---
name: Din-Din
description: Personal expense ledger on frosted glass, where nothing disappears, it changes colour.
colors:
  scene: "#AB8E76"
  scene-glow-1: "#F1DCC6"
  scene-glow-2: "#C89C78"
  glass-frame: "rgb(247 234 219 / 30%)"
  glass-rail: "rgb(241 222 206 / 55%)"
  glass-card: "rgb(250 242 232 / 62%)"
  glass-card-light: "rgb(255 251 245 / 40%)"
  glass-rim: "rgb(255 253 246 / 55%)"
  edge-light: "rgb(255 254 247 / 84%)"
  edge-shade: "rgb(57 40 28 / 19%)"
  gloss: "rgb(255 251 242 / 45%)"
  paper: "#F6ECE2"
  paper-field: "rgb(255 250 245 / 62%)"
  wash: "rgb(255 249 243 / 82%)"
  ink: "#25201E"
  ink-hover: "#3A302B"
  ink-2: "#423731"
  ink-3: "#5E5049"
  rule: "rgb(74 49 33 / 15%)"
  control: "rgb(74 49 33 / 32%)"
  carbon: "#A43C27"
  stamp: "#A43C27"
  pago: "#09644F"
  focus: "#194B48"
  on-ink: "#FFFAF5"
  pick: "#FFF9F3"
  highlight-from: "#1E7461"
  highlight-to: "#08443A"
  scrim: "rgb(30 21 17 / 43%)"
typography:
  display:
    fontFamily: "'Manrope Variable', Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.5rem, 1.5rem + 3.4vw, 3.6rem)"
    fontWeight: 820
    lineHeight: 1.02
    letterSpacing: "-0.07em"
    fontFeature: "'tnum' 1"
  view-title:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 1.2rem + 2vw, 3rem)"
    fontWeight: 760
    lineHeight: 1.03
    letterSpacing: "-0.062em"
  headline:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 830
    letterSpacing: "-0.045em"
  title:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 550
    lineHeight: 1.45
  body-sm:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 550
    lineHeight: 1.45
  label:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 790
  wordmark:
    fontFamily: "'Manrope Variable', Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 850
    letterSpacing: "0.17em"
rounded:
  control: "12px"
  coupon: "15px"
  toast: "18px"
  panel: "20px"
  dialog: "23px"
  stage: "34px"
  pill: "999px"
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
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    filter: "brightness(1.2)"
  button-secondary:
    backgroundColor: "{colors.wash}"
    borderColor: "{colors.glass-rim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.paper}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-ghost-danger:
    textColor: "{colors.stamp}"
    rounded: "{rounded.pill}"
  button-ghost-danger-hover:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.on-ink}"
  icon-button:
    backgroundColor: "{colors.paper-field}"
    borderColor: "{colors.rule}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  text-action:
    backgroundColor: "{colors.wash}"
    borderColor: "{colors.glass-rim}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "32px"
  text-action-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  input:
    backgroundColor: "{colors.paper-field}"
    borderColor: "{colors.control}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    height: "44px"
  search:
    rounded: "{rounded.pill}"
  chip:
    backgroundColor: "{colors.paper-field}"
    borderColor: "{colors.control}"
    rounded: "{rounded.pill}"
    height: "38px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  segmented:
    backgroundColor: "{colors.paper-field}"
    borderColor: "{colors.glass-rim}"
    rounded: "{rounded.pill}"
    padding: "3px"
  segmented-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    height: "36px"
  status-pill:
    textColor: "{colors.pago}"
    backgroundColor: "color-mix(in srgb, {colors.pago} 13%, {colors.paper-field})"
    rounded: "{rounded.pill}"
    padding: "4px 9px 4px 7px"
  status-pill-pendente:
    textColor: "{colors.stamp}"
  top-bar:
    backgroundColor: "{colors.glass-rail}"
    rounded: "{rounded.pill}"
    height: "60px"
  stage:
    backgroundColor: "{colors.glass-frame}"
    rounded: "{rounded.stage}"
  panel:
    backgroundColor: "{colors.glass-card}"
    rounded: "{rounded.panel}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.toast}"
  toast-error:
    backgroundColor: "{colors.paper}"
    borderColor: "{colors.stamp}"
  dialog:
    backgroundColor: "{colors.paper}"
    borderColor: "{colors.glass-rim}"
    rounded: "{rounded.dialog}"
    width: "560px"
---

# Design System: Din-Din

## Overview

**Creative North Star: "Vidro"** (adopted 2026-11-24, replacing "Carbon Copy")

Din-Din is a calm workspace seen through frosted glass. Behind everything sits a warm scene, the light of a beige room drawn only with gradients. On top of it float three layers of glass: a pill-shaped top bar, a large "stage" that holds the whole screen, and panels inside the stage. Dark brown ink writes on the glass; coral marks what is still owed; a deep teal marks what is paid.

The rule from the old system still holds: nothing disappears, it changes colour. A paid bill stays in the ledger, struck through, its value drained to `ink-3`, with a teal PAGO pill. A bill still owed keeps its coral value and a coral PENDENTE pill. What is coral on the screen is, literally, what is left to pay.

**Key Characteristics:**
- Warm gradient scene, frosted glass on three levels (bar, stage, panels).
- Coral marks money still owed; paid amounts and sums stay in ink.
- Status is a pill with a dot: PAGO in teal, PENDENTE in coral. Coral also marks errors and delete.
- Everything interactive is a pill; panels are rounded rectangles (20px), the stage 34px.
- One family (Manrope Variable), tight negative tracking on big type, tabular figures for money.
- One authored motion: the status pill popping in on the row that just changed.

## Colors

### Scene
- **Scene** (`scene`, `scene-glow-1`, `scene-glow-2`, `scene-shade`): the background. Painted by `body::before` with two radial glows, two diagonal tints and a floor shadow. No photo: the production CSP (`img-src 'self' data:`) blocks external images, and a gradient keeps the build self-contained. A local photo in `public/` could replace it later.

### Glass
- **Frame** (`glass-frame`): the stage. **Rail** (`glass-rail`): top bar, banner, mobile dock. **Card** (`glass-card` over a `glass-card-light` gradient): panels and coupon cards.
- **Rim** (`glass-rim`): the 1px light border of every glass surface. **Edge light / edge shade**: the inset 1px highlights top-left and shade bottom-right that give the glass thickness. **Gloss**: the diagonal sheen.
- Panels are more opaque (62%) than a typical glass UI so money stays AA-readable over the scene.

### Ink and surfaces
- **Ink** (`ink`): text, primary buttons, selected chips and segments, the toast. **ink-2**: supporting text, meta, hints. **ink-3**: everything on a paid row.
- **Paper** (`paper`): solid surfaces that float above the glass: dialogs, the error toast, select menus.
- **Paper field** (`paper-field`): inputs, the inner tray of coupons, table head strip, row hover.
- **Wash** (`wash`): text actions, secondary buttons, skeletons, tags.
- **Rule** (`rule`): hairlines between rows. **Control** (`control`): borders of editable fields.
- **Pick** (`pick`): the light disc of the logo.

### Accents
- **Coral** (`carbon`, light #A43C27 / dark #FF9177): money still owed. The display total, coupon values, ledger values of pending rows, the details value while pending.
- **Coral as stamp** (`stamp`, same value): PENDENTE pill, field errors, error toast border, form alert, delete.
- **Teal** (`pago`, light #09644F / dark #75DAC0): the PAGO pill and the "connected" dot.
- **Highlight teal** (`#1E7461` to `#08443A`): fill of the first (largest) pending coupon. On it, ink, value and status turn white.
- **Focus** (`focus`, light #194B48 / dark #F9BF9B): the 2px focus ring.
- **Amber** (#C98A00 / #996300; #F1BE58 in dark): example-data banner icon and the "dados de exemplo" connection dot only.

### Night mode
`data-theme="dark"` on `<html>`, set before first paint by `public/tema.js` and kept by `src/hooks/useTema.js` (choice saved in `localStorage` under `din-din-tema`; without a choice it follows `prefers-color-scheme`). The same scene with the light off: `scene` #40322B, darker glass (`glass-card` 68%), ink turns cream (#FFF6E9), coral and teal lighten. `theme-color` is #AB8E76 in light mode and #40322B in dark mode.

### Named Rules
**The Owed-Only Rule.** A money figure is coral only while it is owed. Once paid it turns `ink-3` and loses weight; sums ("Já pago", "Total registrado", "Total exibido") are always ink. The highlighted coupon is the only place an owed value is white, because it sits on teal.

**The Status Rule.** Teal is PAGO; coral is PENDENTE, error and delete. Neither decorates.

**The Data-Is-Not-Palette Rule.** Category colours come from the API (`cor`) or from defaults in `frontend/src/utils/despesas.js`. They appear only in the 9px / 7px category dot.

## Typography

**Font:** Manrope Variable, self-hosted (`@fontsource-variable/manrope`), imported in `src/main.jsx`. Body weight 550.

### Hierarchy
- **Display** (820, -0.07em, `clamp(2.5rem, 1.5rem + 3.4vw, 3.6rem)`): the owed total. One per screen. The details dialog uses 2.6rem.
- **View title** (760, -0.062em): "Despesas" at the top of the stage, "Entrar" / "Criar conta".
- **Headline** (830, 1.5rem, -0.045em): dialog titles. Empty states use 1.25rem / 800.
- **Title** (800, -0.02em, 15px): section heads "Falta pagar", "Lançamentos" (class `.caps`, no longer uppercase).
- **Body** (550, 15px) and **body small** (13px): text, table cells, meta.
- **Label** (750 to 790, 12px): buttons, pills, table heads, tags.
- **Wordmark** (850, 12px, 0.17em, uppercase): "DIN-DIN" in the top bar, the only uppercase text.

### Named Rules
**The Tabular Rule.** Every money figure and count uses tabular figures and never wraps.

**The Tight-Big Rule.** The larger the type, the tighter the tracking: -0.02em on titles, up to -0.07em on the display total.

## Layout

The page is a centred column `min(100% - 64px, 1380px)` (40px margin below 1060px, 24px below 720px):

1. **Top bar** (pill, 60px): logo disc + wordmark + "Controle financeiro" on the left; connection pill, refresh, theme, "Nova despesa" and logout on the right.
2. **Banner** (pill, only in demo mode): example-data notice with "Reconectar".
3. **Stage** (34px radius): view head (title + one line), then the content grid with 12px gaps:
   - **Owed row:** the total panel (260 to 340px) beside a tray of coupon cards that scrolls sideways (scroll-snap). Without pending bills the total panel spans the row.
   - **Ledger panel:** list head, filters, table or compact list.

Spacing follows a 4px grid. Targets are 44px by default, 36px in dense rows, 32px for text actions.

Responsive:
- **960px and below:** owed row stacks; coupons are `min(72%, 260px)` wide.
- **720px and below:** the bar's "Nova despesa" and connection pill hide; a glass dock fixed at the bottom carries a full-width 50px primary button; the stage padding drops to 12px; filters stack.
- **640px and below:** dialogs become bottom sheets (top corners 23px, grip).
- **Ledger container 760px and below:** table becomes a compact list (container query).
- **420px and below:** "Já pago" and "Total registrado" stack.

## Elevation & Depth

Depth comes from glass, not from rules. Each glass surface combines `backdrop-filter: blur() saturate()`, a 1px rim, inset edge light/shade and a soft brown drop shadow (`rgb(35 21 14 / 9% to 22%)`). The stage casts the deepest shadow (`0 22px 72px`). Dialogs and toasts are solid (`paper` or `ink`) with the overlay shadow `0 20px 80px rgb(35 21 14 / 38%)`; the dialog scrim also blurs the page (5px).

`prefers-reduced-transparency: reduce` and `prefers-contrast: more` swap every glass surface for solid `paper` without blur. `forced-colors` adds `CanvasText` borders.

## Shapes

- **Pill (999px):** buttons, icon buttons, text actions, search, selects in the filter row, segmented control, chips, tags, status pills, top bar, banner, mobile dock, stepper.
- **12px:** inputs and selects in forms, form alert. **16px:** amount field.
- **15px:** coupon cards. **18px:** toast. **20px:** panels and the coupon tray. **23px:** dialogs. **34px:** the stage.
- Circles: logo disc, category dot, status dot, connection dot.

## Components

### Buttons
Weight 790, 13px, pill. **Primary:** ink fill, hover `brightness(1.2)`. **Secondary:** wash with rim. **Ghost:** ink-2 text; danger variant fills coral on hover. **Icon button:** 44px circle on `paper-field` with a rule border; the 36px row variant is borderless and transparent. **Text action** ("Marcar como pago", "Ver pagas", "Criar conta"): 32px wash pill that turns ink on hover. Disabled: 50% opacity. Focus: 2px `focus` ring, 3px offset.

### Inputs
`paper-field` with a 1px `control` border and inner gloss; hover darkens the border; focus draws the 2px focus ring. Error: 2px coral border plus coral message. The amount field is 62px high, 28px / 815 with a fixed "R$". Inside dialogs, fields use a slightly whiter tone so they stand out on the solid paper.

### Segmented control and chips
A pill tray (`paper-field`, rim, 3px padding) holding pill options; the selected one fills ink. Chips are 38px pills; selected fills ink; the "add" chip is dashed.

### Owed row
**Total panel:** "Falta pagar", the coral display total, the pending count, then an inner strip (`paper-field`, 12px radius) with "Já pago" and "Total registrado" split by a hairline. **Coupon tray:** a glass tray holding up to five cards (220px) plus "Ver todas as N pendentes" in a dashed card. Each card: name, coral value, category and method, text action pinned to the foot. The first (largest) card is filled teal with white text, echoing the highlighted metric of the glassy reference. A freshly paid card shows its PAGO pill, then fades out.

### Ledger
Table head on a rounded `paper-field` strip, 12px / 800 in ink-2. Rows separated by hairlines; hover fills the row with `paper-field` and rounds its ends. Pending: bold name, coral value, coral pill. Paid: struck-through name in ink-3, value in ink-3, teal pill.

### Status pill (signature)
Pill with a 6px dot in `currentColor`, 12px / 790, background `color-mix(status 13%, paper-field)`. When a status just changed, the pill enters once from `scale(1.5)` and transparent, 0.36s on `cubic-bezier(0.16, 1, 0.3, 1)`. Functional motion: toast rise, skeleton pulse, refresh spin, coupon fade. Everything collapses under `prefers-reduced-motion`.

### Toast and dialog
**Toast:** ink fill, 18px radius, action as a tinted pill. **Error toast:** paper with a 1.5px coral border and coral icon. **Dialog:** solid paper, rim border, 23px radius, 560px (460px for details), title without a rule below, details as a bordered fact list (14px radius).

## Do's and Don'ts

### Do:
- **Do** keep content inside the stage and group it in glass panels.
- **Do** colour money coral only while it is owed; paid in ink-3, sums in ink.
- **Do** make every interactive control a pill and keep targets at 44px (36px in rows).
- **Do** keep glass opaque enough for AA text, and keep the solid fallback for reduced transparency.
- **Do** use tabular figures and tight tracking on large numbers.

### Don't:
- **Don't** load background images from other hosts; the CSP blocks them in production.
- **Don't** use coral or teal for decoration, buttons or totals.
- **Don't** add a second typeface or put money in monospace.
- **Don't** put glass on glass on glass beyond the three levels (bar, stage, panel); coupons sit in a tray, not deeper.
- **Don't** add a second authored animation; the status pop is the one.
