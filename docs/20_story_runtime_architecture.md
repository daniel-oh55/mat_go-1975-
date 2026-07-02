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

`buildMatchOutcome`는 M7-PR2에서 추가될 Application Layer adapter다. 이 adapter만 engine `FinalResult` type을 import할 수 있다.

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

아래는 M7-PR3에서 구현될 `StorySession` 상태의 제안 형태다. 이번 PR에서는 코드로 구현하지 않는다.

```ts
type StorySessionStatus =
  | 'story'
  | 'matchRequested'
  | 'completed';

type StorySessionState = {
  storyId: string;
  progress: StoryProgress;
  viewModel: StoryViewModel | null;
  status: StorySessionStatus;
};
```

**설명:**

- `StorySessionState`는 Application Layer state다.
- `GameState`를 포함하지 않는다 — 진행 중인 매치의 엔진 상태는 별도의 `GameSession`이 소유한다.
- Active Game save와 StoryProgress save는 분리된 저장 대상으로 남는다 (`docs/16_save_progress_architecture.md`의 카테고리 분리 원칙과 동일한 방향).
- `StorySessionState`는 UI state(예: 애니메이션 진행, 로컬 트랜지션 플래그)와 engine state를 섞지 않는다 — 둘 다 이 타입 밖에 존재해야 한다.

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
