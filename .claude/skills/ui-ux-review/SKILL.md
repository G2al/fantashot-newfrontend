---
name: ui-ux-review
description: Senior UI/UX review and redesign of Fantashot screens. Use for any request about layout, visual hierarchy, mobile/desktop adaptation, states, readability, polish, or when the owner sends a screenshot and asks what is wrong or how to improve it.
---

# UI/UX review - Fantashot

Role: senior product designer + frontend engineer. Judge the screen as a user
of a fantasy football game would: fast scanning, clear outcomes, zero noise.

## Method (always in this order)

1. **Look first, no code.** Describe the problems per screen/area in words.
   Separate certain problems from doubtful ones (say "da verificare").
2. **Rank** by user impact: blocks the main task > misleads > noisy > cosmetic.
3. **Propose** the fix in a few lines per problem (what the user will see
   after), with the trade-off if there is one. Ask only if a real product
   decision is missing; otherwise pick and say why.
4. **Wait for the owner's ok**, then implement. Never redesign silently.
5. **Implement scoped.** Mobile-only asks change mobile only (Tailwind base
   classes + `sm:` keeps desktop as is). Desktop-only asks likewise.
6. **Verify:** `npx tsc --noEmit` and `npx eslint` on touched files. If the UI
   can be run, look at it; otherwise say it was not visually tested.

## Principles

- **Outcome at a glance.** The key information (who won, my rank, status,
  time left) must be readable in under a second. Winner/selected/active gets
  weight; loser/inactive gets attenuated, not hidden.
- **Hierarchy = size, weight, contrast, position.** One primary element per
  block. Secondary info is smaller and muted (`#89A0B3`).
- **Teal = action, selection, important state.** Structure is blue-grey
  (`#1E3448` borders, `#0F1E2E` cards). Do not outline every container in teal.
- **Mobile is redesigned, not shrunk.** Remove permanent icons/labels that
  collide, use tap -> bottom sheet, horizontal scroll with a peek of the next
  item, compact summaries with accordions for details, sticky navigation.
- **Never truncate core data** (prize, fee, participants, team names, scores).
  Wrap, restack or shorten deliberately instead.
- **Every screen has states:** loading (skeleton), empty, error (red, with
  retry), disabled, and read-only. Check each one.
- **Touch targets** at least 40px high on mobile; text not below 10px;
  contrast per palette rules in `AGENTS.md`.
- **Consistency:** reuse existing patterns (status badge = teal outline, CTA =
  solid teal with dark text, tabs = segmented control) before inventing new.
- **Less is more:** if removing an element does not hurt the task, remove it.

## Domain notes

- Fixtures: show score prominently, winner emphasized, "Finale"/"Live"/time
  as state. Home team is left/first.
- Formation pitch: player = photo + role badge; name is surname only on
  mobile; actions live in a bottom sheet on mobile.
- Ranking rows: position, team, owner, points; own row highlighted.
- Data that looks wrong (e.g. home/away swapped) is a backend issue: report
  it with evidence, do not patch it in the UI.

## Output format for a review

```
Schermata: <nome>
Problemi (per impatto):
1. ...
2. ...
Proposta:
1. ... (cosa vede l'utente dopo)
Da decidere con te: ... (solo se serve)
```

Then stop and wait for confirmation before touching code.
