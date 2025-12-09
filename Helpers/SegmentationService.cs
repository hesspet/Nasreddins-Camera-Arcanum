using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

public class SegmentationService : IAsyncDisposable
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _segmentationModule;

    public SegmentationService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<SegmentationResult> SegmentPhotoAsync(
        string photoDataUrl,
        SegmentationFocus? focus,
        SegmentationOptions options)
    {
        _segmentationModule ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "/js/bodySegmentation.js");
        return await _segmentationModule.InvokeAsync<SegmentationResult>(
            "segmentPhoto",
            photoDataUrl,
            focus,
            options);
    }

    public async Task<SegmentationAutoTuneResult> AutoCalibrateAsync(
        string photoDataUrl,
        SegmentationFocus? focus,
        SegmentationOptions options)
    {
        _segmentationModule ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "/js/bodySegmentation.js");
        return await _segmentationModule.InvokeAsync<SegmentationAutoTuneResult>(
            "autoCalibrateSegmentation",
            photoDataUrl,
            focus,
            options);
    }

    public async Task<ImageMetrics?> GetImageMetricsAsync(ElementReference photoRef)
    {
        _segmentationModule ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "/js/bodySegmentation.js");
        return await _segmentationModule.InvokeAsync<ImageMetrics>("getImageMetrics", photoRef);
    }

    public async Task ResetAsync()
    {
        if (_segmentationModule is not null)
        {
            await _segmentationModule.DisposeAsync();
            _segmentationModule = null;
        }
    }

    public async ValueTask DisposeAsync()
    {
        await ResetAsync();
    }
}

public sealed record SegmentationResult(string ForegroundDataUrl, string BackgroundDataUrl);

public sealed record SegmentationFocus(double X, double Y);

public sealed record ImageMetrics(double ClientWidth, double ClientHeight, double NaturalWidth, double NaturalHeight);

public sealed record SegmentationAutoTuneResult(SegmentationOptions TunedOptions, SegmentationAutoTuneStats Stats);

public sealed record SegmentationAutoTuneStats(
    double SoftEdgeRatio,
    double ForegroundRatio,
    double AvgEdgeTransition,
    double BorderLeakRatio);
