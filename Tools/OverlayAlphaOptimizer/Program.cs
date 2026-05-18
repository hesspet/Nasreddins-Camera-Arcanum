using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

const byte TransparentBrightnessThreshold = 8;
const byte SolidBrightnessThreshold = 96;
const int BlurRadius = 9;
const double BlurStrength = 1.08;

var repositoryRoot = FindRepositoryRoot(AppContext.BaseDirectory);
var defaultOverlayDirectory = Path.Combine(repositoryRoot, "wwwroot", "images", "merge", "zwischenbilder");
var overlayDirectory = args.Length > 0 ? Path.GetFullPath(args[0]) : defaultOverlayDirectory;

if (!Directory.Exists(overlayDirectory))
{
    Console.Error.WriteLine($"Overlay-Verzeichnis wurde nicht gefunden: {overlayDirectory}");
    return 1;
}

var overlayFiles = Directory
    .EnumerateFiles(overlayDirectory, "*.png", SearchOption.TopDirectoryOnly)
    .OrderBy(filePath => filePath, StringComparer.OrdinalIgnoreCase)
    .ToList();

if (overlayFiles.Count == 0)
{
    Console.Error.WriteLine($"Keine PNG-Dateien im Overlay-Verzeichnis gefunden: {overlayDirectory}");
    return 1;
}

foreach (var overlayFile in overlayFiles)
{
    var statistics = OptimizeOverlay(overlayFile);
    var status = statistics.WasSkipped ? "übersprungen" : "optimiert";
    Console.WriteLine(
        $"{Path.GetFileName(overlayFile)}: {status}, transparent {statistics.TransparentPixels:N0}, halbtransparent {statistics.SemiTransparentPixels:N0}, deckend {statistics.OpaquePixels:N0}");
}

return 0;

OverlayStatistics OptimizeOverlay(string overlayFile)
{
    using var image = Image.Load<Rgba32>(overlayFile);
    var pixelCount = image.Width * image.Height;

    if (HasUsefulTransparency(image))
    {
        return CountAlphaValues(image, wasSkipped: true);
    }

    var baseAlpha = new double[pixelCount];

    image.ProcessPixelRows(accessor =>
    {
        for (var row = 0; row < image.Height; row++)
        {
            var pixelRow = accessor.GetRowSpan(row);

            for (var column = 0; column < image.Width; column++)
            {
                var pixel = pixelRow[column];
                var brightness = Math.Max(pixel.R, Math.Max(pixel.G, pixel.B));
                var alphaFromBrightness = CalculateAlphaFromBrightness(brightness);
                baseAlpha[row * image.Width + column] = (pixel.A / 255.0) * alphaFromBrightness;
            }
        }
    });

    var blurredAlpha = BlurAlphaMask(baseAlpha, image.Width, image.Height, BlurRadius);
    var transparentPixels = 0L;
    var semiTransparentPixels = 0L;
    var opaquePixels = 0L;

    image.ProcessPixelRows(accessor =>
    {
        for (var row = 0; row < image.Height; row++)
        {
            var pixelRow = accessor.GetRowSpan(row);

            for (var column = 0; column < image.Width; column++)
            {
                var pixelIndex = row * image.Width + column;
                var finalAlpha = Math.Min(baseAlpha[pixelIndex], blurredAlpha[pixelIndex] * BlurStrength);
                var alphaByte = (byte)Math.Clamp(Math.Round(finalAlpha * 255), 0, 255);
                var pixel = pixelRow[column];

                if (alphaByte == 0)
                {
                    pixel.R = 0;
                    pixel.G = 0;
                    pixel.B = 0;
                    transparentPixels++;
                }
                else if (alphaByte < 255)
                {
                    semiTransparentPixels++;
                }
                else
                {
                    opaquePixels++;
                }

                pixel.A = alphaByte;
                pixelRow[column] = pixel;
            }
        }
    });

    image.SaveAsPng(overlayFile);
    return new OverlayStatistics(transparentPixels, semiTransparentPixels, opaquePixels, WasSkipped: false);
}

bool HasUsefulTransparency(Image<Rgba32> image)
{
    var transparentPixels = 0;
    var requiredTransparentPixels = Math.Max(1, (image.Width * image.Height) / 1_000);

    image.ProcessPixelRows(accessor =>
    {
        for (var row = 0; row < image.Height; row++)
        {
            var pixelRow = accessor.GetRowSpan(row);

            for (var column = 0; column < image.Width; column++)
            {
                if (pixelRow[column].A < 250)
                {
                    transparentPixels++;

                    if (transparentPixels >= requiredTransparentPixels)
                    {
                        return;
                    }
                }
            }
        }
    });

    return transparentPixels >= requiredTransparentPixels;
}

OverlayStatistics CountAlphaValues(Image<Rgba32> image, bool wasSkipped)
{
    var transparentPixels = 0L;
    var semiTransparentPixels = 0L;
    var opaquePixels = 0L;

    image.ProcessPixelRows(accessor =>
    {
        for (var row = 0; row < image.Height; row++)
        {
            var pixelRow = accessor.GetRowSpan(row);

            for (var column = 0; column < image.Width; column++)
            {
                var alpha = pixelRow[column].A;

                if (alpha == 0)
                {
                    transparentPixels++;
                }
                else if (alpha < 255)
                {
                    semiTransparentPixels++;
                }
                else
                {
                    opaquePixels++;
                }
            }
        }
    });

    return new OverlayStatistics(transparentPixels, semiTransparentPixels, opaquePixels, wasSkipped);
}

double CalculateAlphaFromBrightness(byte brightness)
{
    if (brightness <= TransparentBrightnessThreshold)
    {
        return 0;
    }

    if (brightness >= SolidBrightnessThreshold)
    {
        return 1;
    }

    var progress = (brightness - TransparentBrightnessThreshold) / (double)(SolidBrightnessThreshold - TransparentBrightnessThreshold);
    return progress * progress * (3 - 2 * progress);
}

double[] BlurAlphaMask(double[] sourceAlpha, int width, int height, int radius)
{
    if (radius <= 0)
    {
        return sourceAlpha.ToArray();
    }

    var horizontalAlpha = new double[sourceAlpha.Length];
    var blurredAlpha = new double[sourceAlpha.Length];

    for (var row = 0; row < height; row++)
    {
        var runningSum = 0.0;
        var sampleCount = 0;

        for (var column = -radius; column < width + radius; column++)
        {
            var enteringColumn = column + radius;
            if (enteringColumn < width)
            {
                runningSum += sourceAlpha[row * width + enteringColumn];
                sampleCount++;
            }

            var leavingColumn = column - radius - 1;
            if (leavingColumn >= 0)
            {
                runningSum -= sourceAlpha[row * width + leavingColumn];
                sampleCount--;
            }

            if (column >= 0 && column < width)
            {
                horizontalAlpha[row * width + column] = sampleCount == 0 ? 0 : runningSum / sampleCount;
            }
        }
    }

    for (var column = 0; column < width; column++)
    {
        var runningSum = 0.0;
        var sampleCount = 0;

        for (var row = -radius; row < height + radius; row++)
        {
            var enteringRow = row + radius;
            if (enteringRow < height)
            {
                runningSum += horizontalAlpha[enteringRow * width + column];
                sampleCount++;
            }

            var leavingRow = row - radius - 1;
            if (leavingRow >= 0)
            {
                runningSum -= horizontalAlpha[leavingRow * width + column];
                sampleCount--;
            }

            if (row >= 0 && row < height)
            {
                blurredAlpha[row * width + column] = sampleCount == 0 ? 0 : runningSum / sampleCount;
            }
        }
    }

    return blurredAlpha;
}

string FindRepositoryRoot(string startDirectory)
{
    var currentDirectory = new DirectoryInfo(startDirectory);

    while (currentDirectory is not null)
    {
        if (Directory.Exists(Path.Combine(currentDirectory.FullName, ".git")))
        {
            return currentDirectory.FullName;
        }

        currentDirectory = currentDirectory.Parent;
    }

    throw new InvalidOperationException("Repository-Wurzel konnte nicht gefunden werden.");
}

internal sealed record OverlayStatistics(long TransparentPixels, long SemiTransparentPixels, long OpaquePixels, bool WasSkipped);
