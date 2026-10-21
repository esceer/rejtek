using System.Threading.RateLimiting;
using Microsoft.Extensions.Options;

namespace Rejtek.Server.Security;

public sealed class RateLimitingOptions
{
    public const string Section = "RateLimiting";

    /// <summary>Login, registration and pairing attempts allowed per client IP per minute.</summary>
    public int AuthPermitsPerMinute { get; init; } = 10;
}

public static class RateLimiting
{
    public const string AuthPolicy = "auth";

    public static IServiceCollection AddRejtekRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RateLimitingOptions>(configuration.GetSection(RateLimitingOptions.Section));
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(AuthPolicy, context =>
            {
                var options = context.RequestServices.GetRequiredService<IOptions<RateLimitingOptions>>().Value;
                return RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = options.AuthPermitsPerMinute,
                        Window = TimeSpan.FromMinutes(1),
                    });
            });
        });
        return services;
    }
}
