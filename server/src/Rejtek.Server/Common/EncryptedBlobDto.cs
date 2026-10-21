using System.ComponentModel.DataAnnotations;
using Rejtek.Server.Data;

namespace Rejtek.Server.Common;

/// <summary>Wire format of client-side ciphertext; mirrors <c>EncryptedBlob</c> in <c>@rejtek/core</c>.</summary>
public sealed record EncryptedBlobDto(
    [property: Range(1, 1)] int V,
    [property: Required, Base64(24, 24)] string Nonce,
    [property: Required, Base64(16, 64 * 1024)] string Ciphertext)
{
    public EncryptedBlob ToEntity() => new(V, Nonce, Ciphertext);

    public static EncryptedBlobDto FromEntity(EncryptedBlob blob) => new(blob.V, blob.Nonce, blob.Ciphertext);
}
