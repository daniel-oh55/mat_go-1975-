# Story Runtime Architecture

## 1. Purpose

M7의 목적은 M6에서 만든 story schema/progression/ViewModel을 실제 local match flow와 연결하는 것이다. 하지만 M7은 아직 full story content, final UI, persistence, art, BGM, monetization을 구현하지 않는다.

**Story Runtime connects match completion to story progress without allowing story to affect match fairness.**

M6에서 확립한 `StoryDefinition` / `StoryProgress` / `advanceStory()` / `buildStoryViewModel()`은 순수 데이터와 순수 함수로만 존재했다. 이 문서는 그 순수 계층을 실제 게임 세션(엔진이 `FinalResult`를 만들어내는 지점)에 연결하는 방법을 규정한다. 연결은 오직 Application Layer를 통해서만 이루어지며, 엔진은 이 연결의 존재를 알지 못한다.

---

## 2. Scope

### Include

- Story runtime data flow — story node에서 match로, match에서 다시 story로 돌아오는 전체 흐름
- MatchOutcome adapter boundary — `FinalResult` → `MatchOutcome` 변환이 어디서, 어떤 방향으로 일어나는지
- StorySession state shape proposal — Application Layer가 소유할 상태 모양 제안
- StoryViewModel update flow — match 완료 후 ViewModel이 어떻게 재계산되는지
- Minimal Story UI shell responsibility — UI가 무엇을 렌더링하고 무엇을 하지 않는지
- Deferred persistence decision — StoryProgress 저장을 왜, 언제까지 미루는지
- Boundary checks for engine fairness — 엔진 공정성을 지키기 위한 경계 확인 목록

### Exclude

- Full regional/NPC/dialogue content
- 1970s presentation
- BGM/SFX/background art
- Reward/unlock animation
- Fortune/saju integration
- Ads/monetization
- Online multiplayer
- Engine rule variation
- Story-driven AI behavior

---

## 3. Existing M6 Foundation

M7은 아래의 M6 산출물 위에 세워진다 (`docs/19_story_system_architecture.md` 참고).

- `StoryDefinition` / `StoryNode` / `StoryProgress` — data-driven story schema
- `StoryNode` discriminated union (`dialogue` / `match` / `choice` / `end`)
- `evaluateUnlockCondition()` — `StoryProgress`와 `MatchOutcome`만으로 조건 평가
- `advanceStory()` — 순수 함수, engine import 없음
- `findStoryNode()` — 노드 조회 헬퍼
- `getCandidateNextNodeIds()` — 다음 후보 노드 계산
- `buildStoryViewModel()` — UI에 넘길 ViewModel 생성
- `sampleStory` — 검증용 최소 샘플 스토리 fixture
- M6-H1 — Story System Foundation 승인 완료

이 산출물들은 모두 engine-free, JSON-serializable, pure function 상태로 남아 있어야 한다. M7은 이 상태를 깨지 않는다.

---

## 4. Layer Boundary for M7

### Engine Layer

- Unchanged.
- No story imports.
- No content imports.
- No region/NPC/dialogue awareness.
- Produces `FinalResult` through the existing game flow only — no new engine output shape for story.

### Application Layer

- Owns `StorySession`.
- Owns the `buildMatchOutcome` adapter.
- May import the engine `FinalResult` type only inside the adapter boundary (`buildMatchOutcome`) — no other Application Layer story file imports engine types.
- Calls `advanceStory()`.
- Builds `StoryViewModel`.
- Decides when to start a match node.
- Does not alter engine randomness or scoring.

### Content Layer

- Holds `StoryDefinition` and the sample story.
- No engine imports.
- No runtime mutation — content is read-only data consumed by the Application Layer.

### UI Layer

- Renders `StoryViewModel`.
- Does not inspect `StoryDefinition.nodes` for traversal.
- Does not evaluate `UnlockCondition`.
- Can request actions such as: continue dialogue, select choice, start match.
- No final visual polish in M7.

### Platform Layer

- Persistence deferred.
- May persist `StoryProgress` later.
- Must not interpret story content.

---

## 5. Proposed Runtime Flow

### Initial Story Start

1. Load `StoryDefinition`.
2. Create initial `StoryProgress`.
3. Build `StoryViewModel`.
4. Render minimal story shell.

### Dialogue Node

1. UI asks to continue.
2. Application calls `advanceStory(progress, null, definition)`.
3. Application rebuilds `StoryViewModel`.

### Match Node

1. UI starts a match from `StoryViewModel.currentNode.matchContext`.
2. Application maps `matchContext` to normal match setup (a `Ruleset`-compatible config).
3. Engine receives normal rules/config only.
4. Engine does not receive `regionId`/`npcId`/dialogue.

### Match Completion

1. `GameSession` reaches the `ended` state.
2. Application reads `finalResult`.
3. `buildMatchOutcome(finalResult)` creates a `MatchOutcome`.
4. `advanceStory(progress, matchOutcome, definition)`.
5. `buildStoryViewModel()`.
6. UI returns to the story shell.

### Choice Node

1. UI displays choices from `currentNode`.
2. UI passes `choiceId` to Application.
3. Application calls `advanceStory(progress, null, definition, choiceId)`.
4. Application rebuilds `StoryViewModel`.

### End Node

1. UI shows the end-of-sample-story state.
2. No new content unlocks in M7.

---

## 6. MatchOutcome Adapter Boundary

`buildMatchOutcome`는 M7-PR2에서 제안되었고 그대로 구현된 Application Layer adapter다. 이 adapter만 engine `FinalResult` type을 import할 수 있다.

**중요:**

- `storyProgression.ts`는 계속 engine-free여야 한다.
- 엔진은 `MatchOutcome`을 모른다.
- Adapter direction은 Application → Engine type 방향이며, 그 반대인 Engine → Story 방향은 존재하지 않는다.

**예상 파일 위치 (제안):**

```
src/application/storySession/matchOutcomeAdapter.ts
```

이 파일은 `buildMatchOutcome(result: FinalResult): MatchOutcome` 하나의 함수만을 목적으로 한다. 이 파일이 `src/application/storySession/` 내에서 engine 타입을 import하는 유일한 파일이 되어야 한다 — `storyProgression.ts`, `storyTypes.ts`는 계속 engine import 없이 유지된다.

**주의:** M7-PR1에서는 이 파일을 만들지 않았다. 문서에만 위치와 책임을 제안했다.

### M7-PR2 Implementation Result

- `buildMatchOutcome`이 제안된 위치 그대로 `src/application/storySession/matchOutcomeAdapter.ts`에 구현되었다.
- `storyProgression.ts`는 여전히 engine-free로 유지된다 — engine import가 추가되지 않았다.
- 엔진은 여전히 `MatchOutcome`을 모른다 — 엔진 파일은 수정되지 않았다.
- Adapter는 `finalResult`를 mutate하지 않는다 — 값을 읽어 새 `MatchOutcome` 객체를 반환할 뿐이다.
- `StorySession` 통합은 여전히 M7-PR3으로 남아 있다.
- UI shell은 여전히 M7-PR4로 남아 있다.
- Persistence는 여전히 deferred 상태다.

### M7-PR2A Boundary Refactor Result

M7-PR2에서 `matchOutcomeAdapter.ts`는 `HUMAN_PLAYER_ID` / `AI_PLAYER_ID`를 가져오기 위해 `src/application/gameSession/index.ts`를 import했다. 문제는 `gameSession/index.ts`가 `createGameSession`도 함께 re-export하고, `createGameSession.ts`는 engine runtime module(`newGame`, `RandomProvider`)을 import한다는 점이다. 그 결과 `storySession → gameSession/index → createGameSession → engine runtime`으로 이어지는 간접 의존이 생길 수 있었다. M7-PR2A는 이 경로를 끊는다.

- `HUMAN_PLAYER_ID` / `AI_PLAYER_ID`는 이제 `src/application/shared/playerIds.ts`에 정의된다 — engine import도, content import도, runtime logic도 없는 순수 상수 파일이다.
- `matchOutcomeAdapter.ts`는 player ID를 Application shared constants(`../shared/playerIds.js`)에서 import하며, `gameSession/index.ts`는 더 이상 import하지 않는다.
- 이를 통해 storySession → gameSession runtime coupling이 제거된다.
- `FinalResult` type-only import는 여전히 `matchOutcomeAdapter.ts`에만 국한된다 — 이 파일의 유일한 남은 engine 의존성이다.
- 엔진은 변경되지 않았다.
- `gameSession/index.ts`의 public export(`HUMAN_PLAYER_ID`, `AI_PLAYER_ID`, `createGameSession`, `createIdleSession`)는 변경되지 않았다 — `createGameSession.ts`가 `shared/playerIds.ts`에서 상수를 import한 뒤 그대로 re-export하는 방식으로 호환성을 유지한다.

---

## 7. Proposed StorySession State Shape

아래는 `StorySession` 상태의 shape다 — M7-PR1에서 제안되었고 M7-PR3에서 그대로 구현되었다. `'invalid'` status와 `pendingMatchContext` / `error` 필드는 M7-PR3 구현 과정에서 확정된 최종 shape에 포함되어 있다 (§7 M7-PR3 Implementation Result 참고).

```ts
type StorySessionStatus =
  | 'story'
  | 'matchRequested'
  | 'completed'
  | 'invalid';

type StorySessionState = {
  storyId: string;
  progress: StoryProgress;
  viewModel: StoryViewModel | null;
  status: StorySessionStatus;
  pendingMatchContext: MatchContext | null;
  error: string | null;
};
```

**설명:**

- `StorySessionState`는 Application Layer state다.
- `GameState`를 포함하지 않는다 — 진행 중인 매치의 엔진 상태는 별도의 `GameSession`이 소유한다.
- Active Game save와 StoryProgress save는 분리된 저장 대상으로 남는다 (`docs/16_save_progress_architecture.md`의 카테고리 분리 원칙과 동일한 방향).
- `StorySessionState`는 UI state(예: 애니메이션 진행, 로컬 트랜지션 플래그)와 engine state를 섞지 않는다 — 둘 다 이 타입 밖에 존재해야 한다.

### M7-PR3 Implementation Result

- `StorySessionState`가 `src/application/storySession/storySessionState.ts`에 구현되었다. 실제 shape는 제안된 형태에 `pendingMatchContext: MatchContext | null`, `error: string | null`, 그리고 `status`에 `'invalid'`가 추가되었다.
- `StorySessionState`는 `StoryDefinition`을 저장하지 않는다 — `StoryDefinition`이 필요한 모든 helper(`createStorySession`, `continueStorySession`, `completeStoryMatch`, `selectStoryChoice`)는 매 호출마다 `definition`을 인자로 받는다.
- `StorySessionState`는 `GameState`를 저장하지 않는다 — 파일 전체가 engine import 없이 작성되었다 (`FinalResult` import 없음).
- `StorySessionState`는 스스로를 persist하지 않는다 — persistence는 여전히 §8의 결정에 따라 deferred 상태다.
- `createInitialStoryProgress(definition)` / `createStorySession(definition)`이 초기 `StoryProgress`와 `StorySessionState`를 생성한다.
- `continueStorySession` / `selectStoryChoice`가 각각 `dialogue` / `choice` 노드를 진행시키고, `requestStoryMatch`가 `match` 노드에서 `pendingMatchContext`를 노출하며, `completeStoryMatch`가 이미 만들어진 `MatchOutcome`을 받아 진행시킨다.
- `requestStoryMatch`는 `MatchContext`만 노출할 뿐 엔진을 시작하지 않는다 — `GameState`나 `RandomProvider`를 만들지 않는다. 실제 match 시작 연결은 M7-PR4 이후로 남아 있다.
- `completeStoryMatch`는 `MatchOutcome`만 인자로 받는다 — `buildMatchOutcome`을 호출하지 않으며, `FinalResult`를 import하지 않는다. `buildMatchOutcome`은 여전히 `matchOutcomeAdapter.ts`에 분리된 adapter로 남아 있다.

---

## 8. Persistence Decision

M7-PR1~PR4에서는 persistence를 바로 구현하지 않는다. `StoryProgress` persistence는 runtime flow가 안정화된 뒤 별도 PR에서 진행한다.

**이유:**

- Active Game save와 StoryProgress save가 섞이면 복구 로직이 복잡해진다.
- 먼저 runtime flow가 맞는지 검증해야 한다 — 저장을 먼저 구현하면 아직 검증되지 않은 상태 모양을 저장 스키마로 굳히게 된다.
- 저장은 나중에 Platform Layer에서 다룬다 (`docs/16_save_progress_architecture.md`의 계층 분리 원칙을 따른다).

---

## 9. MVP Runtime UX

**M7의 최소 UI 목적:**

- 플레이어가 현재 story node를 볼 수 있다.
- dialogue node에서 다음으로 진행할 수 있다.
- match node에서 맞고 한 판을 시작할 수 있다.
- match 종료 후 story로 돌아올 수 있다.
- end node를 볼 수 있다.

**M7에서 하지 않는 것:**

- 캐릭터 초상화
- 지역 배경
- BGM
- 고급 연출
- 1970년대 production dialogue
- 보상/해금 애니메이션

### M7-PR4 Implementation Result

- `StoryRuntimeScreen`(`src/components/story/StoryRuntimeScreen.tsx`)이 구현되었다 — `sampleStory`에 대한 `StorySessionState`를 `useState`로 소유하고, `createStorySession` / `continueStorySession` / `requestStoryMatch` / `completeStoryMatch` / `selectStoryChoice` / `buildMatchOutcome`만으로 상태를 전이시킨다.
- `StoryNodePanel`(`src/components/story/StoryNodePanel.tsx`)이 구현되었다 — `StoryViewModel.currentNode`를 `type`으로만 분기해 렌더링한다. `StoryDefinition.nodes`를 직접 순회하지 않으며 `UnlockCondition`을 평가하지 않는다.
- `sampleStory`는 M6-PR2에서 만든 검증용 fixture 그대로 사용되었다 — production content로 확장되지 않았다.
- Story UI는 오직 `StoryViewModel`만 소비한다 — `App.tsx`가 이제 `StoryRuntimeScreen`을 렌더링하지만, 이는 M7 runtime 검증 흐름이며 production content가 아니다.
- `GameSessionScreen`은 여전히 story-agnostic하다 — `storySession`이나 content를 import하지 않고, `finalResult`만 `onMatchComplete` 콜백으로 상위에 전달한다. `mode`/`enableResume`/`enableActiveGamePersistence` 기본값이 모두 기존 standalone 동작과 동일하므로 기존 로컬 AI match loop는 그대로 유지된다.
- `buildMatchOutcome`은 여전히 Application Layer adapter(`matchOutcomeAdapter.ts`)로 분리되어 있다 — `GameSessionScreen`이 아니라 `StoryRuntimeScreen`이 이를 호출한다.
- `completeStoryMatch`는 이미 만들어진 `MatchOutcome`만 받는다 — `FinalResult`나 engine import는 `StoryRuntimeScreen`에도, `storySessionState.ts`에도 추가되지 않았다.
- `StoryProgress` persistence는 여전히 구현되지 않았다 — `StoryRuntimeScreen`은 `StorageService`에 story 상태를 저장하지 않는다.
- Production content, 지역/NPC/대사, BGM/SFX/artwork는 추가되지 않았다.
- 엔진 파일은 이번 PR에서 전혀 수정되지 않았다.
- 실제 브라우저(Playwright + Vite dev server)에서 dialogue → match node → storyMatch idle 화면(resume 프롬프트 없음, 취소 버튼 존재, 취소 시 match node로 정상 복귀) → 맞고 한 판 완주 → `ResultPanel`에 "다시 하기"와 "이야기로 돌아가기" 동시 표시 → "이야기로 돌아가기" 클릭 시 end node("샘플 이야기 완료")로 복귀 → "샘플 이야기 다시 시작"으로 intro dialogue부터 재시작까지 전체 흐름을 검증했다. 콘솔 에러는 발견되지 않았다.

---

## 10. Risk Review

| Risk | Mitigation |
|---|---|
| Story runtime leaks into engine | `buildMatchOutcome` adapter confined to Application Layer; engine file changes are rejected in PR review |
| UI interprets raw `StoryDefinition` | UI consumes only `StoryViewModel`; §4 explicitly prohibits raw traversal in the UI layer |
| Match result adapter changes engine types | `buildMatchOutcome` reads `FinalResult` but does not modify it; engine types remain untouched |
| Persistence added too early | Persistence explicitly deferred until runtime flow is proven (§8) |
| Production content starts too early | Sample story only; production regional/NPC/dialogue content remains out of scope (§2) |
| Match node setup smuggles NPC/region into engine | `matchContext` is mapped to a generic `Ruleset`-compatible config before reaching the engine; engine never receives `regionId`/`npcId` |
| StoryProgress and ActiveGame save get mixed | Separate storage categories are planned for when persistence is implemented, following the existing Active Game / Player Statistics separation pattern |

---

## 11. M7 Proposed PR Sequence

- M7-PR1 — Story Runtime Architecture
- M7-PR2 — MatchOutcome Adapter Boundary
- M7-PR3 — StorySession State
- M7-PR4 — Minimal Story UI Shell
- M7-H1 — Runtime Boundary Review

---

## 12. Final Decision

M7 may begin with minimal story runtime integration.

M7 must connect story progress to match completion through the Application Layer only.

Engine code remains unchanged and story-agnostic.

Persistence, production content, visual polish, and monetization remain deferred.

---

## 13. M7-H1 Story Runtime Boundary Review

### A. Scope Reviewed

The following PRs constitute the M7 Minimal Story Runtime Integration:

| PR | Title | Status |
|---|---|---|
| M7-PR1 | Story Runtime Architecture | Merged to main |
| M7-PR2 | MatchOutcome Adapter Boundary | Merged to main |
| M7-PR2A | Player ID Boundary Refactor | Merged to main |
| M7-PR3 | StorySession State | Merged to main |
| M7-PR4 | Minimal Story UI Shell | Merged to main |

---

### B. Boundary Verification

| Check | Status | Evidence | Notes |
|---|---|---|---|
| Engine files changed by M7 | **Pass** | No M7 PR modified any file under `src/engine/`; confirmed across PR1–PR4 review notes | Engine tree unchanged since M6-H1 |
| Engine imports story/content/application storySession | **Pass** | `src/engine/` contains no import of `src/application/storySession/`, `src/content/`, or story types | Engine remains world-agnostic |
| Story/content imports engine runtime | **Pass** | `storyProgression.ts`, `storyTypes.ts`, `storySessionState.ts`, `storySchema.ts`, `sampleStory.ts` import no engine module | Only `matchOutcomeAdapter.ts` imports an engine type, and only as a type-only import |
| `FinalResult` import outside `matchOutcomeAdapter.ts` | **Pass** | `matchOutcomeAdapter.ts` is the sole file under `src/application/storySession/` with a `FinalResult` import (type-only, from `src/engine/types/index.ts`) | Verified in M7-PR2 and M7-PR2A review |
| `storyProgression.ts` engine dependency | **Pass** | Imports only from `./storyTypes.js`; no engine import added across M7 | Unchanged since M6-PR3A |
| `storySessionState.ts` engine dependency | **Pass** | Imports only from `./storyTypes.js` and `./storyProgression.js`; no `FinalResult` or engine import | Confirmed in M7-PR3 |
| `StorySessionState` stores `GameState` | **Pass** (does not store it) | `StorySessionState` fields: `storyId`, `progress`, `viewModel`, `status`, `pendingMatchContext`, `error` — no `GameState`, `Ruleset`, or `RandomProvider` field | In-progress match engine state is owned separately by `GameSessionScreen`'s own `GameSessionState` |
| `StorySessionState` stores `StoryDefinition` | **Pass** (does not store it) | Every helper that needs a definition (`createStorySession`, `continueStorySession`, `completeStoryMatch`, `selectStoryChoice`) receives it as a function argument, never as stored state | Confirmed in M7-PR3 |
| `StoryProgress` persistence | **Deferred** | No `StorageService` call exists in `storySessionState.ts` or `StoryRuntimeScreen.tsx` | Deferred per §8; to be revisited after this runtime flow is proven stable |
| `GameSessionScreen` imports story/content | **Pass** (does not import) | `GameSessionScreen.tsx` imports only from `../../application/gameSession/index.js` and sibling UI components; no `storySession` or `content` import | `onMatchComplete` reports `finalResult` upward — `GameSessionScreen` never reads story state |
| `GameSessionScreen` standalone behavior | **Pass** | `mode`, `enableResume`, `enableActiveGamePersistence` all default to the pre-M7 standalone behavior; verified end-to-end in M7-PR4 browser testing | No regression to the local AI match loop |
| Story UI reads `StoryDefinition.nodes` directly | **Pass** (does not) | `StoryNodePanel` reads only `StoryViewModel.currentNode`; `StoryRuntimeScreen` never accesses `sampleStory.nodes` | Confirmed by code review of both files |
| Story UI evaluates `UnlockCondition` | **Pass** (does not) | No `UnlockCondition` type or evaluation logic appears in `src/components/story/` | `evaluateUnlockCondition` is called only inside `storyProgression.ts`, via `advanceStory` |
| `sampleStory` production-content risk | **Validation-only** | `sampleStory` uses `sample-` prefixed node IDs and placeholder NPC/region strings (`sample-npc-01`, `sample-region-01`); no final Korean dialogue or regional art | Unchanged since M6-PR2B; still a validation fixture, not production content |
| Story match affects shuffle/deal/scoring/AI | **Not Applicable / Pass** | `matchContext` is mapped to a normal engine setup before `GameSessionScreen` starts a match; the engine receives no `regionId`/`npcId`/story data | No mechanism exists for story state to reach engine randomness, scoring, or AI decisions |
| ActiveGame save overwritten by story match | **Pass** | `StoryRuntimeScreen` renders `GameSessionScreen` with `enableActiveGamePersistence={false}` for story matches; when disabled, both the save/delete effect and the `deleteActiveGame` call inside `handleStartGame` are skipped | Verified in M7-PR4; a story match cannot delete or overwrite the player's standalone saved game |

---

### C. Runtime Flow Verification

The following flow was implemented in M7-PR2 through M7-PR4 and verified end-to-end in a real browser (Playwright against the Vite dev server) during M7-PR4:

1. `App` renders `StoryRuntimeScreen`.
2. `StoryRuntimeScreen` creates `StorySessionState` from `sampleStory` via `createStorySession`.
3. `StoryNodePanel` renders the dialogue node (`sample-intro`).
4. `continueStorySession` moves the session to the match node (`sample-match-01`).
5. `requestStoryMatch` moves the session to the `matchRequested` state, exposing `pendingMatchContext`.
6. `GameSessionScreen` runs a normal local AI match in `storyMatch` mode (no resume prompt, no active-game persistence).
7. `GameSessionScreen` passes `finalResult` upward via `onMatchComplete` — it does not know about `MatchOutcome` or `StorySession`.
8. `StoryRuntimeScreen` calls `buildMatchOutcome(finalResult)`.
9. `StoryRuntimeScreen` calls `completeStoryMatch(storySession, sampleStory, outcome)`.
10. `StorySession` progresses to the appropriate end node (`sample-end-win` on a human win, `sample-end-default` otherwise).
11. `StoryNodePanel` renders the end node ("샘플 이야기 완료").
12. Restart (`createStorySession(sampleStory)` again) returns to the intro dialogue.

Both the win and lose/draw branches were exercised manually; no console errors were observed in either path.

---

### D. Final M7 Decision

M7 Minimal Story Runtime Integration is approved as a validation runtime.

The project now has a complete sample flow from story node to local AI match and back to story progression.

The engine remains story-agnostic and match fairness remains unaffected.

`StoryProgress` persistence, production content, visual presentation, rewards, and monetization remain deferred.

---

### E. Remaining Deferred Work

| Item |
|---|
| `StoryProgress` persistence |
| Production region/NPC/dialogue content |
| 1970s visual presentation |
| Character portraits |
| BGM/SFX/background art |
| Reward/unlock animation |
| Fortune/saju integration |
| Monetization/ads integration |
| Game Board Visual Shell polish |
| Runtime content loader / story selection |
| StoryRuntimeScreen production routing |
| Online multiplayer |

---

### F. M7 Validation-Only Notes

- `StoryRuntimeScreen` imports `sampleStory` directly, only for M7 validation.
- This is acceptable for the minimal runtime proof, but production routing should eventually load story definitions through an Application/Content boundary rather than hardcoding `sampleStory` in UI.
- `sampleStory` remains a validation fixture, not production content.
- The `App` entry currently uses `StoryRuntimeScreen` for runtime verification. Future milestones may decide whether to keep story-first app entry or restore a menu/home flow.

---

### G. Recommended Next Milestone

M7 이후 바로 production content 제작으로 가지 않는다. 다음 단계는 아래 둘 중 하나로 결정한다.

**Recommended: M8 — MVP Shell Stabilization and Runtime Polish**

| Purpose | Detail |
|---|---|
| Stabilize the current story-match-story loop | Confirm the loop holds up under repeated play before adding content on top |
| Improve board readability enough for test play | Board polish inside both standalone and storyMatch mode |
| Add minimal app navigation/home shell if needed | Decide whether a home/menu screen belongs before the story shell |
| Decide where story runtime lives in the app flow | Story-first entry vs. menu-first entry |
| Constraint | Still avoid full production content until the UX loop is stable |

**Alternative: M8A — Game Board Visual Shell**

Use if board readability and play comfort are more urgent than app navigation/runtime polish.

Full regional/NPC/dialogue production content is **not** recommended as the immediate next step.

### M8-PR1 Decision Note

- M8-PR1 evaluates the app entry flow after M7.
- The recommended path is a Minimal Home Shell with Story Mode and Free Match.
- This keeps M7 validation flow available while restoring a clear Free Match entry.
- Full content production remains deferred.

See `docs/21_runtime_shell_app_flow_decision.md` for the full options comparison and M8-PR2 acceptance criteria.

### M8-PR2 Implementation Note

- `MinimalHomeScreen` implemented (`src/components/shell/MinimalHomeScreen.tsx`).
- `App` no longer launches directly into `StoryRuntimeScreen` — it starts at `MinimalHomeScreen` and tracks an app-level `mode: 'home' | 'story' | 'freeMatch'`.
- `StoryRuntimeScreen` remains available through Story Mode, unmodified.
- Free Match uses `GameSessionScreen` standalone mode with its existing default props — resume and active-game persistence behavior unchanged.
- App-level state stores only the selected mode — no `GameState`, `StorySessionState`, or `StoryDefinition`.
- `StoryProgress` persistence remains deferred.
- `sampleStory` remains a validation fixture.
- Engine unchanged.

### M8-PR3 Implementation Note

- Story runtime UX polish added after the Minimal Home Shell — clearer labels and short helper captions in `StoryRuntimeScreen` and `StoryNodePanel`, and `storyMatch`-only wording changes in `GameSessionScreen`.
- Story UI still consumes `StoryViewModel` only — the new node-state label in `StoryNodePanel` is keyed off `currentNode.type`, not a raw `StoryDefinition` traversal; no `UnlockCondition` evaluation was added.
- `GameSessionScreen` remains story-agnostic — the wording branches only on the existing `mode` prop; no new story/content import was added.
- `storyMatch` wording ("스토리 대결", "스토리 대결 시작", "대결 취소") was improved without changing standalone behavior — verified in a real browser that standalone Free Match still shows "맞고" / "새 게임 시작" unchanged.
- `StoryProgress` persistence remains deferred.
- `sampleStory` remains a validation fixture — unmodified.
- Engine unchanged.

### M8-PR4 Implementation Note

- Board readability improved after the Story Runtime UX polish — `GameSessionScreen`, `CardButton`, `CardRow`, `GameStatusBar`, `ActionHint`, `GoStopPanel`, `ResultPanel`, and `CapturedCardGroups` all received presentation-only changes (labels, stat chips, tap-target sizing, spacing).
- Story Match still uses `GameSessionScreen`'s `storyMatch` mode exactly as established in M8-PR2/M8-PR3 — only the mode label under the title changed (constant "맞고" title + "스토리 대결"/"자유 대전" subtitle, instead of swapping the `h1` text itself).
- `GameSessionScreen` remains story-agnostic — no new import of `storySession`, `content`, or `sampleStory` was added; the readability changes only touch presentational markup and copy.
- Engine unchanged. `src/application/` unchanged.
- `StoryProgress` persistence remains deferred.
- Hidden information invariant preserved: the opponent/AI area still renders only a hand-size count and face-down placeholders — no opponent card content is ever shown. Verified in a real browser for both standalone Free Match and Story Match.

### M8-H1 Note

- M8 shell stabilization approved — see `docs/22_mvp_shell_stabilization_review.md` for the full review.
- Story runtime remains valid after the Minimal Home Shell and Board Readability Pass — the runtime flow documented in §5 and verified in M7-PR4 still holds unchanged.
- `StoryRuntimeScreen` still imports `sampleStory` directly, as validation-only (§F).
- Next recommended step is a content loader/story selection foundation (M9), so the UI stops hardcoding `sampleStory`.
- `StoryProgress` persistence and production content remain deferred.

### M9-PR1 Note

- M9 starts the content loader/story selection foundation — see `docs/23_content_loader_architecture.md` for the full design.
- The purpose is to remove validation-only hardcoding of `sampleStory` from `StoryRuntimeScreen`.
- `StoryRuntimeScreen` should eventually receive a `StoryDefinition` via props (`storyDefinition` injection), or a parent/Content-Layer boundary — not via a direct concrete story import.
- Engine remains unchanged.
- Production content and `StoryProgress` persistence remain deferred.

### M9-PR3 Note

- `StoryRuntimeScreen` no longer imports `sampleStory` — the §F hardcoding this section flagged is resolved. It now takes an injected `storyDefinition: StoryDefinition` prop and uses it for every session transition; it does not import the M9-PR2 registry loader.
- `App.tsx` resolves the default story via `getStoryCatalog()` / `getStoryDefinition()` (from `src/content/stories/storyRegistry.ts`) and passes it down, keyed on `storyDefinition.storyId`.
- The runtime flow itself (§5) is unchanged — verified manually end-to-end in a real browser: dialogue → match → result → story end, plus standalone Free Match unaffected.
- Engine remains unchanged. No story selection UI. Production content and `StoryProgress` persistence remain deferred.

### M9-H1 Note

- Content Loader Boundary signed off — see `docs/24_content_loader_boundary_review.md`. No blocker found; the runtime flow in §5 holds unchanged. Recommended next milestone: M10 — Story Progress Persistence Planning.
