# Game Rule Specification (MVP)

## 1. Purpose

This document defines the scope of Matgo rules to be implemented in the MVP.

**This document is not a complete Matgo encyclopedia.** It defines only the Core Rules needed to complete one valid AI vs. player game. Advanced rules are deferred to a later milestone as `Ruleset` options.

When an item is marked **[OPEN DECISION]**, it must be resolved before the affected rule is implemented.

---

## 2. Rule Scope

### MVP Core Rules — In Scope

- 2-player Matgo
- 48-card Hanafuda deck
- Hand, field, and draw pile
- Play one card from hand per turn
- Reveal one card from draw pile per turn
- Resolve card matching and capture
- Track captured card groups (광, 열, 띠, 피)
- Calculate basic score
- Trigger Go/Stop decision when threshold is reached
- Handle Go and Stop actions
- Detect game end

### Deferred Advanced Rules — Out of Scope for MVP

| Rule | Notes |
|---|---|
| 쪽 | Immediate capture when hand card directly matches a single field card |
| 따닥 | Double score bonus for specific capture conditions |
| 뻑 | Penalty when played card has no match on field |
| 폭탄 | Triple match bonus condition |
| 흔들기 | Bonus for matching sets held in hand |
| 총통 | Instant win condition |
| 피박 | Loser penalty for holding only 피 cards |
| 광박 | Loser penalty against a full 광 set |
| 고박 | Penalty related to Go declaration count |
| 멍박 | Penalty for losing with a specific hand composition |
| 나가리 | Round void condition |
| 지역별 특수 룰 | Regional rule variants |
| NPC별 특수 룰 | NPC-specific rules (content layer concern, not engine) |

> Advanced rules are not discarded. They will be added as independently toggled `Ruleset` options after Core Rules are stable.

---

## 3. Card Model

Each card in the engine must carry at least the following attributes *(attribute names only — no code)*:

| Attribute | Description | Required by Engine? |
|---|---|---|
| `cardId` | Unique identifier for each of the 48 cards | Yes |
| `month` | 1–12, determines which cards match each other | Yes |
| `type` | Scoring category — 광, 열, 띠, 피 | Yes |
| `name` | Label for display and logging | Yes (for events/logging) |
| `scoreRole` | Contribution to a scoring group (e.g., full 광 set) | Yes |
| `matchingGroup` | The group this card belongs to for capture resolution | Yes (same as month in basic rules) |
| `flags` | Optional extension point for advanced rules (e.g., double-pi, special card) | Optional — not required for MVP |

**Not part of the engine card model:**
- Image asset path — belongs to the UI / Content Layer
- Story or lore description — belongs to the Content Layer
- NPC-specific card meaning — belongs to the Content Layer

---

## 4. Deck Rules

- Total cards: **48**
- Months: **12** (January through December)
- Cards per month: **4**
- No duplicate `cardId` in a valid deck
- After shuffle and distribution, every card must be accounted for across: player hands + field + draw pile

---

## 5. Initial Setup

**MVP distribution for 2-player Matgo: [RESOLVED — OD-1]**

| Location | Card Count | Status |
|---|---|---|
| Player 1 hand | 10 | **[RESOLVED]** — see `docs/12_open_decision_resolution.md` OD-1 |
| Player 2 hand | 10 | **[RESOLVED]** — see `docs/12_open_decision_resolution.md` OD-1 |
| Field | 8 | **[RESOLVED]** — see `docs/12_open_decision_resolution.md` OD-1 |
| Draw pile | 20 | Derived from the above |
| **Total** | **48** | Must equal 48 after distribution |

> Distribution confirmed as 10 / 10 / 8 / 20. Implement this in M2-PR3.

**Setup sequence:**
1. Build the 48-card deck.
2. Shuffle using fair `RandomProvider`.
3. Deal hand cards to each player.
4. Place field cards face-up.
5. Remaining cards form the draw pile.
6. Engine returns initial `GameState` and `GAME_STARTED` event.

---

## 6. Turn Structure

A single player turn proceeds in the following order:

1. Current player selects one card from their hand.
2. Engine matches the played card against field cards (by month).
3. Engine resolves capture from the played card (see Section 7).
4. Engine reveals one card from the top of the draw pile.
5. Engine matches the revealed card against field cards (by month).
6. Engine resolves capture from the revealed card (see Section 7).
7. Captured cards move to the current player's captured area.
8. Score is recalculated for the current player.
9. If score threshold is reached, engine enters `GO_STOP_DECISION_REQUIRED` state.
10. If no pending decision, turn passes to the opponent.

---

## 7. Matching Rules

Cards match by **month**.

| Field state | Result |
|---|---|
| No field card of same month | Played/revealed card is placed on the field |
| Exactly one field card of same month | Current player captures both cards |
| Two or more field cards of same month | **[RESOLVED — OD-2]** — `GameAction` must include `targetCardId`; see below |

### [RESOLVED — OD-2] — Multiple same-month field cards

See `docs/12_open_decision_resolution.md` OD-2 for full rationale.

**Confirmed behavior:**
- `GameAction` must include a `targetCardId` (or equivalent) identifying which same-month field card to capture.
- Engine validates that the selected target is a legal same-month card.
- For MVP AI and headless simulation: Application Layer or AI auto-selects the first deterministic legal target.
- Engine does not automatically capture all matching cards by default.
- A future `Ruleset` option may enable capture-all behavior.

---

## 8. Capture Rules

- Captures from the played card and the revealed card are resolved separately in the same turn.
- Captured cards are added to the current player's captured area.
- Captured cards are organized into scoring categories: 광 (광/five-brights), 열 (animals/ribbons with specific items), 띠 (ribbons), 피 (chaff).
- Advanced capture bonuses (쪽, 따닥, 뻑, etc.) are deferred.

---

## 9. Basic Scoring Rules

MVP scoring tracks the following captured group counts:

| Category | Korean | Description |
|---|---|---|
| 광 | 광 | Special high-value cards (5 total in the deck) |
| 열 | 열 | Animal/bird cards and select high-value cards |
| 띠 | 띠 | Ribbon cards |
| 피 | 피 | Chaff (lowest-value cards) |

**[RESOLVED — OD-3] — Score table confirmed**

See `docs/12_open_decision_resolution.md` OD-3 for full rationale.

| Category | Threshold | Score at threshold | Each additional |
|---|---|---|---|
| 광 (brights) | 3 | 3 points | +1 per additional (4 gwang = 4 pts; 5 gwang = 15 pts) |
| 열 (animals) | 5 | 1 point | +1 per additional |
| 띠 (ribbons) | 5 | 1 point | +1 per additional |
| 피 (chaff) | 10 | 1 point | +1 per additional |

Deferred bonuses (고도리, 홍단/청단/초단, 쌍피, 비광, 피박/광박/고박/멍박) remain as Advanced Ruleset items.

**[RESOLVED — OD-4] — Go/Stop threshold: 7 points**

See `docs/12_open_decision_resolution.md` OD-4. Default threshold is **7 points**. Configurable via `Ruleset`.

---

## 10. Go/Stop Rules

1. When a player's score reaches the Go/Stop threshold during their turn, the engine enters `GO_STOP_DECISION_REQUIRED` state.
2. The current player (or AI) must select Go or Stop.
3. **Stop** — Game ends immediately. Final result is calculated.
4. **Go** — Game continues. The player's Go count increases by 1. Turn passes to the opponent.
5. The engine tracks the number of times a player has declared Go.

**[RESOLVED — OD-5] — Go multiplier deferred**

See `docs/12_open_decision_resolution.md` OD-5. MVP tracks `goCount` in `GameState` but does not apply any score multiplier. Go multiplier is deferred to Advanced Ruleset expansion.

---

## 11. Game End Rules

The game ends when any of the following conditions are met:

| Condition | Notes |
|---|---|
| A player declares Stop | Primary MVP end condition |
| Draw pile exhausted with no further legal action | **[RESOLVED — OD-6]** — Game ends; higher score wins; tie = draw |
| Terminal rule condition defined by `Ruleset` | Deferred — not active in MVP default ruleset |

See `docs/12_open_decision_resolution.md` OD-6. Nagari and round carry-over rules are deferred.

---

## 12. AI Rule Requirements

- AI follows the exact same rules as a human player.
- AI selects from the set of legal actions provided by the engine.
- AI must not access hidden player hand data (opponent's hand is not visible).
- MVP AI may use a simple heuristic or random-selection-from-legal-actions strategy.
- MVP AI must be capable of completing a full game from start to finish without errors.
- AI performance (playing well) is not an MVP requirement — correctness is.

---

## 13. Error and Invalid Action Rules

| Invalid Action | Engine Response |
|---|---|
| Playing a card not in the current player's hand | Rejected — `INVALID_ACTION_REJECTED` event |
| Acting out of turn | Rejected |
| Choosing Go/Stop when no decision is pending | Rejected |
| Any action that would put the game in an inconsistent state | Rejected |

- Engine must reject invalid actions **before** any state mutation occurs.
- All invalid action rejections produce an explicit `EngineError` or `INVALID_ACTION_REJECTED` event.
- This behavior must be independently testable.

---

## 14. Open Decisions — All Resolved

All Open Decisions for MVP Milestone 2 are resolved. See `docs/12_open_decision_resolution.md` for full rationale.

| # | Decision | Resolution | Resolved In |
|---|---|---|---|
| OD-1 | Initial deal counts | 10 / 10 / 8 / 20 | `docs/12_open_decision_resolution.md` |
| OD-2 | Multiple same-month field card handling | `targetCardId` in `GameAction`; engine validates | `docs/12_open_decision_resolution.md` |
| OD-3 | Basic score table | Gwang 3/4/15, Yeol/Tti 5+, Pi 10+ | `docs/12_open_decision_resolution.md` |
| OD-4 | Go/Stop threshold | 7 points | `docs/12_open_decision_resolution.md` |
| OD-5 | Go multiplier | Not applied; `goCount` tracked only | `docs/12_open_decision_resolution.md` |
| OD-6 | Draw pile exhaustion | Game ends; score comparison; tie = draw | `docs/12_open_decision_resolution.md` |

> Milestone 2 implementation PRs may now proceed using these resolved defaults.

---

## 15. Future Ruleset Expansion

After the MVP core rules are stable:

- Each advanced rule should be independently toggleable via a `Ruleset` configuration flag.
- Advanced rules must not require story or NPC-specific branches inside the engine.
- Regional rule variants should map into generic `Ruleset` options — the engine does not need to know which region a rule comes from.
- The `Ruleset` type is defined in the MVP with only default values; advanced fields are added incrementally in later milestones.
