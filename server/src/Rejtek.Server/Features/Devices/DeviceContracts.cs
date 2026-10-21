using System.ComponentModel.DataAnnotations;
using Rejtek.Server.Common;
using Rejtek.Server.Data;
using Rejtek.Server.Features.Auth;

namespace Rejtek.Server.Features.Devices;

public enum DeviceKind
{
    Phone,
    Extension,
}

/// <summary>Everything the web UI needs to render the pairing QR code (plus its own origin).</summary>
public sealed record PairingTokenResponse(string Token, DateTimeOffset ExpiresAt, string? CertificateFingerprint);

public sealed record PairRequest(
    [property: Required] string PairingToken,
    [property: Required, StringLength(64, MinimumLength = 1)] string Name,
    [property: Required] DeviceKind? Kind);

/// <summary>The device token plus what the device needs to unlock the vault with the master password.</summary>
public sealed record PairResponse(
    Guid DeviceId,
    string DeviceToken,
    string Username,
    string Salt,
    KdfParamsDto Kdf,
    EncryptedBlobDto WrappedVaultKey);

public sealed record DeviceResponse(Guid Id, string Name, DeviceKind Kind, DateTimeOffset CreatedAt, DateTimeOffset LastUsedAt)
{
    public static DeviceResponse FromEntity(AccessToken token) => new(
        token.Id,
        token.Name,
        token.Kind == AccessTokenKind.Phone ? DeviceKind.Phone : DeviceKind.Extension,
        token.CreatedAt,
        token.LastUsedAt);
}
