using System.Diagnostics;
using System.Net.Http;
using System.Collections.Generic;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Advanced;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Nasreddins_Camera_Arcanum.Helpers;

public sealed class ImageMergeService
{
    public ImageMergeService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<MergeResult> MergeAsync(
        string backgroundDataUrl,
        string overlayPath,
        string foregroundDataUrl,
        PointF? focusPoint,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var timings = new List<MergeStepTiming>();
        var lastElapsed = 0L;

        static void TrackStep(List<MergeStepTiming> collector, ref long lastCheckpoint, Stopwatch timer, string label)
        {
            var current = timer.ElapsedMilliseconds;
            collector.Add(new MergeStepTiming(label, current - lastCheckpoint, current));
            lastCheckpoint = current;
        }

        var backgroundBytes = ExtractBytesFromDataUrl(backgroundDataUrl);
        var foregroundBytes = ExtractBytesFromDataUrl(foregroundDataUrl);
        TrackStep(timings, ref lastElapsed, stopwatch, "Eingaben decodiert");

        var overlayBytes = await _httpClient.GetByteArrayAsync(overlayPath, cancellationToken);
        TrackStep(timings, ref lastElapsed, stopwatch, "Overlay geladen (HTTP)");

        using var background = Image.Load<Rgba32>(backgroundBytes);
        using var foreground = Image.Load<Rgba32>(foregroundBytes);
        using var overlay = Image.Load<Rgba32>(overlayBytes);
        TrackStep(timings, ref lastElapsed, stopwatch, "PNG dekodiert");

        var targetSize = new Size(background.Width, background.Height);
        var overlayTargetSize = new Size(
            Math.Min(targetSize.Width, overlay.Width),
            Math.Min(targetSize.Height, overlay.Height));

        overlay.Mutate(ctx =>
            ctx.Resize(new ResizeOptions
            {
                Size = overlayTargetSize,
                Mode = ResizeMode.Pad,
                // NearestNeighbor keeps resizing fast while avoiding blurry overlays.
                Sampler = KnownResamplers.NearestNeighbor,
                PadColor = SixLabors.ImageSharp.Color.Transparent
            }));
        TrackStep(timings, ref lastElapsed, stopwatch, "Overlay skaliert");

        var placement = CalculatePlacement(focusPoint, targetSize, overlay.Size);

        background.Mutate(ctx =>
        {
            // ImageSharp's DrawImage pipeline is highly optimized and substantially faster than manual per-pixel blending
            // on WebAssembly. Using it for both overlays reduces merge time dramatically.
            ctx.DrawImage(overlay, placement, 1f);
            ctx.DrawImage(foreground, Point.Empty, 1f);
        });
        TrackStep(timings, ref lastElapsed, stopwatch, "Komposition abgeschlossen");

        using var output = new MemoryStream();
        var fastPngEncoder = new PngEncoder
        {
            CompressionLevel = PngCompressionLevel.NoCompression,
            FilterMethod = PngFilterMethod.None
        };

        background.Save(output, fastPngEncoder);
        var base64 = Convert.ToBase64String(output.ToArray());
        TrackStep(timings, ref lastElapsed, stopwatch, "PNG kodiert");

        return new MergeResult(
            $"data:image/png;base64,{base64}",
            timings,
            stopwatch.ElapsedMilliseconds,
            "ImageSharp.DrawImage");
    }

    private readonly HttpClient _httpClient;

    private static Point CalculatePlacement(PointF? focusPoint, Size targetSize, Size overlaySize)
    {
        var defaultPoint = new PointF(targetSize.Width / 2f, targetSize.Height / 2f);
        var anchor = focusPoint ?? defaultPoint;

        var x = (int)Math.Round(anchor.X - overlaySize.Width / 2f);
        var y = (int)Math.Round(anchor.Y - overlaySize.Height / 2f);

        var maxX = targetSize.Width - overlaySize.Width;
        var maxY = targetSize.Height - overlaySize.Height;

        x = Math.Clamp(x, 0, Math.Max(0, maxX));
        y = Math.Clamp(y, 0, Math.Max(0, maxY));

        return new Point(x, y);
    }

    private static byte[] ExtractBytesFromDataUrl(string dataUrl)
    {
        var base64Index = dataUrl.IndexOf(',', StringComparison.Ordinal);
        if (base64Index < 0)
        {
            throw new InvalidOperationException("Ungültiges Bildformat: Kein Base64-Inhalt gefunden.");
        }

        var base64 = dataUrl[(base64Index + 1)..];
        return Convert.FromBase64String(base64);
    }
}

public sealed record MergeResult(
    string DataUrl,
    IReadOnlyList<MergeStepTiming> Timings,
    long TotalDurationMs,
    string Pipeline);

public sealed record MergeStepTiming(string Step, long DurationMs, long ElapsedMs);
