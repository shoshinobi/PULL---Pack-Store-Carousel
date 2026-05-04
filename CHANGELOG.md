# Changelog — Drag Navigation

Documents the design and implementation history of mouse drag navigation for the Pack Store Carousel.

---

## Final implementation

**One card per gesture, fires immediately on threshold cross.**

A `mousedown` on the carousel stage arms a drag. As soon as `mousemove` reports horizontal travel beyond `DRAG_CLICK_THRESHOLD` (6 px), `selectCard()` fires immediately in the drag direction and the gesture is considered committed — any further mouse movement during the same drag is ignored. On `mouseup` the cursor and drag state reset.

```
mousedown  → arm drag (dragActive = true)
mousemove  → threshold crossed → selectCard(adjacent) → committed
mouseup    → disarm, clear cursor
```

A `suppressNextClick` flag is set the instant the threshold is crossed. Because browsers fire `click` after `mouseup` in the same event task, the flag is cleared via `setTimeout(0)` in the `mouseup` handler — this guarantees the card click handler sees the flag during the click event, but the flag is gone before any future interaction.

**Why this approach:** Earlier iterations felt disconnected from the existing springy shuffle animation. Matching the gesture model to what `selectCard()` already does — one discrete step with a directional spring — gave the interaction a consistent feel regardless of input method.

---

## Iteration history

### v1 — Live position tracking with momentum

The first pass tracked the pointer's absolute X position throughout the drag and used it to drive `pos` values on the card proxies directly, giving a live "hold and pull" feel. On mouse-up it calculated a velocity from recent samples and called a `spinToCard()` function that ran the remaining distance with a deceleration ease.

**Problems:**
- Live position tracking conflicted with the existing GSAP proxy model — both systems were writing to `pos` at the same time.
- `spinToCard()` produced smooth, continuous motion that looked and felt nothing like the springy K01/K02/K03 shuffle. Users perceived it as a separate, inconsistent interaction mode rather than the same carousel.
- Momentum calculation required tracking `dragLastX`, `dragLastT`, and `dragVelPx` state variables; if the user paused before releasing, the velocity was near zero and the card would not snap.

**Removed:** `spinToCard()`, `DRAG_MOMENTUM`, `dragLastX`, `dragLastT`, `dragVelPx`.

---

### v2 — Threshold-triggered spinToCard()

The live tracking was replaced with a threshold gate: nothing happened until the pointer had moved `DRAG_CLICK_THRESHOLD` pixels, then `spinToCard()` was called with a target index calculated from the net displacement and a configurable pixels-per-card ratio.

This removed the live conflict but kept `spinToCard()` and its smooth deceleration ease.

**Problems:**
- The smooth wheel-spin still did not match the springy shuffle. The two interaction paths looked like different products.
- Calculating "how many cards to skip" from pixels introduced a mapping constant that felt arbitrary and behaved inconsistently at different viewport scales.

---

### v3 — One card at a time, selectCard() directly (current)

`spinToCard()` was removed entirely. The threshold gate was kept but wired directly to `selectCard(activeIndex ± 1)`. One drag gesture = one card movement, using exactly the same animation as a click or key press.

**Trade-offs accepted:**
- You cannot skip multiple cards in a single drag. A user who wants to jump three cards must perform three separate drag gestures. This was judged acceptable because: (a) the keyboard arrow keys and card clicks already provide fast multi-step navigation, and (b) the consistent animation feel was considered more important than raw speed for this input method.
- There is no "throw" or momentum. The carousel always settles to the nearest adjacent card. This matches the discrete, intentional feel of the rest of the UI.
