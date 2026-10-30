# Klip-Klop Design

Klip-Klop is a single-screen tool: paste a URL, watch, set a range, download. The design job is to keep that loop on one screen at every width.

## Identity

- **Mono is the identity.** `mono-light` is the default theme, and `mono-dark` is its pair. Flat surfaces, 2px borders, no shadows, IBM Plex Mono everywhere.
- **Neon is a skin.** `neon-light` and `neon-dark` stay available in the theme picker, but new UI is designed in mono first and then checked in neon. Never design neon-only.
- **Logo: Trim Brackets, ink tile (M1).** A solid tile with `[ ▶ ]` cut out of it. In the app header it uses `fill-foreground` for the tile and `stroke-background` / `fill-background` for the glyph, so it inverts with the theme. The favicon (`src/app/icon.svg`) is fixed at `#1a1c1c` and white.

## Tokens

All colors come from CSS variables in `src/app/globals.css`, exposed as Tailwind colors. Never hardcode colors or use opacity hacks like `text-foreground/50`.

| Token | Use |
| --- | --- |
| `background` | Page and card background |
| `secondary-background` | Inputs, list items, raised surfaces |
| `foreground` | Body text and icons |
| `muted-foreground` | Labels, hints, metadata, placeholders (meets 4.5:1 in every theme) |
| `main` / `main-foreground` | The single primary action (Download) and the active tab |
| `border` | All 2px borders |
| `ring` | Focus rings, always with `ring-offset-background` |

Shape: `rounded-base` (5px), `border-2`. Shadows and the press offset exist only in neon; mono zeroes them through `--shadow` and `--spacing-boxShadow*`, so components can keep `shadow-shadow` and the hover-translate classes.

The video surface is the one exception: it is `bg-black` **only while a video is playing**. Empty and loading states use `secondary-background` and `muted-foreground`.

## Layout

One breakpoint carries the layout: **`lg` (1024px)**. The JS that scrolls the player into view after a URL is pasted uses the same line (`max-width: 1023px`). Keep both in sync.

### Desktop (≥ 1024px)

Done, keep as is.

- The page is locked to the viewport (`lg:h-screen`, content `lg:max-h-[90vh]`). The page itself never scrolls.
- Header card on top: logo, URL input (flexible), theme button (icon), stop-server button.
- Below it, a 3-column grid: the player spans 2 columns, the Controls card spans 1.
- The Controls card fills the height. Each tab panel scrolls on its own inside a `ScrollArea`.

### Mobile (< 1024px)

Design: "A · Stack + sticky bar" in the [mobile canvas](https://claude.ai/artifact/73KzrPvteLuEDgN9jjkzMR). The header stays a card (not an edge-to-edge bar) so it matches the rest of the page.

Top to bottom, in one page scroll:

1. **Header**: logo, name, then two 40px icon buttons, theme and stop server. The theme picker is icon-only at every width; it opens the theme list.
2. **URL input**, full width, its own row.
3. **Player**, 16:9, full width.
4. **Tabs**: Controls | Downloads (with count).
5. **Controls tab**: hint, Start, End (label left, three boxes right), Filename, Resolution. Filename and Resolution each get a full row; don't squeeze them into two columns.
6. **Sticky action bar** fixed to the bottom of the viewport, Controls tab only: Open folder (icon), Preview (icon + label), Download (`main`, icon + label, fills the rest). Pad the scroll content so the bar never covers the last field.

Rules:

- **No nested scroll on mobile.** Drop the `h-96` + `ScrollArea` below `lg`. The page scrolls; tab panels grow to their content.
- **Same control size as desktop.** Inputs and buttons stay `h-10` with `text-sm`; 44px and 16px felt oversized in the mono font. Download-list buttons are `h-9`. Known trade-off: iOS Safari zooms in when focusing a sub-16px input.
- **Tight spacing.** Page padding `px-3 pt-3`, cards `p-3`, gaps `gap-3`; desktop keeps its larger values. Bottom padding `pb-20` leaves room for the sticky bar.
- **Tab switch** (`ui/tabs.tsx` + `[data-tab-content]` in `globals.css`): the old panel fades out over 150ms on top of the new one, and the new panel's sections fade in over 400ms, staggered by 100ms (same timing as tms-geu). Off under `prefers-reduced-motion`.
- **Scroll areas never grow sideways.** The `ScrollArea` viewport forces Radix's inner `display: table` wrapper to `block`, so long filenames wrap instead of widening the card.
- **Icon-only buttons need `aria-label`**: Open folder (mobile bar), theme, stop server, and Preview in the Downloads list.
- **Downloads tab items**: filename, then size and expiry in `muted-foreground`, then one row of buttons: Preview (icon only, at every width), Copy link (icon + label), Download (icon + label).

### Time inputs stay as three boxes

Start and End are each **three separate number inputs (HH : MM : SS)** at every width. Do not merge them into one `HH:MM:SS` field:

- Each box selects its whole value on focus (`handleInputFocus`), so you can retype just the minutes. A single field loses that.
- The numeric keypad on iOS has no `:` key. A single field would need its own digit-mask parser.
- State is already `h` / `m` / `s` strings throughout (`getSeconds`, `getformattedTime`, `syncCurrentTime`, filename building). Three boxes need no conversion layer.

On mobile each time gets its own full-width row, so the three boxes stay wide enough to tap.
