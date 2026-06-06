# Halo-Auto-Kalibrierung

## Was sie macht

Die Auto-Kalibrierung analysiert dein aktuelles Motiv und passt automatisch zwei Parameter an:

- **Schwellwert**: Bestimmt, wie strikt die Person vom Hintergrund getrennt wird
- **Kantenglättung**: Wie weich die Übergänge an den Rändern sind

## Wann du sie verwenden solltest

- Wenn die automatische Segmentierung einen sichtbaren **Halo** (hellen Hof) um die Person legt
- Wenn Körperteile **abgeschnitten** werden
- Wenn der Hintergrund durch die Person **durchscheint** (Randleck)

## So funktioniert's

1. Klicke auf **"Halo-Auto-Kalibrierung"**
2. Die App führt eine Test-Segmentierung mit verschiedenen Einstellungen durch
3. Die besten Werte werden übernommen und in die Segmentierungsparameter geschrieben
4. Die Segmentierung wird automatisch mit den neuen Werten wiederholt

Nach der Kalibrierung zeigt eine Info-Box die Messwerte an (Weichkantenanteil, Übergang,
Randleck). Du kannst die Werte anschliessend weiter manuell feinjustieren.
