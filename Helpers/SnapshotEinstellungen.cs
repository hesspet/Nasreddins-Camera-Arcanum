namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Snapshot aller Einstellungen, die zur Bilderzeugung geführt haben. Wird für den
///     Kamera-Pur-Modus als Voreinstellung genutzt.
/// </summary>
public sealed class SnapshotEinstellungen
{
    public string BackendPreference { get; set; } = "auto";

    public int DilationRadius { get; set; } = 0;

    public bool EnableEdgeRefinement { get; set; } = true;

    public bool EnableSharpening { get; set; } = true;

    public int ErosionRadius { get; set; } = 0;

    public int InnerFeatherRadius { get; set; } = 3;

    public int MaskBlurAmount { get; set; } = 5;

    public int OuterFeatherRadius { get; set; } = 6;

    public int OverlayOpacityPercent { get; set; } = 100;

    // Overlay
    public string? OverlayPath
    {
        get; set;
    }

    // Quality / Performance
    public string Quality { get; set; } = "auto";

    // Segmentation
    public double SegmentationThreshold { get; set; } = 0.6;

    public bool TemporalSmoothing { get; set; } = true;
    public double TemporalSmoothingAlpha { get; set; } = 0.7;
    public bool UseOriginalBackground { get; set; } = true;
}
