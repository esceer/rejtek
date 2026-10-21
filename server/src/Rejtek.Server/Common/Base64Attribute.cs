using System.ComponentModel.DataAnnotations;

namespace Rejtek.Server.Common;

/// <summary>Validates that a string is standard Base64 decoding to a length within the given byte range.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class Base64Attribute(int minBytes, int maxBytes) : ValidationAttribute
{
    public int MinBytes { get; } = minBytes;

    public int MaxBytes { get; } = maxBytes;

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            return true; // Combine with [Required] where needed.
        }

        if (value is not string text)
        {
            return false;
        }

        var buffer = new byte[text.Length];
        return Convert.TryFromBase64String(text, buffer, out var length) && length >= MinBytes && length <= MaxBytes;
    }

    public override string FormatErrorMessage(string name) =>
        MinBytes == MaxBytes
            ? $"{name} must be Base64 encoding exactly {MinBytes} bytes."
            : $"{name} must be Base64 encoding {MinBytes}–{MaxBytes} bytes.";
}
