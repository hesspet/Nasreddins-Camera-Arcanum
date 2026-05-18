using System.Text.Json.Serialization;

namespace Nasreddins_Camera_Arcanum.Helpers;

public sealed class MergeOverlay
{
    public MergeOverlay()
    {
    }

    public MergeOverlay(string path, string title)
    {
        Path = path;
        Title = title;
    }

    [JsonPropertyName("path")]
    public string Path { get; init; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;
}
