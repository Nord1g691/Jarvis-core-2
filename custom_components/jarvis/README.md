# JARVIS Core Assistant

## Architecture

- `__init__.py`: integration setup
- `manifest.json`: Home Assistant metadata
- `frontend/jarvis-core.js`: HUD only + HA interaction layer
- `www/`: static frontend assets when needed

## Design rules

1. Keep the HUD independent from Home Assistant configuration.
2. Read existing HA entities; do not create or delete user automations.
3. Fail gracefully when an entity is unavailable.
4. Add voice, energy and control features incrementally.
5. Keep each release usable as a rollback point.

Current test baseline: `0.2.0-test.2`.
