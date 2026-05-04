# Pack Store Carousel

An interactive card carousel built with vanilla JavaScript and GSAP. Cards are arranged on an elliptical arc with one card elevated as the "hero" at the apex. Clicking, swiping, or using the arrow keys promotes any card to hero with a directional, physics-inspired shuffle animation.

---

## Features

### Elliptical Arc Layout
Cards sit on an invisible ellipse. The hero occupies the apex (top centre), and all other cards fan out to either side following the curve of the arc. Each card rotates to follow the ellipse tangent, so they appear to physically lie on the path. The arc is computed from live viewport dimensions, so it reflows correctly on resize.

### Hero Card
The active card is larger, sharp, fully bright, and has an edge glow that traces the shape of the pack image (using CSS `drop-shadow` on the PNG alpha). A soft radial gradient blooms behind it. The filter transition is timed to complete just before the card physically arrives so the image is already in-focus when it lands; the ambient blob transitions in slightly later as the card settles.

When a card first becomes hero it rises upward with a spring ease, giving it a sense of weight landing into place.

### Directional Shuffle
When a new card is selected, the animation plays in two waves based on which side the selected card is on:

1. **Same-side wave** — the selected card moves to the hero position immediately. Cards on the same side ripple outward from the selected card with a stagger delay.
2. **Opposite-side wave** — cards on the other side hold still until just before the selected card arrives, then begin their own ripple outward from the old hero position.

Each card's shuffle plays through three phases derived from an After Effects motion spec: an anticipation dip (K01), an accelerating drive through the target (K02), and a damped settle (K03).

### Long-Jump Slowdown
Jumping more than a set number of cards slows all shuffle phases by a configurable multiplier, giving bigger moves a more deliberate, weighty feel.

### Idle Float
After the carousel settles, the hero card gently bobs up and down on a looping ease. The first cycle eases in gradually to avoid a jolt on entry.

### Inactivity Shake
After 6 seconds without interaction, the hero card wiggles left and right to prompt the user. It plays once and then resets the inactivity timer.

### Hero Hover
Hovering the hero card scales it up slightly and intensifies the edge glow. Both the scale and glow animate in and out with separate GSAP tweens. The CSS filter transition is suppressed during hover so GSAP has full control; it is restored when the hover ends.

### Satellite Hover
Hovering any non-hero card scales it up by a separately configurable amount. The scale resets smoothly when the mouse leaves, and is snapped to normal if the card is selected while hovered.

### Hero Click
Clicking the hero card triggers a quick scale squeeze-down followed by a springy bounce back. The squish depth, duration, and easing are all independently configurable.

### Interaction Toggles
Two toggles in the UI panel independently enable or disable hover and click effects for the hero card and for satellite cards. Disabling a toggle while a card is mid-hover smoothly resets it rather than snapping.

### Keyboard Navigation
Left and right arrow keys step through cards one at a time. A 450 ms debounce prevents accidental rapid-fire navigation.

### Touch / Swipe Navigation
Swiping left or right on a touch device navigates the carousel in the corresponding direction. A minimum travel threshold (`SWIPE_THRESHOLD`) filters out incidental touches, and a diagonal guard ignores predominantly vertical gestures. The same 450 ms debounce is shared with keyboard navigation.

### Mouse Drag Navigation
Clicking and dragging the carousel stage moves it one card in the drag direction. The selection fires as soon as the drag threshold is crossed — not on mouse-up — so the springy `selectCard()` animation begins immediately and feels responsive rather than deferred.

A `suppressNextClick` flag prevents the synthetic click event that browsers emit after a mouse-up from accidentally re-triggering the card's click handler. The flag is set the instant the drag threshold is crossed (during `mousemove`) and cleared via `setTimeout(0)` in the `mouseup` handler, which guarantees it runs after the click event has been dispatched but before any future pointer interaction.

The cursor changes to a grab hand while the pointer is over the carousel stage, and to a grabbing fist while a drag is in progress.

### Animated Gradient Background
`background.js` creates a layer of large, softly blurred radial gradient blobs (`#bg-layer`) that drift across the screen behind the carousel. Each blob is independently animated to a random position, size, and opacity on a loop. Placement is edge-biased so blobs concentrate near the viewport boundaries, keeping the centre clear for the cards.

The blob system exposes a live control panel in the UI overlay with sliders for movement speed, blob size, and edge bias, colour swatches for each blob's hue, and a randomise button that immediately re-scatters all blobs to new positions.

### Rive Particle Background
`bg-rive.js` loads `bgparticles.riv` onto a full-viewport WebGL2 canvas (`#rive-bg`) that sits above the gradient blob layer in the stacking order. The Rive animation is driven by a ViewModel (`ViewModel1`) whose inputs are bound at runtime:

| Input | Type | What it does |
|---|---|---|
| `width` / `height` | number | Kept in sync with `window.innerWidth` / `window.innerHeight` on load and resize so the animation always fills the viewport exactly. |
| `direction` | enum | Particle travel direction: `up`, `down`, `left`, or `right`. |
| `baseSize` | number | Base size of each particle. |
| `particleOpacity` | number | Opacity of the particle layer (0–1). |
| `particleCount` | number | Number of active particles. |
| `speed` | number | Particle movement speed. |
| `speedVar` | number | Per-particle speed variation. |
| `leftPadding` | number | Left boundary of the particle spawn region (0–1, fraction of canvas width). |
| `rightPadding` | number | Right boundary of the particle spawn region (0–1, fraction of canvas width). |

All inputs are controlled from a dedicated UI panel at the bottom of the screen. Direction is set via a D-pad control; the remaining parameters are numeric input fields.

### Responsive Scaling
The entire carousel stage is scaled as a single unit from the hero's screen position using a breakpoint table. Every card, glow, and blur scales together without any layout reflow. A minimum viewport height cap prevents the hero card from clipping the top of the screen on short displays.

### Live Stats Overlay
A bottom-centre UI panel displays live animation state: active card name and index, card count, arc map, arc position, ellipse dimensions, card angle spread, long-jump status, and time until the next inactivity shake. Stats update at 10 Hz and live in a separate file (`stats.js`) that reads globals from `carousel.js`.

---

## Key Variables

All tuning values live at the top of `carousel.js`. Nothing else needs to be touched for visual or timing changes.

### Layout

| Variable | Default | What it does |
|---|---|---|
| `INITIAL_INDEX` | `2` | Which card starts as hero. `0` = first card. Automatically clamped if the index is out of range. |
| `SPREAD` | `0.21` | Radians between adjacent arc positions. Keep above ~0.20 to avoid overlap. |
| `ELLIPSE_RX` | `980` | Horizontal radius of the arc in px — controls how wide the fan is. |
| `ELLIPSE_RY` | `1080` | Vertical radius of the arc in px — controls front-to-back perspective depth. |
| `ELLIPSE_CX` | `null` | Centre X of the ellipse in px. `null` = always tracks viewport centre. |
| `HERO_Y_VH` | `0.40` | Hero card vertical position as a fraction of viewport height. `0.40` = 40% from the top. |

### Scale

| Variable | Default | What it does |
|---|---|---|
| `HERO_SCALE` | `1.25` | Scale of the hero card relative to the base card size. |
| `BASE_SCALE` | `1.00` | Scale of cards far from the hero. |
| `SCALE_ZONE` | `1.5` | Arc distance from the hero at which the scale ramp begins. |
| `SCALE_BREAKPOINTS` | — | Table of `{ minWidth, scale }` entries. The first matching row sets the zoom level. `150` = 1.5× the base design size (calibrated at 1440 px). |
| `MIN_VIEWPORT_HEIGHT` | `600` | Below this height in px the carousel shrinks proportionally so the hero doesn't clip the top. |

### Hover Effects

| Variable | Default | What it does |
|---|---|---|
| `HERO_HOVER_SCALE` | `1.025` | Scale multiplier applied on top of `HERO_SCALE` when hovering the hero card. |
| `NON_HERO_HOVER_SCALE` | `1.03` | Scale multiplier for satellite cards on hover. |
| `HOVER_GLOW_MULT` | `1.25` | Multiplies both the glow radius and opacity when hovering the hero card. |

### Hero Click Effect

| Variable | Default | What it does |
|---|---|---|
| `CLICK_SCALE_DOWN` | `0.98` | How far the hero squishes on click. `0.94` = 6% smaller. |
| `CLICK_DOWN_DURATION` | `0.20` | Seconds for the squish phase. |
| `CLICK_DOWN_EASE` | `'power2.out'` | GSAP ease string for the squish phase. |

### Shuffle Timing

| Variable | Default | What it does |
|---|---|---|
| `SAME_SIDE_STAGGER` | `0.080` | Seconds of delay added per card in the same-side ripple, measured outward from the selected card. |
| `OPP_SIDE_LEAD_IN` | `0.300` | How many seconds *before* the hero arrives that the opposite-side wave starts. |
| `OPP_SIDE_STAGGER` | `0.080` | Seconds of delay per card in the opposite-side ripple, measured outward from the old hero. |
| `LONG_JUMP_THRESHOLD` | `2` | Jump distance in cards above which the slowdown multiplier applies. |
| `LONG_JUMP_SLOW` | `1.25` | Duration multiplier for long jumps. `1.5` = 50% slower phases. |

### Touch & Drag Navigation

| Variable | Default | What it does |
|---|---|---|
| `SWIPE_THRESHOLD` | `50` | Minimum horizontal travel in px to register a touch swipe. Diagonal swipes are ignored. |
| `DRAG_CLICK_THRESHOLD` | `6` | Minimum horizontal travel in px before a mouse-down is treated as a drag rather than a click. |

---

## CSS Tokens

Visual appearance is controlled by custom properties in `style.css`:

| Token | Default | What it does |
|---|---|---|
| `--glow-rgb` | `200, 200, 255` | Colour of the edge glow on the hero card (R, G, B). |
| `--glow-alpha` | `0.20` | Base opacity of the edge glow. Multiplied by `HOVER_GLOW_MULT` on hover. |
| `--glow-size` | `8px` | Base spread radius of the edge glow. Multiplied by `HOVER_GLOW_MULT` on hover. |
| `--card-blur` | `1.0px` | Blur applied to non-hero cards. |
| `--card-dim` | `0.7` | Brightness of non-hero cards. `1` = full brightness. |

The `transition` property on `.card.hero img` controls how quickly the blur and glow transition in when a card becomes hero. The default (`0.28s ease` with a `0.08s` delay) is timed to clear just before the card physically arrives at the hero position.

---

## How GSAP Is Used

GSAP is used purely as an animation engine — it has no knowledge of the DOM layout. Every card's visual state lives in a plain JavaScript object called a **proxy**:

```js
{ pos, yOffset, riseOffset, shakeRotation, scaleMult, hoverScale, cardIdx }
```

GSAP tweens the numbers inside these proxy objects. On every frame, an `onUpdate` callback passes the proxy into `applyState()`, which recomputes the card's position on the ellipse and calls `gsap.set()` to apply the result as CSS transforms. This separation means the geometry only lives in one place — no animation code ever writes a pixel value directly.

The hero hover glow is the one exception: `applyHeroHover()` writes directly to the hero card's `img.style.filter` so the drop-shadow can be animated independently from the CSS transition that handles blur/glow during shuffles. The CSS transition is suppressed (`transition: none`) while GSAP is in control and restored on completion.

The key GSAP features in use are:

- **`gsap.to()`** — tweens an object's properties from their current value to a target over time.
- **`gsap.set()`** — applies values instantly with no duration, used inside `applyState()` every frame.
- **`gsap.timeline()`** — chains tweens in sequence. Used for the three-phase shuffle (K01 → K02 → K03), the departing hero scale pulse, and the hero click effect.
- **`delay`** on timelines — staggers when each card's shuffle begins, creating the ripple wave.
- **`CustomEase`** — defines bezier easing curves by their SVG path string, exactly as After Effects exports them.
- **`gsap.killTweensOf()`** — cancels any in-progress tween on a proxy so a rapid second click doesn't stack animations.

### Translating to Other Frameworks or No Framework

The proxy pattern is what makes this portable. GSAP is responsible for two things: interpolating numbers over time, and scheduling when to do so. Both can be replaced.

**Using a different animation library (Anime.js, Motion One, Framer Motion, etc.)**

The proxy objects and `applyState()` stay exactly the same. The only thing that changes is the syntax for running a tween. For example, the three-phase shuffle:

```js
// GSAP
gsap.timeline({ delay })
  .to(proxy, { pos: p1, duration: d1, ease: 'K01', onUpdate: upd })
  .to(proxy, { pos: p2, duration: d2, ease: 'K02', onUpdate: upd })
  .to(proxy, { pos: targetPos, duration: d3, ease: 'K03', onUpdate: upd });

// Anime.js equivalent (simplified)
anime({ targets: proxy, pos: p1, duration: d1 * 1000, easing: 'cubicBezier(...)', update: upd,
  complete: () => anime({ targets: proxy, pos: p2, ... }) });
```

The easing curves (K01, K02, K03) are defined as SVG cubic bezier strings. Any library that accepts cubic bezier parameters can use the same control points.

**Without any animation library**

The core of the system is just changing numbers over time. You can replicate this with `requestAnimationFrame` and a manually stepped bezier:

```js
function animateValue(obj, key, target, duration, easeFn, onUpdate) {
  const start = obj[key];
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min((now - startTime) / (duration * 1000), 1);
    obj[key] = start + (target - start) * easeFn(t);
    onUpdate();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

Chaining phases becomes calling the next `animateValue` inside `onComplete`. Stagger delays become `setTimeout(() => animateValue(...), delay * 1000)`. Cancellation requires an abort flag or token passed into each `requestAnimationFrame` loop.

In short: GSAP is a well-optimised convenience layer. The underlying model — proxy state, per-frame geometry computation, cubic bezier easing — is entirely framework-agnostic and can be carried into any environment, including React (storing proxies in refs), Canvas, WebGL, or native mobile via equivalent tween libraries.
