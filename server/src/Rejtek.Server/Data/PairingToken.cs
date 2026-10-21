namespace Rejtek.Server.Data;

/// <summary>One-time token shown as a QR code to pair a device.</summary>
public sealed class PairingToken
{
    public Guid Id { get; init; }

    public Guid UserId { get; init; }

    public required byte[] TokenHash { get; init; }

    public DateTimeOffset ExpiresAt { get; init; }
}
