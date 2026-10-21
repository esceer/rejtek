namespace Rejtek.Server.Data;

/// <summary>Client-side encrypted data. The server stores it verbatim and never decrypts it.</summary>
public sealed record EncryptedBlob(int V, string Nonce, string Ciphertext);
