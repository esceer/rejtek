namespace Rejtek.Server.Data;

/// <summary>A bearer token: a short-lived web session or a long-lived paired device.</summary>
public sealed class AccessToken
{
    public Guid Id { get; init; }

    public Guid UserId { get; init; }

    public required string Name { get; init; }

    public AccessTokenKind Kind { get; init; }

    /// <summary>SHA-256 of the token; the token itself is only known to the client.</summary>
    public required byte[] TokenHash { get; init; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset LastUsedAt { get; set; }

    /// <summary>Null for paired devices: valid until revoked.</summary>
    public DateTimeOffset? ExpiresAt { get; init; }
}
