# Rapid Fire Multiplication

A simple, configurable web app for practicing multiplication tables under time pressure. Plain HTML, CSS, and JavaScript — no build step, no dependencies.

## Getting started

Open `index.html` in any modern browser. That's it.

## Features

- **Two quiz modes**
  - **Number of questions** — answer a fixed number of questions.
  - **Fixed total time** — answer as many questions as you can within a total time budget (e.g. 10 minutes).
- **Per-question timer** — every question has its own countdown; when it runs out, the app auto-advances and records whatever's typed. This applies in *both* modes. In time mode you'll see two badges: the overall countdown and the per-question timer.
- **Configurable tables** — choose any combination of tables from 1 to 20 (Select all / Clear all shortcuts included).
- **No repeated questions** — the exact same question won't appear twice in one test. Commuted pairs like `6 × 9` and `9 × 6` are treated as distinct and are both allowed.
- **Numeric-only answers** — type the answer and press **Enter** (or click **Next**) to advance.
- **Results & review** — final score plus a per-question breakdown showing correct answers and your responses.

## Configuration (all from the UI)

| Setting | Description |
| --- | --- |
| Quiz mode | Number of questions, or fixed total time |
| Number of questions | How many questions in a "number of questions" test |
| Total time (minutes) | Time budget for a "fixed total time" test |
| Time per question (seconds) | Countdown limit for each individual question (both modes) |
| Tables to include | Which multiplication tables (1–20) to draw from |

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup and screen structure (settings, quiz, results) |
| `styles.css` | Styling; colors are centralized as CSS custom properties in `:root` |
| `script.js` | Quiz logic, timers, question generation, and results |
| `background-2.jpg` | Background illustration; the palette is themed to match it |

## Theming

All colors live as CSS variables in the `:root` block of `styles.css`, grouped by role (brand, accent, neutrals, feedback). Re-theme the whole app by editing those values.
