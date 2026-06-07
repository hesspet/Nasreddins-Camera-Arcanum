namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Einfacher Frontmatter-Parser für Markdown-Dateien. Erkennt YAML-Frontmatter zwischen ---
///     Trennlinien am Dateianfang.
/// </summary>
public static class MarkdownFrontmatter
{
    /// <summary>
    ///     Parst den Frontmatter-Block aus einem Markdown-String. Erwartet das Format: ---
    ///     font: Schriftname --- # Überschrift
    /// </summary>
    public static Ergebnis Parsen(string rohText)
    {
        ArgumentNullException.ThrowIfNull(rohText);

        var zeilen = rohText.Split('\n');
        if (zeilen.Length < 3 || !zeilen[0].TrimEnd('\r').Equals("---"))
        {
            return new Ergebnis
            {
                Markdown = rohText,
                Schrift = null,
                HatFrontmatter = false
            };
        }

        // Zweite Trennlinie suchen
        var endeIndex = -1;
        for (var i = 1; i < zeilen.Length; i++)
        {
            if (zeilen[i].TrimEnd('\r').Equals("---"))
            {
                endeIndex = i;
                break;
            }
        }

        if (endeIndex == -1)
        {
            // Keine schliessende Trennlinie – kein gueltiges Frontmatter
            return new Ergebnis
            {
                Markdown = rohText,
                Schrift = null,
                HatFrontmatter = false
            };
        }

        // Frontmatter-Zeilen parsen
        string? schrift = null;
        string? schriftgroesse = null;
        for (var i = 1; i < endeIndex; i++)
        {
            var zeile = zeilen[i].TrimEnd('\r');
            var doppelpunkt = zeile.IndexOf(':');
            if (doppelpunkt <= 0)
                continue;

            var schluessel = zeile[..doppelpunkt].Trim();
            var wert = zeile[(doppelpunkt + 1)..].Trim();

            // Entferne optionale Anführungszeichen
            if (wert.Length >= 2 && (wert[0] == '\'' || wert[0] == '"') && wert[^1] == wert[0])
            {
                wert = wert[1..^1];
            }

            if (schluessel.Equals("font", StringComparison.OrdinalIgnoreCase))
            {
                schrift = wert;
            }
            else if (schluessel.Equals("font-size", StringComparison.OrdinalIgnoreCase))
            {
                schriftgroesse = wert;
            }
        }

        // Markdown-Text nach dem Frontmatter (leere Zeilen nach --- ueberspringen)
        var inhaltStart = endeIndex + 1;
        while (inhaltStart < zeilen.Length && string.IsNullOrWhiteSpace(zeilen[inhaltStart]))
        {
            inhaltStart++;
        }

        var markdown = inhaltStart < zeilen.Length
            ? string.Join("\n", zeilen[inhaltStart..])
            : string.Empty;

        return new Ergebnis
        {
            Markdown = markdown,
            Schrift = schrift,
            Schriftgroesse = schriftgroesse,
            HatFrontmatter = true
        };
    }

    /// <summary>
    ///     Ergebnis der Frontmatter-Analyse.
    /// </summary>
    public readonly struct Ergebnis
    {
        /// <summary>
        ///     Ob überhaupt ein Frontmatter-Block vorhanden war.
        /// </summary>
        public bool HatFrontmatter
        {
            get; init;
        }

        /// <summary>
        ///     Markdown-Inhalt ohne Frontmatter-Block.
        /// </summary>
        public string Markdown
        {
            get; init;
        }

        /// <summary>
        ///     Optionaler Schriftname aus dem font-Feld.
        /// </summary>
        public string? Schrift
        {
            get; init;
        }

        /// <summary>
        ///     Optionale Schriftgrösse aus dem font-size-Feld (z.B. "1.1rem", "18px").
        /// </summary>
        public string? Schriftgroesse
        {
            get; init;
        }
    }
}
