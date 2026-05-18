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
        int overlayOpacityPercent,
        CancellationToken cancellationToken = default)
    {
        var module = await _moduleTask.Value;
        var result = await module.InvokeAsync<JsMergeResult>(
            "mergeWithCanvas",
            cancellationToken,
            backgroundDataUrl,
            overlayPath,
            foregroundDataUrl,
            focusPoint,
            overlayOpacityPercent);

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

    private sealed class JsMergeResult
    {
        public JsMergeResult(string dataUrl, IReadOnlyList<JsMergeTiming> timings, double totalDurationMs)
        {
            DataUrl = dataUrl;
            Timings = timings;
            TotalDurationMs = totalDurationMs;
        }

        public string DataUrl { get; }

        public IReadOnlyList<JsMergeTiming> Timings { get; }

        public double TotalDurationMs { get; }
    }

    private sealed class JsMergeTiming
    {
        public JsMergeTiming(string step, double durationMs, double elapsedMs)
        {
            Step = step;
            DurationMs = durationMs;
            ElapsedMs = elapsedMs;
        }

        public string Step { get; }

        public double DurationMs { get; }

        public double ElapsedMs { get; }
    }
}

public sealed class MergeResult
{
    public MergeResult(string dataUrl, IReadOnlyList<MergeStepTiming> timings, long totalDurationMs, string pipeline)
    {
        DataUrl = dataUrl;
        Timings = timings;
        TotalDurationMs = totalDurationMs;
        Pipeline = pipeline;
    }

    public string DataUrl { get; }

    public IReadOnlyList<MergeStepTiming> Timings { get; }

    public long TotalDurationMs { get; }

    public string Pipeline { get; }
}

public sealed class MergeStepTiming
{
    public MergeStepTiming(string step, long durationMs, long elapsedMs)
    {
        Step = step;
        DurationMs = durationMs;
        ElapsedMs = elapsedMs;
    }

    public string Step { get; }

    public long DurationMs { get; }

    public long ElapsedMs { get; }
}
