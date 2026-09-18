<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Visual source of truth

`C:\Users\giomm\Desktop\project\survivor-fe` is the structural source of truth
for this frontend. Before creating or changing layouts, components,
responsive behaviour, typography scale, spacing, borders, shadows, or
animations, inspect the equivalent implementation in that project and
reproduce its patterns faithfully here.

**Colors are the one exception - never copy them.** Fantashot has its own
palette, based on its own logo (`public/images/logo-fantashot.png`, white +
red), not survivor-fe's navy/sky-blue. Concretely: page/panel backgrounds use
a warm near-black (`#0c0504` page, `#1c0b09` cards/panels, `#150705`
inputs), the accent color is red (`red-500`/`red-600`, never `sky-*`/
`lime-*`/survivor's navy hex codes), and error messages use amber (not red -
red is already the brand color, reusing it for errors would make them
ambiguous with normal UI). Success/valid states stay emerald, matching
survivor-fe, since that doesn't clash with either brand.

Only copy or adapt presentation and interaction patterns (never colors, per
above). Fantashot keeps its own branding assets, API contracts,
authentication, data model, routes, and game logic. Never modify
`survivor-fe` while working on this repository.
