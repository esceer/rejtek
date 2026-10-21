using System.Security.Cryptography;

namespace Rejtek.Server.Security;

/// <summary>
/// Hashes the client's auth key. The auth key is already a 256-bit Argon2id-derived secret,
/// so a salted PBKDF2 hash is sufficient and needs no extra dependency.
/// </summary>
public static class AuthKeyHasher
{
    private const int SaltBytes = 16;
    private const int HashBytes = 32;
    private const int Iterations = 100_000;

    public static (byte[] Hash, byte[] Salt) Hash(byte[] authKey)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        return (Derive(authKey, salt), salt);
    }

    public static bool Verify(byte[] authKey, byte[] expectedHash, byte[] salt) =>
        CryptographicOperations.FixedTimeEquals(Derive(authKey, salt), expectedHash);

    private static byte[] Derive(byte[] authKey, byte[] salt) =>
        Rfc2898DeriveBytes.Pbkdf2(authKey, salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
}
