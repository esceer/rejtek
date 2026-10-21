using Microsoft.AspNetCore.StaticFiles;

namespace Rejtek.Server.Web;

/// <summary>Serves the React web app (built into wwwroot) with strict browser security headers.</summary>
public static class WebAppHosting
{
    // 'wasm-unsafe-eval' lets libsodium's WebAssembly run; nothing else may execute or load externally.
    private const string ContentSecurityPolicy =
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; " +
        "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; " +
        "frame-ancestors 'none'";

    public static WebApplication UseSecurityHeaders(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers.ContentSecurityPolicy = ContentSecurityPolicy;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            await next();
        });
        return app;
    }

    public static WebApplication UseWebAppFiles(this WebApplication app)
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = context =>
            {
                // Vite fingerprints everything under /assets; index.html must always be revalidated.
                context.Context.Response.Headers.CacheControl =
                    context.Context.Request.Path.StartsWithSegments("/assets", StringComparison.Ordinal)
                        ? "public, max-age=31536000, immutable"
                        : "no-cache";
            },
        });
        return app;
    }

    public static WebApplication MapWebApp(this WebApplication app)
    {
        // Unknown API routes must stay 404s instead of falling through to the SPA.
        app.Map("/api/{**rest}", () => TypedResults.NotFound());
        app.MapFallbackToFile("index.html", new StaticFileOptions
        {
            OnPrepareResponse = context => context.Context.Response.Headers.CacheControl = "no-cache",
        });
        return app;
    }
}
