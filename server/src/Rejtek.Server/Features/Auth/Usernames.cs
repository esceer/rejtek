namespace Rejtek.Server.Features.Auth;

public static class Usernames
{
    public const string Pattern = "^[A-Za-z0-9._-]{3,32}$";

    /// <summary>Usernames are case-insensitive; they are stored lower-case.</summary>
    public static string Normalize(string username) => username.Trim().ToLowerInvariant();
}
