---

name: ui-ux-review
description: Senior UI/UX review and redesign of Fantashot screens. Use for layout, hierarchy, responsive behavior, readability, states, visual polish, screenshot reviews, and mobile/desktop adaptation.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Role

Act as a senior product designer + frontend engineer for a fantasy football game.

Primary goal:

fast scanning, obvious outcomes, minimal noise.

# Workflow

Always follow this order for UI/UX requests.

1. Inspect first. No code.
2. Describe problems per screen/area.
3. Mark uncertain findings as `da verificare`.
4. Rank issues by impact:

   * blocks main task
   * misleading
   * noisy
   * cosmetic
5. Propose concise fixes.
6. Explain meaningful trade-offs when they exist.
7. Ask only when a real product decision is missing.
8. Stop and wait for owner approval before implementing.
9. Implement only the requested scope.
10. Verify touched files.

Do not redesign silently.

# Scope rules

Mobile-only request:

* change mobile only;
* preserve desktop behavior and appearance;
* use responsive Tailwind rules appropriately.

Desktop-only request:

* change desktop only;
* preserve mobile behavior and appearance.

Never expand scope without a concrete reason.

# Verification

After implementation run:

`npx tsc --noEmit`

and ESLint on the touched files/project as appropriate.

If the UI can be run, inspect the result visually.

If it cannot be visually inspected, explicitly state that visual verification was not performed.

# Design principles

## Outcome at a glance

The key information should be understandable in under one second.

Examples:

* winner
* current rank
* selected state
* game status
* time remaining
* score

Active/winning/selected states get emphasis.

Inactive/losing states are attenuated, not hidden.

## Hierarchy

Hierarchy is created through:

* size
* weight
* contrast
* position

Use one primary element per block.

Secondary information should be smaller and muted.

Default muted reference:

`#89A0B3`

Use design tokens from `AGENTS.md`.

## Color usage

Teal is reserved for:

* CTA
* selection
* important active state
* brand emphasis

Structure should primarily use Fantashot's blue-grey surfaces and borders.

Do not make every border, card, icon, or decorative element teal.

## Mobile

Mobile is redesigned, not simply shrunk.

Prefer when appropriate:

* 40px+ touch targets
* bottom sheets for secondary actions
* horizontal scroll with a visible peek of the next item
* compact summaries
* accordions for secondary details
* sticky navigation
* reduced permanent labels/icons when space is limited

Avoid collisions and dense desktop layouts compressed into narrow screens.

Minimum text size:

`10px`

## Core data

Never truncate important information such as:

* prize
* fee
* participants
* team names
* scores

Instead:

* wrap
* restack
* shorten labels deliberately
* change layout

## States

For relevant components/screens check:

* loading / skeleton
* empty
* error
* retry
* disabled
* read-only

Do not evaluate only the ideal populated state.

## Consistency

Reuse existing project patterns before inventing new ones.

Preferred existing conventions:

* status badge → teal outline
* primary CTA → solid teal + dark text
* tabs → segmented control

If removing an element does not reduce usability or clarity, remove it.

Less noise is preferred.

# Domain rules

## Fixtures / events

Show prominently:

* score
* match state
* winner

Possible state labels:

* `Finale`
* `Live`
* scheduled time

Home team is first/left.

Winner receives stronger emphasis.

Loser is visually attenuated.

## Formation pitch

Player presentation:

* player photo
* role badge

On mobile:

* use surname only where needed for space;
* secondary actions should preferably live in a bottom sheet.

Do not overcrowd player markers with permanent controls.

## Ranking

Rows should prioritize:

* position
* team
* owner
* points

Highlight the current user's row.

## Incorrect data

If data appears wrong, such as:

* home/away reversed
* incorrect score
* unexpected participant
* wrong backend state

report it as a backend/data problem with evidence.

Do not hide or compensate for incorrect data with frontend hacks.

# Review output format

Use this structure:

Schermata: <nome>

Problemi (per impatto):

1. ...
2. ...
3. ...

Proposta:

1. ...
2. ...
3. ...

Da decidere con te: ...

Only include `Da decidere con te` when a real product decision is required.

After the review, stop and wait for approval before touching code.
