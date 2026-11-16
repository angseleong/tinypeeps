# 3. A Drop opens the Drop Box, it never starts work

Status: proposed (2026-11-16).

## Context

Dragging a Peep is the most fun thing in the app, so people will do it for fun. If a Drop started work
by itself, one careless drag could start an Opus review and spend part of the Weekly Limit.

## Decision

- **A Drop always opens the Drop Box**: free text plus Quick Actions for that Room or neighbour.
  Nothing is sent until the CEO sends it.
- **Picking up a working Peep doesn't stop it.** Its Task keeps running. "Stop and do this first" is a
  Quick Action, not a side effect.
- Escape, or clicking away, puts the Peep back at its desk with nothing started.

## Consequences

- One more click than "drop to act", which is the price of never spending by accident.
- Quick Actions are data per Room ([office.md](../office.md#rooms-in-v1)), so a Template can add its own.
