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
        if (!File.Exists(path))
        {
            TryWriteNew(path, Create(hostnames, time.GetUtcNow()));
        }

        // Always serve what is on disk, so the served certificate is the one that survives restarts.
        return X509CertificateLoader.LoadPkcs12FromFile(path, password: null);
    }

    /// <summary>Writes the file only if it does not exist yet; a concurrently created certificate wins.</summary>
    private static void TryWriteNew(string path, byte[] pfx)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows())
        {
            options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }

        try
        {
            using var stream = new FileStream(path, options);
            stream.Write(pfx);
        }
        catch (IOException) when (File.Exists(path))
        {
        }
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
