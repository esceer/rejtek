namespace Rejtek.Server.Data;

public sealed class VaultItem
{
    public Guid UserId { get; init; }

    /// <summary>Client-generated UUID, stable across devices.</summary>
    public Guid Id { get; init; }

    public int Version { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public bool Deleted { get; set; }

    /// <summary>Null for deleted items (tombstones).</summary>
    public EncryptedBlob? Data { get; set; }
}
