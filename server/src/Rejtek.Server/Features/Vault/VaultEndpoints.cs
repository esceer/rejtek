using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Rejtek.Server.Data;
using Rejtek.Server.Security;

namespace Rejtek.Server.Features.Vault;

public static class VaultEndpoints
{
    public static IEndpointRouteBuilder MapVaultEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vault/items").WithTags("Vault").RequireAuthorization();
        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPut("/{id:guid}", Put);
        group.MapDelete("/{id:guid}", Delete);
        return app;
    }

    private static async Task<Ok<VaultItemResponse[]>> List(ClaimsPrincipal principal, RejtekDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var items = await db.VaultItems.Where(i => i.UserId == userId).ToArrayAsync(ct);
        return TypedResults.Ok(items.Select(VaultItemResponse.FromEntity).ToArray());
    }

    private static async Task<Results<Ok<VaultItemResponse>, NotFound>> Get(
        Guid id,
        ClaimsPrincipal principal,
        RejtekDbContext db,
        CancellationToken ct)
    {
        var item = await Find(db, principal.GetUserId(), id, ct);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(VaultItemResponse.FromEntity(item));
    }

    private static async Task<Results<Ok<VaultItemResponse>, Conflict<VersionConflict>>> Put(
        Guid id,
        PutItemRequest request,
        ClaimsPrincipal principal,
        RejtekDbContext db,
        CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var item = await Find(db, userId, id, ct);
        if ((item?.Version ?? 0) != request.BaseVersion)
        {
            return Conflict(item);
        }

        if (item is null)
        {
            item = new VaultItem { UserId = userId, Id = id };
            db.VaultItems.Add(item);
        }

        item.Version = request.BaseVersion + 1;
        item.UpdatedAt = request.UpdatedAt!.Value.ToUniversalTime();
        item.Deleted = false;
        item.Data = request.Data.ToEntity();
        if (await SaveOrConflict(db, item, ct) is { } conflict)
        {
            return conflict;
        }

        return TypedResults.Ok(VaultItemResponse.FromEntity(item));
    }

    private static async Task<Results<Ok<VaultItemResponse>, Conflict<VersionConflict>, NotFound>> Delete(
        Guid id,
        int baseVersion,
        ClaimsPrincipal principal,
        RejtekDbContext db,
        TimeProvider time,
        CancellationToken ct)
    {
        var item = await Find(db, principal.GetUserId(), id, ct);
        if (item is null)
        {
            return TypedResults.NotFound();
        }

        if (item.Version != baseVersion)
        {
            return Conflict(item);
        }

        // Keep a tombstone so other devices learn about the deletion on their next sync.
        item.Version = baseVersion + 1;
        item.UpdatedAt = time.GetUtcNow();
        item.Deleted = true;
        item.Data = null;
        if (await SaveOrConflict(db, item, ct) is { } conflict)
        {
            return conflict;
        }

        return TypedResults.Ok(VaultItemResponse.FromEntity(item));
    }

    /// <returns>Null on success; the conflict response if another request won the race.</returns>
    private static async Task<Conflict<VersionConflict>?> SaveOrConflict(
        RejtekDbContext db,
        VaultItem item,
        CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return null;
        }
        catch (DbUpdateException)
        {
            // A concurrent request changed (or created) the item between our read and write.
            db.ChangeTracker.Clear();
            return Conflict(await Find(db, item.UserId, item.Id, ct));
        }
    }

    private static Conflict<VersionConflict> Conflict(VaultItem? current) =>
        TypedResults.Conflict(new VersionConflict(current is null ? null : VaultItemResponse.FromEntity(current)));

    private static Task<VaultItem?> Find(RejtekDbContext db, Guid userId, Guid id, CancellationToken ct) =>
        db.VaultItems.SingleOrDefaultAsync(i => i.UserId == userId && i.Id == id, ct);
}
