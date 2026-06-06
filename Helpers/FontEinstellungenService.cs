using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
/// Verwaltet die globale Schriftarten-Auswahl und speichert sie im localStorage.
/// </summary>
public class FontEinstellungenService
{
    private readonly IJSRuntime _javascriptLaufzeit;
    private const string SpeicherSchluessel = "nasreddin-schriftart";

    /// <summary>CSS-font-family-Wert der aktuell gewählten Schrift.</summary>
    public string GewaehlteSchriftCss { get; private set; } = string.Empty;

    /// <summary>Anzeigename der aktuell gewählten Schrift.</summary>
    public string GewaehlteSchriftName { get; private set; } = "App-Standard";

    /// <summary>Wird ausgelöst, wenn sich die Schriftauswahl ändert.</summary>
    public event Action? SchriftGeaendert;

    public FontEinstellungenService(IJSRuntime javascriptLaufzeit)
    {
        _javascriptLaufzeit = javascriptLaufzeit;
    }

    /// <summary>
    /// Lädt die gespeicherte Schriftart aus dem localStorage.
    /// </summary>
    public async Task StelleSicherInitialisiertAsync()
    {
        try
        {
            var gespeichert = await _javascriptLaufzeit.InvokeAsync<string?>("localStorage.getItem", SpeicherSchluessel);
            if (!string.IsNullOrWhiteSpace(gespeichert))
            {
                var eintrag = VerfuegbareSchriften.Alle.FirstOrDefault(
                    f => f.CssWert.Equals(gespeichert, StringComparison.Ordinal));
                if (eintrag.AnzeigeName != null)
                {
                    GewaehlteSchriftCss = eintrag.CssWert;
                    GewaehlteSchriftName = eintrag.AnzeigeName;
                }
            }
        }
        catch
        {
            // Fallback: App-Standard
        }
    }

    /// <summary>
    /// Setzt die Schriftart und speichert sie.
    /// </summary>
    /// <param name="cssWert">Der CSS-font-family-Wert (z.B. "'Medieval Scribish', serif").</param>
    /// <param name="anzeigeName">Der Anzeigename für die UI.</param>
    public async Task SetzeSchriftAsync(string cssWert, string anzeigeName)
    {
        GewaehlteSchriftCss = cssWert;
        GewaehlteSchriftName = anzeigeName;

        try
        {
            await _javascriptLaufzeit.InvokeVoidAsync("localStorage.setItem", SpeicherSchluessel, cssWert);
        }
        catch
        {
            // Speichern fehlgeschlagen
        }

        SchriftGeaendert?.Invoke();
    }
}

/// <summary>
/// Statische Liste aller verfügbaren Schriften.
/// </summary>
public static class VerfuegbareSchriften
{
    public readonly struct SchriftEintrag
    {
        public string AnzeigeName { get; init; }
        public string CssWert { get; init; }
        public string Gruppe { get; init; }
    }

    public static readonly SchriftEintrag AppStandard = new()
    {
        AnzeigeName = "App-Standard",
        CssWert = string.Empty,
        Gruppe = string.Empty
    };

    public static readonly IReadOnlyList<SchriftEintrag> FantasySchriften = new List<SchriftEintrag>
    {
        new() { AnzeigeName = "Berry Rotunda",               CssWert = "'Berry Rotunda', serif",               Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Bodywork",                    CssWert = "'Bodywork', serif",                    Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Books Vhasenti",              CssWert = "'Books Vhasenti', serif",              Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Celtic Garamond 2nd",         CssWert = "'Celtic Garamond 2nd', serif",         Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Elementary Gothic Bookhand",  CssWert = "'Elementary Gothic Bookhand', serif",  Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Medieval Scribish",           CssWert = "'Medieval Scribish', serif",           Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Perry Gothic",                CssWert = "'Perry Gothic', serif",                Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Rotunda Pommerania",          CssWert = "'Rotunda Pommerania', serif",          Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Seven Swordsmen BB",          CssWert = "'Seven Swordsmen BB', serif",          Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Uberholme",                   CssWert = "'Uberholme', serif",                   Gruppe = "Mittelalter / Fantasy" },
        new() { AnzeigeName = "Uberholme Alt",               CssWert = "'Uberholme Alt', serif",               Gruppe = "Mittelalter / Fantasy" },
    };

    public static readonly IReadOnlyList<SchriftEintrag> WebStandardSchriften = new List<SchriftEintrag>
    {
        new() { AnzeigeName = "Arial",                       CssWert = "Arial, sans-serif",                    Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Helvetica Neue",              CssWert = "'Helvetica Neue', Helvetica, Arial, sans-serif", Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Georgia",                     CssWert = "Georgia, serif",                       Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Times New Roman",             CssWert = "'Times New Roman', Times, serif",     Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Verdana",                     CssWert = "Verdana, sans-serif",                  Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Tahoma",                      CssWert = "Tahoma, sans-serif",                   Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Trebuchet MS",                CssWert = "'Trebuchet MS', sans-serif",           Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Courier New",                 CssWert = "'Courier New', monospace",             Gruppe = "Web-Standard" },
        new() { AnzeigeName = "Impact",                      CssWert = "Impact, sans-serif",                   Gruppe = "Web-Standard" },
    };

    public static readonly IReadOnlyList<SchriftEintrag> GenerischeSchriften = new List<SchriftEintrag>
    {
        new() { AnzeigeName = "Sans-Serif (System)",         CssWert = "sans-serif",                           Gruppe = "Generisch" },
        new() { AnzeigeName = "Serif (System)",              CssWert = "serif",                                Gruppe = "Generisch" },
        new() { AnzeigeName = "Monospace (System)",          CssWert = "monospace",                            Gruppe = "Generisch" },
    };

    public static readonly IReadOnlyList<SchriftEintrag> Alle = new List<SchriftEintrag> { AppStandard }
        .Concat(FantasySchriften)
        .Concat(WebStandardSchriften)
        .Concat(GenerischeSchriften)
        .ToList()
        .AsReadOnly();
}
