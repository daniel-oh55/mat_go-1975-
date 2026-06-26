# Open Decision Resolution

## 1. Purpose

This document resolves the Open Decisions required before Milestone 2 engine implementation begins.

**Goals:**
- Ensure Claude Code does not make arbitrary judgment calls during engine implementation.
- Establish confirmed MVP Core Rule defaults.
- Preserve the path for future Advanced Rule expansion via `Ruleset` configuration.

---

## 2. Resolution Summary

| ID | Decision | Resolution | Applies Before |
|---|---|---|---|
| OD-1 | Initial deal counts | 10 / 10 / 8 / 20 | M2-PR3 |
| OD-2 | Multiple same-month field card handling | Target selection (action includes `targetCardId`) | M2-PR5 |
| OD-3 | Basic score table | Simplified gwang / yeol / tti / pi table | M2-PR6 |
| OD-4 | Go/Stop score threshold | 7 points | M2-PR6 |
| OD-5 | Go multiplier | Not applied in MVP; `goCount` tracked only | M2-PR7 |
| OD-6 | Draw pile exhaustion end condition | Game ends; higher score wins; tie = draw | M2-PR9 |

---

## OD-1 — Initial Deal Counts

**Resolution:**

| Zone | Card Count |
|---|---|
| Player hand | 10 |
| AI hand | 10 |
| Field | 8 |
| Draw pile | 20 |
| **Total** | **48** |

**Reason:**
- Standard 2-player Matgo setup used in most Korean rule sets.
- Simple to implement and verify — total must equal 48.
- Compatible with MVP full-game simulation.

**Applies before:** M2-PR3

---

## OD-2 — Multiple Same-Month Field Card Handling

**Resolution:**

When two or more field cards share the same month as the played or revealed card:

- The `GameAction` must include a `targetCardId` (or equivalent target reference) identifying which field card to capture.
- The engine validates that the selected target is a legal same-month field card.
- For headless simulation and MVP AI: the Application Layer or AI strategy may auto-select the first deterministic legal target (e.g., lowest `cardId`, or first in field array order).
- The engine must **not** automatically capture all matching cards by default.
- A future `Ruleset` option may enable capture-all behavior, but this is deferred.

**Reason:**
- More extensible than capture-all: future UI can present a choice without rewriting engine logic.
- Keeps MVP simulation deterministic — AI picks the first valid target.
- Engine remains the authority on legality; selection responsibility belongs to Application Layer or AI.

**Applies before:** M2-PR5

---

## OD-3 — Basic Score Table

**Resolution:**

MVP uses a simplified but recognizable score table:

### 광 (Gwang / Brights)

| Captured | Score |
|---|---|
| 3 gwang | 3 points |
| 4 gwang | 4 points |
| 5 gwang | 15 points |

### 열 (Yeol / Animals)

| Captured | Score |
|---|---|
| 5 yeol | 1 point |
| Each additional yeol | +1 point |

### 띠 (Tti / Ribbons)

| Captured | Score |
|---|---|
| 5 tti | 1 point |
| Each additional tti | +1 point |

### 피 (Pi / Chaff)

| Captured | Score |
|---|---|
| 10 pi | 1 point |
| Each additional pi | +1 point |

**Deferred to Advanced Ruleset expansion:**
- Godori (고도리) — special animal combination bonus
- Hongdan / Cheongdan / Chodan (홍단 / 청단 / 초단) — ribbon color bonuses
- Double-pi (쌍피) — double-value chaff cards
- Bi-gwang special handling (비광 특수 처리)
- Pi-bak / Gwang-bak / Go-bak / Meong-bak (피박 / 광박 / 고박 / 멍박)

**Reason:**
- Sufficient to validate core scoring logic and Go/Stop threshold triggering.
- Avoids advanced rule complexity before the core engine is stable.
- Deferred items can be added independently as `Ruleset` options.

**Applies before:** M2-PR6

---

## OD-4 — Go/Stop Score Threshold

**Resolution:**
- Default Go/Stop trigger threshold: **7 points**

**Reason:**
- Common baseline used in most Korean Matgo rule sets.
- Simple and easy to test with the simplified score table.
- Can be adjusted via `Ruleset` configuration later.

**Applies before:** M2-PR6

---

## OD-5 — Go Multiplier

**Resolution:**
- MVP tracks `goCount` in `GameState`.
- MVP does **not** apply any score multiplier based on `goCount`.
- Go multiplier behavior is deferred to Advanced Ruleset expansion.

**Reason:**
- Allows the Go/Stop decision flow to be implemented and tested without adding score multiplication complexity.
- `goCount` is tracked now so the multiplier can be added later without a state shape change.
- Keeps M2-PR6 and M2-PR7 focused and small.

**Applies before:** M2-PR7

---

## OD-6 — Draw Pile Exhaustion End Condition

**Resolution:**
- If a player's turn begins but they have no cards in hand **and** the draw pile is empty, the game ends.
- Final result is determined by comparing current scores.
- Higher score wins.
- Equal scores result in a draw.
- Nagari (나가리) and round carry-over rules are deferred to Advanced Ruleset expansion.

**Reason:**
- Guarantees that the headless simulation always terminates.
- Avoids advanced round-carry logic in MVP.
- Draw result is a valid edge case that keeps the engine deterministic.

**Applies before:** M2-PR9

---

## 3. Implementation Impact

| PR | What to implement |
|---|---|
| M2-PR3 | Use 10 / 10 / 8 / 20 as fixed initial distribution |
| M2-PR5 | `GameAction` must accept `targetCardId`; engine validates target legality |
| M2-PR6 | Implement simplified gwang / yeol / tti / pi score table; trigger at 7 points |
| M2-PR7 | Track `goCount`; no multiplier applied |
| M2-PR9 | Detect hand-and-pile exhaustion; compare scores; terminate game |

---

## 4. Deferred Rules

The following remain as Advanced Rules for future `Ruleset` expansion. They are not part of MVP:

| Rule | Category |
|---|---|
| 쪽 | Capture bonus |
| 따닥 | Score bonus |
| 뻑 | Penalty |
| 폭탄 | Bonus |
| 흔들기 | Bonus |
| 총통 | Instant win |
| 고도리 (Godori) | Score combination |
| 홍단 / 청단 / 초단 | Ribbon color bonus |
| 쌍피 (double-pi) | Chaff value modifier |
| 비광 특수 처리 | Bright scoring variant |
| 피박 | Loser penalty |
| 광박 | Loser penalty |
| 고박 | Go-related penalty |
| 멍박 | Hand composition penalty |
| 나가리 | Round void / carry-over |
| 지역별 특수 룰 | Regional rule variants |
| NPC별 특수 룰 | NPC-specific rules (content layer) |

---

## 5. PR Review Checklist

- [ ] All OD-1 through OD-6 are resolved in this document.
- [ ] No engine code is added.
- [ ] No card data is added.
- [ ] No test code is added.
- [ ] Rule decisions are reflected in `docs/04_game_rule_spec.md`.
- [ ] Milestone 2 PR plan references the resolved decisions.
- [ ] Advanced rules remain deferred.
