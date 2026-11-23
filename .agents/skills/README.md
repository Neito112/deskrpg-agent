# Project-local Codex CLI skills

Skills in this directory are auto-discovered by Codex CLI (verified against
Codex 0.144.3) when this repo is opened as the working
directory. They are NOT part of the marketplace-distributed plugin (that
set lives under `skills/` and is manifested by `.codex-plugin/`). Two
separate namespaces, on purpose:

- `.agents/skills/` — **repo-native**, run only against this repo
  (weekly changelog videos, doctrine-heavy authoring flows). Codex CLI's
  project-local skill dir.
- `skills/` — **marketplace-distributable**, installed into other
  projects from this repo (see the repo README for the current install
  command).

## Weekly changelog video

The `changelog-video` skill turns a weekly changelog markdown into a
~45–60s branded 1080×1080 MP4 (motion-doctrine layout, Annie VO,
seam-gated cuts, caption rail). It ships pre-configured — fonts,
background pattern, house BGM, lexicon, and the align-captions script
all live inside `changelog-video/`. Its five dependency skills
(`motion-doctrine`, `cut-the-curve`, `captions-overlay`, `seam-craft`,
`oversized-cursor`) sit alongside so the router graph is complete on
clone.

Weekly usage:

1. Regenerate the digest markdown for the target range:
   `bun run changelog:weekly --from YYYY-MM-DD --to YYYY-MM-DD` (this
   only reads git; the `--write` variant is what the docs cron uses).
2. In Codex CLI at the repo root, invoke `/changelog-video` with the
   generated markdown. The agent will present its script +
   visualization plan for review before rendering.
3. Accept, and the agent produces `weekly-changelog-<range>.mp4` gated
   by the repo's check step (0 errors).

TTS uses the tracked TTS script under `skills/` (see that skill's README
for the exact path — no extra install needed). Runtime dependencies you need on PATH:

- Node ≥ 22
- HeyGen CLI ≥ 0.3.0, authenticated via `heygen auth login --oauth`
- `ffmpeg` (for VO wav conversion + frame QA)
- A headless Chrome for HTML slide rendering, if the slide workflow
  needs it (the repo's check script will point out the exact ask if
  it's missing)

The parallel set at `.claude/skills/` is a byte-identical copy so
Claude Code users get the same auto-discover behaviour — keep the two
in sync when editing. A `scripts/check-skill-mirror.mjs` check enforces
this at CI time.

Each repo-native skill declares `metadata.internal: true`. That excludes it from
normal `npx skills add` discovery and from `npx skills add ... --all`. A named
`npx skills add ... --skill <name>` still installs a matching skill regardless of
`metadata.internal`; no environment variable is needed. `INSTALL_INTERNAL_SKILLS=1`
opts internal skills into normal discovery and bulk installation. This does not
change local agent discovery.
