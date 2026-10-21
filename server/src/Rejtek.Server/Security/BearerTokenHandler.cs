using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rejtek.Server.Data;

namespace Rejtek.Server.Security;

/// <summary>Authenticates <c>Authorization: Bearer &lt;token&gt;</c> against stored access tokens.</summary>
public sealed class BearerTokenHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    RejtekDbContext db,
    TimeProvider time) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Bearer";
    private const string Prefix = "Bearer ";

    // Avoid a database write on every request.
    private static readonly TimeSpan LastUsedResolution = TimeSpan.FromMinutes(1);

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? header = Request.Headers.Authorization;
        if (header is null || !header.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return AuthenticateResult.NoResult();
        }

        var tokenHash = OpaqueToken.Hash(header[Prefix.Length..].Trim());
        var now = time.GetUtcNow();
        var token = await db.AccessTokens.SingleOrDefaultAsync(t => t.TokenHash == tokenHash, Context.RequestAborted);
        if (token is null || token.ExpiresAt <= now)
        {
            return AuthenticateResult.Fail("Invalid or expired token");
        }

        if (now - token.LastUsedAt > LastUsedResolution)
        {
            token.LastUsedAt = now;
            await db.SaveChangesAsync(Context.RequestAborted);
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(RejtekClaims.UserId, token.UserId.ToString()),
                new Claim(RejtekClaims.TokenId, token.Id.ToString()),
            ],
            SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }
}
