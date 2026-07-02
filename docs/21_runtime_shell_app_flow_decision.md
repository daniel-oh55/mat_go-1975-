# Runtime Shell App Flow Decision

## 1. Purpose

M7은 story → match → result → story progression이 가능한 validation runtime을 증명했다. 하지만 현재 App entry가 `StoryRuntimeScreen`에 직접 연결되어 있어, MVP 앱 흐름으로는 부족하다. M8-PR1은 MVP app shell의 방향을 결정한다.

**M8 should stabilize how players enter Story Mode and Free Match before production content is created.**

---

## 2. Current State After M7

- `App.tsx` renders `StoryRuntimeScreen`.
- `StoryRuntimeScreen` owns `StorySessionState` for `sampleStory`.
- `StoryRuntimeScreen` imports `sampleStory` directly as a validation fixture.
- `GameSessionScreen` supports `standalone` and `storyMatch` modes.
- `storyMatch` mode disables active game persistence.
- `GameSessionScreen` remains story-agnostic.
- `StoryProgress` persistence is not implemented.
- Production content is not implemented.

---

## 3. Problem

- 앱 시작 시 sample story validation flow로 바로 들어간다.
- Free Match 진입점이 사용자에게 명확하지 않다.
- `StoryRuntimeScreen`이 `sampleStory`를 직접 import하는 구조는 validation-only로는 허용되지만 production routing으로는 적합하지 않다.
- Story Mode / Free Match / future content selection의 위치가 아직 정해지지 않았다.
- production content를 만들기 전에 app shell decision이 필요하다.

---

## 4. Options Considered

### Option A — Keep StoryRuntimeScreen as App Entry

**설명:** 앱을 켜면 바로 `StoryRuntimeScreen`으로 들어간다.

**Pros:**
- 가장 단순하다.
- M7 validation flow를 계속 빠르게 테스트할 수 있다.
- 추가 UI 코드가 필요 없다.

**Cons:**
- Free Match 접근이 어렵다.
- `sampleStory`가 앱의 실제 시작 콘텐츠처럼 보일 수 있다.
- production routing으로 전환할 때 다시 구조를 바꿔야 한다.
- 플레이어가 앱의 모드를 이해하기 어렵다.

**Decision:** Not recommended for MVP shell.

---

### Option B — Minimal Home Shell with Story Mode / Free Match

**설명:** 앱 시작 시 최소 홈 화면을 보여주고, 두 버튼을 제공한다.

- Story Mode: 현재 sample `StoryRuntimeScreen`으로 진입
- Free Match: standalone `GameSessionScreen`으로 진입

**Pros:**
- 플레이어가 무엇을 할지 이해하기 쉽다.
- 개발 중 Story Mode와 Free Match를 분리 테스트할 수 있다.
- 기존 `GameSessionScreen` standalone behavior를 살릴 수 있다.
- 나중에 Daily Match, Settings, Archive로 확장 가능하다.
- `sampleStory`가 validation fixture임을 표시하기 쉽다.

**Cons:**
- 최소 UI 코드가 추가된다.
- 아직 final visual design은 아니므로 임시 화면이라는 점을 명확히 해야 한다.

**Decision:** Recommended.

---

### Option C — Full Home / Menu / Navigation System

**설명:** 본격적인 홈 화면, 설정, 모드 선택, 저장/이어하기, 콘텐츠 선택까지 포함한다.

**Pros:**
- 장기적으로 가장 자연스럽다.
- 출시 앱 구조에 가깝다.

**Cons:**
- 지금은 과하다.
- production content도 없는데 navigation 구조가 과도해질 수 있다.
- UI polish로 범위가 커질 위험이 있다.
- MVP 우선 원칙에 맞지 않는다.

**Decision:** Deferred.

---

## 5. Final Decision

**Decision:**
M8 should add a Minimal Home Shell in M8-PR2.

The app should not remain locked to `StoryRuntimeScreen` as the only entry point.
The app should not build a full navigation system yet.

**Recommended M8-PR2 app flow:**

```
App
→ MinimalHomeScreen
  → Story Mode
     → StoryRuntimeScreen using sampleStory validation flow
  → Free Match
     → GameSessionScreen in standalone mode
```

---

## 6. MVP Player Experience

플레이어가 앱을 켰을 때 두 가지 선택지를 이해할 수 있어야 한다.

- **Story Mode:** 이야기 흐름 속에서 맞고 한 판을 진행한다.
- **Free Match:** 바로 AI와 맞고 한 판을 한다.

**감정 목표:**
- 혼란 감소
- 선택감
- 기대감
- "이 게임은 그냥 맞고 앱이 아니라 이야기 모드가 있다"는 첫 인상

**주의:**
- 아직 production story content를 만들지 않는다.
- Story Mode 라벨에는 sample/validation 성격을 표시해도 된다.
- final visual design은 하지 않는다.

---

## 7. Technical Direction for M8-PR2

**예상 파일:**
- `src/components/shell/MinimalHomeScreen.tsx`
- `src/components/shell/index.ts`
- `src/App.tsx`

**App-level state proposal:**
- `mode: 'home' | 'story' | 'freeMatch'`

**흐름:**
- home → story: render `StoryRuntimeScreen`
- home → freeMatch: render `GameSessionScreen` standalone
- story/freeMatch → home: optional back button if minimal and safe

**중요:**
- `MinimalHomeScreen`은 engine을 import하지 않는다.
- `MinimalHomeScreen`은 storySession logic을 직접 다루지 않는다.
- `StoryRuntimeScreen`은 그대로 사용한다.
- `GameSessionScreen` standalone mode는 기존 default props를 사용한다.
- No persistence changes.
- No production content.

---

## 8. What Not To Add Yet

- Full navigation router
- Settings screen
- Save slot selection
- Story selection screen
- Production region/NPC/dialogue content
- Character portraits
- 1970s visual design
- BGM/SFX
- Reward/unlock screen
- Monetization/ads
- Online multiplayer
- StoryProgress persistence

---

## 9. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Home shell expands into full navigation | M8-PR2 minimal two-button shell only |
| Story Mode looks like production content | Label Story Mode as sample/runtime validation if needed |
| Free Match breaks existing standalone GameSessionScreen behavior | Use GameSessionScreen default standalone props |
| App-level mode state starts mixing story/game state | App stores only selected mode, not GameState or StorySessionState |
| Content production starts too early | Keep production content deferred until M8-H1 or later |

---

## 10. M8-PR2 Acceptance Criteria

- App starts at `MinimalHomeScreen`.
- Home shows Story Mode and Free Match buttons.
- Story Mode opens `StoryRuntimeScreen`.
- Free Match opens `GameSessionScreen` in standalone mode.
- Existing standalone resume/save behavior remains available in Free Match.
- Story Mode continues to disable active game persistence for story matches.
- No engine changes.
- No production content.
- No StoryProgress persistence.
- No full navigation/router.

---

## 11. Final Recommendation

M8-PR2 should implement the Minimal Home Shell.

This is the smallest app-shell improvement that makes the current validation runtime understandable without committing to final UX, final art, or production content.

---

## 12. M8-PR2 Implementation Result

- Option B implemented as decided in §5.
- `MinimalHomeScreen` added (`src/components/shell/MinimalHomeScreen.tsx`, `src/components/shell/index.ts`) — two buttons (스토리 모드 / 자유 대전) with short descriptions and a note that Story Mode is a runtime-validation sample. No engine, `storySession`, `gameSession`, `sampleStory`, or `StorageService` import.
- `App.tsx` now matches the decided structure: `App → MinimalHomeScreen → (Story Mode → StoryRuntimeScreen) / (Free Match → GameSessionScreen standalone)`. App-level state is `mode: 'home' | 'story' | 'freeMatch'` only.
- Back to home behavior: implemented. `App` renders a small "← 홈으로" button above `StoryRuntimeScreen` / `GameSessionScreen` without modifying either component; clicking it sets `mode` back to `'home'`.
- **Current limitation:** Story Mode state is not persisted. Returning home and re-entering Story Mode restarts `sampleStory` from the intro dialogue (a fresh `createStorySession` call on remount). This is acceptable until `StoryProgress` persistence is approved in a later milestone.
- Free Match is unaffected by this limitation: `GameSessionScreen` standalone mode keeps its own active-game save/resume, verified to survive a home round-trip (leaving and re-entering Free Match shows "게임 이어하기").
- No production content. No full navigation/router. No settings/save-slot/story-selection screens.

---

## 13. M8-PR3 Note

- After the Minimal Home Shell (M8-PR2), Story Mode UX labels were clarified in `StoryRuntimeScreen` and `StoryNodePanel` (node-state labels, short helper captions, updated button copy), and `storyMatch`-only wording was added to `GameSessionScreen` ("스토리 대결" title, "스토리 대결 시작", "대결 취소").
- Story Mode remains a validation sample — no production dialogue, region, or NPC content was added; `sampleStory` was not modified.
- Free Match remains standalone — its title, button copy, and resume/persistence behavior are unchanged, verified in a real browser.
- No production content.
- No full navigation/router.
- No persistence changes.

---

## 14. M8-PR4 Note

- After the Minimal Home Shell and Story Runtime UX labels, board readability was improved for both Free Match and Story Match: clearer section labels ("상대", "바닥패"), labelled stat chips in `GameStatusBar`, a colored outcome badge in `ResultPanel`, larger card tap targets, and tinted captured-card groups.
- Free Match remains standalone — verified its save/resume behavior survives a home round-trip after this pass, same as before.
- Story Mode remains a validation sample — `sampleStory` was not modified and no production dialogue/region/NPC content was added.
- No production content.
- No full navigation/router.
- No persistence changes.

---

## 15. M8-H1 Note

- Minimal Home Shell decision implemented and reviewed — see `docs/22_mvp_shell_stabilization_review.md` for the full sign-off.
- App flow is stable enough for MVP continuation: Home → Story Mode / Free Match, with the "← 홈으로" back button working from both.
- Board readability improved for both modes (M8-PR4), without changing rule/scoring/AI/save logic.
- No full navigation/router added.
- Next issue: `sampleStory` is still hardcoded in `StoryRuntimeScreen`, so content loader/story selection (M9) should come before production content.
