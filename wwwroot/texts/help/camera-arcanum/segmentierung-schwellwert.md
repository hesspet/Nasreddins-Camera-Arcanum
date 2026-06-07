# Trennung: Schwellwert

## Was der Schwellwert bewirkt

Der Schwellwert bestimmt, ab welcher **Sicherheit** ein Pixel als "Person" oder
"Hintergrund" klassifiziert wird.

- **Niedriger Wert** (0.05–0.30): Mehr Pixel werden zur Person gezählt. Die Maske wird
  **grosszügiger**. Gut, wenn Körperteile abgeschnitten werden.
- **Mittlerer Wert** (0.40–0.60): Ausgewogene Trennung. Der Standardwert.
- **Hoher Wert** (0.70–0.95): Nur sehr sichere Pixel zählen zur Person. Die Maske wird
  **strenger**. Gut, wenn ein Halo (heller Rand) um die Person sichtbar ist.

## Einstellung

Der Regler reicht von **0.05** bis **0.95** in Schritten von 0.05. Nach jeder Änderung
musst du auf **"Aktualisieren"** tippen, um die Trennung neu zu berechnen.

## Tipp

Starte mit den von der **Auto-Kalibrierung** vorgeschlagenen Werten und justiere dann
in kleinen Schritten nach.
