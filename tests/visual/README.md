# Mobile Visual Regression Testing

LumenMap uses deterministic automated screenshot testing to prevent mobile layout clipping, horizontal scroll leaks, and unintended UI regressions across narrow viewports.

## Target Viewports & States

Visual snapshots are captured and verified across **3 mobile viewports**:
- `320px`: Small mobile (e.g., iPhone SE)
- `360px`: Android standard mobile
- `390px`: Standard iPhone mobile

Across **5 dashboard states**:
1. `loading`: Skeleton cards / initial data fetching
2. `loaded`: Complete dashboard with treemap, KPIs, and time-series chart
3. `selected`: Active treemap node selected displaying the DetailPanel
4. `empty`: Zero activity / empty response state
5. `error`: BigQuery provider error card state

---

## Commands

### Run Visual Tests
```bash
npm run test:visual
```
Spawns background mock server (if dev server is not already running), navigates to all 15 viewport/state combinations, asserts zero horizontal scroll overflow (`scrollWidth <= viewportWidth`), and compares pixel outputs against approved baselines in `tests/visual/baselines/`.

### Update Baselines (Intentional UI Changes)
```bash
npm run test:visual:update
```
Regenerates and overwrites approved PNG snapshots in `tests/visual/baselines/` when dashboard layout or component styles are intentionally updated.

---

## Baseline & Artifact Directory Structure

```text
tests/visual/
├── baselines/         # Approved reference snapshots committed to git
│   ├── 320px/
│   ├── 360px/
│   └── 390px/
└── diffs/             # Generated side-by-side diff artifacts (git-ignored)
    ├── 320px/
    ├── 360px/
    └── 390px/
```

---

## CI / Failure Handling

If a PR introduces visual differences exceeding 0.1% or causes horizontal clipping at 320px, 360px, or 390px:
1. `npm run test:visual` fails with non-zero exit code.
2. Side-by-side PNG diff artifacts are generated under `tests/visual/diffs/{width}px/{state}-diff.png`.
3. If the visual change is intentional, run `npm run test:visual:update` and commit the updated baselines.
