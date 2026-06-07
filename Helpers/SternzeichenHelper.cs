namespace Nasreddins_Camera_Arcanum.Helpers;

/// <summary>
///     Ermittelt das Sternzeichen für ein Datum und mappt es auf die Buchstaben A–L des KR-Astro-3-Fonts.
/// </summary>
public static class SternzeichenHelper
{
    /// <summary>
    ///     Gibt den Buchstaben (A–L) für das Sternzeichen des heutigen Datums zurück.
    /// </summary>
    public static char HeutigesSternzeichenBuchstabe()
    {
        return SternzeichenBuchstabe(DateTime.Now);
    }

    /// <summary>
    ///     Gibt das Sternzeichen für das heutige Datum als vollen Namen zurück.
    /// </summary>
    public static string HeutigesSternzeichenName()
    {
        return SternzeichenName(DateTime.Now);
    }

    /// <summary>
    ///     Gibt den Buchstaben (A–L) für das Sternzeichen eines Datums zurück.
    /// </summary>
    public static char SternzeichenBuchstabe(DateTime datum)
    {
        foreach (var (_, buchstabe, startMonat, startTag, endeMonat, endeTag) in Sternzeichen)
        {
            if (IstImBereich(datum, startMonat, startTag, endeMonat, endeTag))
            {
                return buchstabe;
            }
        }

        return 'A'; // Fallback
    }

    /// <summary>
    ///     Gibt das Sternzeichen für ein Datum als vollen Namen zurück.
    /// </summary>
    public static string SternzeichenName(DateTime datum)
    {
        foreach (var (name, _, startMonat, startTag, endeMonat, endeTag) in Sternzeichen)
        {
            if (IstImBereich(datum, startMonat, startTag, endeMonat, endeTag))
            {
                return name;
            }
        }

        return "Widder"; // Fallback
    }

    private static readonly (string Name, char Buchstabe, int StartMonat, int StartTag, int EndeMonat, int EndeTag)[] Sternzeichen =
                    [
        ("Widder",       'A',  3, 21,  4, 19),
        ("Stier",        'B',  4, 20,  5, 20),
        ("Zwillinge",    'C',  5, 21,  6, 20),
        ("Krebs",        'D',  6, 21,  7, 22),
        ("Löwe",         'E',  7, 23,  8, 22),
        ("Jungfrau",     'F',  8, 23,  9, 22),
        ("Waage",        'G',  9, 23, 10, 22),
        ("Skorpion",     'H', 10, 23, 11, 21),
        ("Schütze",      'I', 11, 22, 12, 21),
        ("Steinbock",    'J', 12, 22,  1, 19),
        ("Wassermann",   'K',  1, 20,  2, 18),
        ("Fische",       'L',  2, 19,  3, 20),
    ];

    private static bool IstImBereich(DateTime datum, int startMonat, int startTag, int endeMonat, int endeTag)
    {
        var monat = datum.Month;
        var tag = datum.Day;

        if (startMonat <= endeMonat)
        {
            // Normaler Bereich (z.B. März–April)
            if (monat < startMonat || monat > endeMonat)
                return false;
            if (monat == startMonat && tag < startTag)
                return false;
            if (monat == endeMonat && tag > endeTag)
                return false;
            return true;
        }
        else
        {
            // Jahresübergreifend (z.B. Dezember–Januar, Steinbock)
            if (monat == startMonat && tag >= startTag)
                return true;
            if (monat == endeMonat && tag <= endeTag)
                return true;
            return false;
        }
    }
}
