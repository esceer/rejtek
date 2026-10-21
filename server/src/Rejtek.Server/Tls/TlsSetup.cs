namespace Rejtek.Server.Tls;

public sealed class TlsOptions
{
    public const string Section = "Tls";

    /// <summary>Off for local development and tests; on in the Docker image.</summary>
    public bool Enabled { get; init; }

    public int Port { get; init; } = 8443;

    public string CertificatePath { get; init; } = "/data/tls/server.pfx";

    /// <summary>Host names / IP addresses the phone and browser use to reach the server.</summary>
    public string[] Hostnames { get; init; } = [];
}

/// <summary>Facts about this server that clients need for pairing.</summary>
public sealed record ServerIdentity(string? CertificateFingerprint);

public static class TlsSetup
{
    /// <summary>Configures Kestrel for HTTPS with the self-signed certificate, if enabled.</summary>
    public static ServerIdentity ConfigureRejtekTls(this WebApplicationBuilder builder)
    {
        var options = builder.Configuration.GetSection(TlsOptions.Section).Get<TlsOptions>() ?? new TlsOptions();
        if (!options.Enabled)
        {
            return new ServerIdentity(CertificateFingerprint: null);
        }

        var certificate = SelfSignedCertificate.LoadOrCreate(options.CertificatePath, options.Hostnames, TimeProvider.System);
        builder.WebHost.ConfigureKestrel(kestrel =>
            kestrel.ListenAnyIP(options.Port, listen => listen.UseHttps(certificate)));
        return new ServerIdentity(SelfSignedCertificate.Fingerprint(certificate));
    }
}
