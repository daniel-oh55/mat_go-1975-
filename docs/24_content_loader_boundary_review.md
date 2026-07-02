# Content Loader Boundary Review

## 1. Purpose

M9-H1은 production story content 작성 전에 Content Loader Boundary가 충분히 분리되었는지 검토하는 sign-off 문서입니다.

## 2. Reviewed Scope

검토 범위:
- `docs/23_content_loader_architecture.md`
- `src/content/stories/storyRegistry.ts`
- `src/content/stories/storyRegistry.test.ts`
- `src/App.tsx`
- `src/components/story/StoryRuntimeScreen.tsx`
- `docs/09_pr_plan.md`
- `docs/10_decision_log.md`
- `docs/20_story_runtime_architecture.md`

## 3. Boundary Checklist

| # | Item | Result |
|---|---|---|
| 1 | `StoryRuntimeScreen` no longer imports `sampleStory` directly. | PASS |
| 2 | `StoryRuntimeScreen` receives `StoryDefinition` via props. | PASS |
| 3 | `StoryRuntimeScreen` uses the injected `StoryDefinition` for `createStorySession` / `continueStorySession` / `selectStoryChoice` / `completeStoryMatch` / restart. | PASS |
| 4 | `StoryRuntimeScreen` does not import `getStoryCatalog` / `getStoryDefinition`. | PASS |
| 5 | `App.tsx` acts as the current parent boundary that resolves the default story through the registry. | PASS |
| 6 | `App.tsx` does not import `sampleStory` directly. | PASS |
| 7 | `storyRegistry` registers `sampleStory` as the only story. | PASS |
| 8 | `getStoryCatalog` returns catalog metadata only. | PASS |
| 9 | `getStoryDefinition` returns `StoryDefinition` or `null`. | PASS |
| 10 | Duplicate `storyId` guard exists. | PASS |
| 11 | Engine imports no content/story files. | PASS |
| 12 | Application runtime logic remains story-content agnostic. | PASS |
| 13 | Free Match remains standalone and unaffected. | PASS |
| 14 | `StoryProgress` persistence remains deferred. | DEFERRED |
| 15 | Production story content remains deferred. | DEFERRED |
| 16 | Story selection UI remains optional and deferred. | DEFERRED |
| 17 | No async/network/storage/CMS loader complexity has been added. | PASS |

Verification basis for each PASS item:
- Items 1–4: confirmed by reading `src/components/story/StoryRuntimeScreen.tsx` — it imports `StoryDefinition` as a type-only import from `content/schemas/storySchema.js`, takes `storyDefinition` as a prop, and every session-transition call site (`createStorySession`, `continueStorySession`, `selectStoryChoice`, `completeStoryMatch`, restart) passes `storyDefinition`. No `sampleStory` or registry import appears in the file.
- Items 5–6: confirmed by reading `src/App.tsx` — it imports `getStoryCatalog` / `getStoryDefinition` from `./content/stories/storyRegistry.js`, resolves `getDefaultStoryDefinition()` from the first catalog entry, and passes the result to `StoryRuntimeScreen` as `storyDefinition`. No `sampleStory` import appears in the file.
- Items 7–10: confirmed by reading `src/content/stories/storyRegistry.ts` and its 10 passing tests in `storyRegistry.test.ts` — `storyRegistry` contains exactly one entry (`sampleStory`), `getStoryCatalog()` returns `StoryCatalogEntry[]` (`storyId`/`title`/`description`/`status` only, no `definition`/`nodes` keys), `getStoryDefinition(storyId)` returns the matching `StoryDefinition` or `null` for unknown ids, and a module-load-time `hasDuplicateStoryId` guard exists (plus an independently-tested pure function).
- Item 11: confirmed by grepping `src/engine/` for `content`/`story` — the only matches are boundary-enforcing comments (e.g. "Must NOT include: image paths, story text, NPC meanings" in `deck.ts`, `card.ts`, `player.ts`, `ruleset.ts`), no actual import.
- Item 12: confirmed by reading `src/application/storySession/` — `StorySessionState`, `MatchOutcome`, and the adapter (`matchOutcomeAdapter.ts`) operate on `StoryDefinition` as an opaque parameter; none of them import a concrete story file or the registry.
- Item 13: confirmed by manual Playwright verification in M9-PR3 (dialogue → match → result → story end) and a second manual pass confirming standalone Free Match starts and plays with no console errors, independent of the Story Mode default-story resolution added to `App.tsx`.
- Item 17: confirmed by reading `storyRegistry.ts` — lookups are synchronous array operations over a local `const`; no `fetch`, `localStorage`, `async`, or `Promise` appears in the file.

## 4. Current Architecture Summary

현재 흐름:

```
App
→ getStoryCatalog()
→ getStoryDefinition(default storyId)
→ StoryRuntimeScreen(storyDefinition)
→ createStorySession(storyDefinition)
→ Story Mode runtime flow
```

Free Match 흐름:

```
App
→ GameSessionScreen standalone
```

Engine 흐름:

```
GameSessionScreen / Application Layer
→ Engine
→ Engine does not know story/content
```

## 5. Findings

- No blocking issue.
- Content loader boundary is now acceptable for MVP continuation.
- `StoryRuntimeScreen` hardcoding of `sampleStory` has been resolved.
- `App.tsx` is currently the minimal parent boundary for default story resolution.
- Registry remains local, synchronous, and sample-only.
- Production content should still not begin until the next milestone explicitly approves it.
- `StoryProgress` persistence should remain deferred until story identity / selection / save semantics are planned.

비차단 observation:

- `App.tsx` currently resolves the default story on every render via `getDefaultStoryDefinition()`. This is acceptable because the registry lookup is local, synchronous, and operates over a single sample entry — no measurable cost, no side effects.
- App-level comments may need future wording cleanup because `App` now acts as the story loading boundary, though it still does not own `StorySessionState` — that remains inside `StoryRuntimeScreen`.
- `getStoryCatalog` currently returns catalog object references from the registry (not deep copies). This is acceptable for MVP since nothing in the UI mutates catalog entries, but can be shallow-copied later if a mutation risk appears once more callers exist.

## 6. M9-PR4 Decision

M9-PR4 Minimal Story Selection Stub은 지금은 진행하지 않는 것으로 추천합니다.

이유:
- 현재 `sampleStory`가 유일한 story입니다.
- selector를 추가해도 플레이어 경험상 선택 의미가 거의 없습니다.
- 화면 단계만 늘어날 수 있습니다.
- production content 전에는 boundary sign-off가 더 중요합니다.
- story selection UI는 production content 또는 최소 2개 이상의 story entry가 생길 때 다시 검토하는 것이 좋습니다.

결론: M9-PR4 is deferred.

## 7. Production Content Decision

Production story content는 아직 시작하지 않습니다.

이유:
- 아직 `StoryProgress` persistence가 없습니다.
- 아직 region/NPC/content production pipeline이 없습니다.
- 아직 story selection UX가 없습니다.
- 지금은 content 작성보다 runtime/loader/save boundary를 먼저 안정화하는 것이 MVP에 더 중요합니다.

결론: Production regional/NPC/dialogue content remains deferred.

## 8. StoryProgress Persistence Decision

StoryProgress persistence도 아직 deferred로 유지합니다.

이유:
- persistence는 `storyId` identity만이 아니라 save timing, reset behavior, story replay, match result 반영 시점, 앱 종료/복귀 정책을 함께 결정해야 합니다.
- 지금 추가하면 MVP shell이 다시 복잡해질 수 있습니다.
- M10에서 별도 milestone으로 설계하는 것이 안전합니다.

결론: StoryProgress persistence remains deferred to a later milestone.

## 9. Recommended Next Milestone

M9-H1 이후 바로 production content로 가지 않고, 다음 milestone은 **"M10 — Story Progress Persistence Planning"** (또는 "M10 — MVP Story Save Boundary")을 추천합니다.

M10도 바로 구현부터 시작하지 말고 첫 PR은 문서/설계 PR로 시작하는 방향을 추천합니다.

추천 M10 방향:
- StoryProgress persistence requirements
- save timing
- reset/restart behavior
- story progress storage key
- migration/versioning policy
- manual test scenarios
- no production content yet

## 10. Sign-off

**M9 Content Loader Boundary is approved for MVP continuation.**

Approved:
- local synchronous story registry
- sample-only registry
- App-level default story resolution
- StoryRuntimeScreen definition injection
- no direct sampleStory import in StoryRuntimeScreen
- engine remains story-agnostic

Deferred:
- M9-PR4 story selection stub
- production story content
- StoryProgress persistence
- async/remote/CMS loader
- multi-story UX

**Update (M11-PR1):** production content authoring rules are now documented in `docs/27_mvp_content_authoring_boundary.md`, including `storyId`/`nodeId` stability implications for this loader boundary. Production content still has not started.
