using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.JSInterop;
using SixLabors.ImageSharp;

namespace Nasreddins_Camera_Arcanum.Helpers;

public sealed class ImageMergeService : IAsyncDisposable
{
    public ImageMergeService(IJSRuntime jsRuntime)
    {
        _moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/imageMerge.js").AsTask());
    }

    public async Task<MergeResult> MergeAsync(
        string backgroundDataUrl,
        string overlayPath,
        string foregroundDataUrl,
        PointF? focusPoint,
        CancellationToken cancellationToken = default)
    {
        var module = await _moduleTask.Value;
        var result = await module.InvokeAsync<JsMergeResult>(
            "mergeWithCanvas",
            cancellationToken,
            backgroundDataUrl,
            overlayPath,
            foregroundDataUrl,
            focusPoint);

        var timings = result.Timings
            .Select(t => new MergeStepTiming(t.Step, (long)Math.Round(t.DurationMs), (long)Math.Round(t.ElapsedMs)))
            .ToList();

        return new MergeResult(
            result.DataUrl,
            timings,
            (long)Math.Round(result.TotalDurationMs),
            "Canvas2D");
    }

    public async ValueTask DisposeAsync()
    {
        if (_moduleTask.IsValueCreated)
        {
            var module = await _moduleTask.Value;
            await module.DisposeAsync();
        }
    }

    private readonly Lazy<Task<IJSObjectReference>> _moduleTask;

    private sealed record JsMergeResult(string DataUrl, IReadOnlyList<JsMergeTiming> Timings, double TotalDurationMs);

    private sealed record JsMergeTiming(string Step, double DurationMs, double ElapsedMs);
}

public sealed record MergeResult(
    string DataUrl,
    IReadOnlyList<MergeStepTiming> Timings,
    long TotalDurationMs,
    string Pipeline);

public sealed record MergeStepTiming(string Step, long DurationMs, long ElapsedMs);
