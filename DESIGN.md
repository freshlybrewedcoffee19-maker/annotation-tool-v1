---
name: Cheddar Vox
description: Cream, red and dark ink around footage, labels and human review.
colors:
  red: "#2563EB"
  red-deep: "#172033"
  ink: "#172033"
  cream: "#FFFDF8"
  muted: "#475569"
  line: "#DBEAFE"
  paper: "#FFFFFF"
  warm-hover: "#DBEAFE"
  pending: "#FFB82E"
  verified: "#284b2e"
  verified-surface: "#e0ebdf"
  disqualified: "#841c22"
  disqualified-surface: "#f5dddd"
typography:
  display:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "clamp(42px, 5.3vw, 72px)"
    fontWeight: 550
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  review-title:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 550
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 700
  body:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  hero-body:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
  note:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  field: "12px"
  media: "16px"
  chip: "20px"
  button: "24px"
  sprint-button: "32px"
spacing:
  compact: "8px"
  control: "12px"
  content: "20px"
  section: "24px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.red-deep}"
  button-neutral:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
  button-sprint:
    backgroundColor: "linear-gradient(155deg, #cc4249, #2563EB 65%)"
    textColor: "{colors.paper}"
    rounded: "{rounded.sprint-button}"
    padding: "15px 30px"
    height: "58px"
  button-sprint-secondary:
    backgroundColor: "linear-gradient(155deg, #55403a, #172033 65%)"
    textColor: "{colors.paper}"
    rounded: "{rounded.sprint-button}"
    padding: "15px 30px"
    height: "58px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px"
  review-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.media}"
    width: "650px"
  status-chip:
    backgroundColor: "{colors.pending}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "6px 12px"
---

# Design System: Cheddar Vox

## Overview

**Creative North Star: "Footage, labels and a human check"**

The existing Cheddar Vox identity is the authority: warm cream, paper surfaces, dark brown text, restrained red and the typed brand. Real footage provides the imagery. The opening page uses the approved Relay composition; large rounded actions carry the approved Build Sprint button treatment.

The workspace gives video the largest working area, keeps microphone and labels nearby, and uses quieter bordered surfaces for precise data. Review gives one segment a focused card. The landing composition is a surface choice, not a required layout for every screen.

**Key Characteristics:**
- Warm cream canvas and paper surfaces.
- Red actions and dark ink text.
- Rounded controls with clear selected states.
- Real footage at the centre of the work.
- Quiet borders for dense data, soft depth for media.

## Colors

The palette combines warm neutrals with the incumbent red identity; green appears only as review feedback.

### Primary
- **Brand Red:** typed brand, primary actions, active workspace step and recorded segments.
- **Deep Red:** primary hover feedback.

### Secondary
- **Verified Green:** the Verify action and verified status text.
- **Verified Surface:** the background of the verified review chip.
- **Disqualified Red / Surface:** rejected review status, distinct from the ordinary brand action.

### Neutral
- **Cream:** page canvas.
- **Paper:** fields, toolbars, tables and review card.
- **Ink:** primary text and the secondary opening action.
- **Muted Brown:** supporting copy, field details and navigation links.
- **Warm Line:** borders, table divisions and workflow separators.
- **Warm Hover:** neutral control hover.
- **Pending:** review chip before a decision.

**The Brand Continuity Rule.** Extend the cream, paper, ink and red identity on new surfaces; keep review colours tied to their stated meaning.

## Typography

**Display Font:** incumbent Segoe UI with sans-serif fallback.
**Body Font:** incumbent Segoe UI with sans-serif fallback.

The existing font is preserved deliberately. Larger titles use moderate weight and tight tracking; interface labels are heavier than supporting explanations. No separate display face or mono family is established.

### Hierarchy
- **Display:** the opening title, constrained to an 850px measure; on phones it resolves to 42px.
- **Headline:** setup question, with a phone override of 34px.
- **Review title:** review heading; phones use 25px. Segment titles use 27px, then 24px on phones.
- **Title:** dashboard section headings.
- **Body:** regular interface copy. Opening explanation uses the hero-body role and a 520px maximum width.
- **Label:** field labels and supporting controls; sentence case.
- **Note:** quiet status and guidance; small metadata details use 12px where already implemented.

**The Task Hierarchy Rule.** Give the current question or footage decision the strongest title; keep storage details and secondary navigation quieter.

## Layout

The dashboard has a centred maximum width of 1320px with 32px outer padding, reduced to 20px at 850px. Setup is capped at 1200px with a centred 570px question area. The opening page has a full-width cream canvas and horizontal padding of clamp(20px, 5vw, 88px).

Annotation uses a two-column video and voice area with a 1.85:1 proportion, a 285px minimum control column and a 28px gap. At 850px it becomes 1.4:1 with a 260px minimum and a 20px gap; at 700px it stacks. Supporting manual controls use two columns with a 32px gap, then stack on phones. Review centres a card capped at 650px.

Opening actions sit beside each other and become a centred vertical group capped at 380px on phones. The film sequence shows five frames on wide screens and three on phones. Keep horizontal overflow inside the segment table rather than shrinking precise data. Setup progress wraps, with the question count inside its navigation above the named stages.

## Elevation & Depth

Most working surfaces use paper colour and fine warm borders. Soft, diffuse shadows lift media cards and the prominent opening actions. There are no hard offset shadows. The opening canvas has a gentle warm radial glow; setup has a restrained peach glow at its upper right.

### Shadow Vocabulary
- **Film depth** (`0 14px 26px rgba(44,26,23,.16)`): receding trial frames.
- **Review depth** (`0 16px 32px rgba(44,26,23,.12)`): the focused segment card.
- **Action depth** (`0 5px 12px rgba(44,26,23,.1)`): opening and setup sprint actions.

**The Media Depth Rule.** Reserve diffuse lift for footage and prominent sprint actions; organise dense working data with borders and tonal surfaces.

## Shapes

Pill-like buttons use the button radius; sprint actions use the larger sprint-button radius. Fields use the field radius. Main media, review cards and the dashboard toolbar use the media radius. Review status and label chips use the chip radius. Smaller legacy data panels retain their existing modest corners; do not flatten them or assume every container is a pill.

## Components

### Buttons

Rounded and legible, with sentence-case labels. Neutral actions are paper with ink text and a warm-line border. Primary actions are red with paper text. Sprint actions have the gradients recorded above, a 600 weight and a subtle shadow; phones reduce their minimum height to 54px and padding to 14px 22px. The dark variant is the second opening choice. Verify is green; Disqualify is outlined in red.

Hover changes fill or text colour over 150ms with ease timing. Keyboard focus uses a 3px red outline offset by 4px for the main interactive elements; selects retain their source 2px offset. Disabled buttons use half opacity and a default cursor. Reduced-motion mode removes button transitions.

### Chips

Voice labels are small paper chips with warm borders. Review chips use pending, verified or disqualified colours and always include a written status. Setup uses dark ink for its current stage, red text for completed stages and muted text for future stages.

### Cards / Containers

The review card is paper with rounded media corners, clipped footage and soft review depth. Its top row has 16px 20px padding; its caption has 20px 24px 24px padding. Phone padding becomes 12px 16px at the top and 18px in the caption. Data containers remain quieter, using paper and warm-line borders.

### Inputs / Fields

Paper fields with ink text, warm-line borders and rounded field corners. Regular fields use 10px padding; setup textareas use 18px padding, a 170px minimum height and 1.7 line height. Labels sit above fields with an 8px gap. Errors appear as written messages on a pale warm-red surface.

### Navigation

Workspace stages are rounded outlined buttons above a warm-line divider; the selected stage is solid red. On phones the small number is hidden while the stage name remains. Setup progress is a separate centred stage row. Back, Next and the save guidance share a footer row that wraps on narrow screens. The redundant current-step announcement is visually hidden but remains available to assistive technology.

### Footage sequence

Real trial frames form a shallow fan with the centre frame largest and upright, adjacent frames angled by three degrees and outer frames by seven degrees. Outer frames recede with opacity. This approved opening motif is specific to the landing page, not a reusable data-card treatment.

## Do's and Don'ts

### Do:
- **Do** preserve the cream, paper, ink and red identity.
- **Do** keep video and voice controls adjacent on laptops and stacked on phones.
- **Do** pair review colours with written status labels.
- **Do** retain visible keyboard focus and reduced-motion support.
- **Do** keep dense segment data readable in a horizontally scrollable table.

### Don't:
- **Don't** replace the established Segoe UI family without an explicit identity decision.
- **Don't** turn the landing footage fan into a rule for every screen.
- **Don't** use review green as a second general brand accent.
- **Don't** introduce hard offset shadows into this soft media treatment.

## Approved Cheddar Vox brand — 6 October 2026
Company: Cheddar Vox. Tagline: Voice led video annotation tool.
Cheddar Yellow #FFB82E for primary actions/brand accents; Cheddar Orange #F59E0B for depth/hover; Vox Blue #2563EB for voice/interaction; Deep Navy #172033 for text; Soft Blue #DBEAFE for secondary UI; Warm White #FFFDF8 for backgrounds; White #FFFFFF for cards. Existing geometry and workflows retained. Semantic warning/error colors remain distinct with text labels. This approved palette supersedes the historical cream/red description above.

Services sample refinement — 6 October 2026: reuse original owner's dataset section: left copy and pilot link, right compact portrait 400:540 video with timed human-annotation overlay and segmented playhead. Preserve original copy/statistics verified against the pilot card. Phone stacks copy over portrait media. Blue/white annotation overlay and orange playhead follow the Cheddar Vox palette. Preserve remainder of services page.
