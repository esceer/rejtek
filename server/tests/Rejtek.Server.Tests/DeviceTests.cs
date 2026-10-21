using System.Net;
using System.Net.Http.Json;
using Rejtek.Server.Features.Devices;
using Rejtek.Server.Tests.Support;

namespace Rejtek.Server.Tests;

public sealed class DeviceTests : ApiTestBase
{
    [Fact]
    public async Task Pairing_gives_the_device_a_token_and_what_it_needs_to_unlock()
    {
        var registration = await RegisterAsync();
        var web = Authorized((await LoginAsync(registration)).Token);
        var pairingToken = await CreatePairingTokenAsync(web);

        var pair = await PairAsync(pairingToken, "OnePlus 15");

        Assert.Equal(HttpStatusCode.OK, pair.StatusCode);
        var paired = (await pair.Content.ReadFromJsonAsync<PairResponse>(Json, Ct))!;
        Assert.Equal("roland", paired.Username);
        Assert.Equal(registration.Salt, paired.Salt);
        Assert.Equal(registration.WrappedVaultKey, paired.WrappedVaultKey);
        Assert.Equal(HttpStatusCode.OK, (await Authorized(paired.DeviceToken).GetAsync("/api/vault/items", Ct)).StatusCode);
    }

    [Fact]
    public async Task Pairing_tokens_work_only_once()
    {
        var pairingToken = await CreatePairingTokenAsync(await SignedInAsync());
        await PairAsync(pairingToken, "OnePlus 15");

        var second = await PairAsync(pairingToken, "Other phone");

        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
    }

    [Fact]
    public async Task Pairing_tokens_expire_after_five_minutes()
    {
        var pairingToken = await CreatePairingTokenAsync(await SignedInAsync());

        Factory.Time.Advance(TimeSpan.FromMinutes(5));

        Assert.Equal(HttpStatusCode.Unauthorized, (await PairAsync(pairingToken, "OnePlus 15")).StatusCode);
    }

    [Fact]
    public async Task Devices_are_listed_without_web_sessions()
    {
        var web = await SignedInAsync();
        await PairAsync(await CreatePairingTokenAsync(web), "OnePlus 15");

        var devices = await web.GetFromJsonAsync<DeviceResponse[]>("/api/devices", Json, Ct);

        var device = Assert.Single(devices!);
        Assert.Equal("OnePlus 15", device.Name);
        Assert.Equal(DeviceKind.Phone, device.Kind);
    }

    [Fact]
    public async Task Revoking_a_device_invalidates_its_token()
    {
        var web = await SignedInAsync();
        var paired = (await (await PairAsync(await CreatePairingTokenAsync(web), "OnePlus 15"))
            .Content.ReadFromJsonAsync<PairResponse>(Json, Ct))!;

        var revoke = await web.DeleteAsync($"/api/devices/{paired.DeviceId}", Ct);

        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Authorized(paired.DeviceToken).GetAsync("/api/vault/items", Ct)).StatusCode);
    }

    [Fact]
    public async Task Users_cannot_revoke_each_others_devices()
    {
        var roland = await SignedInAsync("roland");
        var anna = await SignedInAsync("anna");
        var paired = (await (await PairAsync(await CreatePairingTokenAsync(roland), "OnePlus 15"))
            .Content.ReadFromJsonAsync<PairResponse>(Json, Ct))!;

        var revoke = await anna.DeleteAsync($"/api/devices/{paired.DeviceId}", Ct);

        Assert.Equal(HttpStatusCode.NotFound, revoke.StatusCode);
    }

    private static async Task<string> CreatePairingTokenAsync(HttpClient web)
    {
        var response = await web.PostAsync("/api/devices/pairing-tokens", content: null, Ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PairingTokenResponse>(Json, Ct))!.Token;
    }

    private Task<HttpResponseMessage> PairAsync(string pairingToken, string name) =>
        Anonymous().PostAsJsonAsync("/api/devices/pair", new PairRequest(pairingToken, name, DeviceKind.Phone), Json, Ct);
}
