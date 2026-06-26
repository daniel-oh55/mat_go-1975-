# MVP AI Design

## 1. Purpose

This document defines the goal and responsibility scope of the MVP AI.

The MVP AI goal is **not** to play Matgo well. The goal is to select legal actions and complete a full game from start to finish without errors. Strength and personality come later.

---

## 2. MVP AI Goal

- MVP AI is **correctness-first**.
- MVP AI does not need to play optimally.
- MVP AI must always select a legal action.
- MVP AI must never bypass engine validation.
- MVP AI difficulty is controlled by decision strategy — never by card distribution.
- MVP AI must support headless full-game simulation without a UI.

---

## 3. AI Boundary

| Responsibility | Description |
|---|---|
| Location | `engine/ai` or an engine-adjacent module during MVP |
| Input | `GameState` (legal information only) + legal action candidates from the engine |
| Output | A selected `GameAction` returned to the Application Layer |
| Submission | Application Layer submits the selected action to the engine — AI does not call the engine directly |
| State mutation | AI must not mutate `GameState` directly |

The AI is a **pure decision function**: given what it can legally see and the set of legal actions, it returns one action.

---

## 4. AI Information Access

### Can see

| Information | Notes |
|---|---|
| AI's own hand | Full visibility |
| Field cards | Face-up; visible to all |
| AI's captured cards | Visible to all |
| Player's captured cards | Visible to all |
| Current scores | Visible to all |
| Current turn | Visible to all |
| Pending Go/Stop decision state | Visible to all |
| Legal actions | Provided by engine |
| Draw pile count | Count only — not order |

### Cannot see

| Information | Notes |
|---|---|
| Player's hand | Hidden — opponent's cards are not visible |
| Order of the draw pile | Hidden — AI cannot predict future draws |
| Future card draws | Hidden |
| RNG seed | Hidden — AI must not exploit randomness |
| Story/NPC hidden metadata | Not part of engine |
| Any user-specific manipulation data | Prohibited by fairness policy |

---

## 5. MVP AI Strategy

Two candidate strategies for MVP:

| Strategy | Description | Recommendation |
|---|---|---|
| Random legal action | Select uniformly at random from legal actions | First implementation — simple, testable, always valid |
| Simple heuristic | Prefer actions that improve score; safe Go/Stop decisions | Improvement after random strategy is verified |

**Implementation order:**
1. Random legal action — implement and validate first.
2. Simple heuristic — add after full-game simulation is passing.

### Simple heuristic direction *(for later)*

- Prefer actions that immediately increase score.
- Prefer Stop when already in a winning position.
- Prefer Go only when clearly ahead and the risk is low.
- Never choose an illegal or unavailable action.
- This heuristic will be specified in detail before implementation.

---

## 6. Go/Stop AI Decision

Go/Stop decision logic for MVP:

| Condition | Action |
|---|---|
| AI can Stop and currently has a winning score | Choose Stop |
| Uncertain or no clear advantage | Choose Stop (MVP default: conservative) |
| Go strategy | Deferred — can be improved after basic loop is stable |

**MVP default behavior:** When in doubt, Stop. The goal is game completion, not score maximization.

---

## 7. AI Difficulty Strategy

| Principle | Description |
|---|---|
| Difficulty by strategy quality | Harder AI selects better actions from the legal set |
| Never by card distribution | Giving AI better cards violates the fairness policy |
| No player-favoring hands | Fairness applies in both directions |
| No AI-favoring hands | Fairness applies in both directions |
| No rubber-banding through shuffle | Catch-up mechanics via card distribution are prohibited |

Difficulty levels (Easy, Normal, Hard) are a post-MVP feature. In the MVP, one AI strategy level is sufficient.

---

## 8. AI Test Requirements

Before the MVP is considered complete, the AI must pass all of the following:

- [ ] AI always selects a legal action from the provided legal action set.
- [ ] AI never acts out of turn.
- [ ] AI can handle a state where no high-scoring action is obvious.
- [ ] AI can make a Go/Stop decision when required.
- [ ] AI can complete a full game in a headless simulation.
- [ ] AI does not access hidden information (opponent hand, draw pile order).

---

## 9. Future AI Expansion

After the MVP, AI can be expanded in the following directions:

| Expansion | Layer |
|---|---|
| Difficulty levels (Easy/Normal/Hard) | Engine AI module |
| NPC personality layer | Content Layer / Application Layer |
| Regional play style | Content Layer → mapped to AI strategy configuration |
| Risk-taking and bluffing behavior | Engine AI strategy |
| Story-driven dialogue reactions | Content Layer (separate from AI decision logic) |

**Critical constraint:** NPC personality must live in the Content or Application Layer — not inside the core AI decision engine. Personality may influence which AI strategy is selected, but it must never affect card distribution or shuffle.
