using System.Net;
using System.Net.Http.Json;
using Rejtek.Server.Features.Vault;
using Rejtek.Server.Tests.Support;

namespace Rejtek.Server.Tests;

public sealed class VaultTests : ApiTestBase
{
    private static readonly DateTimeOffset ChangedAt = new(2026, 10, 21, 14, 2, 0, TimeSpan.FromHours(2));

    [Fact]
    public async Task New_items_start_at_version_one_and_are_listed()
    {
        var client = await SignedInAsync();
        var id = Guid.NewGuid();
        var data = RandomBlob();

        var put = await PutAsync(client, id, baseVersion: 0, data);

        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        var item = Assert.Single((await client.GetFromJsonAsync<VaultItemResponse[]>("/api/vault/items", Json, Ct))!);
        Assert.Equal(new VaultItemResponse(id, 1, ChangedAt, Deleted: false, data), item);
    }

    [Fact]
    public async Task Updating_with_the_current_version_increments_it()
    {
        var client = await SignedInAsync();
        var id = Guid.NewGuid();
        await PutAsync(client, id, baseVersion: 0, RandomBlob());

        var update = await PutAsync(client, id, baseVersion: 1, RandomBlob());

        Assert.Equal(2, (await update.Content.ReadFromJsonAsync<VaultItemResponse>(Json, Ct))!.Version);
    }

    [Fact]
    public async Task Updating_with_a_stale_version_conflicts_and_returns_the_current_item()
    {
        var client = await SignedInAsync();
        var id = Guid.NewGuid();
        await PutAsync(client, id, baseVersion: 0, RandomBlob());
        var latest = RandomBlob();
        await PutAsync(client, id, baseVersion: 1, latest);

        var stale = await PutAsync(client, id, baseVersion: 1, RandomBlob());

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var conflict = (await stale.Content.ReadFromJsonAsync<VersionConflict>(Json, Ct))!;
        Assert.Equal(2, conflict.Current!.Version);
        Assert.Equal(latest, conflict.Current.Data);
    }

    [Fact]
    public async Task Creating_with_a_nonzero_base_version_conflicts()
    {
        var client = await SignedInAsync();

        var response = await PutAsync(client, Guid.NewGuid(), baseVersion: 3, RandomBlob());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Null((await response.Content.ReadFromJsonAsync<VersionConflict>(Json, Ct))!.Current);
    }

    [Fact]
    public async Task Deleting_leaves_a_tombstone_that_can_be_restored()
    {
        var client = await SignedInAsync();
        var id = Guid.NewGuid();
        await PutAsync(client, id, baseVersion: 0, RandomBlob());

        var delete = await client.DeleteAsync($"/api/vault/items/{id}?baseVersion=1", Ct);

        var tombstone = (await delete.Content.ReadFromJsonAsync<VaultItemResponse>(Json, Ct))!;
        Assert.True(tombstone.Deleted);
        Assert.Null(tombstone.Data);
        Assert.Equal(2, tombstone.Version);
        Assert.Equal(HttpStatusCode.OK, (await PutAsync(client, id, baseVersion: 2, RandomBlob())).StatusCode);
    }

    [Fact]
    public async Task Deleting_with_a_stale_version_conflicts()
    {
        var client = await SignedInAsync();
        var id = Guid.NewGuid();
        await PutAsync(client, id, baseVersion: 0, RandomBlob());
        await PutAsync(client, id, baseVersion: 1, RandomBlob());

        var delete = await client.DeleteAsync($"/api/vault/items/{id}?baseVersion=1", Ct);

        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
    }

    [Fact]
    public async Task Users_only_see_their_own_items()
    {
        var roland = await SignedInAsync("roland");
        var anna = await SignedInAsync("anna");
        var id = Guid.NewGuid();
        await PutAsync(roland, id, baseVersion: 0, RandomBlob());

        Assert.Empty((await anna.GetFromJsonAsync<VaultItemResponse[]>("/api/vault/items", Json, Ct))!);
        Assert.Equal(HttpStatusCode.NotFound, (await anna.GetAsync($"/api/vault/items/{id}", Ct)).StatusCode);
    }

    [Fact]
    public async Task Malformed_ciphertext_is_rejected()
    {
        var client = await SignedInAsync();
        var bad = RandomBlob() with { Nonce = "not base64!" };

        var response = await PutAsync(client, Guid.NewGuid(), baseVersion: 0, bad);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static Task<HttpResponseMessage> PutAsync(
        HttpClient client,
        Guid id,
        int baseVersion,
        Common.EncryptedBlobDto data) =>
        client.PutAsJsonAsync($"/api/vault/items/{id}", new PutItemRequest(baseVersion, ChangedAt, data), Json, Ct);
}
