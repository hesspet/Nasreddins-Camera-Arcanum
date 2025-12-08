using System.Text.Json;
using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

public class SegmentationSettings
{
    private const string StorageKey = "camera_arcanum_segmentation_options";
    private readonly IJSRuntime _jsRuntime;
    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private bool _initialized;

    public SegmentationSettings(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public SegmentationOptions Options { get; private set; } = new();

    public event Action? OnChange;

    public async Task EnsureInitializedAsync()
    {
        if (_initialized)
        {
            return;
        }

        _initialized = true;

        try
        {
            var raw = await _jsRuntime.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                var storedOptions = JsonSerializer.Deserialize<SegmentationOptions>(raw, _serializerOptions);
                if (storedOptions is not null)
                {
                    Options = Normalize(storedOptions);
                }
            }
        }
        catch
        {
            // Wenn der Zugriff auf localStorage fehlschlägt, bleiben die Default-Werte bestehen.
        }
    }

    public async Task UpdateAsync(SegmentationOptions newOptions)
    {
        ArgumentNullException.ThrowIfNull(newOptions);

        Options = Normalize(newOptions);

        try
        {
            var payload = JsonSerializer.Serialize(Options, _serializerOptions);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", StorageKey, payload);
        }
        catch
        {
            // Persistenzfehler dürfen die Laufzeit nicht blockieren.
        }

        OnChange?.Invoke();
    }

    private static SegmentationOptions Normalize(SegmentationOptions source)
    {
        return new SegmentationOptions
        {
            ModelType = string.IsNullOrWhiteSpace(source.ModelType)
                ? "general"
                : source.ModelType,
            SegmentationThreshold = Math.Clamp(source.SegmentationThreshold, 0.01, 0.99),
            MaskBlurAmount = Math.Max(0, source.MaskBlurAmount),
        };
    }
}

public sealed class SegmentationOptions
{
    public string ModelType { get; set; } = "general";

    public double SegmentationThreshold { get; set; } = 0.6;

    public int MaskBlurAmount { get; set; } = 5;
}
