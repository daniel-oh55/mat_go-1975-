# Project Vision

## 1. Project Overview

This project builds a reusable Matgo (Korean flower card game) engine alongside a long-term game IP. The codebase is designed so the engine can power multiple game titles across different narrative worlds, while each world supplies its own story, NPCs, regions, and content without modifying the engine.

Current working title: **팔도맞고 1975** *(provisional — subject to change)*

---

## 2. Current Working Title

**팔도맞고 1975** is a working title only. The final name will be decided once the world-building, tone, story, and player experience are complete enough to choose the most fitting identity for the IP.

---

## 3. Long-Term Goal

1. Build a simple, robust, and reusable Matgo engine that works across different game worlds.
2. Build a single game IP that can grow and expand over the long term.

These two goals reinforce each other: a clean engine lowers the cost of expanding the IP, and a compelling IP gives the engine a reason to keep improving.

---

## 4. Core Philosophy

> **Simple Engine. Deep Experience. Complete Before Expand.**

- Keep the engine simple and solid.
- Make the player experience deep and memorable.
- Prioritize completion over expansion.
- Finish existing features before adding new ones.
- Features are a means to deliver emotion — not an end in themselves.

---

## 5. MVP Definition

> *The MVP goal is to complete an engine where a user can play one full game of Matgo against an AI — from start to finish — without any errors.*

**Not included in MVP:**

| Category | Examples |
|---|---|
| Narrative | Story, NPC, dialogue, regional lore |
| Atmosphere | BGM, background images, fortune/horoscope |
| Progression | Rewards, achievements, unlocks |
| Monetization | Ads |
| Social | Online multiplayer, rankings |

These elements belong to the content layer and will be addressed in later milestones.

---

## 6. Development Order

This project always follows this sequence:

1. **Design the overall project structure first.**
2. **Complete the engine.**
3. **Validate the engine thoroughly.**
4. **Complete UI/UX.**
5. **Produce story and content last.**

Skipping steps or reversing this order is not allowed. Content work must not begin before the engine is validated.

---

## 7. Engine and Content Separation

The engine is responsible for **only**:

- Card definitions and deck
- Shuffle and hand distribution
- Game rules and scoring
- Turn management and game state
- AI opponent logic
- Save/load interface (abstract)

The engine must **never** know about:

- Story, NPCs, regions, dialogue
- Background images, BGM
- Fortune / horoscope
- Reward data, unlock conditions

**Rules:**

- Adding a new region or story must never require modifying engine code.
- All content is managed as data, not as engine logic.
- The engine must remain reusable for future Matgo game titles.

---

## 8. Fairness Policy

- Shuffle and hand distribution always use fair randomness.
- Win/loss outcomes are never manipulated.
- No user receives intentionally good or bad hands.
- Fortune / horoscope / story elements do not affect win/loss probability.
- Fortune elements only affect: dialogue, atmosphere, presentation, rewards, and unlockable content.

---

## 9. AI Collaboration Model

| Role | Responsibility |
|---|---|
| **ChatGPT** | Game director, PM, system design, UX design, project management, Claude Code task briefs |
| **Claude Code** | Code implementation, refactoring, tests, components, bug fixes |
| **Claude** | Story, NPC, world-building, regional lore, dialogue, fortune copy, content review |
| **Codex** | Pull request review, core logic review, performance improvements, complex bug analysis, pre-release final review |

---

## 10. What This Project Is Not

- Not a simple card game app built in a weekend.
- Not a project where content is added before the engine is stable.
- Not a project where features accumulate without being finished.
- Not a clone of existing Matgo apps.
- Not built to move fast and ship broken.

---

## 11. Long-Term Expansion Direction

Once the engine is complete and validated, the IP can expand in these directions:

- Additional regional worlds with distinct art styles, dialogue, and atmosphere
- Story-driven single-player campaigns
- Online multiplayer (asynchronous and real-time)
- Seasonal events and fortune-based content
- Alternative rule variants built on top of the same engine core
- Ports to additional platforms using the same engine layer

Each expansion layer is additive — it sits on top of the engine without touching it.
