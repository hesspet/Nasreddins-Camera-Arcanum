using System.Net.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Advanced;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Nasreddins_Camera_Arcanum.Helpers;

public sealed class ImageMergeService
{
    private readonly HttpClient _httpClient;

    public ImageMergeService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> MergeAsync(
        string backgroundDataUrl,
        string overlayPath,
        string foregroundDataUrl,
        PointF? focusPoint,
        CancellationToken cancellationToken = default)
    {
        var backgroundBytes = ExtractBytesFromDataUrl(backgroundDataUrl);
        var foregroundBytes = ExtractBytesFromDataUrl(foregroundDataUrl);
        var overlayBytes = await _httpClient.GetByteArrayAsync(overlayPath, cancellationToken);

        using var background = Image.Load<Rgba32>(backgroundBytes);
        using var foreground = Image.Load<Rgba32>(foregroundBytes);
        using var overlay = Image.Load<Rgba32>(overlayBytes);

        var targetSize = new Size(background.Width, background.Height);
        var overlayTargetSize = new Size(
            Math.Min(targetSize.Width, overlay.Width),
            Math.Min(targetSize.Height, overlay.Height));

        overlay.Mutate(ctx =>
            ctx.Resize(new ResizeOptions
            {
                Size = overlayTargetSize,
                Mode = ResizeMode.Pad,
                Sampler = KnownResamplers.Triangle,
                PadColor = Color.Transparent
            }));

        var placement = CalculatePlacement(focusPoint, targetSize, overlay.Size);

        BlendImageOntoBackground(background, overlay, placement);
        BlendImageOntoBackground(background, foreground, Point.Empty);

        using var output = new MemoryStream();
        background.Save(output, new PngEncoder());
        var base64 = Convert.ToBase64String(output.ToArray());
        return $"data:image/png;base64,{base64}";
    }

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

    private static void BlendImageOntoBackground(Image<Rgba32> background, Image<Rgba32> overlay, Point placement)
    {
        var destinationBounds = new Rectangle(Point.Empty, new Size(background.Width, background.Height));
        var overlayBounds = new Rectangle(placement, overlay.Size);
        var targetBounds = Rectangle.Intersect(destinationBounds, overlayBounds);

        if (targetBounds.Width == 0 || targetBounds.Height == 0)
        {
            return;
        }

        var overlayOffset = new Point(targetBounds.X - placement.X, targetBounds.Y - placement.Y);

        var backgroundFrame = background.Frames.RootFrame;
        var overlayFrame = overlay.Frames.RootFrame;

        for (var y = 0; y < targetBounds.Height; y++)
        {
            var backgroundRow = backgroundFrame.GetPixelRowSpan(targetBounds.Y + y);
            var overlayRow = overlayFrame.GetPixelRowSpan(overlayOffset.Y + y);

            for (var x = 0; x < targetBounds.Width; x++)
            {
                ref var destinationPixel = ref backgroundRow[targetBounds.X + x];
                var sourcePixel = overlayRow[overlayOffset.X + x];

                if (sourcePixel.A == 0)
                {
                    continue;
                }

                if (sourcePixel.A == byte.MaxValue)
                {
                    destinationPixel = sourcePixel;
                    continue;
                }

                var sourceAlpha = sourcePixel.A / 255f;
                var destinationAlpha = destinationPixel.A / 255f;
                var outputAlpha = sourceAlpha + destinationAlpha * (1f - sourceAlpha);

                destinationPixel.R = (byte)Math.Round((sourcePixel.R * sourceAlpha + destinationPixel.R * destinationAlpha * (1f - sourceAlpha)) / outputAlpha);
                destinationPixel.G = (byte)Math.Round((sourcePixel.G * sourceAlpha + destinationPixel.G * destinationAlpha * (1f - sourceAlpha)) / outputAlpha);
                destinationPixel.B = (byte)Math.Round((sourcePixel.B * sourceAlpha + destinationPixel.B * destinationAlpha * (1f - sourceAlpha)) / outputAlpha);
                destinationPixel.A = (byte)Math.Round(outputAlpha * 255f);
            }
        }
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
