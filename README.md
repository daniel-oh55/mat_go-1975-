# 팔도맞고 1975 *(가칭 / Working Title)*

> **Simple Engine. Deep Experience. Complete Before Expand.**

---

## Overview

This project builds a reusable Matgo (Korean flower card game) engine and a long-term game IP. The engine is designed to be world-agnostic — story, NPCs, regions, and content are separate from the core game logic and can be swapped or extended without touching the engine.

The current name **팔도맞고 1975** is provisional. The final title will be chosen once the world, atmosphere, and player experience are fully shaped.

---

## MVP Goal

> Complete an engine where a user can play one full game of Matgo against an AI — from start to finish — without any errors.

The MVP does not include story, NPCs, BGM, backgrounds, fortune/horoscope, rewards, ads, or online play. Those belong to later milestones.

---

## Documentation

All design decisions and project vision are documented in the `docs/` folder.

| File | Contents |
|---|---|
| [docs/00_project_vision.md](docs/00_project_vision.md) | Project goals, philosophy, MVP definition, engine/content separation, fairness policy |
| [docs/10_decision_log.md](docs/10_decision_log.md) | Key decisions with rationale and impact |

---

## Development Approach

Design and documentation come before implementation. The project always follows this order:

1. Design the overall structure
2. Complete and validate the engine
3. Complete UI/UX
4. Produce story and content

No code is written until the relevant design is documented and agreed upon.
