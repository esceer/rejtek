using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Rejtek.Server.Common;
using Rejtek.Server.Data;
using Rejtek.Server.Features.Auth;
using Rejtek.Server.Security;
using Rejtek.Server.Tls;

namespace Rejtek.Server.Features.Devices;

public static class DeviceEndpoints
{
    private static readonly TimeSpan PairingTokenLifetime = TimeSpan.FromMinutes(5);

    public static IEndpointRouteBuilder MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/devices").WithTags("Devices");
        group.MapPost("/pair", Pair).RequireRateLimiting(RateLimiting.AuthPolicy);

        var authorized = group.MapGroup("").RequireAuthorization();
        authorized.MapPost("/pairing-tokens", CreatePairingToken);
        authorized.MapGet("/", List);
        authorized.MapDelete("/{id:guid}", Revoke);
        return app;
    }

    private static async Task<Ok<PairingTokenResponse>> CreatePairingToken(
        ClaimsPrincipal principal,
        RejtekDbContext db,
        TimeProvider time,
        ServerIdentity server,
        CancellationToken ct)
    {
        var token = OpaqueToken.Generate();
        var expiresAt = time.GetUtcNow() + PairingTokenLifetime;
        db.PairingTokens.Add(new PairingToken
        {
            Id = Guid.CreateVersion7(),
            UserId = principal.GetUserId(),
            TokenHash = OpaqueToken.Hash(token),
            ExpiresAt = expiresAt,
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new PairingTokenResponse(token, expiresAt, server.CertificateFingerprint));
    }

    private static async Task<Results<Ok<PairResponse>, UnauthorizedHttpResult>> Pair(
        PairRequest request,
        RejtekDbContext db,
        TimeProvider time,
        CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var tokenHash = OpaqueToken.Hash(request.PairingToken);
        var pairing = await db.PairingTokens.SingleOrDefaultAsync(t => t.TokenHash == tokenHash, ct);
        if (pairing is null)
        {
            return TypedResults.Unauthorized();
        }

        // Single use: consumed even if it turns out to be expired.
        db.PairingTokens.Remove(pairing);
        if (pairing.ExpiresAt <= now)
        {
            await db.SaveChangesAsync(ct);
            return TypedResults.Unauthorized();
        }

        var user = await db.Users.SingleAsync(u => u.Id == pairing.UserId, ct);
        var deviceToken = OpaqueToken.Generate();
        var device = new AccessToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            Name = request.Name.Trim(),
            Kind = request.Kind == DeviceKind.Phone ? AccessTokenKind.Phone : AccessTokenKind.Extension,
            TokenHash = OpaqueToken.Hash(deviceToken),
            CreatedAt = now,
            LastUsedAt = now,
        };
        db.AccessTokens.Add(device);
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(new PairResponse(
            device.Id,
            deviceToken,
            user.Username,
            Convert.ToBase64String(user.KdfSalt),
            KdfParamsDto.FromUser(user),
            EncryptedBlobDto.FromEntity(user.WrappedVaultKey)));
    }

    private static async Task<Ok<DeviceResponse[]>> List(ClaimsPrincipal principal, RejtekDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var devices = await db.AccessTokens
            .Where(t => t.UserId == userId && t.Kind != AccessTokenKind.WebSession)
            .OrderBy(t => t.CreatedAt)
            .ToArrayAsync(ct);
        return TypedResults.Ok(devices.Select(DeviceResponse.FromEntity).ToArray());
    }

    private static async Task<Results<NoContent, NotFound>> Revoke(
        Guid id,
        ClaimsPrincipal principal,
        RejtekDbContext db,
        CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var deleted = await db.AccessTokens
            .Where(t => t.Id == id && t.UserId == userId && t.Kind != AccessTokenKind.WebSession)
            .ExecuteDeleteAsync(ct);
        return deleted == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
    }
}
