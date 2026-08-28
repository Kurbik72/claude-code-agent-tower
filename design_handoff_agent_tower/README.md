# Handoff: Claude Code Agent Visualizer — Agent Tower

## Overview
An isometric "office tower" visualization of a Claude Code agent run. Five floors map to five
areas of a codebase (Frontend, Testers, QA, DevOps, Backend). Each floor is a cutaway isometric
room populated with agent characters; a single elevator car travels the shaft between floors to
show which floor currently holds focus. Floor lights turn on automatically whenever a floor has
active agents and go dark when it is idle, so the tower reads as a live activity map at a glance.
Clicking any agent opens an inspector modal ("внутри головы") that streams that agent's reasoning
lines and its list of called tools with per-tool status.

The canonical, most developed design is **Agent Tower.dc.html**. The other three files are
earlier explorations of the same idea and are included as context, not as targets.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the
intended look, layout and behavior. They are not production code to lift directly.

The task is to **recreate these designs in the target codebase's existing environment** (React,
Vue, Svelte, SwiftUI, native, whatever is already in use), using its established component
patterns, styling layer and animation library. If the project has no environment yet, choose the
framework that best fits it and implement the designs there.

Two authoring specifics of these files that should **not** be carried into production:
- All styling is written as **inline `style` attributes**. This is a constraint of the prototyping
  environment, not a design decision. In production, use the codebase's normal styling layer
  (CSS modules, Tailwind, styled-components, etc.).
- `support.js` and the `<x-dc>` / `{{ hole }}` / `<sc-for>` / `<sc-if>` syntax are the prototyping
  runtime. Replace them with the framework's own templating and list rendering. `support.js` is
  bundled only so the HTML files open and run for review.

To review a design: open the `.dc.html` file directly in a browser (all four sit next to
`support.js`, which they load relatively).

## Fidelity
**High-fidelity.** Colors, typography, spacing, floor geometry, animation timings and copy are
all final. Recreate the UI pixel-accurately, using the codebase's existing primitives where they
exist and matching these values where they do not.

Copy is in **Russian** and is final — do not rewrite or translate it.

## Screens / Views
The design is a single full-viewport screen. Root element: `height: 100vh; min-height: 500px;
min-width: 1080px;` laid out as `display: grid; grid-template-rows: auto 1fr auto` —
header / body / footer. Page background `oklch(0.11 0.008 70)`, default text
`oklch(0.72 0.012 80)`. `html, body { overflow-x: auto; overflow-y: hidden }`.

### 1. Header (row 1, `auto`)
`display: flex; align-items: center; gap: 24px; padding: 11px 20px;`
background `oklch(0.15 0.012 70)`, `border-bottom: 1px solid oklch(0.26 0.02 70)`.

Contents, left to right:
- **Title block** (`flex-column; gap: 3px`)
  - "Claude Code · башня агентов" — SF Pro Display 700, 17.5px, `letter-spacing: 0.014em`,
    `text-transform: uppercase`, `line-height: 1`, `white-space: nowrap`, `oklch(0.93 0.02 80)`.
    No subtitle line.
- **Status chips** (`flex; gap: 8px; flex-wrap: wrap`). Each chip: `flex; align-items: center;
  gap: 7px; padding: 5px 10px`, 1px border, label 11.5px `letter-spacing: 0.08em`. Four chips:
  1. "на смене {count}" — border `oklch(0.28 0.02 70)`, bg `oklch(0.17 0.012 70)`,
     7px round green dot `oklch(0.75 0.13 148)` with `box-shadow: 0 0 8px` same color
  2. "свет горит {n}/5" — same frame, amber dot `oklch(0.92 0.09 88)`, glow `oklch(0.9 0.1 86)`
  3. "темно {n}" — `border: 1px dashed oklch(0.3 0.02 70)`, bg `oklch(0.16 0.01 70)`,
     text `oklch(0.6 0.012 80)`, marker is a 7px hollow square `1px solid oklch(0.44 0.012 80)`
  4. "ударов {n}" — border `oklch(0.34 0.06 40)`, bg `oklch(0.18 0.02 40)`,
     text `oklch(0.86 0.05 60)`, marker is a 16×10px whip glyph in `oklch(0.72 0.1 44)` drawn with
     `clip-path: polygon(0 0, 34% 20%, 62% 62%, 100% 100%, 82% 100%, 48% 66%, 22% 26%, 0 14%)`
- **Right-aligned readouts** (`margin-left: auto; flex; align-items: stretch; gap: 18px`), split by a
  `1px` vertical rule in `oklch(0.26 0.02 70)`. Each: 10px uppercase label
  `letter-spacing: 0.16em` `oklch(0.5 0.012 80)` over a Barlow Condensed 700 24px `line-height: 1`
  value.
  - "токены смены" → value `oklch(0.9 0.02 84)`
  - "лифт" → current floor badge, value `oklch(0.79 0.13 76)`

### 2. Body (row 2, `1fr`)
`display: grid; grid-template-columns: 272px minmax(0, 1fr); gap: 1px; min-height: 0;`
background `oklch(0.24 0.018 70)` (the 1px gap reads as a divider).

#### 2a. Sidebar — 272px, `oklch(0.145 0.012 70)`, `flex-column`
- **Object header**, `padding: 12px 14px 11px`, `border-bottom: 1px solid oklch(0.24 0.018 70)`:
  "объект" (10px, `letter-spacing: 0.18em`, uppercase, `oklch(0.52 0.012 80)`),
  "agents-lab / 5 этажей" (12.5px, `oklch(0.9 0.014 84)`, `margin-top: 5px`).
- **Floor list** — scrollable (`flex: 1; min-height: 0; overflow-y: auto`), one row per floor,
  top floor first. Row: `padding: 10px 14px`, `cursor: pointer`,
  `border-bottom: 1px solid oklch(0.175 0.014 70)`, `border-left: 2px solid <floor accent>`,
  background varies with selected/lit state, plus a hover state.
  - Line 1: floor number (Barlow Condensed 700, 20px, `line-height: 1`, floor accent) ·
    title (12px, `oklch(0.9 0.014 84)`) over subtitle (9.5px, `letter-spacing: 0.1em`,
    `oklch(0.55 0.014 80)`, single-line ellipsis) · 9px round status lamp with a matching
    `box-shadow` glow, `flex: none`
  - Line 2 (`margin-top: 7px`): agent count (10.5px, `oklch(0.6 0.014 80)`) and a right-aligned
    light toggle button (`padding: 4px 8px`, 9.5px, `letter-spacing: 0.1em`, uppercase,
    `oklch(0.78 0.02 82)`, 1px border). Clicking the row focuses the floor and sends the
    elevator; clicking the toggle overrides that floor's light and must not bubble to the row.
- **Event feed** — header strip `padding: 10px 14px 8px` with "поток событий" (10px, uppercase,
  `letter-spacing: 0.18em`, `oklch(0.52 0.012 80)`) and a right-aligned total
  (10px, `oklch(0.42 0.012 80)`); then a scrollable list. Row: `flex; gap: 9px;
  padding: 7px 14px; border-bottom: 1px solid oklch(0.175 0.014 70)` — timestamp
  (10px, `oklch(0.46 0.012 80)`, `padding-top: 1px`), a 5px round severity dot
  (`margin-top: 5px`, per-event color), then the message text.

#### 2b. Tower canvas — the main stage
A `position: relative; overflow: hidden` viewport containing a **1180 × 2560px absolutely
positioned world** that is pan/zoomed via `transform` with `transform-origin: 0 0`. Behind the
floors sits a full-size vertical gradient backdrop.

**Floor geometry (important — this is the core of the design).** Every floor is a 760 × 600px
absolutely positioned wrapper at `left: 240px`, stacked on a **470px vertical step**:

| Floor | id | Label | Subtitle | Accent | wrapper `top` |
|---|---|---|---|---|---|
| 05 | f5 | Frontend | терраса · шезлонги · смузи | `oklch(0.8 0.06 200)` | 30px |
| 04 | f4 | Тестировщики | смокинги · переговорка | `oklch(0.8 0.05 84)` | 500px |
| 03 | f3 | QA | кухня · борщ · ноутбуки | `oklch(0.78 0.04 96)` | 970px |
| 02 | f2 | DevOps | приёмная · рецепшн · пол | `oklch(0.76 0.05 160)` | 1440px |
| 01 | f1 | Backend | подвал · окно на помойку | `oklch(0.74 0.04 84)` | 1910px |

Floor 05 is flagged `noWhip` (it is the terrace and is exempt from the whip event).

The 470px step is deliberate: each floor plate is 600px tall, so the step must stay well above the
~380px that made adjacent plates overlap. If floors are ever made taller, raise the step and the
world height together.

Isometric construction, per floor, all inside the 760 × 600 wrapper:
- **Floor slab top**: `clip-path: polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)` —
  a 2:1 isometric diamond. Fill is a striped
  `repeating-linear-gradient(26.565deg, oklch(0.68 0.055 70) 0 26px, oklch(0.62 0.05 68) 26px 30px)`.
  `26.565deg` = `atan(0.5)`, the 2:1 isometric angle — use it everywhere.
- **Slab edge** (the 20px-thick side of the plate):
  `clip-path: polygon(20px 380px, 380px 560px, 740px 380px, 740px 400px, 380px 580px, 20px 400px)`,
  fill `oklch(0.34 0.03 62)`.
- **Glass walls**: two 360 × 70px rectangles skewed into the isometric planes —
  left wall at `left: 20px; top: 310px` with `transform: skewY(-26.565deg)`, right wall at
  `left: 380px; top: 130px` with `skewY(26.565deg)`, both `transform-origin: 0 100%`,
  fill `oklch(0.86 0.03 208 / 0.22)`, `box-shadow: inset 0 0 0 1px oklch(0.9 0.02 200 / 0.4)`.
  Each is capped by a 360 × 7px rail in `oklch(0.9 0.02 200)` 6px above it (same skew).
- **Ceiling lights** (rendered only when the floor is lit): a 300 × 4px rail in
  `oklch(0.5 0.02 70)` skewed `-26.565deg`, with four 11px round bulbs
  `oklch(0.94 0.1 88)` and `box-shadow: 0 0 18px 6px oklch(0.9 0.11 86 / 0.5)`, stepped along the
  isometric axis (x +70px / y −34px per bulb).
- **Support column**: 10 × 190px, `oklch(0.72 0.02 84)`, high `z-index` so it occludes furniture.
- Furniture, props and agent characters are then absolutely positioned inside the same wrapper and
  z-ordered back-to-front. Read them per floor from `Agent Tower.dc.html`; each floor has its own
  themed set (terrace loungers, meeting room, kitchen, reception, basement).

**Elevator.** Two 4px shaft rails at `left: 1030px` and `left: 1112px`, `top: 90px`,
`height: 2430px`, filled `linear-gradient(180deg, oklch(0.42 0.02 70), oklch(0.24 0.014 66))`.
The car is 94 × 116px at `left: 1026px`, `z-index: 8`, and animates on `top` with
`transition: top 1.15s cubic-bezier(0.4, 0, 0.3, 1)`. Car `top = floor.top + 260`, so
floor 05 → 290px and floor 01 → 2170px; the default resting position is floor 01 (2170px).
Inside the car: a recessed cabin panel (`inset 8px 10px 26px 8px`, `oklch(0.16 0.012 64)`,
`box-shadow: inset 0 0 0 1px oklch(0.36 0.02 70)`), a 3px center door split in
`oklch(0.36 0.02 70)`, and the floor badge at `left: 12px; bottom: 8px` — 11px,
`letter-spacing: 0.18em`, `oklch(0.8 0.09 84)`.

**Agent hover card.** Appears on agent hover, anchored to the agent's world position:
`position: absolute` at the agent's x/y, `width: 260px; margin-left: -130px;
transform: translateY(-100%)`, `z-index: 60`, `pointer-events: none`.
Background `oklch(0.16 0.012 68 / 0.97)`, `border: 1px solid oklch(0.34 0.02 70)`,
`box-shadow: 0 18px 44px oklch(0.06 0.006 60 / 0.7)`. Header row: `flex; align-items: center;
gap: 8px; padding: 9px 11px; border-bottom: 1px solid oklch(0.26 0.02 70)` — 7px status dot,
then the agent name at 12.5px `oklch(0.93 0.014 84)`.

Below the event feed, a hint strip (`padding: 10px 14px`,
`border-top: 1px solid oklch(0.24 0.018 70)`, 10px, `line-height: 1.7`, `oklch(0.48 0.012 80)`):
"колесо — зум · тяни мышкой — панорама · клик по этажу — приблизить · клик по агенту — заглянуть в
голову".

**Zoom controls.** `position: absolute; right: 14px; bottom: 14px; z-index: 70;
flex; align-items: center; gap: 7px`. Two 34 × 34px square buttons (− then +), centered content,
17px glyph in `oklch(0.86 0.014 84)`, `cursor: pointer`.

#### 2c. Agent inspector modal — "внутри головы"
Opened by clicking an agent; rendered inside the canvas section, not the page root.

- **Backdrop**: `position: absolute; inset: 0; z-index: 100; display: flex; align-items: center;
  justify-content: center; padding: 28px`, `background: oklch(0.08 0.006 60 / 0.78)`,
  `backdrop-filter: blur(3px)`. Clicking it closes the modal.
- **Panel**: `width: 780px; max-width: 100%; cursor: default`, background `oklch(0.155 0.012 68)`,
  `border: 1px solid oklch(0.32 0.02 70)`, `box-shadow: 0 30px 80px oklch(0.06 0.006 60 / 0.8)`.
  Clicks inside must stop propagation so they do not close it.
- **Header row**: `flex; align-items: center; gap: 14px; padding: 12px 16px;
  border-bottom: 1px solid oklch(0.26 0.02 70)`, background `oklch(0.185 0.014 68)`.
  - Avatar: 28 × 28px, `border-radius: 14px 14px 9px 9px`, `oklch(0.74 0.045 62)`, with two 4px
    round eyes `oklch(0.24 0.02 60)` at `left: 7px / 17px, top: 10px`.
  - Title: "внутри головы · {agent name}" — SF Pro Display 700, 18px, `letter-spacing: 0.03em`,
    uppercase, `line-height: 1.1`, `oklch(0.93 0.02 84)`; followed by a 7px round status dot in the
    agent's status color (same palette as the hover card: work `oklch(0.75 0.13 148)`,
    wait `oklch(0.79 0.13 76)`, dead `oklch(0.6 0.19 28)`).
  - Subtitle: "{role} · {task}" — 11px, `letter-spacing: 0.045em`, `oklch(0.58 0.014 80)`,
    single-line ellipsis.
  - Close button, `margin-left: auto`: "выйти", `padding: 7px 13px`, 10.5px,
    `letter-spacing: 0.09em`, uppercase, `oklch(0.72 0.014 80)`,
    `border: 1px solid oklch(0.34 0.02 70)`, bg `oklch(0.17 0.012 68)`;
    hover bg `oklch(0.26 0.02 70)`, text `oklch(0.95 0.02 84)`.
- **Body**: `display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
  background: oklch(0.26 0.02 70)` (the gap is the divider). Both columns `min-height: 230px`,
  `padding: 14px 16px 18px`. Column labels are 10px, `letter-spacing: 0.081em`, uppercase,
  `oklch(0.55 0.014 80)`, `margin-bottom: 11px`.
  - **Left — "рассуждения"**, background `oklch(0.155 0.012 68)`. Lines in a
    `flex-column; gap: 8px`; each line is `flex; gap: 8px`, a `›` marker in `oklch(0.62 0.09 76)`
    plus text at 12.5px, `line-height: 1.5`, `oklch(0.82 0.014 84)`, `text-wrap: pretty`.
    While lines are still arriving, an 8 × 14px caret block `oklch(0.79 0.13 76)` blinks below them
    (`animation: bulb 1s steps(2) infinite`); it disappears when the stream finishes.
    Before the first line lands, one placeholder line reads "загружаю контекст...".
  - **Right — "вызванные инструменты"**, background `oklch(0.145 0.012 66)`. Rows in a
    `flex-column; gap: 6px`; each row `flex; align-items: center; gap: 10px; padding: 8px 10px`,
    background `oklch(0.18 0.012 66)`, `border-left: 2px solid <status color>`. Tool name is
    monospace (`ui-monospace, 'SF Mono', Menlo, monospace`), 11.5px, `oklch(0.87 0.014 84)`,
    single-line ellipsis; status label is 9.5px, `letter-spacing: 0.081em`, uppercase, in the same
    status color.
    Status colors: `ок` `oklch(0.74 0.12 148)` · `идёт` `oklch(0.86 0.12 84)` ·
    `ждёт` `oklch(0.6 0.016 80)` · `упал` `oklch(0.64 0.19 28)`.
- **Footer**: `padding: 10px 16px; border-top: 1px solid oklch(0.26 0.02 70)`, 10.5px,
  `letter-spacing: 0.045em`, `oklch(0.52 0.014 80)`. Text:
  "этаж {num} · контекст {n}% · агент не знает, что за ним наблюдают".
  In the prototype the percentage is faked as `42 + name.length`; in production use the real
  context-window usage.

### 3. Footer (row 3, `auto`)
Legend / status strip matching the header's chip vocabulary.

## Interactions & Behavior
- **Click a floor row** (sidebar) → that floor becomes focused and the elevator travels to it
  (`top` transition, 1.15s, `cubic-bezier(0.4, 0, 0.3, 1)`). The header "лифт" badge and the car's
  own badge update to the new floor.
- **Click a floor plate** in the canvas → same focus behavior as the sidebar row.
- **Click a floor's light toggle** → overrides that floor's light on/off, independently of its agent
  count. Must stop propagation so the row's focus handler does not also fire.
- **Automatic lighting** → a floor with at least one active agent lights up; an empty floor goes
  dark. The header's "свет горит n/5" and "темно n" chips recount on every change.
- **Hover an agent** → the hover card fades in above the agent with its name, status and current
  task. The card is `pointer-events: none` and must never block the plate click beneath it.
  While the inspector modal is open the hover card is suppressed.
- **Click an agent** → opens the inspector modal for that agent (stop propagation so the floor
  plate does not also handle the click). Agents on a floor whose light has been switched off
  (evacuated) do not open. On open: reasoning lines and tool rows are revealed one per **850ms**
  tick — one new reasoning line and one new tool row per tick, starting with one tool row already
  visible; the tick stops once both lists are fully shown. The open also appends an event to the
  feed ("открыт поток мыслей {name}. он не в курсе.", dot color `oklch(0.78 0.09 210)`).
- **Close the inspector** → the "выйти" button, a click on the backdrop, or `Escape`
  (a `window` keydown listener, registered on mount and removed on unmount). Closing clears the
  streamed lines and stops the tick.
- **Zoom buttons** → step the world `transform` scale down / up. `transform-origin: 0 0`, and the
  canvas clips (`overflow: hidden`) with horizontal page scroll allowed (`min-width: 1080px`).
- **Event feed** → new events prepend; the list scrolls independently of the floor list.
- **Whip event** → a periodic "motivation" beat on a random non-terrace floor. The whip enters from
  above, cracks, and retracts; the affected agent jolts. Floor 05 (`noWhip`) is never targeted, and
  the "ударов" counter increments per crack.
- **Ambient loops** run continuously and independently of agent state (see Animations).

## Animations
All are CSS `@keyframes` loops or one-shots. Timings and easings are part of the design.

| Name | What it drives | Notes |
|---|---|---|
| `bulb` | incandescent bulb flicker | opacity 1 → .84 → .5 → .93 → .68, irregular stops |
| `fluor` | fluorescent tube stutter | sharp double-blink at 21–23% and 62–66% |
| `crt` | monitor scanline scroll | `translateY(0 → -50%)`, linear, seamless loop on a 2× tall strip |
| `typeR` / `typeL` | typing hands | `rotate(8 → 24deg)` / `rotate(-24 → -8deg)`, alternate |
| `breathe` | idle character bob | `translateY(0 → -2px → 0)` |
| `jolt` | whip reaction | `-9px` up, then `+3px` with `scaleY(.94)` squash, settling |
| `whipEnter` | whip entry / exit | in from `-80px` by 15%, hold to 66%, out to `-60px` |
| `handleSwing`, `lashSeg`, `lashTip`, `lashSwing` | whip segments | staggered rotations; `lashTip` swings widest (`-74 → 60deg`) — chain them per segment for the crack |
| `flash` | crack impact | `scale(.2 → 1 → 2.1)` with opacity `0 → 1 → 0` |
| `bubble` | chat / thought bubbles | rise `8px → -20px` with fade in and out |
| `steam` | kitchen steam | `translateY(0 → -70px)` + `scale(.7 → 1.6)`, peak opacity .55 |
| `stir` | stirring arm | `rotate(-30 → -62 → -30deg)` |
| `sway`, `waddle`, `tail` | ambient character motion | small alternating rotations |
| `rain` | rain streaks on a screen | `translateY(-30px → 150px)`, linear, ~0.64–0.72s, staggered delays |
| `sip` | drinking | `rotate(0 → -16deg)` hold, return |
| `twinkle` | small lights | opacity .75 ↔ .2 |

Elevator travel is a CSS `transition` (not a keyframe): `top 1.15s cubic-bezier(0.4, 0, 0.3, 1)`.

## State Management
State lives in one component. Shape:
- `floors` — the five records in the table above (`id`, `num`, `title`, `sub`, `tone`, `top`,
  `noWhip`), plus per-floor agent lists and a light override.
- `lift: { y, floor }` — the car's pixel `top` and the focused floor id. Derived: `y = floor.top + 260`.
  Defaults to floor `f1` / `y: 2170`.
- `view` — pan/zoom transform for the world layer.
- `events` — the event feed, newest first, each with `time`, `color`, message.
- `card` — hovered agent (`x`, `y`, `name`, `dot`, status/task) or null; forced to null while the
  inspector is open.
- `open` — id of the agent whose inspector is showing, or null.
- `lines` — the reasoning lines revealed so far for `open` (array, grows one per tick).
- `toolsShown` — how many tool rows are revealed so far (integer, min 1 while open).

Per-agent inspector content is static reference data keyed by agent id:
`{ think: string[], tools: { n: string, s: 'ок' | 'идёт' | 'ждёт' | 'упал' }[] }`.
All 17 agents have their own set (see `this.minds` in `Agent Tower.dc.html`); waiting agents have a
single thought and one `ждёт` tool, the dead agent has one `упал` tool. In production this comes
from the real agent's thinking stream and tool-call log.
- `stats` — derived, not stored: `shift` (agents on duty), `lit`, `dark`, `whips`, `tokens`, `events`.

Transitions: floor click → set `lift`; toggle click → flip that floor's light override; timers →
append events, increment tokens, fire the periodic whip; agent hover → set/clear `card`;
zoom buttons → adjust `view`.

The prototype drives everything from local timers with synthetic data. In production, replace those
timers with the real agent-run event stream and derive the same state from it.

## Design Tokens

**Colors** — the whole design is authored in `oklch()`, a warm near-neutral dark palette (hues
60–96) with a small set of saturated signal colors. Keep it in `oklch`; converting to hex loses
the tuned lightness relationships.

Surfaces (darkest → lightest):
`oklch(0.11 0.008 70)` page · `oklch(0.145 0.012 70)` sidebar · `oklch(0.15 0.012 70)` header ·
`oklch(0.16 0.01 70)` / `oklch(0.17 0.012 70)` chips · `oklch(0.16 0.012 68 / 0.97)` hover card ·
`oklch(0.16 0.012 64)` elevator cabin

Borders and rules:
`oklch(0.175 0.014 70)` list divider · `oklch(0.24 0.018 70)` panel divider ·
`oklch(0.26 0.02 70)` header border · `oklch(0.28 0.02 70)` chip border ·
`oklch(0.3 0.02 70)` dashed chip · `oklch(0.34 0.02 70)` card border ·
`oklch(0.36 0.02 70)` elevator trim

Text:
`oklch(0.93 0.02 80)` title · `oklch(0.9 0.014 84)` primary · `oklch(0.72 0.012 80)` body ·
`oklch(0.6 0.014 80)` secondary · `oklch(0.55 0.014 80)` tertiary ·
`oklch(0.52 0.012 80)` section label · `oklch(0.46 0.012 80)` timestamp ·
`oklch(0.42 0.012 80)` faintest

Signal:
`oklch(0.75 0.13 148)` active green · `oklch(0.92 0.09 88)` light-on amber ·
`oklch(0.94 0.1 88)` bulb · `oklch(0.79 0.13 76)` elevator / link accent ·
`oklch(0.88 0.1 76)` link hover · `oklch(0.72 0.1 44)` whip · `oklch(0.86 0.05 60)` whip text

Structure:
`oklch(0.68 0.055 70)` / `oklch(0.62 0.05 68)` floor stripes · `oklch(0.34 0.03 62)` slab edge ·
`oklch(0.86 0.03 208 / 0.22)` glass · `oklch(0.9 0.02 200)` glass rail ·
`oklch(0.72 0.02 84)` column

Floor accents: see the floor table.

**Typography** — `Agent Tower.dc.html` uses **no web fonts**. Body and UI:
`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica,
sans-serif`; titles and big numerals are the same stack at weight 700 (`'SF Pro Display'` first).
Tool names in the inspector are `ui-monospace, 'SF Mono', Menlo, monospace`.
Scale in use: 9.5 · 10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 14 px body; 17.5 · 18 · 20 · 24 · 46 px
display. Label convention: uppercase + `letter-spacing` 0.045–0.081em at 9.5–10px.
Numeric readouts use `font-variant-numeric: tabular-nums`.

(The three older exploration files still load `IBM Plex Mono` and `Barlow Condensed` from Google
Fonts. The tower does not — match the tower.)

**Spacing** — 2 · 3 · 5 · 7 · 8 · 9 · 10 · 11 · 14 · 18 · 20 · 24 px. Sidebar 272px. 1px grid gaps
used as dividers.

**Radius** — effectively none; the design is deliberately square. Exceptions are `border-radius: 50%`
status dots and bulbs, and small radii on props (2–3px).

**Shadows** — glows rather than drop shadows: `0 0 8px <color>` on status dots,
`0 0 18px 6px oklch(0.9 0.11 86 / 0.5)` on bulbs, `inset 0 0 0 1px <color>` for hairline frames,
and one real elevation: `0 18px 44px oklch(0.06 0.006 60 / 0.7)` on the hover card.

**Isometric constants** — projection angle `26.565deg` (2:1), floor plate 760 × 600px,
diamond `polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)`, vertical floor step 470px,
world 1180 × 2560px, elevator car offset `+260px` from floor top.

## Assets
None. Every visual — the tower, the isometric floors, the agent characters, the furniture, the whip,
the icons — is built from positioned `div`s with `clip-path`, `transform: skewY()`,
`repeating-linear-gradient` and `border-radius`. There are no images, sprites, icon fonts or SVG
files to carry over.

No external dependencies: the tower is system-font only.

If this ships inside an Anthropic surface, use the existing brand type and color system in the
codebase rather than re-declaring these tokens.

## Screenshots
In `screenshots/`, captured from `Agent Tower.dc.html` in a ~920px-wide viewport at 0.84 page
zoom, so they are indicative of composition rather than of true pixel sizes. The `.dc.html` file is
the source of truth for measurements.
- `tower-overview.png` — whole tower fitted in the canvas, sidebar and event feed populated
- `tower-hover-card.png` — agent hover card over a floor
- `tower-inspector.png` — the "внутри головы" inspector open on `regress-lord`

## Files
- `Agent Tower.dc.html` — **the design to implement.** Isometric five-floor tower, elevator,
  automatic floor lighting, sidebar floor list + event feed, hover cards, agent inspector modal,
  zoom. 1246 lines.
- `Agent Building.dc.html` — early exploration of the same tower, floors 05 and 04 only. Useful for
  the per-floor `data-screen-label` naming. 282 lines.
- `Agent Console.dc.html` — a flat (non-isometric) console variant, single basement room. Its
  component class carries the fullest event/timer logic of the set; read it for the event-stream
  behavior. 708 lines.
- `Agent Visualizer.dc.html` — the original single-room version the tower grew out of. 522 lines.
- `support.js` — prototyping runtime, bundled only so the files open in a browser. Do not port.
