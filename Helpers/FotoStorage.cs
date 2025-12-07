using System.Runtime.InteropServices;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

public class FotoStorage : IAsyncDisposable
{
    private readonly IJSRuntime _jsRuntime;
    private readonly Lazy<Task<IJSObjectReference>> _moduleTask;

    public FotoStorage(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
        _moduleTask = new Lazy<Task<IJSObjectReference>>(() =>
            _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/fotoStorage.js").AsTask());
    }

    public async Task<StoredPhoto> SavePhotoAsync(string? dataUrl, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(dataUrl);

        if (OperatingSystem.IsBrowser())
        {
            var module = await _moduleTask.Value;
            var result = await module.InvokeAsync<BrowserStorageResult>(
                "savePhotoToFilesystem",
                cancellationToken,
                dataUrl);

            return new StoredPhoto(result.Path, result.PreviewDataUrl, result.InMemoryFallback is not true);
        }

        var buffer = ExtractBytesFromDataUrl(dataUrl);
        var extension = GetExtensionFromDataUrl(dataUrl);
        var filePath = BuildPlatformPath(extension);

        var directory = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await File.WriteAllBytesAsync(filePath, buffer, cancellationToken);
        var filePreviewDataUrl = await ReadFileAsDataUrlAsync(filePath, extension, cancellationToken);

        return new StoredPhoto(filePath, filePreviewDataUrl, true);
    }

    private static byte[] ExtractBytesFromDataUrl(string dataUrl)
    {
        var base64Index = dataUrl.IndexOf(",", StringComparison.Ordinal);
        if (base64Index < 0)
        {
            throw new InvalidOperationException("Ungültiges Bildformat: Kein Base64-Inhalt gefunden.");
        }

        var base64 = dataUrl[(base64Index + 1)..];
        return Convert.FromBase64String(base64);
    }

    private static string GetExtensionFromDataUrl(string dataUrl)
    {
        const string prefix = "data:image/";
        var startIndex = dataUrl.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
        if (startIndex < 0)
        {
            return "png";
        }

        startIndex += prefix.Length;
        var endIndex = dataUrl.IndexOf(";", startIndex, StringComparison.Ordinal);
        if (endIndex < 0)
        {
            return "png";
        }

        return dataUrl[startIndex..endIndex].ToLowerInvariant() switch
        {
            "jpeg" or "jpg" => "jpg",
            "gif" => "gif",
            "webp" => "webp",
            _ => "png",
        };
    }

    private static string BuildPlatformPath(string extension)
    {
        var fileName = $"camera_arcanum_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}.{extension}";

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            var pictures = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
            return Path.Combine(string.IsNullOrWhiteSpace(pictures) ? Path.GetTempPath() : pictures, fileName);
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            var pictures = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
            return Path.Combine(string.IsNullOrWhiteSpace(pictures) ? "/tmp" : pictures, fileName);
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            var pictures = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var basePath = string.IsNullOrWhiteSpace(pictures)
                ? (string.IsNullOrWhiteSpace(home) ? "/tmp" : Path.Combine(home, "Pictures"))
                : pictures;
            return Path.Combine(basePath, fileName);
        }

        // Mobile platforms supported by .NET MAUI / WASM hybrid scenarios
        if (OperatingSystem.IsAndroid())
        {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), fileName);
        }

        if (OperatingSystem.IsIOS() || OperatingSystem.IsTvOS())
        {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), fileName);
        }

        return Path.Combine(Path.GetTempPath(), fileName);
    }

    private static async Task<string> ReadFileAsDataUrlAsync(
        string filePath,
        string extension,
        CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(filePath);
        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, cancellationToken);
        var base64 = Convert.ToBase64String(memoryStream.ToArray());
        return $"data:image/{extension};base64,{base64}";
    }

    public async ValueTask DisposeAsync()
    {
        if (_moduleTask.IsValueCreated)
        {
            var module = await _moduleTask.Value;
            await module.DisposeAsync();
        }
    }

    private sealed record BrowserStorageResult
    {
        [JsonPropertyName("path")]
        public string Path { get; init; } = string.Empty;

        [JsonPropertyName("previewDataUrl")]
        public string PreviewDataUrl { get; init; } = string.Empty;

        [JsonPropertyName("inMemoryFallback")]
        public bool? InMemoryFallback { get; init; }
    }
}

public sealed record StoredPhoto(string FilePath, string PreviewDataUrl, bool PersistedToFilesystem);
