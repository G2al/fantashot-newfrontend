<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## How to work with the owner

- Answers are short, direct, reasoned. No small talk. Yes/no questions get a
  yes/no first.
- Don't re-read files already read in the session and don't burn tokens on
  needless exploration.
- Act as a senior UI/UX designer and frontend developer. For any UI/UX task
  (layout, hierarchy, mobile, states, visual redesign, screenshot review)
  follow the `ui-ux-review` skill (`.claude/skills/ui-ux-review/SKILL.md`).
- Do not touch desktop when asked for mobile-only changes, and vice versa.
- Backend/data problems are reported, never hidden with frontend workarounds.
- Commits and pushes only when asked; the owner runs `git push` himself.

## Visual source of truth

`C:\Users\giomm\Desktop\project\survivor-fe` is the structural source of truth
for this frontend. Before creating or changing layouts, components,
responsive behaviour, typography scale, spacing, borders, shadows, or
animations, inspect the equivalent implementation in that project and
reproduce its patterns faithfully here.

**Colors are the one exception - never copy them.** Fantashot has its own
palette, based on its own logo (`public/images/logo-fantashot.png`, white +
teal), not survivor-fe's navy/sky-blue, and not emerald/red from earlier
iterations of this file. This is a fixed design-token palette (client-supplied
hex values, not Tailwind's default color scale) - use arbitrary-value classes
(`bg-[#22E6C3]`, `text-[#06111B]`, etc.), never `emerald-*`/`teal-*`/`red-*`
for brand accent.

- Backgrounds: app `#06111B`, cards/panels `#0F1E2E`, inputs `#101D2C`.
- Borders: default `#1E3448` (most borders still use `border-white/10`
  opacity overlays instead, which is an accepted looser equivalent - only
  switch a given border to the exact token if you're already touching it for
  another reason).
- Text: primary `#F4F8FC` (or `text-white`/`zinc-50`), secondary `#B7C6D6` (or
  `zinc-300`/`zinc-400`), muted `#89A0B3` (or `zinc-500`), disabled `#5F7487`.
- Primary/brand accent (teal): main `#22E6C3`, hover `#1ED8B7`, active
  `#18C6A7`, soft background `#123A3B`, soft border `#1D6D68`, glow/lightest
  text accent `#3AF5D4`, active-state text `#E9FFFA`. **Any element with a
  solid or gradient teal background must use dark text (`#06111B`), never
  white** - teal is too light for white text to pass contrast.
- Semantic (never use primary teal for these - primary is brand/CTA only):
  success `green-500`/`green-400` (Tailwind, matches `#22C55E` closely),
  warning `amber-400`/`amber-500` (matches `#F5B942` closely), error/danger
  `red-400`/`red-500`/`red-950` (exact match, `#EF4444` is Tailwind's
  `red-500`), info `sky-400` (exact match, `#38BDF8` is Tailwind's `sky-400`).
- Player role colors (already correct, don't touch):
  `public/images/roles/*.svg` use goalkeeper `#F6C343`, defender `#3B82F6`,
  midfielder `#22C55E`, attacker `#EF4444`.

The one deliberate exception is `components/PasswordStrength.tsx`, where
red/amber/orange/green form a semantic weak-to-strong gradient unrelated to
branding - it correctly uses `green-*` (success), not primary teal, for its
top tier. Never touch that mapping when doing brand-wide color passes.

Only copy or adapt presentation and interaction patterns (never colors, per
above). Fantashot keeps its own branding assets, API contracts,
authentication, data model, routes, and game logic. Never modify
`survivor-fe` while working on this repository.
