---
name: Din-Din
description: Personal expense ledger where nothing disappears, it cancels.
colors:
  carbon: "#6B3FA0"
  stamp: "#D8262F"
  pago: "#177A43"
  ink: "#14285A"
  ink-hover: "#0E1D45"
  ink-2: "#4A5A82"
  ink-3: "#56638A"
  control: "#7C89AB"
  rule: "#C9CFDD"
  wash: "#ECEEF4"
  paper: "#FBFBF8"
  paper-field: "#FFFFFF"
  on-ink: "#FFFFFF"
  on-bar-ok: "#7BE0A3"
  on-bar-warn: "#FFD166"
  on-bar-error: "#FF9AA0"
typography:
  display:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.75rem, 1.6rem + 3.4vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.45
    fontVariation: "'wdth' 85"
  title:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 80"
  body:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 80"
rounded:
  mark: "2px"
  radius: "3px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "20px"
  sp-6: "24px"
  sp-8: "32px"
  sp-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.on-ink}"
  button-secondary:
    backgroundColor: "{colors.paper-field}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
  button-ghost:
    textColor: "{colors.ink-2}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
  button-ghost-danger:
    textColor: "{colors.stamp}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "44px"
  button-ghost-danger-hover:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.on-ink}"
  button-on-bar:
    backgroundColor: "{colors.on-ink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "44px"
  button-on-bar-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.radius}"
    size: "44px"
  icon-button-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.paper-field}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.paper-field}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "0 12px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  segmented-option:
    backgroundColor: "{colors.paper-field}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "0 12px"
    height: "41px"
  segmented-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  tag:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "2px 2px 2px 10px"
  stamp:
    textColor: "{colors.pago}"
    rounded: "{rounded.mark}"
    padding: "1px 8px"
  stamp-pendente:
    textColor: "{colors.stamp}"
    rounded: "{rounded.mark}"
    padding: "1px 8px"
  top-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    height: "60px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.radius}"
    padding: "8px 8px 8px 16px"
  toast-error:
    backgroundColor: "{colors.paper-field}"
    textColor: "{colors.ink}"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    padding: "24px"
    width: "560px"
---

# Design System: Din-Din

## Overview

**Creative North Star: "Carbon Copy"**

Din-Din looks like the owner's own ticket wallet: coupon-white paper, navy ink, and the purple of a carbon duplicate for every amount that is still owed. The rule the whole system serves is that nothing disappears, it cancels. A paid bill stays in the ledger, struck through, drained of purple, and stamped PAGO in green; a bill still owed carries a red PENDENTE stamp. What remains purple on the screen is, literally, what is left to pay.

The system is dense and flat. There are no boxed areas on the page: the owed band, the ledger, table rows and definition lists are separated by ruled lines in two weights, a heavy navy rule (2px) that opens a block and a hairline (1px) between entries. Corners are near-square, like cut paper. One typeface does everything; hierarchy comes from weight and from the width axis, which condenses headings and large figures.

This world replaces a look the owner rejected as generic: navy page ground, indigo accent, a row of KPI cards, rounded cards everywhere. Navy survives only as ink and as the top bar, never as the ground.

**Key Characteristics:**
- White coupon ground, navy ink, navy top bar.
- Purple marks money still owed; paid and summed figures stay in ink.
- Status is stamped: PAGO in green, PENDENTE in red. Red also marks errors and delete.
- Ruled lines instead of cards; shadow only on dialog and toast.
- One family (Archivo Variable), condensed uppercase for heads, tabular figures for money.
- One authored motion: the stamp landing on a freshly paid row.

## Colors

A two-ink ledger on white paper: navy for everything written, carbon purple for what is owed, and two stamp inks: green for PAGO, red for PENDENTE, errors and delete.

### Primary
- **Carbon Purple** (`carbon`): the amount still owed. The display total under "Falta pagar", each pending value in the owed column, the ledger table and the compact list, and the value in the details dialog while the bill is pending. It also draws the keyboard focus ring (3px solid, 2px offset), the text caret and the text selection, and the hover of underlined text actions.

### Secondary
- **Stamp Red** (`stamp`): the PENDENTE stamp (2.5px border and text), field and form errors (border of an invalid field, error text, the error toast and form alert border, the error empty-state icon) and delete (ghost danger text, filled on hover with white text).

- **Stamp Green** (`pago`, #177A43, 5.2:1 on paper; `pago-hover` #126337 on wash): the PAGO stamp, and nothing else. Night mode: #4CC98A / #6BD6A0.

### Tertiary
- **Bar Green / Bar Amber / Bar Pink** (`on-bar-ok`, `on-bar-warn`, `on-bar-error`): the 8px connection dot in the top bar, and nothing else. They exist only on navy.

### Neutral
- **Navy Ink** (`ink`): body text, the top bar, the primary button, selected chips and segmented options, heavy rules (1.5px and 2px), the dialog border. `ink-hover` is its pressed/hover shade on the primary button.
- **Secondary Ink** (`ink-2`): supporting text, meta lines, hints, ghost buttons and resting icon buttons.
- **Cancelled Ink** (`ink-3`): everything on a paid row (description, value, meta), and input placeholders.
- **Control Grey** (`control`): the 1.5px border of inputs, selects and unselected chips; the bottom-sheet grip.
- **Rule Grey** (`rule`): hairlines (1px) between entries and under the banner.
- **Wash** (`wash`): hover ground for rows and quiet buttons, the example-data banner, filter tags, skeletons.
- **Coupon Paper** (`paper`): page and dialog ground.
- **Field White** (`paper-field`): inputs, selects, chips, segmented control, secondary button, error toast.
- **On Ink** (`on-ink`): text and icons on navy and on filled red. Written as a literal `#fff` in the stylesheets, not as a custom property.

### Night mode ("the back of the carbon")
A second set of values for the same roles, switched by `data-theme="dark"` on `<html>`. With no saved choice it follows the system (`prefers-color-scheme`); the moon/sun icon button in the top bar (`aria-pressed`, label "Modo noturno") saves the choice in `localStorage` under `din-din-tema`. An inline script in `index.html` sets the attribute before first paint so the page never flashes light; `src/hooks/useTema.js` keeps it in sync and updates `theme-color`.

- Ground is neutral graphite, never navy (`paper` #141519, `paper-field` #1B1D22, `wash` #262930). A navy ground is the rejected look.
- Ink turns coupon white (`ink` #ECEAE2, `ink-2` #AEB2BF, `ink-3` #8F95A5); `rule` #33363F, `control` #737A8C.
- Carbon lightens to #BB9AF0 (7.8:1) and stamp to #FF5C62 (6.1:1); the roles and named rules do not change.
- Ink fills invert: primary button, selected chips and segments, and the toast become light with graphite text. Text on a fill uses `on-ink` / `on-stamp` (white in light mode, graphite in night mode), never a literal `#fff`.
- The top bar stays navy (`bar` #14285A) in both modes, with a 1px #2B3D6B bottom edge in night mode; its contents keep their white and the "Nova despesa" button keeps navy text.
- Overlays use a black scrim (`rgba(0,0,0,0.66)`) and a deeper overlay shadow.

### Named Rules
**The Owed-Only Rule.** A money figure is purple only while it is still owed. The moment a bill is paid its value turns `ink-3` and loses weight (800 to 600); sums ("Já pago", "Total registrado", "Total exibido") are always ink.

**The Stamp Rule.** Stamp inks mark status, failure and destruction only: green for PAGO; red for PENDENTE, errors and delete (owner's choice, 2026-11-10). They colour the stamp, never the amount: a pending value stays carbon purple, a paid one `ink-3`. They never decorate.

**The Data-Is-Not-Palette Rule.** Category swatch colours come from the API (`cor`) or from defaults in `frontend/src/utils/despesas.js`. They are user data shown in a 10px or 8px square and are never used for interface elements.

## Typography

**Display Font:** Archivo Variable, width axis condensed (with system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)
**Body Font:** Archivo Variable at normal width (same fallback)
**Label/Mono Font:** none; money uses tabular figures of the same family

**Character:** One grotesque doing the work of three. Normal width for reading, condensed and heavy for heads and big figures, which gives the printed-ticket feel without a second family. The font is self-hosted with the width axis (`@fontsource-variable/archivo/wdth.css`).

### Hierarchy
- **Display** (800, width 75%, `clamp(2.75rem, 1.6rem + 3.4vw, 3.75rem)`, 1.05): the owed total. One per screen. The details dialog uses the same voice at 2.5rem / 1.1.
- **Headline** (800, width 85%, 1.25rem): dialog titles, empty-state titles, pending values in the owed column. The wordmark uses the same size at width 80%, uppercase, 0.06em.
- **Title** (700, width 80%, 1rem, 0.05em, uppercase): section heads "Falta pagar" and "Lançamentos".
- **Body** (400, 1rem, 1.45): running text; 700 for entry names and definition values, 800 for values in the ledger.
- **Body small** (400, 0.875rem): table cells, meta lines, controls (600 on chips, segmented options and tags; 700 on buttons and field labels).
- **Label** (700, width 80%, 0.8125rem, 0.05em, uppercase): table column heads. The same size at normal width and weight 400 carries sub-lines and hints; 700 in red for field errors.

### Named Rules
**The One Family Rule.** Hierarchy comes from weight (400 / 600 / 700 / 800) and width (75 / 80 / 85 / 100%). No second typeface.

**The Tabular Rule.** Every money figure and count uses tabular figures (`font-variant-numeric: tabular-nums`) and never wraps. Values are not set in a monospace face.

**The Condensed-Caps Rule.** Uppercase with tracking is only for section heads, column heads, the wordmark and the stamp, always condensed (80%). Body text and buttons stay sentence case.

## Layout

A single screen, stacked, inside a 1360px container with 32px side padding ("Faixa de canhotos", chosen 2026-11-10 over a single-column receipt and a pay/paid split). On top, the owed band: the total block on the left (260 to 320px, closed by a 2px navy vertical rule) and the pending bills to its right as a row of stubs that scrolls sideways. A 2px navy rule closes the band and opens the ledger, which takes the full width below. When there are no expenses the band is absent; when nothing is pending the total block spans the band. The top bar is full-bleed navy, 60px minimum height.

Spacing follows a 4px grid (4, 8, 12, 16, 20, 24, 32, 48). Rows are compact: 12px vertical padding per entry, 8px for column heads. Interactive targets are 44px high by default, 36px in dense rows, 32px for the smallest text button.

Responsive behaviour:
- **960px and below:** the band stacks: total block on top ("Já pago" and "Total registrado" side by side), stubs below in a thumb-swipe row that bleeds to the screen edge so the next stub shows cut off; side padding drops to 16px.
- **720px and below:** stub actions get 44px touch targets; the bar's "Nova despesa" button and connection label hide; a fixed bottom bar (paper ground, 2px navy top rule) carries a full-width 52px primary button; filters stack with the two selects side by side; toasts centre above the bottom bar.
- **640px and below:** dialogs become bottom sheets (full width, 92dvh max, top rule only, square corners, a 40x4px grip); form rows collapse to one column.
- **Ledger container at 760px and below:** the table is replaced by a ruled compact list (container query on the ledger, not the viewport), each row a single 64px button.

## Elevation & Depth

Flat. Depth on the page is drawn with rules, not shadows or tonal layers. Only things that float above the page cast a shadow, and they also carry a hard edge (2px navy border on the dialog, navy fill on the toast). The dialog sits on a navy scrim (`rgba(14, 29, 69, 0.6)`).

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 18px 40px -12px rgba(20, 40, 90, 0.45)`): dialog and toast only.

### Named Rules
**The Overlay-Only Rule.** Nothing resting on the page has a shadow. The one non-overlay `box-shadow` in the build is a 1.5px white ring that keeps a category swatch visible on a selected (navy) chip; it is an outline, not depth.

## Shapes

Near-square, like cut paper. Controls, buttons, tags, dialogs and toasts use a 3px radius. Small marks (the stamp, category swatches, skeleton bars, the sheet grip) use 2px. The segmented control clips its square options inside one 3px frame; bottom sheets and full-width list rows are fully square. The only circle is the 8px connection dot.

Lines carry the structure, in a fixed set of weights: 2px navy opens a block (table head, dialog head, owed footer, column divider), 1.5px navy frames a committed control or separates owed entries, 1.5px control grey frames an editable field, 1px rule grey separates rows. The stamp is the one tilted element (rotated -4deg, 2.5px red border).

## Components

### Buttons
Plain and flat; weight 700, 14px, sentence case, no shadow, colour-only transitions (0.15s).
- **Shape:** near-square (3px), 44px high, 16px side padding; 36px and 32px dense sizes.
- **Primary:** navy fill, white text; hover darkens to `ink-hover`. One per context.
- **Secondary:** white field, 1.5px navy border, navy text; hover fills with wash.
- **Ghost:** `ink-2` text, no border; hover turns navy on wash. The danger variant is red text that fills red with white text on hover.
- **On bar:** white fill, navy text, used only on the navy top bar.
- **Icon button:** 44px square (36px in rows), `ink-2` icon, wash on hover; white icon with a 16% white hover on navy surfaces. Icons are lucide line icons, 2px stroke, 14 to 20px.
- **Text action:** underlined bold navy text (1.5px underline, 3px offset) for in-row actions such as "Marcar como pago"; hover turns it carbon.
- **Disabled:** 50% opacity.
- **Focus:** 3px carbon outline, 2px offset; white outline on navy surfaces.

### Chips
- **Style:** white field, 1.5px control-grey border, 40px high, 14px / 600. Used as radio options in the form (category, payment method), optionally with a category swatch or icon.
- **State:** hover darkens the border to navy; selected fills navy with white text. The "add" chip has a dashed border. An invalid group turns every chip border red.
- **Tag:** active-filter tag on wash with a 28px remove button that inverts to navy on hover.

### Segmented control
One 1.5px navy frame, options divided by 1.5px navy rules, 41px high, 14px / 600. Selected option fills navy with white text; counts sit beside labels at weight 400 with tabular figures.

### Containers
There are no cards. Areas are separated by rules and whitespace on the paper ground. The only bounded surfaces are overlays (dialog, toast), the inline form alert (white, 2px red border) and the full-bleed wash banner for example data.

### Inputs / Fields
- **Style:** white field, 1.5px control-grey border, 3px radius, 44px high, 14px text. Labels sit above at 14px / 700, 6px gap. Selects use a navy lucide-style chevron. The amount field is the large one: 60px high, 28px / 800 at width 85%, with a fixed "R$" prefix.
- **Hover / Focus:** border turns navy on hover; focus draws the 3px carbon outline flush to the field and turns the border carbon.
- **Error:** 2px red border, with a 13px / 700 red message and icon below.
- **Stepper:** 1.5px navy frame, two 44x41px icon buttons around a bold tabular output.

### Navigation
A single navy top bar: condensed uppercase wordmark on the left; connection status (dot plus 14px label), refresh icon button and "Nova despesa" on the right. On phones the creation action moves to the fixed bottom bar.

### Ledger rows
Table rows on desktop, ruled list rows when the ledger is narrow. Pending: bold navy name, carbon value at weight 800, the red PENDENTE stamp in the status position. Paid: name struck through (1px) at weight 500 in `ink-3`, value in `ink-3` at 600, and the PAGO stamp in the status position. Hover washes the row. Column heads are condensed caps over a 2px navy rule.

### Owed band and stubs
The "Falta pagar" band holds the total block (section head, display total, count, then a definition list under a hairline with "Já pago" and "Total registrado" in ink) and up to five stubs. Each stub is 236px wide (min(72%, 280px) on phones), separated by 1px rule-grey vertical lines, scroll-snapped: bold name, carbon value (24px / 800, width 80%), meta, and "Marcar como pago" pinned to the stub's foot. More than five pending adds a last stub with "Ver todas as N pendentes". The strip scrolls horizontally with a thin control-grey scrollbar; on phones it bleeds to the screen edge.

### Status stamp (signature)
Condensed caps (16px / 800, width 80%, 0.08em) inside a 2.5px border with a 2px radius, rotated -4deg: PAGO in green, PENDENTE in red (`.stamp-pago` / `.stamp-pend`, both driven by `--stamp-cor`). On row hover it switches to the darker hover tone of its own ink. When a bill's status has just changed, in either direction, its new stamp enters once: from rotate(-14deg) scale(1.9) and transparent to rest, in 0.36s on `cubic-bezier(0.16, 1, 0.3, 1)`. The freshly paid stub stays in the band for a moment, stamped, before leaving. This is the only authored motion; the toast rise (0.24s, 8px), skeleton pulse and refresh spin are functional feedback. All motion collapses under `prefers-reduced-motion`.

### Toast and dialog
- **Toast:** navy fill, white text, 14px, overlay shadow, bottom right (centred above the bottom bar on phones), with an underlined text action and a close icon button. The error toast inverts to a white field with a 2px red border and a red icon.
- **Dialog:** paper ground, 2px navy border, 3px radius, overlay shadow, 560px max (440px for details). Head with a 2px navy rule below, body with 24px padding and 20px gaps, footer above a 1px hairline.

## Do's and Don'ts

### Do:
- **Do** colour a money figure carbon only while it is owed; switch it to `ink-3` at weight 600 the moment it is paid, and keep sums in ink.
- **Do** keep paid entries visible: struck through, drained of purple, stamped PAGO in green.
- **Do** separate areas with rules: 2px navy to open a block, 1px rule grey between entries.
- **Do** keep corners at 3px (2px for small marks) and targets at 44px, 36px in dense rows.
- **Do** build hierarchy from Archivo's weight and width axis, with tabular figures on every amount.
- **Do** keep the 3px focus outline: carbon on paper, white on navy.
- **Do** treat category colours as data inside the small square swatch.

### Don't:
- **Don't** use carbon purple on paid amounts, totals, buttons or decoration.
- **Don't** use red for anything other than the PENDENTE stamp, errors and delete, or green for anything other than the PAGO stamp.
- **Don't** put page content in cards or boxed panels; only dialogs, toasts and the form alert are bounded.
- **Don't** add shadows to anything resting on the page; the overlay shadow is for dialog and toast.
- **Don't** return to the rejected look: navy page ground, indigo accent, KPI card row, rounded cards.
- **Don't** add a second typeface or set money in monospace.
- **Don't** add a second authored animation; the stamp entrance is the one.
