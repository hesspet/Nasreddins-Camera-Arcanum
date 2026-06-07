# Trennung: Kanten

## Maskenweichzeichnung

Wendet einen **Gaussian Blur** auf die gesamte Trennungsmaske an. Je höher der Wert,
desto weicher die Übergänge.

- **0**: Harte Kanten – klare Trennlinie, kann künstlich wirken
- **3–8**: Natürlicher Übergang – die Person fügt sich weich in den neuen Hintergrund ein
- **10–20**: Sehr weiche Kanten – die Person "verschwimmt" mit dem Hintergrund

## Weiche Kante innen

Weichzeichnet nur die **Innenseite** der Maskenkante (Richtung Person). Dadurch wird die
Person am Rand transparent, ohne dass Hintergrund eindringt.

Gut geeignet, wenn Haare oder feine Details am Rand der Person erhalten bleiben sollen.

## Weiche Kante aussen

Weichzeichnet nur die **Aussenseite** der Maskenkante (Richtung Hintergrund). Dadurch wird
der Übergang zum Hintergrund weicher, ohne die Person selbst zu beeinflussen.

Gut geeignet, um harte Schnittkanten zum neuen Hintergrund zu vermeiden.

## Empfehlung

Beginne mit moderaten Werten (Maskenweichzeichnung 3, innen und aussen je 2–5)
und passe dann nach Sicht an. Für dramatische Effekte (Geister, Schatten) können
höhere Werte interessant sein.
