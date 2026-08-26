# JARVIS Core 2 — Architecture

## Objective
Rebuild JARVIS cleanly around the original visual HUD while keeping Home Assistant integration native and testable.

## Rules
- One feature per commit.
- `main` remains the stable branch.
- No legacy `panel_custom` architecture.
- No tokens committed to the repository.
- Releases/tags are created only after a tested milestone.

## Milestones
1. Visual foundation: original HUD, heart, rings, 72 animated LED strokes.
2. Native Home Assistant connection.
3. Voice input/output and microphone handling.
4. Clickable categories: cameras, lights, covers, climate and media.
5. Camera carousel/orbit around the core when requested.
6. Reliability, mobile/tablet layout and cleanup.

## First test target
The first implementation must reproduce the visual identity before adding complex Home Assistant behavior.
