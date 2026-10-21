using System.Globalization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace Rejtek.Server.Tests.Support;

/// <summary>Runs the real app in memory against a throw-away SQLite file and a controllable clock.</summary>
public sealed class RejtekApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"rejtek-test-{Guid.NewGuid():N}.db");

    public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 10, 21, 12, 0, 0, TimeSpan.Zero));

    public int AuthPermitsPerMinute { get; init; } = 1_000;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Rejtek", $"Data Source={_databasePath}");
        builder.UseSetting("RateLimiting:AuthPermitsPerMinute", AuthPermitsPerMinute.ToString(CultureInfo.InvariantCulture));
        builder.ConfigureServices(services => services.AddSingleton<TimeProvider>(Time));
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        SqliteConnection.ClearAllPools();
        File.Delete(_databasePath);
    }
}
