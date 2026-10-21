using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rejtek.Server.Common;
using Rejtek.Server.Data;
using Rejtek.Server.Security;

namespace Rejtek.Server.Features.Auth;

public static class AuthEndpoints
{
    private static readonly TimeSpan WebSessionLifetime = TimeSpan.FromHours(12);

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");
        group.MapPost("/prelogin", Prelogin).RequireRateLimiting(RateLimiting.AuthPolicy);
        group.MapPost("/register", Register).RequireRateLimiting(RateLimiting.AuthPolicy);
        group.MapPost("/login", Login).RequireRateLimiting(RateLimiting.AuthPolicy);
        group.MapPost("/logout", Logout).RequireAuthorization();
        return app;
    }

    private static async Task<Results<Ok<PreloginResponse>, NotFound>> Prelogin(
        PreloginRequest request,
        RejtekDbContext db,
        CancellationToken ct)
    {
        var user = await FindUser(db, request.Username, ct);
        return user is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(new PreloginResponse(Convert.ToBase64String(user.KdfSalt), KdfParamsDto.FromUser(user)));
    }

    private static async Task<Results<Created, Conflict<ProblemDetails>>> Register(
        RegisterRequest request,
        RejtekDbContext db,
        TimeProvider time,
        CancellationToken ct)
    {
        var username = Usernames.Normalize(request.Username);
        if (await db.Users.AnyAsync(u => u.Username == username, ct))
        {
            return TypedResults.Conflict(new ProblemDetails { Title = "Username is already taken" });
        }

        var (hash, salt) = AuthKeyHasher.Hash(Convert.FromBase64String(request.AuthKey));
        db.Users.Add(new User
        {
            Id = Guid.CreateVersion7(),
            Username = username,
            AuthKeyHash = hash,
            AuthKeyHashSalt = salt,
            KdfSalt = Convert.FromBase64String(request.Salt),
            KdfOpsLimit = request.Kdf.OpsLimit,
            KdfMemLimitBytes = request.Kdf.MemLimitBytes,
            WrappedVaultKey = request.WrappedVaultKey.ToEntity(),
            CreatedAt = time.GetUtcNow(),
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.Created();
    }

    private static async Task<Results<Ok<LoginResponse>, UnauthorizedHttpResult>> Login(
        LoginRequest request,
        RejtekDbContext db,
        TimeProvider time,
        CancellationToken ct)
    {
        var user = await FindUser(db, request.Username, ct);
        if (user is null || !AuthKeyHasher.Verify(Convert.FromBase64String(request.AuthKey), user.AuthKeyHash, user.AuthKeyHashSalt))
        {
            return TypedResults.Unauthorized();
        }

        var now = time.GetUtcNow();
        var token = OpaqueToken.Generate();
        var session = new AccessToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            Name = "Web session",
            Kind = AccessTokenKind.WebSession,
            TokenHash = OpaqueToken.Hash(token),
            CreatedAt = now,
            LastUsedAt = now,
            ExpiresAt = now + WebSessionLifetime,
        };
        db.AccessTokens.Add(session);
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(new LoginResponse(token, session.ExpiresAt.Value, EncryptedBlobDto.FromEntity(user.WrappedVaultKey)));
    }

    private static async Task<NoContent> Logout(ClaimsPrincipal principal, RejtekDbContext db, CancellationToken ct)
    {
        var tokenId = principal.GetTokenId();
        await db.AccessTokens.Where(t => t.Id == tokenId).ExecuteDeleteAsync(ct);
        return TypedResults.NoContent();
    }

    private static Task<User?> FindUser(RejtekDbContext db, string username, CancellationToken ct)
    {
        var normalized = Usernames.Normalize(username);
        return db.Users.SingleOrDefaultAsync(u => u.Username == normalized, ct);
    }
}
