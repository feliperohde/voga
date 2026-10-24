# Design: Voga site

The design system of the Voga site. It follows the structure of the PAIDEICA site (`../website/design.md`: tokens, a floating pill nav, left-aligned section heads, text against proof, light and dark) with Voga's own colors and type. The tokens live in `site/styles.css`; this file names them and says how to use them.

## Genre

Civic record. Voga sets promises against votes, bills and spending, so the page reads like a well-set newspaper page about public records: serif headlines, plain sans text, data in mono, warm paper in light, the app's deep teal in dark.

## Color

From the app's mark (`voga-mark.svg`): the deep teal of its tile (`#13343b`), the cream of the V (`#f3ead8`) and the amber of its bottom node (`#e9a23b`).

- Light (the default when the system states none): warm paper `--page`, teal ink `--text`, a teal primary button with cream text, teal links.
- Dark: deep teal `--page`, the mark's teal as `--surface`, cream text, an amber primary button with teal text, amber links.
- Amber is the one accent: the primary button in dark, the record's node, the last install step, the bullet rings. In light it is never used for text (2:1 on paper).
- Red (`--against`) appears only in the hero example, for "Possível contradição", as in the app.
- Glow only at the top of the page.

## Typography

- Headlines (h1, h2): Source Serif 4, 600, slight negative tracking, `text-wrap: balance`.
- Text: Source Sans 3, the app's own typeface, 18px (17px on phones).
- Data: Source Code Pro at `--text-mono` (13px), only for app data: the example's labels, the version line, table headers.

## Motif

The mark is a graph: two nodes joined at an amber node. The site repeats it where something is linked: in the hero example the promise's node and the record's amber node are joined by a line; the install steps are a chain of numbered nodes ending in amber; list bullets are small amber rings.

## Layout

- One rail, `--rail` 1160px, gutters `--gutter` (24px, 16px on phones). Sections are separated by a hairline as wide as the content.
- Hero: text left (7fr), the example panel right (5fr). Promessas and Ao vivo: text against a screenshot (5fr/7fr, mirrored for Ao vivo). Mapa: the head split in two over a full-width screenshot. Fontes, Perguntas: two columns of ruled rows. Também: four ruled columns. Seus dados: a table (one block per row on phones). Instalar: the steps beside a notes panel.
- Panels (radius `--radius-panel`) only for the example and the install notes; screenshots have `--radius-shot` and the one shadow.
- Below 1000px the nav moves into a `<details>` menu; below 400px the menu button is icon-only. Check 320, 360, 768 and 1440px in both themes, with no horizontal scroll.

## Motion

Color transitions (150ms), smooth anchor scrolling and a 1px button press. Nothing else moves; all of it stops under `prefers-reduced-motion`.
