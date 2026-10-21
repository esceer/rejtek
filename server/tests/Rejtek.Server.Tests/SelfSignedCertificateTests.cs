using System.Security.Cryptography.X509Certificates;
using Rejtek.Server.Tls;

namespace Rejtek.Server.Tests;

public sealed class SelfSignedCertificateTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), $"rejtek-tls-{Guid.NewGuid():N}");

    private string CertificatePath => Path.Combine(_directory, "server.pfx");

    [Fact]
    public void Creates_a_certificate_once_and_reuses_it()
    {
        using var first = SelfSignedCertificate.LoadOrCreate(CertificatePath, ["192.168.1.20"], TimeProvider.System);
        using var second = SelfSignedCertificate.LoadOrCreate(CertificatePath, ["other-host"], TimeProvider.System);

        Assert.True(File.Exists(CertificatePath));
        Assert.Equal(SelfSignedCertificate.Fingerprint(first), SelfSignedCertificate.Fingerprint(second));
        Assert.True(second.HasPrivateKey);
    }

    [Fact]
    public void Covers_the_configured_hosts_and_localhost()
    {
        using var certificate = SelfSignedCertificate.LoadOrCreate(CertificatePath, ["192.168.1.20", "rejtek.home"], TimeProvider.System);

        var names = certificate.Extensions.OfType<X509SubjectAlternativeNameExtension>().Single();
        Assert.Contains("rejtek.home", names.EnumerateDnsNames());
        Assert.Contains("localhost", names.EnumerateDnsNames());
        Assert.Contains(System.Net.IPAddress.Parse("192.168.1.20"), names.EnumerateIPAddresses());
    }

    [Fact]
    public void Fingerprint_is_colon_separated_sha256_hex()
    {
        using var certificate = SelfSignedCertificate.LoadOrCreate(CertificatePath, [], TimeProvider.System);

        Assert.Matches("^([0-9A-F]{2}:){31}[0-9A-F]{2}$", SelfSignedCertificate.Fingerprint(certificate));
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }
}
