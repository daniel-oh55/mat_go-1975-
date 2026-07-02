# Content Loader Architecture

## 1. Purpose

M8까지 앱은 Minimal Home Shell과 Story Mode / Free Match 흐름을 갖췄다. 하지만 Story Mode는 아직 `StoryRuntimeScreen`이 `sampleStory`를 직접 import하는 validation-only 구조다. M9의 목적은 production content를 만들기 전에 `StoryDefinition`을 등록, 선택, 전달하는 content loader boundary를 설계하는 것이다.

**Before production story content begins, the project needs a data-driven way to load and select StoryDefinitions without hardcoding a specific story file in UI.**

---

## 2. Current Problem

- `StoryRuntimeScreen`이 `sampleStory`를 직접 import한다.
- 이는 M7/M8 validation 목적으로는 허용 가능했다.
- production content 확장에는 적합하지 않다.
- 지금 production 지역/NPC/대사를 추가하면 UI가 특정 content 파일에 결합된다.
- story selection, story metadata, 향후 content unlock에는 별도의 boundary가 필요하다.
- `StoryProgress` persistence는 story identity/loading이 안정된 뒤에 시작해야 한다.

---

## 3. Design Goals

- Remove direct concrete story imports from `StoryRuntimeScreen`.
- Keep engine story-agnostic.
- Keep `StoryRuntimeScreen` focused on runtime UI/state, not content discovery.
- Keep Content Layer responsible for `StoryDefinition` registration.
- Allow Story Mode to receive a `StoryDefinition` from parent/Application boundary.
- Support `sampleStory` as the only registered story for now.
- Avoid production content.
- Avoid async/network/database complexity in MVP.
- Keep the structure reusable for future Matgo IPs.

---

## 4. Non-Goals

- No production regional story writing.
- No NPC/dialogue expansion.
- No BGM/SFX/artwork.
- No monetization.
- No StoryProgress persistence.
- No save slots.
- No full story selection UI.
- No remote CMS.
- No dynamic downloading.
- No online multiplayer.
- No engine rule variation.

---

## 5. Proposed Layer Boundary

| Layer | Responsibility |
|---|---|
| Engine | Matgo state, rules, scoring, AI, `finalResult`. No story/content import. |
| Application Story Session | `StoryProgress`, `StoryViewModel`, `StorySessionState`, `MatchOutcome` adapter. Does not own concrete content files. |
| Content | `StoryDefinition` files. Story metadata. Story registry. Validation/sample content. No engine import. |
| UI Shell | Home / mode selection. Later minimal story selection. Does not inspect the story graph. |
| Story Runtime UI | Receives `StoryDefinition` or a selected story definition from parent. Owns `StorySessionState` for that definition. Does not discover/import concrete story files directly. |
| Platform Storage | `ActiveGame` storage now. `StoryProgress` persistence later, after loader identity is stable. |

---

## 6. Proposed Content Registry Shape

The following is a proposed pseudo-shape for M9-PR2 — not implemented in this PR.

```ts
export interface StoryCatalogEntry {
  readonly storyId: string;
  readonly title: string;
  readonly description: string;
  readonly status: 'sample' | 'draft' | 'production';
}

export interface RegisteredStory {
  readonly catalog: StoryCatalogEntry;
  readonly definition: StoryDefinition;
}

export const storyRegistry: ReadonlyArray<RegisteredStory> = [
  {
    catalog: {
      storyId: sampleStory.storyId,
      title: '샘플 이야기',
      description: '런타임 검증용 샘플 스토리',
      status: 'sample',
    },
    definition: sampleStory,
  },
];
```

**주의:**

- M9-PR2에서 실제로 구현할 수 있는 최소 shape만 문서화한다.
- 과도한 metadata를 넣지 않는다.
- region/npc/art/bgm 필드는 아직 넣지 않는다.
- `status: 'production'`은 future-proofing 정도로만 존재하며, M9에서는 `'sample'` 값만 실제로 쓰인다.

---

## 7. Proposed Loader API

The following is a proposed pseudo-API for M9-PR2 — not implemented in this PR.

```ts
export function getStoryCatalog(): ReadonlyArray<StoryCatalogEntry>;

export function getStoryDefinition(storyId: string): StoryDefinition | null;
```

**설명:**

- MVP에서는 synchronous local registry lookup만 사용한다.
- No async.
- No network.
- No localStorage.
- No remote CMS.
- `StoryDefinition`은 read-only content data다.
- 알 수 없는 `storyId`는 `null`을 반환한다.

---

## 8. StoryRuntimeScreen Refactor Direction

M9-PR3에서 진행할 리팩터 방향을 문서화한다 — 이번 PR에서는 구현하지 않는다.

**현재:**

```ts
// StoryRuntimeScreen.tsx
import { sampleStory } from '../../content/stories/sample/sampleStory.js';
// ... createStorySession(sampleStory) directly inside the component
```

**목표 (권장):**

```ts
interface StoryRuntimeScreenProps {
  readonly storageService: StorageService;
  readonly storyDefinition: StoryDefinition;
}
```

**대안 (검토했으나 비권장):**

```ts
interface StoryRuntimeScreenProps {
  readonly storageService: StorageService;
  readonly storyId: string;
}
```

**판단:** MVP에서는 `storyDefinition` prop injection을 우선 추천한다.

**이유:**

- `StoryRuntimeScreen`이 loader 세부사항을 알 필요가 없다.
- parent/shell이 어떤 story를 로드할지 결정할 수 있다.
- 테스트하기 더 쉽다 (definition을 직접 넘기면 됨).
- runtime UI를 content discovery로부터 분리된 상태로 유지한다.

`storyId` 방식은 `StoryRuntimeScreen`이 loader 함수(`getStoryDefinition`)를 직접 호출해야 하므로, runtime UI가 content discovery 책임을 일부 떠안게 된다. 이는 §3의 "Keep `StoryRuntimeScreen` focused on runtime UI/state, not content discovery" 목표와 어긋난다. 반면 `storyDefinition` prop injection은 parent(Story Mode entry, 향후 M9-PR4의 selection stub)가 `getStoryDefinition`을 호출하고 그 결과만 `StoryRuntimeScreen`에 전달하므로, 책임이 정확히 분리된다.

**주의:**

- `StoryRuntimeScreen`은 여전히 `StorySessionState`를 소유한다.
- `StoryRuntimeScreen`은 주입된 definition으로부터 session을 생성해야 한다 (`createStorySession(storyDefinition)`).
- `sampleStory`가 유일하게 등록된 story인 동안에는 동작이 동일하게 유지되어야 한다.

---

## 9. Story Mode Flow After M9

**M9-PR2 이후:**

```
Content Layer
→ storyRegistry includes sampleStory
```

**M9-PR3 이후:**

```
App / Story Mode parent
→ loads or selects sample story
→ passes StoryDefinition to StoryRuntimeScreen
→ StoryRuntimeScreen runs the same story-match-story flow
```

**M9-PR4 이후, 필요 시:**

```
Story Mode entry
→ minimal story selection stub
→ selected StoryDefinition
→ StoryRuntimeScreen
```

---

## 10. Validation and Error Handling

- 알 수 없는 `storyId`는 `null`을 반환한다.
- story를 로드할 수 없으면 UI는 단순한 오류를 표시해야 한다.
- story 누락으로 인한 crash는 없어야 한다.
- registry는 중복된 `storyId`를 허용해서는 안 된다.
- M9-PR2는 아래에 대한 테스트를 포함해야 한다:
  - `sampleStory`가 registry에 등록되어 있다
  - `getStoryCatalog`가 metadata를 반환한다
  - `getStoryDefinition`이 id로 `sampleStory`를 반환한다
  - 알 수 없는 id는 `null`을 반환한다
  - 중복 `storyId`가 없다

**주의:**

- content validation은 단순한 수준으로 유지할 수 있다.
- `sampleStory`/schema 주변의 깊은 story graph validation은 이미 존재하며 (M6-PR2B `sampleStory.test.ts`), 나중에 확장할 수 있다.

---

## 11. Persistence Decision

`StoryProgress` persistence remains deferred.

**이유:**

- `StoryProgress` persistence는 안정적인 `storyId` identity를 필요로 한다.
- persistence schema보다 loader/registry가 먼저 존재해야 한다.
- 하드코딩된 `sampleStory`를 대상으로 progress를 저장하는 것은 시기상조다.

---

## 12. Production Content Decision

Production region/NPC/dialogue content remains deferred.

**이유:**

- loader/selection boundary가 존재하기 전에 content를 확장해서는 안 된다.
- M9-PR2에서도 `sampleStory`가 유일하게 등록된 story로 남는다.
- production content는 M9-H1 이후 또는 별도의 명시적인 마일스톤 결정이 있어야만 시작할 수 있다.

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Registry becomes too complex too early | Keep registry local and synchronous |
| Metadata grows into production content prematurely | Keep metadata minimal |
| UI still hardcodes `sampleStory` after M9 | M9-PR3 removes the direct `sampleStory` import from `StoryRuntimeScreen` |
| Loader starts using async/storage/network too early | No async/network/storage in M9 |
| `StoryProgress` persistence is added before loader identity is stable | Persistence remains deferred until after the loader boundary review (M9-H1) |

---

## 14. M9 Proposed PR Sequence

### M9-PR1 — Content Loader Architecture

Documentation only.

### M9-PR2 — Story Content Registry

Implement a local registry with `sampleStory` only. Add tests. No production content.

### M9-PR3 — StoryRuntimeScreen Definition Injection

Refactor `StoryRuntimeScreen` to receive `StoryDefinition` via props. Remove the direct `sampleStory` import from `StoryRuntimeScreen`. Keep behavior identical.

### M9-PR4 — Minimal Story Selection Stub

Optional if needed. Add a minimal story selection using the registry catalog. Only the sample story listed. No production content.

### M9-H1 — Content Loader Boundary Review

Sign-off the boundary before any production story content.

---

## 15. Acceptance Criteria for M9-PR2

- Story registry exists in the Content Layer.
- `sampleStory` is the only registered story.
- `getStoryCatalog()` returns one sample entry.
- `getStoryDefinition(sampleStory.storyId)` returns `sampleStory`.
- Unknown `storyId` returns `null`.
- A duplicate-`storyId` check exists.
- No engine import.
- No Application Layer runtime logic changes, unless strictly needed for typing.
- No UI changes.
- No production content.

---

## 16. Final Recommendation

M9 should begin with a local synchronous content registry using `sampleStory` only.

The project should not begin production story writing until the UI no longer hardcodes concrete story files and the loader boundary is reviewed.

---

## 17. M9-PR2 Implementation Note

- `src/content/stories/storyRegistry.ts` implemented exactly as proposed in §6/§7 — `StoryCatalogEntry`, `RegisteredStory`, `storyRegistry` (`sampleStory` only), `getStoryCatalog()`, `getStoryDefinition(storyId)`.
- `hasDuplicateStoryId()` added and unit-tested independently of the real registry, plus a module-load-time guard call against `storyRegistry` itself (§10's duplicate-`storyId` check).
- `getStoryCatalog()` returns catalog metadata only — never the `StoryDefinition` — matching the read-only, content-discovery-safe boundary described in §5.
- No engine import in `storyRegistry.ts`.
- `StoryRuntimeScreen` is unchanged and still imports `sampleStory` directly — the §8 refactor (injecting `storyDefinition` as a prop) is still M9-PR3, not this PR.
- No production content added; `sampleStory` remains the only registered story.
- `StoryProgress` persistence remains deferred.

---

## 18. M9-PR3 Implementation Note

- `StoryRuntimeScreen` implements the §8 recommended direction exactly: it takes a `storyDefinition: StoryDefinition` prop (type-only import) and no longer imports `sampleStory`. Every session transition (`createStorySession`, `continueStorySession`, `selectStoryChoice`, `completeStoryMatch`, restart) uses the injected `storyDefinition`.
- `StoryRuntimeScreen` does not import `getStoryCatalog` / `getStoryDefinition` — it stays a pure function of the injected definition plus its own `StorySessionState`, per §3's "Keep `StoryRuntimeScreen` focused on runtime UI/state, not content discovery" goal.
- `App.tsx` is the Story Mode parent boundary described in §9's "M9-PR3 이후" flow: it calls `getStoryCatalog()`, takes the first catalog entry, calls `getStoryDefinition(storyId)`, and passes the result to `StoryRuntimeScreen`. `App.tsx` does not import `sampleStory`.
- If the registry has no entries or the lookup fails, `App.tsx` renders a minimal error fallback instead of mounting `StoryRuntimeScreen` — no crash path (§10).
- `StoryRuntimeScreen` is keyed on `storyDefinition.storyId` in `App.tsx` so a future story-definition change (e.g. M9-PR4 selection) safely resets runtime state instead of reusing stale `StorySessionState`.
- Manual end-to-end verification (dialogue → match → result → story end, and standalone Free Match) passed with no console errors.
- No story selection UI, no production content, no `StoryProgress` persistence, no engine or Application Layer runtime logic changes.

---

## 19. M9-H1 Review Note

- Full boundary sign-off is documented in `docs/24_content_loader_boundary_review.md` — a 17-item checklist covering M9-PR1–PR3, with no blocker found.
- **M9 Content Loader Boundary is approved for MVP continuation**: the local synchronous sample-only registry, `App.tsx`-level default story resolution, and `StoryRuntimeScreen` definition injection all hold as designed in §5–§9 of this document.
- M9-PR4 (minimal story selection stub) is deferred — revisit once a second story entry exists.
- Production story content remains deferred (§12 unchanged).
- `StoryProgress` persistence remains deferred (§11 unchanged).
- Recommended next milestone: **M10 — Story Progress Persistence Planning**, starting with a documentation/design PR before implementation.
