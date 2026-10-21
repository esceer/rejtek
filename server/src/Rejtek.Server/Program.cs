using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Rejtek.Server.Data;
using Rejtek.Server.Features.Auth;
using Rejtek.Server.Features.Devices;
using Rejtek.Server.Features.Vault;
using Rejtek.Server.Security;
using Rejtek.Server.Tls;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<RejtekDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Rejtek")));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(builder.ConfigureRejtekTls());

builder.Services
    .AddAuthentication(BearerTokenHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, BearerTokenHandler>(
        BearerTokenHandler.SchemeName,
        configureOptions: null);
builder.Services.AddAuthorization();
builder.Services.AddRejtekRateLimiting(builder.Configuration);

builder.Services.AddValidation();
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<RejtekDbContext>().Database.Migrate();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/api/health", () => TypedResults.Ok());
app.MapAuthEndpoints();
app.MapDeviceEndpoints();
app.MapVaultEndpoints();

app.Run();

public partial class Program;
