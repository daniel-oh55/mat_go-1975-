# Save / Progress Architecture

## 1. Purpose

This document defines the architecture for the Save and Progress system — what is saved, where it is saved, when it is saved, and which layer is responsible for each concern.

This is an architecture and planning document. No implementation code is created by this PR. The implementation is a separate milestone.

Use this document when:
- Implementing the Platform Layer storage service.
- Implementing the Application Layer save/load logic.
- Adding a new data category that needs persistence.
- Reviewing a PR that touches storage, save triggers, or progress state.

---

## 2. What This Document Does Not Cover

The following are out of scope for the Save/Progress system and must not be added to the save schema:

- Cloud save (requires server and account — deferred to post-release)
- Online multiplayer state
- Purchase history, entitlements, or product IDs (Platform Layer — billing, not save)
- Ad impression history
- Analytics event log
- BGM or sound preferences (deferred to UI polish milestone)
- Story progress, NPC relationship state (deferred to Content milestone)
- Region unlock state (deferred to Content milestone)
- Full game replay / action history (deferred — not needed for MVP or M5)
- `GameState` internals that include NPC, region, or content identity

---

## 3. M5 MVP Implementation Scope

**Milestone 5 implements Category A only.** Category B and Category C are architecture-complete but not implemented in M5.

| Category | M5 status | Description |
|---|---|---|
| A: Active Game | **Implemented in M5** | Player can resume the current game after closing the app |
| B: Player Statistics | Deferred (post-M5) | Win/loss record, best score — requires Stats screen UI |
| C: App Settings | Deferred (post-M5) | No settings fields defined yet |

**Rationale for scope:** The highest-value save feature for a single-session mobile game is "not losing your game progress when the app closes." Player statistics are meaningful only once the core play loop is stable and the player has played multiple games. Implementing stats in M5 would require a Stats screen UI that is not yet designed.

**What M5 delivers:**
- `StorageService` interface + `BrowserLocalStorageStorageService` + `InMemoryStorageService` (browser/Vite environment first, no Capacitor dependency)
- Application Layer save/load module for Category A (serialize, validate, migrate)
- Save triggers wired into `GameSessionScreen` (after each turn, on game end)
- Resume UX — "게임 이어하기" prompt when an active game is detected on startup
- `CapacitorStorageService` (Platform Layer implementation for production mobile — M5-PR6, after browser validation)

**What M5 does not deliver:**
- Category B (Player Statistics) — no stats tracking, no stats screen
- Category C (App Settings) — no settings persistence
- Cloud save, account, entitlements

All three categories remain documented in §4 below so the architecture is established before implementation begins.

---

## 4. Save Data Categories

There are three independent categories of persistent data. Each has a different save trigger, retention lifetime, and consumer.

### Category A: Active Game — **M5 scope**

A snapshot of the in-progress game so the player can resume after closing the app.

**Contents:**
- Serialized `GameState` (the complete engine snapshot)
- `SessionPhase` — `'playing'` or `'pendingGoStop'` (only active phases are saved; `idle` and `ended` are not saved as an active game)
- `saveVersion` — schema version for migration
- `savedAt` — ISO 8601 timestamp for staleness detection

**Lifetime:**
- Written after every human turn and every AI turn.
- Written when the app is paused / sent to background.
- Cleared when the game ends (`phase === 'ended'`).
- Cleared when the player explicitly starts a new game from the result screen.

**Notes:**
- Only one active game is stored at a time. There is no save-slot system.
- If the app is reopened and a valid active game exists, the player is offered a "게임 이어하기" (Resume) option before the title screen.

---

### Category B: Player Statistics — **Deferred (post-M5)**

> **Not implemented in M5.** Category B is documented here so the storage key and schema are established before implementation begins.

Cumulative lifetime statistics for the player. Updated when a game ends.

**Contents:**
- `totalGames: number` — total completed games
- `wins: number` — games where `winner === humanPlayerId`
- `losses: number` — games where `winner !== null && winner !== humanPlayerId`
- `draws: number` — games where `winner === null`
- `totalGoCount: number` — lifetime total of Go declarations made by the human
- `bestScore: number` — highest single-game score achieved
- `saveVersion` — schema version
- `updatedAt` — ISO 8601 timestamp

**Lifetime:**
- Updated on every game end, regardless of reason (Stop or deck exhaustion).
- Never cleared by the player in the MVP.
- Additive — each game end accumulates into existing stats.

**Notes:**
- Stats are displayed in a future Stats screen. The display UI is not in scope for M5.
- `totalGoCount` is stored because Go declarations are a meaningful player behaviour metric and are already tracked by the engine (`goCount`).

---

### Category C: App Settings — **Deferred (post-M5)**

> **Not implemented in M5.** Category C is documented here so the storage key and schema format are established before the Settings UI is built.

Player preferences that persist between sessions.

**Contents (MVP scope):**
- `saveVersion` — schema version
- `updatedAt` — ISO 8601 timestamp

> **Note:** No settings are defined in the MVP. Category C is specified here so the storage key and schema format are established before the Settings UI is built. The document will be updated when settings are added. Do not add settings fields speculatively.

**Lifetime:**
- Updated whenever the player changes a setting.
- Never automatically cleared.

---

## 5. Storage Key Design

Each category maps to a stable storage key. Keys are namespaced to avoid collisions if multiple apps share the same storage space (e.g., Capacitor Storage on shared device storage).

| Category | Key |
|---|---|
| Active Game | `matgo.v1.activeGame` |
| Player Statistics | `matgo.v1.playerStats` |
| App Settings | `matgo.v1.settings` |

**Key versioning:** The `v1` segment in each key is the storage schema generation. A breaking schema change that requires full data migration uses a new key (e.g., `matgo.v2.activeGame`) and a one-time migration function in the Application Layer.

**Key format rules:**
- All lowercase, dot-separated.
- Prefix `matgo.` always present — never use bare keys.
- Generation segment (`v1`, `v2`, …) is incremented only on breaking schema changes — not on every feature update.

---

## 6. Save Triggers

### Active Game save triggers

| Trigger | Condition | Action |
|---|---|---|
| After human turn | `session.phase === 'playing'` after SUBMIT_HUMAN_ACTION | Save Category A |
| After AI turn | After ADVANCE_AI completes | Save Category A |
| After AI Go/Stop decision | After ADVANCE_AI resolves Go/Stop | Save Category A |
| App paused / backgrounded | Platform pause event (Capacitor only — deferred to M5-PR7; requires `@capacitor/app`) | Save Category A |
| Game ended | `session.phase === 'ended'` | Delete Category A |
| Player starts new game from result | "다시 하기" dispatched | Delete Category A (new game starts fresh) |

> **Save on every turn:** Saving after every turn means at most one turn of progress is lost if the app crashes or is force-killed. This is acceptable for a single-device local game.

> **Category B update on game end is deferred.** In M5, game end only deletes the Category A document. Category B (Player Statistics) update is a separate concern documented in the "Player Statistics save triggers" table below — it is not part of the M5 Active Game trigger flow.

> **"App paused / backgrounded" requires Capacitor.** `BrowserLocalStorageStorageService` (M5-PR2 through M5-PR5) has no reliable app-pause signal in a browser environment. Per-turn saves provide equivalent protection for the browser development phase. The pause trigger requires the `@capacitor/app` plugin and is deferred to M5-PR7. M5-PR6 added `CapacitorStorageService` (Preferences adapter) but did not wire the pause event.

### Player Statistics save triggers — Deferred (post-M5)

> Not implemented in M5. The trigger is documented for future reference.

| Trigger | Condition | Action |
|---|---|---|
| Game ended | `session.phase === 'ended'` | Update Category B |

Stats are updated once per game, not once per turn.

### App Settings save triggers — Deferred (post-M5)

> Not implemented in M5. No settings fields are defined yet.

| Trigger | Condition | Action |
|---|---|---|
| User changes a setting | (no settings defined yet) | Update Category C |

---

## 7. JSON Schema (document format)

All saved documents are JSON objects. No binary format. The Application Layer serializes and deserializes all fields.

### Category A — Active Game

```
{
  "saveVersion": 1,
  "savedAt": "2026-06-28T14:00:00.000Z",
  "sessionPhase": "playing" | "pendingGoStop",
  "gameState": { /* serialized GameState — all fields are plain data */ }
}
```

`gameState` contains the complete `GameState` object as returned by the engine. Because the engine's `GameState` boundary requires all fields to be plain serializable data (no class instances, no functions, no Symbols), no custom serializer is needed — `JSON.stringify` and `JSON.parse` are sufficient.

### Category B — Player Statistics (Deferred, post-M5)

> Schema is documented for future implementation. Not written in M5.

```
{
  "saveVersion": 1,
  "updatedAt": "2026-06-28T14:00:00.000Z",
  "totalGames": 0,
  "wins": 0,
  "losses": 0,
  "draws": 0,
  "totalGoCount": 0,
  "bestScore": 0
}
```

### Category C — App Settings (Deferred, post-M5)

> Schema is documented for future implementation. Not written in M5.

```
{
  "saveVersion": 1,
  "updatedAt": "2026-06-28T14:00:00.000Z"
}
```

---

## 8. Schema Versioning and Migration

Every saved document contains a `saveVersion: number` field. The version is an integer starting at 1.

**When to increment `saveVersion`:**
- A field is removed or renamed.
- A field's type changes in a breaking way.
- The semantics of an existing field change.

**When NOT to increment:**
- A new optional field is added with a safe default.
- A new key/category is introduced (it starts at version 1 independently).

**Migration responsibility:**
- The Application Layer reads `saveVersion` immediately after loading a document.
- If `saveVersion < CURRENT_VERSION`, the Application Layer runs the applicable migration function before using the data.
- Migration functions are pure: they take the old document and return the new document. They do not write to storage — the caller writes the migrated document back.
- If `saveVersion > CURRENT_VERSION` (data from a newer app version), the document is treated as unreadable. The Application Layer discards the active game and starts fresh.

**First migration entry point:** The migration table starts empty. It is updated in the PR that introduces the first schema change. This document does not pre-define migration paths for schema versions that do not yet exist.

---

## 9. Layer Responsibilities

### Engine Layer

- Produces `GameState` — always plain serializable data.
- Accepts an existing `GameState` on load — processes it identically to a freshly created state.
- Has no knowledge of storage APIs, keys, or save triggers.
- Never calls `localStorage`, `Capacitor.Plugins`, or any storage API.

### Application Layer

- **Decides when to trigger a save** (see §6).
- **Serializes** `GameState` and session metadata into a Category A document.
- **Deserializes** a loaded document back into a `GameState` and session metadata.
- **Validates** a loaded `GameState` before passing it to the engine (rejects corrupted or mismatched documents).
- **Runs migration** if `saveVersion` is below the current version.
- **Computes stats delta** after a game ends and writes Category B. _(Deferred — not in M5)_
- **Requests reads and writes** from the Platform Layer via an interface (not directly from a storage implementation).

**Must not:**
- Call storage APIs directly — always goes through the Platform Layer interface.
- Pass an unvalidated `GameState` to the engine.
- Store NPC, region, story, or content identity in the save document.
- Let save/load logic affect game rules or scoring.

### Platform Layer

- **Implements** the storage interface for the target environment: `BrowserLocalStorageStorageService` for browser/Vite, `CapacitorStorageService` for production mobile, `InMemoryStorageService` for tests.
- Provides `read(key): Promise<string | null>` and `write(key, value: string): Promise<void>` and `delete(key): Promise<void>`.
- Has no knowledge of what is stored — it works with opaque strings.
- Returns `null` when a key does not exist (first-run case).
- Never interprets, transforms, or validates the serialized content.

### UI Layer

- Reads save availability from Application Layer view state.
- Does not call storage APIs directly.
- Does not serialize or deserialize save documents.
- Displays "게임 이어하기" prompt if the Application Layer reports a valid active game on startup.

---

## 10. Platform Layer Interface

The Platform Layer exposes a storage service interface. The interface is defined in the Application Layer (as a dependency inversion) so the Application Layer can be tested with a mock without a Capacitor environment.

```
interface StorageService {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

**Three implementations are needed:**

| Implementation | Environment | M5 status |
|---|---|---|
| `BrowserLocalStorageStorageService` | Browser / Vite dev server (`window.localStorage`) | **M5-PR2** — primary implementation |
| `InMemoryStorageService` | Tests (no browser or Capacitor dependency) | **M5-PR2** — test implementation |
| `CapacitorStorageService` | Production mobile (Capacitor Storage API) | M5-PR6 — after browser validation |

**Why browser-first?** The game runs in a Vite/React browser environment during development. Validating save/load against `window.localStorage` — which is available in any browser — eliminates the need to run on a device or emulator for the first implementation pass. `CapacitorStorageService` is added in M5-PR6 once the Application Layer save logic is proven correct.

The Application Layer always receives a `StorageService` through dependency injection — it never imports a concrete implementation directly.

---

## 11. Application Layer Save Flow

When a save trigger fires:

```
1. Application Layer serializes the current GameState and session metadata
   into a Category A document (JSON.stringify).

2. Application Layer calls StorageService.write(
     'matgo.v1.activeGame',
     serializedDocument
   ).

3. If write fails: log the error. Do not show an error to the player.
   The game continues. The save will be retried on the next trigger.
   (Save failure is non-fatal.)
```

When the game ends (M5 scope):

```
1. Application Layer calls StorageService.delete('matgo.v1.activeGame').
```

> **Stats update (Category B) is deferred to post-M5.** Steps 2–6 below are documented for future implementation but are not executed in M5.

```
// Deferred — not in M5:
2. Application Layer computes the stats delta (wins/losses/draws/totalGoCount/bestScore).
3. Application Layer calls StorageService.read('matgo.v1.playerStats').
4. If read returns null: start from zero (first game).
5. Application Layer deserializes existing stats, applies delta, re-serializes.
6. Application Layer calls StorageService.write('matgo.v1.playerStats', updatedStats).
```

---

## 12. Application Layer Load Flow

On app startup:

```
1. Application Layer calls StorageService.read('matgo.v1.activeGame').

2. If null: no active game — show title screen with "새 게임 시작" only.

3. If present:
   a. Deserialize the JSON document.
   b. Check saveVersion — run migration if needed.
   c. Validate the GameState shape (required fields present, valid phase, etc.).
   d. If validation passes: update view state to offer "게임 이어하기".
   e. If validation fails: delete the corrupted document, fall back to title screen.

4. Player chooses:
   - "게임 이어하기": Application Layer reconstructs the session from the loaded GameState.
   - "새 게임 시작": Application Layer deletes the active game and starts fresh.
```

**Validation rules for a loaded GameState:**

| Check | What to do on failure |
|---|---|
| `saveVersion` is a positive integer | Treat as corrupted — delete, fall back |
| `sessionPhase` is `'playing'` or `'pendingGoStop'` | Treat as corrupted — delete, fall back |
| `gameState` object is present and non-null | Treat as corrupted — delete, fall back |
| `gameState` has required fields (players, phase, deck, etc.) | Treat as corrupted — delete, fall back |
| `saveVersion > CURRENT_VERSION` | Treat as unreadable (newer app) — delete, fall back |

Partial validation failure is not recoverable — the entire active game document is discarded.

---

## 13. Boundary Constraints

These must be enforced at PR review.

| Constraint | Enforcement |
|---|---|
| Engine never calls `StorageService` or any storage API | PR review — reject any storage import in `src/engine/` |
| Application Layer never imports a concrete storage implementation | PR review — Application Layer imports only the `StorageService` interface |
| `GameState` contains no NPC, region, or content identity | Existing engine boundary (doc 03 §6) |
| Save failure does not crash the game or corrupt `GameState` | Application Layer error handling — save is fire-and-forget |
| Loading validates before passing to engine | Application Layer load flow (§12) — never pass a raw loaded blob to the engine |
| Stats are updated from engine `FinalResult` only — not computed in UI | Application Layer owns stats delta computation |
| No speculative settings fields | Category C schema must not grow until a Settings UI is implemented |

---

## 14. What Is Not Saved (explicit exclusions)

| Data | Reason |
|---|---|
| NPC identity or story progress | Content milestone — not in scope |
| Region unlock status | Content milestone — not in scope |
| Ad impression count or ad state | Platform Layer (billing/ads) — not save system |
| Full action history / replay log | Too large for MVP; deferred |
| UI animation state | Ephemeral — never persisted |
| React component local state | Ephemeral — never persisted |
| `RandomProvider` seed for ongoing game | Deterministic replay is not a requirement for M5 |
| Go multiplier (goCount applied) | OD-5: multiplier is tracked but not applied; stats track `totalGoCount` as a declaration count, not as a modifier |
| Error messages | Ephemeral |

### Do not persist derived view state

The save system must not persist `GameViewModel`.

`GameViewModel` is derived from `GameState` after restore by the Application Layer. It is always a pure function of the current `GameState` — saving it would create a redundant copy that can drift out of sync with the source.

**Do not persist:**

- `GameViewModel` (the entire derived view object)
- score display strings (e.g., `humanScoreBreakdown`, `aiScoreBreakdown`)
- `legalCardIds`
- `legalPlayActions`
- `statusDisplay`
- React component local state
- timers
- transient errors

### UI receives GameViewModel after restore, not raw GameState

When resuming a saved game, the Application Layer reconstructs the session as follows:

1. Load and validate the saved `GameState` document from storage.
2. Pass the validated `GameState` to the engine (engine treats it identically to a live state).
3. Derive a fresh `GameViewModel` from the restored `GameState` — same derivation function used during live play.
4. Pass `GameViewModel` to the UI.

**The UI never receives a raw saved document.** React components receive only `GameViewModel`, regardless of whether the session was restored or started fresh. There is no "resume mode" in the UI layer — the UI cannot tell the difference between a restored game and a live game one turn in.

**Why this matters:**
- No deserialization logic belongs in React components.
- A stale or saved `GameViewModel` cannot cause a mismatch between displayed state and actual engine state.
- Adding a new derived field to `GameViewModel` never requires a save schema migration.

---

## 15. Relationship to Other Documents

| Document | Contents |
|---|---|
| [01_architecture.md](01_architecture.md) | Layer overview and dependency direction — Platform Layer owns storage implementation |
| [03_engine_boundary.md](03_engine_boundary.md) | §12 Save/Load Boundary — engine must not call storage APIs; `GameState` must be serializable |
| [05_data_flow.md](05_data_flow.md) | §8 Save/Load Flow Direction — high-level direction (Application Layer triggers, Platform Layer persists) |
| [02_mvp_scope.md](02_mvp_scope.md) | §4 — Cloud save, account, entitlements are explicitly out of MVP scope |
| [10_decision_log.md](10_decision_log.md) | M5 save/progress architecture decisions (to be added with this PR) |
