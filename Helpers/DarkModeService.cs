using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Verwaltet den Darkmode-Zustand und speichert ihn im localStorage des Browsers.
/// </summary>
public class DarkModeService
{
    public DarkModeService(IJSRuntime javascriptLaufzeit)
    {
        _javascriptLaufzeit = javascriptLaufzeit;
    }

    /// <summary>
    ///     Wird ausgelöst, wenn sich der Darkmode-Zustand ändert.
    /// </summary>
    public event Action<bool>? DarkModeGeändert;

    /// <summary>
    ///     Gibt an, ob der Darkmode aktiv ist. Standard: true (Darkmode).
    /// </summary>
    public bool IstDarkMode { get; private set; } = true;

    /// <summary>
    ///     Setzt den Darkmode-Zustand und speichert ihn im localStorage.
    /// </summary>
    /// <param name="istDarkMode"> true für Darkmode, false für hellen Modus. </param>
    public async Task SetzeDarkModeAsync(bool istDarkMode)
    {
        IstDarkMode = istDarkMode;
        try
        {
            await _javascriptLaufzeit.InvokeVoidAsync("localStorage.setItem", SpeicherSchlüssel, istDarkMode.ToString().ToLowerInvariant());
        }
        catch
        {
            // Speichern fehlgeschlagen – Zustand bleibt nur im Speicher erhalten.
        }
        DarkModeGeändert?.Invoke(IstDarkMode);
    }

    /// <summary>
    ///     Lädt den gespeicherten Darkmode-Zustand aus dem localStorage. Wird beim Start der
    ///     Anwendung aufgerufen.
    /// </summary>
    public async Task StelleSicherInitialisiertAsync()
    {
        try
        {
            var gespeichert = await _javascriptLaufzeit.InvokeAsync<string?>("localStorage.getItem", SpeicherSchlüssel);
            if (gespeichert is not null)
            {
                IstDarkMode = bool.Parse(gespeichert);
            }
        }
        catch
        {
            // Wenn der Zugriff auf localStorage fehlschlägt, bleibt der Standardwert (true =
            // Darkmode) bestehen.
        }
    }

    private const string SpeicherSchlüssel = "nasreddin-darkmode";
    private readonly IJSRuntime _javascriptLaufzeit;
}
