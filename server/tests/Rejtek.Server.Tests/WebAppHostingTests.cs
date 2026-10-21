using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Rejtek.Server.Tests;

public sealed class WebAppHostingTests : IAsyncDisposable
{
    private readonly string _webRoot = Directory.CreateTempSubdirectory("rejtek-webroot-").FullName;
    private readonly Support.RejtekApiFactory _factory = new();
    private readonly WebApplicationFactory<Program> _app;

    public WebAppHostingTests()
    {
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), "<!doctype html><title>Rejtek</title>");
        Directory.CreateDirectory(Path.Combine(_webRoot, "assets"));
        File.WriteAllText(Path.Combine(_webRoot, "assets", "app-abc123.js"), "console.log(1)");
        _app = _factory.WithWebHostBuilder(builder => builder.UseWebRoot(_webRoot));
    }

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Client_side_routes_serve_the_app()
    {
        var response = await _app.CreateClient().GetAsync("/devices/pair", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("<title>Rejtek</title>", await response.Content.ReadAsStringAsync(Ct));
        Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task Hashed_assets_are_cached_forever()
    {
        var response = await _app.CreateClient().GetAsync("/assets/app-abc123.js", Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromDays(365), response.Headers.CacheControl?.MaxAge);
    }

    [Fact]
    public async Task Unknown_api_routes_are_not_found_instead_of_the_app()
    {
        var response = await _app.CreateClient().GetAsync("/api/does-not-exist", Ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Responses_carry_strict_security_headers()
    {
        var response = await _app.CreateClient().GetAsync("/", Ct);

        var csp = Assert.Single(response.Headers.GetValues("Content-Security-Policy"));
        Assert.Contains("default-src 'self'", csp, StringComparison.Ordinal);
        Assert.Contains("frame-ancestors 'none'", csp, StringComparison.Ordinal);
        Assert.Equal("nosniff", Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));
        Assert.Equal("no-referrer", Assert.Single(response.Headers.GetValues("Referrer-Policy")));
    }

    public async ValueTask DisposeAsync()
    {
        await _app.DisposeAsync();
        await _factory.DisposeAsync();
        Directory.Delete(_webRoot, recursive: true);
    }
}
