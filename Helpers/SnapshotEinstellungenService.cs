using Microsoft.JSInterop;
using System.Text.Json;

namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Persistiert Snapshot-Einstellungen im localStorage.
/// </summary>
public class SnapshotEinstellungenService
{
    public SnapshotEinstellungenService(IJSRuntime javascriptLaufzeit)
    {
        _javascriptLaufzeit = javascriptLaufzeit;
    }

    /// <summary>
    ///     Das aktuell geladene Snapshot-Objekt (nie null, bei Erstnutzung greifen Defaults).
    /// </summary>
    public SnapshotEinstellungen AktuelleEinstellungen { get; private set; } = new();

    public async Task SpeichernAsync(SnapshotEinstellungen einstellungen)
    {
        ArgumentNullException.ThrowIfNull(einstellungen);
        AktuelleEinstellungen = einstellungen;

        try
        {
            var json = JsonSerializer.Serialize(einstellungen, _serializerOptions);
            await _javascriptLaufzeit.InvokeVoidAsync("localStorage.setItem", SpeicherSchluessel, json);
        }
        catch
        {
            // Persistenz ist Best-Effort
        }
    }

    public async Task StelleSicherInitialisiertAsync()
    {
        try
        {
            var gespeichert = await _javascriptLaufzeit.InvokeAsync<string?>("localStorage.getItem", SpeicherSchluessel);
            if (!string.IsNullOrWhiteSpace(gespeichert))
            {
                var geladen = JsonSerializer.Deserialize<SnapshotEinstellungen>(gespeichert, _serializerOptions);
                if (geladen is not null)
                {
                    AktuelleEinstellungen = geladen;
                }
            }
        }
        catch
        {
            // Fallback: Defaults bleiben bestehen
        }
    }

    private const string SpeicherSchluessel = "nasreddin-snapshot";
    private readonly IJSRuntime _javascriptLaufzeit;

    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
}
