---
name: Ilieal Conduit Care
description: Calm clinical operations at a glance, with compact nurse workflows and touch-first patient forms.
colors:
  clinical-teal: "#147d91"
  clinical-teal-deep: "#106d7f"
  pale-blue-gray-canvas: "#dce8eb"
  workspace: "#f8fafb"
  surface: "#ffffff"
  ink: "#172b39"
  text-secondary: "#687c87"
  cool-border: "#dce5e8"
  teal-wash: "#e7f5f7"
  success: "#55a985"
  warning: "#d99a28"
  danger: "#d55757"
  warning-wash: "#fffaf0"
typography:
  headline:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "clamp(23px, 2.2vw, 29px)"
    fontWeight: 740
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "16px"
    fontWeight: 720
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "normal"
  metric:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "28px"
    fontWeight: 720
    lineHeight: 1.05
    letterSpacing: "normal"
rounded:
  control: "9px"
  field: "10px"
  card: "12px"
  shell: "16px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.clinical-teal}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.clinical-teal-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  status-warning:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
---

# Design System: Ilieal Conduit Care

## Overview

**Creative North Star: "The Calm Clinical Command Surface"**

Ilieal Conduit Care is a composed operational workspace where the next nursing decision is visible before the next action is taken. A pale blue-gray canvas holds a compact white sidebar and workspace; cool hairline borders establish order, while teal is reserved for navigation, focus, and deliberate action. The result is clinical without feeling sterile and dense without feeling crowded.

The desktop dashboard is built for rapid scanning: workload first, then the seven-day issue trend, the awaiting-reply queue, urgency distribution, and patient context. The patient-facing LIFF experience keeps the same visual language but removes the command-surface density in favor of full-width, touch-first forms, clear progress states, and explicit safety guidance.

**Key Characteristics:**

- Pale blue-gray outer canvas with compact white operational surfaces.
- Thin cool borders and restrained shadows carry structure without visual noise.
- Teal marks action, focus, active navigation, and informational emphasis.
- Tabular numerals, compact labels, and Thai-first copy support fast clinical scanning.
- Desktop density collapses into single-column LIFF forms and drawer navigation on small screens.

## Colors

The palette is cool, quiet, and information-led: deep blue-gray ink, white surfaces, pale blue-gray layers, one teal action voice, and restrained triage colors.

### Primary

- **Clinical Teal:** The single action accent for primary buttons, active navigation, focus cues, icons, and chart emphasis.
- **Deep Clinical Teal:** The hover and pressed expression of the primary action color.

### Secondary

- **Teal Wash:** A low-emphasis field for active navigation, icon wells, and informational grouping.

### Tertiary

- **Clinical Success:** Normal urgency, completed states, and reassuring outcomes.
- **Watchful Amber:** Monitoring states and non-emergency caution.
- **Clinical Red:** Urgent, unanswered, or destructive information that must interrupt scanning.

### Neutral

- **Pale Blue-Gray Canvas:** The page-level frame around the desktop command surface.
- **Workspace Mist:** The quiet inner workspace behind cards and tables.
- **Clinical White:** The default surface for cards, navigation, headers, and form shells.
- **Blue-Black Ink:** Primary text and high-value numeric content.
- **Secondary Slate:** Explanations, metadata, timestamps, and supporting labels.
- **Cool Hairline:** Dividers, field strokes, card edges, and shell boundaries.
- **Warm Caution Wash:** The background for patient safety and emergency guidance.

**The One Teal Voice Rule.** Teal identifies action, focus, or live informational emphasis; do not scatter it as decoration.

**The Triage Pairing Rule.** Urgency is always communicated with text plus color, never color alone.

## Typography

**Display Font:** Inter (with Noto Sans Thai and sans-serif fallback)
**Body Font:** Inter (with Noto Sans Thai and sans-serif fallback)

**Character:** The pairing is compact, neutral, and highly legible across Latin and Thai. Inter supplies disciplined dashboard numerals and labels; Noto Sans Thai preserves the same contemporary, low-contrast tone for Thai-first workflows.

### Hierarchy

- **Headline:** Strong but contained page titles with tight tracking; LIFF form titles scale up to a touch-friendly 28–36px.
- **Title:** Compact 16px section and card headings that establish hierarchy without competing with workload metrics.
- **Metric:** Tabular 28px numerals for KPI values and distribution totals.
- **Body:** 13px on patient forms and 11–12px on dense operational rows, with generous line height for clinical detail.
- **Label:** 10–11px, medium-to-bold metadata, navigation, table headers, and status labels.

**The Scan Before Read Rule.** Numerals and state labels carry the first glance; explanatory copy remains quieter and smaller.

**The Thai-First Rule.** Never reduce Thai body copy below the established readable form size merely to match Latin density.

## Layout

The desktop shell sits inside an 18px pale blue-gray frame. A fixed 220px white sidebar meets a bordered workspace with an 82px header; the content region is capped at 1480px and uses 18–34px responsive horizontal padding. The first dashboard viewport follows a deliberate sequence: four KPI cards, a two-column operational grid led by the seven-day trend, then the awaiting-reply list and urgency distribution. Tables remain horizontally scrollable rather than collapsing data into ambiguous stacked labels.

At 1180px, KPI and analysis grids reduce to two columns and the trend spans the row. At 900px, the sidebar becomes a 230px off-canvas drawer with a dimmed backdrop and the workspace loses its framed corners. At 760px and below, analysis cards become one column and chart detail is simplified. At 640px, LIFF shells become edge-to-edge, shadowless, single-column forms. At 600px, dashboard KPIs remain a compact two-column grid; at the narrowest widths, nonessential KPI icons are removed before labels or values.

Spacing follows a compact 8/12/16/22/32px rhythm. Operational surfaces favor 12–16px internal padding; patient forms use 22–32px to protect touch clarity.

**The Priority-First View Rule.** Preserve the KPI → trend → awaiting reply → urgency sequence before adding secondary analysis.

**The Collapse, Don't Shrink Rule.** Move grids to fewer columns and open navigation as a drawer; do not miniaturize controls or Thai text.

## Elevation & Depth

Depth is quiet and structural. Thin cool borders do most of the separation; low-opacity blue-gray shadows lift only the shell, cards, LIFF form containers, and emphasized chart bars. Mobile LIFF removes both border and shadow so the form becomes the page.

### Shadow Vocabulary

- **Shell Lift** (`0 12px 34px rgb(35 65 78 / 0.06–0.08)`): Desktop sidebar and workspace framing only.
- **Card Lift** (`0 5px 15px rgb(34 67 81 / 0.035)`): Dashboard cards, KPI tiles, tables, and issue panels.
- **Form Lift** (`0 14px 36px rgb(36 67 81 / 0.09)`): Centered login and LIFF shells above tablet width.
- **Action Lift** (`0 5px 14px rgb(20 125 145 / 0.2)`): Primary LIFF submission action.

**The Border-First Rule.** Establish hierarchy with surface tone and a one-pixel border; shadow is secondary evidence, not decoration.

## Shapes

The form language is softly clinical: 8–10px controls, 12px operational cards, and 16px outer shells. Fully rounded pills are reserved for compact status and count labels; avatars are circular, while brand and icon wells use compact rounded squares. Asymmetric 5px/13px chat bubbles are the only intentionally conversational silhouette.

**The Radius Hierarchy Rule.** Small controls sit inside medium cards, which sit inside the largest shell radius; do not give every element the same corner size.

## Components

### Buttons

- **Shape:** Compact rounded rectangle for dashboard actions and a taller touch target in LIFF forms.
- **Primary:** Clinical Teal with white text, firm label weight, and restrained action lift on patient forms.
- **Hover / Focus:** Deepens to Deep Clinical Teal; the global focus-visible ring remains explicit and offset.
- **Secondary / Ghost:** White or transparent with a Cool Hairline border; hover shifts to Teal Wash and teal text.
- **Disabled:** Retains shape and label but drops to 58% opacity with a not-allowed cursor in forms.

### Chips

- **Style:** Fully rounded status labels with pale tonal backgrounds and dark semantic text.
- **State:** Normal, watchful, and urgent variants always retain a written label; compact count chips use the teal wash rather than a triage color.

### Cards / Containers

- **Corner Style:** Operational cards use the card radius; page shells use the shell radius.
- **Background:** Clinical White over Workspace Mist or Pale Blue-Gray Canvas.
- **Shadow Strategy:** Card Lift at rest, with no decorative hover elevation.
- **Border:** One-pixel Cool Hairline edges and dividers.
- **Internal Padding:** 16px for dense cards, 22–32px for patient-facing forms.

### Inputs / Fields

- **Style:** White, one-pixel cool border, 10px corners, and a minimum 48px touch height in LIFF.
- **Focus:** Border shifts toward teal and gains a translucent three-pixel teal halo.
- **Error / Disabled:** Errors use a pale red field and explicit text; disabled submission remains visible at reduced opacity.

### Navigation

The desktop sidebar is a compact white rail with 12px labels, 16px icons, quiet group headings, and a Teal Wash active state with an inset border. Below 900px it becomes an off-canvas drawer with explicit open and close controls plus a dismissible backdrop.

### KPI Tile

KPI tiles pair a small label, a tabular metric, and one line of context with a 34px icon well. Warning and urgent tiles change border/icon tone while preserving the shared white-card structure.

### Seven-Day Trend

The primary chart uses slim teal bars over faint horizontal guides, with red nested bars only when urgent issues exist. On narrow screens, legends and redundant urgent-value pills disappear before the chart itself.

### Awaiting-Reply Item

Each row combines patient avatar, issue subject, patient name, and written urgency badge in one link. Ordering is clinical: urgency first, then recency.

### LIFF Form Shell

Above mobile width, the form is a centered white shell on the pale canvas; below 640px it becomes a full-height white page. Fields collapse to one column, primary actions span the available width, and safety guidance remains in the content flow.

## Do's and Don'ts

### Do:

- **Do** keep workload, unanswered items, urgent items, and patient context visible before secondary reporting.
- **Do** use Clinical Teal for meaningful action, focus, active navigation, and live informational emphasis.
- **Do** pair every urgency color with a Thai text label.
- **Do** preserve 48px form controls and single-column LIFF fields on small screens.
- **Do** use tabular numerals for KPIs, counts, and operational metrics.

### Don't:

- **Don't** turn the dashboard into a decorative card gallery; its density serves triage and follow-up.
- **Don't** use triage red or amber for non-clinical decoration.
- **Don't** add heavy shadows, saturated gradients, or oversized radii that weaken the compact clinical character.
- **Don't** hide safety guidance or imply that the interface diagnoses the patient.
- **Don't** shrink the desktop sidebar into an icon-only rail on mobile; use the established drawer pattern.
