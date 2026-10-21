using System.ComponentModel.DataAnnotations;
using Rejtek.Server.Common;
using Rejtek.Server.Data;

namespace Rejtek.Server.Features.Vault;

public sealed record VaultItemResponse(Guid Id, int Version, DateTimeOffset UpdatedAt, bool Deleted, EncryptedBlobDto? Data)
{
    public static VaultItemResponse FromEntity(VaultItem item) => new(
        item.Id,
        item.Version,
        item.UpdatedAt,
        item.Deleted,
        item.Data is null ? null : EncryptedBlobDto.FromEntity(item.Data));
}

/// <summary>
/// Creates or overwrites an item. <see cref="BaseVersion"/> is the server version the client
/// last saw (0 for a new item); a mismatch means someone else changed it in the meantime.
/// </summary>
public sealed record PutItemRequest(
    [property: Range(0, int.MaxValue)] int BaseVersion,
    [property: Required] DateTimeOffset? UpdatedAt,
    [property: Required] EncryptedBlobDto Data);

/// <summary>Returned with 409: the current server state, so the client can re-diff.</summary>
public sealed record VersionConflict(VaultItemResponse? Current);
