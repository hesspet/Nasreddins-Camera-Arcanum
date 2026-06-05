using System.Collections.Generic;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

public class SegmentationService : IAsyncDisposable
{
    private const string SegmentationModulePath = "js/bodySegmentation.js";

    private readonly IJSRuntime _jsRuntime;
    private readonly NavigationManager _navigationManager;
    private IJSObjectReference? _segmentationModule;

    public SegmentationService(IJSRuntime jsRuntime, NavigationManager navigationManager)
    {
        _jsRuntime = jsRuntime;
        _navigationManager = navigationManager;
    }

    public async Task<SegmentationResult> SegmentPhotoAsync(
        string photoDataUrl,
        SegmentationFocus? focus,
        SegmentationOptions options)
    {
        _segmentationModule ??= await ImportSegmentationModuleAsync();
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
        _segmentationModule ??= await ImportSegmentationModuleAsync();
        return await _segmentationModule.InvokeAsync<SegmentationAutoTuneResult>(
            "autoCalibrateSegmentation",
            photoDataUrl,
            focus,
            options);
    }

    public async Task<ImageMetrics?> GetImageMetricsAsync(ElementReference photoRef)
    {
        _segmentationModule ??= await ImportSegmentationModuleAsync();
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

    public async Task<SegmentationPerformance?> GetPerformanceSnapshotAsync()
    {
        _segmentationModule ??= await ImportSegmentationModuleAsync();
        return await _segmentationModule.InvokeAsync<SegmentationPerformance?>("getPerformanceSnapshot");
    }

    private async Task<IJSObjectReference> ImportSegmentationModuleAsync()
    {
        return await _jsRuntime.InvokeAsync<IJSObjectReference>("import", BuildSegmentationModuleUri());
    }

    private string BuildSegmentationModuleUri()
    {
        var baseUri = new Uri(_navigationManager.BaseUri);
        if (baseUri.AbsolutePath != "/")
        {
            return new Uri(baseUri, SegmentationModulePath).ToString();
        }

        var currentUri = new Uri(_navigationManager.Uri);
        if (currentUri.Host.EndsWith(".github.io", StringComparison.OrdinalIgnoreCase))
        {
            var pathSegments = currentUri.AbsolutePath
                .Split('/', StringSplitOptions.RemoveEmptyEntries);

            if (pathSegments.Length > 0)
            {
                var repositoryBaseUri = new Uri($"{currentUri.Scheme}://{currentUri.Authority}/{pathSegments[0]}/");
                return new Uri(repositoryBaseUri, SegmentationModulePath).ToString();
            }
        }

        return new Uri(baseUri, SegmentationModulePath).ToString();
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

public sealed record SegmentationPerformance(
    string? Backend,
    string? Quality,
    string? Resolution,
    double Total,
    Dictionary<string, double>? Steps,
    double? Width,
    double? Height,
    string? DynamicQuality,
    IReadOnlyList<double>? History);
