## Summary

<!-- What changed and why? Keep it short. -->

-

## Linked issue

<!-- Replace NNN with the issue number, or delete if there is no issue. -->

Closes #

## Verification

Commands supported by this repository (run what applies):

```bash
npm run lint
npm run build
```

Optional, if your change touches that area:

```bash
# Hubble / BigQuery query changes (requires GCP credentials)
npm run test:hubble

# Entity / directory label sync
npm run sync:directory

# Manual UI check
npm run dev
```

Paste the commands you ran and the outcome:

-

## UI evidence _(optional — UI / layout changes only)_

If this PR changes visible UI, include responsive evidence:

- [ ] Desktop screenshot or recording attached / linked
- [ ] Mobile / narrow viewport screenshot or recording attached / linked
- [ ] N/A — no UI changes

Notes / links:

-

## Data & methodology impact _(optional — metrics / queries / aggregations only)_

If this PR changes KPIs, treemap aggregation, query filters, periods, or how counts/shares are computed:

- [ ] Methodology is unchanged (refactor / plumbing only)
- [ ] Methodology changed — briefly describe the old vs new definition below
- [ ] N/A — no metric or query semantics changed

Methodology notes:

-

## Checklist

- [ ] Summary describes the change and motivation
- [ ] Linked issue filled in, or intentionally omitted
- [ ] Relevant `npm run …` checks from Verification above were run (or marked N/A with reason)
- [ ] UI evidence completed or marked N/A
- [ ] Data & methodology impact completed or marked N/A
- [ ] No secrets (`.env.local`, service account keys, etc.) are included
