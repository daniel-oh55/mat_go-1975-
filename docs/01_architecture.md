# Architecture

## 1. Purpose

This document defines the overall layer structure and dependency direction for the project.

The project is not a single Matgo game. The goal is to build a reusable Matgo engine that can power different game worlds, alongside a long-term game IP. The architecture must support both — a stable, testable engine core and an expandable content and platform surface.

---

## 2. Architecture Principles

- Engine must be simple, deterministic where possible, and testable.
- Engine must not know about story, NPCs, regions, BGM, ads, UI, or platform APIs.
- Content must be data-driven.
- UI must not contain game rules.
- Platform services must be isolated behind interfaces.
- New worlds or stories must not require engine code changes.
- Completion is prioritized over expansion.
- Monetization belongs to the Platform and Application layers — never the engine.
- Engine must not know about ads, purchases, product IDs, entitlements, or premium user state.
- Monetization must not affect game rules, scoring, shuffle, or AI fairness.

---

## 3. Layer Overview

### UI Layer

**Responsible for:**
- React screens and components
- Card display
- Buttons and player input
- Animations and visual feedback
- Rendering game state for the player

**Must not:**
- Calculate Matgo rules directly
- Calculate scores
- Shuffle or distribute cards
- Directly interpret content data
- Directly call save/ad SDKs (minimize where unavoidable)

---

### Application Layer

**Responsible for:**
- Orchestration between UI and Engine
- Converting user input into `GameAction`
- Converting engine results into UI-friendly view state
- Controlling AI turn flow
- Requesting save/load from Platform Layer
- Mapping between Content data and Engine-understood configuration

**Key constraint:**
- UI must interact with the Engine only through the Application Layer where possible.
- Content data is interpreted in this layer and translated into engine-compatible configuration before being passed down.

---

### Game Engine Layer

**Responsible for:**
- Card definitions
- Deck construction and shuffle
- Hand distribution
- Game state
- Turn management
- Legal action validation
- Capture rules
- Scoring
- Go/Stop decision flow
- Game end detection
- Basic AI strategy interface

**Must not:**
- Import React
- Access the DOM
- Import story, NPC, or region data
- Import BGM, background image, fortune, or reward data
- Directly call LocalStorage, Capacitor, or Ads SDK

---

### Content Layer

**Responsible for:**
- Worlds
- Regions
- NPCs
- Dialogue
- Episodes
- Match metadata
- Unlock data
- Rewards
- Fortune and atmosphere copy
- BGM and background image metadata

**Key constraints:**
- Content will not be implemented during the MVP phase.
- Content must not directly affect the engine.
- Fortune and story elements must never affect win/loss probability, shuffle, or hand distribution.

---

### Platform Layer

**Responsible for:**
- Local storage implementation
- Capacitor integration
- Android-specific services
- Ads (AdMob — deferred to release preparation)
- Analytics
- App version, device, and platform APIs
- Google Play Billing (deferred to release preparation)
- Purchase restore and entitlement persistence (deferred to release preparation)

**Must not:**
- Directly mutate engine state
- Contain game rules
- Allow monetization state to affect engine shuffle, scoring, or win/loss

---

### Shared Layer

**Responsible for:**
- Common utility functions
- Common types
- Error types
- Immutability and validation utilities

**Caution:**
- Shared must not become a dumping ground where all layers become entangled. If a utility is only used by one layer, it belongs in that layer.

---

## 4. Dependency Direction

### Allowed

```
UI            → Application
Application   → Engine
Application   → Content
Application   → Platform
Application   → Shared
Engine        → Shared
Content       → Shared
Platform      → Shared
```

### Forbidden

```
Engine        → UI
Engine        → Content
Engine        → Platform
UI            → Engine  (direct calls bypassing Application)
Content       → Engine  (depending on engine internals)
Platform      → Engine  (directly mutating engine state)
```

Any PR that introduces a dependency in the Forbidden list must be rejected.

---

## 5. Proposed Future Directory Structure

The following structure is documented as a target. **No folders or files are created by this PR.**  
Actual directories are created only when the relevant milestone requires them.

```
src/
├─ engine/
│  ├─ cards/          # Card definitions and deck construction
│  ├─ rng/            # Fair randomness utilities
│  ├─ rules/          # Capture rules, Go/Stop rules
│  ├─ state/          # GameState definition and transitions
│  ├─ actions/        # GameAction definitions and validation
│  ├─ scoring/        # Score calculation
│  ├─ ai/             # AI strategy interface and implementations
│  ├─ simulation/     # Headless game runner for testing
│  └─ types/          # Engine-internal types
│
├─ app/
│  ├─ controllers/    # Orchestration between UI and Engine
│  ├─ usecases/       # Use-case flows (new game, play card, go/stop)
│  ├─ selectors/      # Derive UI view state from GameState
│  └─ services/       # Cross-cutting app services
│
├─ ui/
│  ├─ screens/        # Full screen components
│  ├─ components/     # Reusable UI components
│  ├─ layouts/        # Layout primitives
│  └─ animations/     # Animation definitions and hooks
│
├─ content/
│  ├─ schemas/        # Type definitions for content data
│  └─ worlds/
│     └─ paldo-1975/  # Content data for 팔도맞고 1975 world
│
├─ platform/
│  ├─ storage/        # Storage interface and implementation
│  ├─ ads/            # Ads integration
│  ├─ analytics/      # Analytics integration
│  └─ capacitor/      # Capacitor-specific wrappers
│
└─ shared/
   ├─ constants/      # App-wide constants
   ├─ utils/          # Common utility functions
   └─ errors/         # Shared error types
```

---

## 6. Engine API Direction

The engine is designed to move toward the following model:

```
GameState + GameAction + Ruleset
=
NextGameState + GameEvent[]
```

**Core concepts:**

| Concept | Description |
|---|---|
| `GameState` | Complete snapshot of the current game — all hands, field, deck, scores, turn, flags |
| `GameAction` | A player's or AI's intent — which card to play, Go or Stop decision |
| `Ruleset` | Rule options for the session — variant rules, scoring thresholds |
| `NextGameState` | The new state after the action is applied |
| `GameEvent[]` | Structured results that UI, animation, logging, and save systems can interpret |

**Key point:** The engine returns `GameEvent[]` — it does not directly modify UI. The UI reacts to events.

---

## 7. Extension Strategy

The engine is designed to be world-agnostic so it can be reused in future Matgo titles.

| What to extend | Where |
|---|---|
| New game world or story | Content Layer — add new world directory under `content/worlds/` |
| Rule variation | Engine — extend `Ruleset` configuration |
| UI theme or visual style | UI Layer — swap theme providers or component variants |
| Platform feature | Platform Layer — add or swap implementation behind existing interface |

No extension scenario should require modifying engine internals.

---

## 8. What Not To Do

- Do not put story conditions or NPC checks inside engine code.
- Do not calculate scores inside React components.
- Do not let fortune or horoscope data affect shuffle or hand distribution.
- Do not access localStorage directly from the engine.
- Do not create special-case engine logic for one specific NPC or region.
- Do not add online multiplayer concerns during the MVP engine phase.
- Do not let the Application Layer grow into a second engine — rules belong in the Engine, not in controllers or use cases.
