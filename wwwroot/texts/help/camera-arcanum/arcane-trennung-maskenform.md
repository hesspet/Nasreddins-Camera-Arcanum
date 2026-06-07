# Arcane Trennung: Maskenform

## Dilatation

Vergrössert die Maske. Jeder Pixel am Rand der Person wird um die angegebene Anzahl Pixel
nach aussen erweitert.

- **0**: Keine Erweiterung
- **1–3**: Leichte Erweiterung – schliesst kleine Lücken
- **4–10**: Starke Erweiterung – kann die Person unnatürlich aufblähen

Verwende Dilatation, wenn die Trennung Körperteile **abschneidet** oder Löcher in der
Maske auftreten.

## Erosion

Verkleinert die Maske. Jeder Pixel am Rand der Person wird um die angegebene Anzahl Pixel
nach innen zurückgenommen.

- **0**: Keine Verkleinerung
- **1–3**: Leichte Verkleinerung – entfernt dünne Ausläufer
- **4–10**: Starke Verkleinerung – kann Körperteile entfernen

Verwende Erosion, wenn ein **Halo** (heller Rand) um die Person sichtbar ist oder
Hintergrundreste an den Rändern kleben.

## Zusammenspiel

Dilatation und Erosion kannst du kombinieren. Eine typische Reihenfolge: Erst dilatieren,
um Lücken zu schliessen, dann erodieren, um den ursprünglichen Umriss wiederherzustellen –
aber ohne die Lücken ("Closing"-Operation).
