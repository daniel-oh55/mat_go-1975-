# Testing Strategy

## 1. Purpose

This document defines the testing strategy for the Matgo game engine.

> **In the MVP, tests come before UI.**

The engine must be fully testable in isolation — no React, no browser, no Capacitor, no storage, no content data. A complete headless game simulation must pass before any UI work begins.

---

## 2. Testing Principles

- Engine must be testable without UI.
- Tests validate **rules and state**, not visuals.
- Invalid actions must be tested explicitly.
- Randomness must be testable through an injected `RandomProvider`.
- Full-game simulation must pass before UI development starts.
- Content, ads, platform services, and NPC data are excluded from MVP tests.

---

## 3. Test Layers

### Unit Tests

Validate individual engine modules in isolation.

| Target | What to verify |
|---|---|
| Card model | Card has correct `cardId`, `month`, `type`, `name` |
| Deck creation | Exactly 48 cards, no duplicates, all months present |
| Shuffle | 48 cards preserved, no duplicates, no missing cards |
| Distribution | Hand + field + draw pile sums to 48; no card appears twice |
| Legal action validation | Correct legal actions returned for a given state |
| Card matching | Correct match resolution for 0 / 1 / 2+ same-month field cards |
| Capture resolution | Correct cards moved to captured zone |
| Scoring | Correct score calculated from captured card groups |
| Go/Stop trigger | Pending decision state set at correct score threshold |
| Game end detection | Terminal condition detected correctly |

### Integration Tests

Validate sequences of engine operations together.

| Target | What to verify |
|---|---|
| New game creation | Initial `GameState` is valid and consistent |
| One player turn | Card played → match → capture → score update → turn change |
| One AI turn | AI action submitted → engine validates → state updates |
| Go/Stop flow | Threshold reached → decision required → Go/Stop applied correctly |
| Invalid action flow | Invalid action rejected before state mutation |
| Game end flow | Stop declared → final result calculated → no further actions accepted |

### Simulation Tests

Validate the complete game loop without any UI involvement.

| Target | What to verify |
|---|---|
| Full AI vs. player game | Game starts, runs to completion, produces final result |
| Repeated deterministic simulations | Same seed produces identical game sequence |
| No infinite loop | Game always terminates within a bounded number of turns |
| No invalid AI action | AI never selects an illegal action across repeated simulations |
| Final state consistency | Total card count = 48 after game ends; all zones account for all cards |

---

## 4. Randomness Tests

- Shuffle output contains exactly 48 unique cards — no duplicates, no missing cards.
- A deterministic seed produces the same card order across repeated runs.
- Production `RandomProvider` (non-seeded) does not produce systematic bias toward player or AI.

**MVP scope note:** Statistical randomness verification (chi-square, etc.) is not required for MVP. Structural integrity — correct card count and uniqueness — is the MVP-level randomness validation.

---

## 5. GameState Invariant Tests

The following invariants must hold after every action and must be directly testable:

| Invariant | Description |
|---|---|
| Total card count | Sum of all cards across all zones equals 48 |
| No duplicate card in two zones | A card cannot appear in hand, field, draw pile, and captured simultaneously |
| Valid `currentTurn` | `currentTurn` is always one of the defined player IDs |
| Decision blocks card play | When a Go/Stop decision is pending, normal card play must be rejected |
| Score matches captures | `scoreState` must match what is derivable from `capturedCards` |
| Game ended blocks actions | After the game is in ended state, all further actions must be rejected |

---

## 6. Invalid Action Tests

Each of the following invalid actions must be explicitly tested and must result in rejection before any state mutation:

- Playing a card that is not in the current player's hand
- Acting when it is not the current player's turn
- Choosing Go or Stop when no decision is pending
- Playing any card after the game has ended
- AI attempting an action outside the legal action set
- Submitting a duplicate or already-applied action (if applicable)

---

## 7. AI Tests

- AI always selects an action that is in the legal action set.
- AI does not access opponent hand or draw pile order.
- AI can complete a full simulation game from start to finish.
- AI handles the Go/Stop decision state without error.

---

## 8. Regression Tests

> **When a bug is found, a regression test must be added before the fix is merged.**

This ensures that resolved bugs do not reappear as the engine evolves. Regression tests live in the same test suite as unit and integration tests.

---

## 9. Not Tested in MVP

The following are explicitly excluded from MVP testing scope:

| Excluded | Reason |
|---|---|
| UI animations | Visual behavior; not engine correctness |
| BGM playback | Platform/audio concern |
| Ads | Platform concern |
| Analytics | Platform concern |
| Story content | Content layer; not part of engine |
| NPC dialogue | Content layer |
| Online multiplayer | Not in MVP scope |
| App store release flow | Release pipeline concern |

---

## 10. Milestone 2 Testing Gate

Milestone 2 (engine implementation) is complete only when all of the following pass:

- [ ] All unit tests pass.
- [ ] All core state transition integration tests pass.
- [ ] Headless full-game simulation completes without error.
- [ ] No story, content, platform, or UI code is required to run any test.
