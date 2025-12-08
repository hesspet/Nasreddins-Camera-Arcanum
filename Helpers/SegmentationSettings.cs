namespace Nasreddins_Camera_Arcanum.Helpers;

public class SegmentationSettings
{
    public SegmentationOptions Options { get; private set; } = new();

    public event Action? OnChange;

    public void Update(SegmentationOptions newOptions)
    {
        ArgumentNullException.ThrowIfNull(newOptions);

        Options = new SegmentationOptions
        {
            ModelType = string.IsNullOrWhiteSpace(newOptions.ModelType)
                ? "general"
                : newOptions.ModelType,
            SegmentationThreshold = Math.Clamp(newOptions.SegmentationThreshold, 0.01, 0.99),
            MaskBlurAmount = Math.Max(0, newOptions.MaskBlurAmount),
        };

        OnChange?.Invoke();
    }
}

public sealed class SegmentationOptions
{
    public string ModelType { get; set; } = "general";

    public double SegmentationThreshold { get; set; } = 0.6;

    public int MaskBlurAmount { get; set; } = 5;
}
