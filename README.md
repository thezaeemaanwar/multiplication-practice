# Math Practice

A simple, configurable set of math-practice tools — multiplication drills, table learning, and fraction/percentage conversion. Plain HTML, CSS, and JavaScript — no build step, no dependencies.

## Getting started

Open `index.html` in any modern browser. It's a landing page that links to each activity.

## Pages

### 🏠 Home — `index.html`
An entryway that navigates to the three activities below.

### ✖️ Rapid Fire Multiplication — `multiplication.html`
A configurable, timed multiplication-tables test.

- **Two quiz modes**
  - **Number of questions** — answer a fixed number of questions.
  - **Fixed total time** — answer as many as you can within a total time budget (e.g. 10 minutes).
- **Per-question timer** — every question has its own countdown; when it runs out the app auto-advances and records whatever's typed. Applies in *both* modes. In time mode you'll see two badges: the overall countdown and the per-question timer.
- **Configurable tables** — any combination from 1 to 20 (Select all / Clear all included).
- **No repeated questions** — the exact same question won't appear twice in one test. Commuted pairs like `6 × 9` and `9 × 6` are treated as distinct and both allowed.
- **Results & review** — final score plus a per-question breakdown.

### 📚 Learn the Tables — `learn.html`
Enter any table (1–20) to see it laid out from `n × 1` to `n × 10`. Switch to practice mode to turn the answers into input boxes and check yourself.

### ½ Fractions ⇄ Percentages — `fractions.html`
Convert between common fractions and percentages in either direction (or mixed).

- Decimal answers may be **shortened without rounding** — e.g. `1/3` accepts `33.3`, `33.33`, `33`, etc., but not `33.4`.
- Fraction answers accept any equal fraction — e.g. `2/4` is accepted for `1/2`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` / `index.css` | Landing page and its navigation menu (uses `background.png`) |
| `multiplication.html` / `script.js` | Rapid Fire Multiplication quiz logic |
| `learn.html` / `learn.js` | Learn-the-tables view/practice page |
| `fractions.html` / `fractions.js` | Fractions ⇄ Percentages test |
| `global.css` | Shared styles: variables, layout, buttons, quiz/results components |
| `multiplication.css` | Multiplication + learn page styles (uses `background-2.jpg`) |
| `fractions.css` | Fractions page styles (uses `background-3.png`) |
| `background*.{png,jpg}` | Background illustrations; the palette is themed to match them |

## Theming

All colors live as CSS variables in the `:root` block of `global.css`, grouped by role (brand, accent, neutrals, feedback). Re-theme the whole app by editing those values.
