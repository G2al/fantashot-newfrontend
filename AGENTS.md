<!-- BEGIN:nextjs-agent-rules -->

# Next.js version

This project may differ from training data. Before using or changing Next.js APIs, conventions, config, or file structure, read the relevant docs in:

`node_modules/next/dist/docs/`

Respect deprecations and version-specific guidance.

<!-- END:nextjs-agent-rules -->

# Owner preferences

* Be short, direct, and reasoned.
* For yes/no questions, answer yes/no first.
* Do not re-read files already inspected in the current session.
* Avoid unnecessary exploration and token usage.
* For UI/UX work, follow `.claude/skills/ui-ux-review/SKILL.md`.
* Mobile-only request = do not alter desktop.
* Desktop-only request = do not alter mobile.
* Report backend/data issues; never hide them with frontend workarounds.
* Commit/push only when explicitly requested.
* The owner runs `git push`.

# Visual source of truth

Structural reference:

`C:\Users\giomm\Desktop\project\survivor-fe`

Before creating or changing:

* layouts
* components
* responsive behavior
* typography scale
* spacing
* borders
* shadows
* animations
* interaction patterns

inspect the equivalent implementation in `survivor-fe` and reuse its structural/presentation patterns when appropriate.

Never:

* modify `survivor-fe`;
* copy its colors;
* copy its routes;
* copy its API contracts;
* copy its authentication;
* copy its data model;
* copy its game logic.

Fantashot keeps its own branding and application logic.

# Fantashot design tokens

Brand asset:

`public/images/logo-fantashot.png`

Fantashot uses a dark navy + teal identity.

Prefer exact custom colors with Tailwind arbitrary values instead of replacing them with approximate default Tailwind brand colors.

## Base colors

* app background: `#06111B`
* cards/panels: `#0F1E2E`
* inputs: `#101D2C`
* border: `#1E3448`
* primary text: `#F4F8FC`
* secondary text: `#B7C6D6`
* muted text: `#89A0B3`
* disabled text: `#5F7487`

`border-white/10` is an accepted looser border equivalent.

Do not replace existing borders with the exact token unless already touching that element for another reason.

## Brand teal

* primary: `#22E6C3`
* hover: `#1ED8B7`
* active: `#18C6A7`
* soft background: `#123A3B`
* soft border: `#1D6D68`
* glow/light accent: `#3AF5D4`
* active-state text: `#E9FFFA`

Rules:

* Teal = brand, CTA, selection, important active state.
* Do not use teal as generic semantic success.
* Do not outline every container in teal.
* Any solid or gradient teal background MUST use dark text `#06111B`, never white.

Examples:

`bg-[#22E6C3]`

`text-[#06111B]`

Do not use `emerald-*`, generic `teal-*`, or old brand colors as replacements for Fantashot's primary accent.

# Semantic colors

Semantic states stay separate from brand teal:

* success: Tailwind `green-*`
* warning: `amber-*`
* error/danger: `red-*`
* info: `sky-400`

Reference values:

* success ≈ `#22C55E`
* warning ≈ `#F5B942`
* danger `#EF4444`
* info `#38BDF8`

# Player role colors

Already correct. Do not change:

`public/images/roles/*.svg`

* goalkeeper: `#F6C343`
* defender: `#3B82F6`
* midfielder: `#22C55E`
* attacker: `#EF4444`

# PasswordStrength exception

`components/PasswordStrength.tsx`

intentionally uses a semantic weak-to-strong scale:

red → amber/orange → green

This is unrelated to branding.

Never replace its green top tier with Fantashot teal during brand-wide color changes.
