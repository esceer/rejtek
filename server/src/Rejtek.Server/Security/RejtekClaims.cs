using System.Security.Claims;

namespace Rejtek.Server.Security;

public static class RejtekClaims
{
    public const string UserId = "rejtek:user_id";
    public const string TokenId = "rejtek:token_id";

    public static Guid GetUserId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(UserId)!);

    public static Guid GetTokenId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(TokenId)!);
}
