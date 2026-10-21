using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Rejtek.Server.Common;
using Rejtek.Server.Features.Auth;

namespace Rejtek.Server.Tests.Support;

/// <summary>A fresh app and database per test, plus helpers for the common setup steps.</summary>
public abstract class ApiTestBase : IAsyncDisposable
{
    protected static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    protected ApiTestBase(int authPermitsPerMinute = 1_000)
    {
        Factory = new RejtekApiFactory { AuthPermitsPerMinute = authPermitsPerMinute };
    }

    protected RejtekApiFactory Factory { get; }

    protected static CancellationToken Ct => TestContext.Current.CancellationToken;

    protected HttpClient Anonymous() => Factory.CreateClient();

    protected HttpClient Authorized(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    protected static string RandomBase64(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes));

    protected static EncryptedBlobDto RandomBlob() => new(1, RandomBase64(24), RandomBase64(64));

    protected static RegisterRequest NewRegistration(string username) => new(
        username,
        RandomBase64(16),
        new KdfParamsDto("argon2id", 3, 64 * 1024 * 1024),
        RandomBase64(32),
        RandomBlob());

    protected async Task<RegisterRequest> RegisterAsync(string username = "roland")
    {
        var registration = NewRegistration(username);
        var response = await Anonymous().PostAsJsonAsync("/api/auth/register", registration, Json, Ct);
        response.EnsureSuccessStatusCode();
        return registration;
    }

    protected async Task<LoginResponse> LoginAsync(RegisterRequest registration)
    {
        var response = await Anonymous().PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Username, registration.AuthKey),
            Json,
            Ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponse>(Json, Ct))!;
    }

    /// <summary>Registers and logs in; returns a client carrying the web session token.</summary>
    protected async Task<HttpClient> SignedInAsync(string username = "roland") =>
        Authorized((await LoginAsync(await RegisterAsync(username))).Token);

    public async ValueTask DisposeAsync()
    {
        await Factory.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
