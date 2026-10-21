using System.Net;
using System.Net.Http.Json;
using Rejtek.Server.Features.Auth;
using Rejtek.Server.Tests.Support;

namespace Rejtek.Server.Tests;

public sealed class AuthTests : ApiTestBase
{
    [Fact]
    public async Task Prelogin_returns_the_registered_salt_and_kdf_params()
    {
        var registration = await RegisterAsync();

        var response = await Anonymous().PostAsJsonAsync("/api/auth/prelogin", new PreloginRequest("Roland"), Json, Ct);

        var prelogin = await response.Content.ReadFromJsonAsync<PreloginResponse>(Json, Ct);
        Assert.Equal(registration.Salt, prelogin!.Salt);
        Assert.Equal(registration.Kdf, prelogin.Kdf);
    }

    [Fact]
    public async Task Prelogin_for_unknown_user_is_not_found()
    {
        var response = await Anonymous().PostAsJsonAsync("/api/auth/prelogin", new PreloginRequest("nobody"), Json, Ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Usernames_are_unique_case_insensitively()
    {
        await RegisterAsync("roland");

        var response = await Anonymous().PostAsJsonAsync("/api/auth/register", NewRegistration("ROLAND"), Json, Ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("has space")]
    public async Task Register_rejects_invalid_usernames(string username)
    {
        var response = await Anonymous().PostAsJsonAsync("/api/auth/register", NewRegistration(username), Json, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_rejects_an_auth_key_of_the_wrong_length()
    {
        var registration = NewRegistration("roland") with { AuthKey = RandomBase64(16) };

        var response = await Anonymous().PostAsJsonAsync("/api/auth/register", registration, Json, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_returns_the_wrapped_vault_key()
    {
        var registration = await RegisterAsync();

        var login = await LoginAsync(registration);

        Assert.Equal(registration.WrappedVaultKey, login.WrappedVaultKey);
        Assert.False(string.IsNullOrEmpty(login.Token));
    }

    [Fact]
    public async Task Login_with_a_wrong_auth_key_is_unauthorized()
    {
        var registration = await RegisterAsync();

        var response = await Anonymous().PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(registration.Username, RandomBase64(32)),
            Json,
            Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Requests_without_a_valid_token_are_unauthorized()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Anonymous().GetAsync("/api/vault/items", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Authorized("bogus").GetAsync("/api/vault/items", Ct)).StatusCode);
    }

    [Fact]
    public async Task Web_sessions_expire_after_twelve_hours()
    {
        var client = await SignedInAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/vault/items", Ct)).StatusCode);

        Factory.Time.Advance(TimeSpan.FromHours(12));

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/vault/items", Ct)).StatusCode);
    }

    [Fact]
    public async Task Logout_revokes_the_session()
    {
        var client = await SignedInAsync();

        var logout = await client.PostAsync("/api/auth/logout", content: null, Ct);

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/vault/items", Ct)).StatusCode);
    }
}

public sealed class AuthRateLimitTests() : ApiTestBase(authPermitsPerMinute: 2)
{
    [Fact]
    public async Task Auth_endpoints_are_rate_limited()
    {
        var client = Anonymous();
        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 3; i++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/prelogin", new PreloginRequest("nobody"), Json, Ct);
            statuses.Add(response.StatusCode);
        }

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.TooManyRequests], statuses);
    }
}
