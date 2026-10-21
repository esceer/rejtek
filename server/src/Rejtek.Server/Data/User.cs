namespace Rejtek.Server.Data;

public sealed class User
{
    public Guid Id { get; init; }

    /// <summary>Lower-case, unique.</summary>
    public required string Username { get; init; }

    /// <summary>PBKDF2 hash of the client's auth key (the auth key itself is never stored).</summary>
    public required byte[] AuthKeyHash { get; init; }

    public required byte[] AuthKeyHashSalt { get; init; }

    /// <summary>Salt for the client-side Argon2id master key derivation.</summary>
    public required byte[] KdfSalt { get; init; }

    public required int KdfOpsLimit { get; init; }

    public required long KdfMemLimitBytes { get; init; }

    /// <summary>The vault key, encrypted with the client's encryption key.</summary>
    public required EncryptedBlob WrappedVaultKey { get; init; }

    public DateTimeOffset CreatedAt { get; init; }
}
