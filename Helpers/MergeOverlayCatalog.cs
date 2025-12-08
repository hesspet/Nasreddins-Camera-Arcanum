using System.Collections.Generic;

namespace Nasreddins_Camera_Arcanum.Helpers;

public static class MergeOverlayCatalog
{
    public static IReadOnlyList<MergeOverlay> Overlays { get; } = new List<MergeOverlay>
    {
        new("/images/merge/haunted/Ghost_1.png", "Geist 1"),
        new("/images/merge/haunted/Ghost_2.png", "Geist 2"),
        new("/images/merge/haunted/Skelett_1.png", "Skelett 1"),
        new("/images/merge/haunted/Skelett_2.png", "Skelett 2"),
        new("/images/merge/haunted/Skelett_3.png", "Skelett 3"),
        new("/images/merge/haunted/Skull_1.png", "Schädel 1"),
        new("/images/merge/haunted/Skull_2.png", "Schädel 2"),
        new("/images/merge/heaven/Wing_1.png", "Flügel 1"),
        new("/images/merge/heaven/Wing_2.png", "Flügel 2"),
        new("/images/merge/heaven/Wing_3.png", "Flügel 3"),
        new("/images/merge/heaven/Wing_4.png", "Flügel 4"),
    };
}

public sealed record MergeOverlay(string Path, string Title);
