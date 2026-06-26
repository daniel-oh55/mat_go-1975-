# MVP Scope

## 1. Purpose

This document defines what is included and excluded from the MVP.

> **MVP goal:** Complete an engine where a user can play one full game of Matgo against an AI — from start to finish — without any errors.

The MVP is not a finished product. It is proof that the core game loop works correctly. Everything else waits until the engine is stable and validated.

---

## 2. MVP Principle

- MVP is engine-first.
- MVP is not a content showcase.
- MVP is not a polished commercial release.
- MVP must prove the core game loop.
- One complete, reliable game is more important than many incomplete features.
- Features are added only after the engine is stable and validated.

---

## 3. MVP In Scope

| Area | Feature | Reason |
|---|---|---|
| Cards | Basic Hanafuda card model | Foundation of all game logic |
| Cards | 48-card deck definition | Required for any game to start |
| Cards | Fair shuffle | Required for game integrity |
| Cards | Initial hand distribution for 2-player Matgo | Required for a valid game start |
| Cards | Field card setup | Required for standard Matgo rules |
| Cards | Draw pile management | Required for turn-by-turn play |
| State | GameState model | Central data structure for the entire engine |
| State | Turn management | Required to sequence player and AI turns |
| Actions | Player action model | Required to represent what a player does |
| Actions | Legal action validation | Required to enforce rules; also testable boundary |
| Flow | Card play flow | Core of each turn |
| Flow | Deck reveal flow | Core of each turn |
| Flow | Capture resolution | Core scoring mechanic |
| Scoring | Basic score state | Required to track progress toward Go/Stop |
| Scoring | Basic scoring calculation | Required for game end result |
| Go/Stop | Go/Stop decision trigger | Required by Matgo rules |
| Go/Stop | Go/Stop action handling | Required to end or continue the game |
| End | Game end detection | Required to terminate the game loop |
| End | Final result calculation | Required to determine winner |
| AI | Basic local AI opponent | Required so a user can play a full game without a second human |
| AI | AI legal action selection | AI must follow the same rules as the player |
| Stability | Engine-level error handling | Invalid actions must fail explicitly and testably |
| Testing | Engine unit tests | Required to validate rules and state transitions |
| Testing | Headless simulation test for one complete game | Required to confirm the full game loop runs without UI |

---

## 4. MVP Out of Scope

| Feature | Reason for Deferral | Future Milestone |
|---|---|---|
| Story | Engine must be validated before content is built on top of it | Content milestone |
| NPC personality | Requires stable engine and content layer design | Content milestone |
| Regional progression | Requires content layer and stable game loop | Content milestone |
| World map | UI/content feature; not needed for engine validation | Content milestone |
| BGM | Atmosphere feature; irrelevant to engine correctness | UI/content milestone |
| Background art | Atmosphere feature; irrelevant to engine correctness | UI/content milestone |
| Fortune/horoscope system | Content layer feature; must not affect engine | Content milestone |
| Rewards | Requires stable game loop and content layer | Post-engine milestone |
| Unlock system | Depends on progression and content layer | Post-engine milestone |
| Achievements | Depends on progression and content layer | Post-engine milestone |
| Ads (AdMob) | Monetization implementation deferred; strategy documented in `docs/11_monetization_strategy.md` | Release preparation |
| In-app purchases (Google Play Billing) | Monetization implementation deferred; strategy documented in `docs/11_monetization_strategy.md` | Release preparation |
| Entitlement storage | Depends on billing SDK and purchase restore flow | Release preparation |
| Online multiplayer | Requires stable engine, server, and networking | Post-release or separate milestone |
| Rankings | Requires online infrastructure | Post-release |
| Account/login | Requires server infrastructure | Post-release |
| Cloud save | Requires server and account system | Post-release |
| Push notifications | Requires server and platform setup | Release preparation |
| Analytics | Not needed until release preparation | Release preparation |
| Advanced animations | Atmosphere; not needed for engine validation | UI polish milestone |
| Polished UI theme | Atmosphere; functional UI is sufficient for MVP | UI polish milestone |
| App store release assets | Not needed until near release | Release preparation |
| Complex AI personality | NPC feature; MVP AI only needs to complete a valid game | Content/AI milestone |
| Dynamic difficulty through card distribution | Prohibited by fairness policy | Never — violates fairness policy |
| NPC-specific rules | Content feature; must not be baked into engine | Content milestone |
| Region-specific rules | Content feature; must not be baked into engine | Content milestone |
| Special story-driven match conditions | Content feature; must not be baked into engine | Content milestone |

---

## 5. MVP Completion Criteria

The MVP is complete when all of the following are true:

- [ ] A new game can be created.
- [ ] Deck contains the correct number of cards (48).
- [ ] Shuffle produces no duplicates and no missing cards.
- [ ] Initial card distribution is valid (correct counts for hands, field, and draw pile).
- [ ] Player can take a legal turn.
- [ ] Illegal actions are rejected by the engine before any state mutation.
- [ ] AI can take a legal turn following the same validation path as the player.
- [ ] Turns continue until the game ends.
- [ ] Go/Stop decision is triggered when the score threshold is reached.
- [ ] Stop ends the game and produces the correct final result.
- [ ] Final result is calculated correctly.
- [ ] Engine can complete one full game without any UI.
- [ ] Unit tests cover core rules.
- [ ] Simulation test can complete a full AI vs. player game from start to finish.
- [ ] No story, NPC, region, ads, or platform code is required to reach any of the above.

---

## 6. MVP Non-Goals

The MVP does not aim to be:

- A shippable commercial app
- A beautiful UI experience
- A story or character experience
- A monetized product
- An online multiplayer system
- A complete implementation of all Matgo rule variants
- A long-term play loop with progression
- A content expansion platform

Monetization-specific non-goals for the MVP:

- No AdMob or ad SDK integration — ads are documented only in `docs/11_monetization_strategy.md`
- No Google Play Billing integration — in-app purchases are documented only
- No product IDs, entitlements, or purchase restore implementation
- No pay-to-win items — prohibited permanently, not just deferred

**The sole purpose of the MVP is to validate the engine.**

---

## 7. Rule Scope Strategy

Matgo has many regional and house-rule variants. This section defines which rules are in scope for the MVP and which are deferred.

### Core Rules for MVP

These rules are required for a complete and valid game:

- 2-player Matgo
- 48-card deck
- Hand, field, and draw pile setup
- Play one card from hand
- Reveal one card from the draw pile
- Resolve card captures (hand card and draw card separately)
- Track captured card groups (광, 열, 띠, 피)
- Basic score calculation based on captured groups
- Go/Stop decision when score threshold is reached
- Game end when Stop is declared or terminal condition is met

### Advanced Rules Deferred

The following rules are not included in the MVP. They are not discarded — they will be added as `Ruleset` options after the core rules are stable:

| Rule | Notes |
|---|---|
| 쪽 | Immediate capture when played card matches field card directly |
| 따닥 | Double score bonus condition |
| 뻑 | Penalty condition when a played card has no match |
| 폭탄 | Triple match condition |
| 흔들기 | Bonus condition for matching sets in hand |
| 총통 | Instant win condition |
| 피박 | Penalty for losing with only pi cards |
| 광박 | Penalty for losing against full gwang set |
| 고박 | Penalty related to Go declaration count |
| 멍박 | Penalty for losing with a specific hand composition |
| 나가리 | Round void condition |
| 지역별 특수 룰 | Regional rule variants |
| NPC별 특수 룰 | NPC-specific rules (content layer concern) |

> Advanced rules are extended through the `Ruleset` configuration — they do not require changes to the engine core.

---

## 8. MVP Anti-Scope-Creep Rules

Use these rules to evaluate any feature request during the MVP phase:

- If a feature does not help a user complete one full AI match, it is **not MVP**.
- If a feature requires story, NPC, or content data, it is **not MVP**.
- If a feature requires ads, account, server, or online systems, it is **not MVP**.
- If a feature improves atmosphere but not engine correctness, it is **not MVP**.
- If a feature makes testing harder before the core loop is stable, it is **not MVP**.
- PR reviews must reject MVP scope creep.

When in doubt, apply the litmus test: *Does this help the engine complete one valid Matgo game?* If not, defer it.

---

## 9. Future Expansion After MVP

After the MVP is complete and validated, the project expands in this order:

1. **Advanced rules** — Add deferred Matgo rules as optional `Ruleset` modules.
2. **UI polish** — Improve visuals and animations after the engine is confirmed stable.
3. **Save/unlock** — Add persistence and unlock mechanics after the game loop is stable.
4. **Story and content** — Build story, NPCs, and regional content after UI and engine are stable.
5. **Ads** — Integrate advertising only during release preparation.
6. **Online multiplayer** — Add only after the local AI experience is complete and satisfying.

Each step is conditional on the previous step being complete and validated.

---

## 10. Relationship to Other Documents

| Document | Contents |
|---|---|
| [00_project_vision.md](00_project_vision.md) | Project philosophy, long-term goals, AI collaboration model |
| [01_architecture.md](01_architecture.md) | Layer boundaries and dependency direction |
| `03_engine_boundary.md` | Detailed engine responsibility — *to be written in a later PR* |
| `04_game_rule_spec.md` | Detailed rule specification — *to be written in a later PR* |
| [05_data_flow.md](05_data_flow.md) | Game flow, event direction, AI turn flow |
| [10_decision_log.md](10_decision_log.md) | Key decisions with rationale and impact |
