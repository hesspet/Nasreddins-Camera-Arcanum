namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Compile-time catalog of spinner images. Add new entries to <see cref="Images"/> to make them
///     available for random selection at runtime. Images are served from wwwroot/images/spinner/.
/// </summary>
public static class SpinnerImageCatalog
{
    public static readonly IReadOnlyList<string> Images = new[]
    {
        "images/spinner/spinner1.png",
        "images/spinner/spinner2.png",
        "images/spinner/spinner3.png",
        "images/spinner/spinner4.png",
    };
}
