using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace Rejtek.Server.Security;

/// <summary>Random bearer/pairing tokens. Only their SHA-256 hash is persisted.</summary>
public static class OpaqueToken
{
    private const int TokenBytes = 32;

    public static string Generate() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));

    public static byte[] Hash(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));
}
