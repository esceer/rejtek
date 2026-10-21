using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Rejtek.Server.Tls;

/// <summary>Creates the server's self-signed certificate on first start and reuses it afterwards.</summary>
public static class SelfSignedCertificate
{
    private static readonly TimeSpan Validity = TimeSpan.FromDays(5 * 365);

    public static X509Certificate2 LoadOrCreate(string path, IEnumerable<string> hostnames, TimeProvider time)
    {
        if (File.Exists(path))
        {
            return X509CertificateLoader.LoadPkcs12FromFile(path, password: null);
        }

        var pfx = Create(hostnames, time.GetUtcNow());
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        File.WriteAllBytes(path, pfx);
        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }

        return X509CertificateLoader.LoadPkcs12(pfx, password: null);
    }

    /// <summary>SHA-256 fingerprint as colon-separated hex, the form clients pin and users compare.</summary>
    public static string Fingerprint(X509Certificate2 certificate) =>
        string.Join(':', certificate.GetCertHash(HashAlgorithmName.SHA256).Select(b => b.ToString("X2", null)));

    private static byte[] Create(IEnumerable<string> hostnames, DateTimeOffset now)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var request = new CertificateRequest("CN=Rejtek", key, HashAlgorithmName.SHA256);

        var names = new SubjectAlternativeNameBuilder();
        foreach (var host in hostnames.Append("localhost").Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (IPAddress.TryParse(host, out var ip))
            {
                names.AddIpAddress(ip);
            }
            else
            {
                names.AddDnsName(host);
            }
        }

        request.CertificateExtensions.Add(names.Build());
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, true));
        request.CertificateExtensions.Add(
            new X509EnhancedKeyUsageExtension([new Oid("1.3.6.1.5.5.7.3.1", "Server Authentication")], false));

        using var certificate = request.CreateSelfSigned(now.AddDays(-1), now + Validity);
        return certificate.Export(X509ContentType.Pkcs12);
    }
}
