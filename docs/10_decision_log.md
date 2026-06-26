# Decision Log

This file records key decisions made during the project. Each entry documents what was decided, why, and what impact it has on future development.

Entries are listed in reverse chronological order (newest first).

---

## 2026-06-26 - Engine and Content Must Be Strictly Separated

**Decision**  
The game engine will have no knowledge of story, NPCs, regions, dialogue, background images, BGM, fortune/horoscope data, or reward structures. All content is managed externally as data and injected into the content layer — never into the engine.

**Reason**  
Mixing content into the engine creates tight coupling that makes it expensive to add new worlds, change narratives, or reuse the engine in another title. Separation ensures the engine stays clean and portable.

**Impact**  
- Adding a new region or story must never require modifying engine code.
- Engine code changes are gated to: rules, scoring, shuffle, AI, state, save interface.
- Content teams (Claude, writers, designers) work independently of engine development.

---

## 2026-06-26 - Shuffle and Hand Distribution Must Use Fair Randomness

**Decision**  
Shuffle and hand distribution will always use fair, unbiased randomness. No system will intentionally give a user a favorable or unfavorable hand. Win/loss outcomes are never manipulated.

**Reason**  
Player trust depends on fairness. Manipulating outcomes — even with good intentions (e.g., adjusting difficulty) — breaks the integrity of the game. Difficulty will be managed through AI strength, not card distribution.

**Impact**  
- The shuffle module must be independently testable for statistical fairness.
- Fortune/horoscope/story elements must be implemented in the content layer only and must not feed back into engine randomness.
- Any future difficulty system must operate through AI behavior, not hand stacking.

---

## 2026-06-26 - Completion Over Expansion

**Decision**  
New features will not be added until existing features are complete and working correctly. The project follows the principle: *Complete Before Expand*.

**Reason**  
Premature expansion leads to shallow, half-finished features that accumulate technical debt and reduce overall quality. A fully working core experience is more valuable than many partially working features.

**Impact**  
- Feature requests during active development milestones will be logged but not implemented until the current milestone is complete.
- PR reviews should flag scope creep.
- Each milestone has a single, clearly defined completion condition.

---

## 2026-06-26 - MVP Scope: Engine-Only, No Content Layer

**Decision**  
The MVP will implement only the Matgo engine. Story, NPCs, regions, BGM, background images, fortune/horoscope, rewards, ads, online multiplayer, and rankings are explicitly excluded from the MVP.

**Reason**  
The engine is the foundation. Building content before the engine is stable and validated results in content that must be rebuilt later. Validating the engine first — with a single AI vs. player game — ensures the foundation is solid before anything is layered on top.

**Impact**  
- MVP completion condition: a user can play one full game of Matgo against an AI, from start to finish, without errors.
- Any PR that introduces content-layer code during the MVP phase should be rejected.
- UI/UX in the MVP is functional, not polished.

---

## 2026-06-26 - Working Title Is Provisional

**Decision**  
The current project name **팔도맞고 1975** is a working title (가칭). The final name will be chosen after the world-building, tone, story, and player experience are sufficiently developed.

**Reason**  
A name chosen too early may not fit the final identity of the game. The world, atmosphere, and experience should inform the name — not the other way around.

**Impact**  
- Internal documents, code, and repo names may use 팔도맞고 1975 as a placeholder.
- No brand assets, app store listings, or external communications should treat this name as final.
- A naming review should be scheduled as part of the content milestone.
