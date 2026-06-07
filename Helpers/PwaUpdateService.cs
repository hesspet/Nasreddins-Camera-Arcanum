using Microsoft.JSInterop;

namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Rückgabewert von getPlatformInfo() in pwaUpdate.js.
/// </summary>
public class PwaPlattformInfo
{
    public bool IsInstalledPwa
    {
        get; set;
    }

    public string Platform { get; set; } = "unknown";
}

/// <summary>
///     .NET-Interop-Dienst für den PWA-Update-Mechanismus. Importiert das JS-Modul <c>
///     wwwroot/js/pwaUpdate.js </c> und stellt die Update-Funktionen für Razor-Komponenten bereit.
/// </summary>
public sealed class PwaUpdateService : IAsyncDisposable
{
    public PwaUpdateService(IJSRuntime jsLaufzeit)
    {
        _modulAufgabe = new Lazy<Task<IJSObjectReference>>(() =>
            jsLaufzeit.InvokeAsync<IJSObjectReference>("import", "./js/pwaUpdate.js").AsTask());
    }

    public async ValueTask DisposeAsync()
    {
        if (_modulAufgabe.IsValueCreated)
        {
            var modul = await _modulAufgabe.Value;
            await modul.DisposeAsync();
        }
    }

    /// <summary>
    ///     Gibt Plattform-Informationen zurück (Betriebssystem, ob als installierte PWA).
    /// </summary>
    public async Task<PwaPlattformInfo> ErmittlePlattformInfoAsync()
    {
        var modul = await _modulAufgabe.Value;
        return await modul.InvokeAsync<PwaPlattformInfo>("getPlatformInfo");
    }

    /// <summary>
    ///     Prüft, ob die App im Standalone-Modus (als installierte PWA) läuft.
    /// </summary>
    public async Task<bool> IstPwaInstalliertAsync()
    {
        var modul = await _modulAufgabe.Value;
        return await modul.InvokeAsync<bool>("isPwaInstalled");
    }

    /// <summary>
    ///     Erzwingt ein PWA-Update: Prüft auf neue Service-Worker-Version, aktiviert den neuen
    ///     Worker sofort und lädt die Seite neu.
    /// </summary>
    public async Task<PwaUpdateErgebnis> UpdateErzwingenAsync()
    {
        var modul = await _modulAufgabe.Value;
        return await modul.InvokeAsync<PwaUpdateErgebnis>("forceUpdate");
    }

    private readonly Lazy<Task<IJSObjectReference>> _modulAufgabe;
}

/// <summary>
///     Rückgabewert von forceUpdate() in pwaUpdate.js.
/// </summary>
public class PwaUpdateErgebnis
{
    public string Message { get; set; } = string.Empty;

    public bool Reload
    {
        get; set;
    }

    public bool Success
    {
        get; set;
    }
}
