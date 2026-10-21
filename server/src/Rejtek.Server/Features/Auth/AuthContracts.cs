using System.ComponentModel.DataAnnotations;
using Rejtek.Server.Common;
using Rejtek.Server.Data;

namespace Rejtek.Server.Features.Auth;

public sealed record KdfParamsDto(
    [property: Required, AllowedValues("argon2id")] string Algorithm,
    [property: Range(1, 10)] int OpsLimit,
    [property: Range(typeof(long), "8388608", "1073741824")] long MemLimitBytes)
{
    public static KdfParamsDto FromUser(User user) => new("argon2id", user.KdfOpsLimit, user.KdfMemLimitBytes);
}

public sealed record RegisterRequest(
    [property: Required, RegularExpression(Usernames.Pattern)] string Username,
    [property: Required, Base64(16, 16)] string Salt,
    [property: Required] KdfParamsDto Kdf,
    [property: Required, Base64(32, 32)] string AuthKey,
    [property: Required] EncryptedBlobDto WrappedVaultKey);

public sealed record PreloginRequest([property: Required] string Username);

public sealed record PreloginResponse(string Salt, KdfParamsDto Kdf);

public sealed record LoginRequest(
    [property: Required] string Username,
    [property: Required, Base64(32, 32)] string AuthKey);

public sealed record LoginResponse(string Token, DateTimeOffset ExpiresAt, EncryptedBlobDto WrappedVaultKey);
