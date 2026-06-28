# Milestone 4 Playability Polish — Review

## 1. Purpose

This document is the M4 hardening review. It:

- Summarizes all Milestone 4 PRs and what each accomplished.
- Verifies that implementation and documentation are mutually consistent.
- Audits accessibility attributes added during M4.
- Defines the completion criteria that must hold before M4 is closed.

Use this document when deciding whether M4 is done, or when planning M5.

---

## 2. M4 PR Summary

| PR | Branch | Purpose |
|---|---|---|
| M4-PR1 | `pr1-card-interaction-clarity` | `CardButton` touch size (44px), 2px border all states, `opacity:1` override, `aria-label` with suffix, `CardRow` horizontal scroll |
| M4-PR1A | `pr1a-card-state-badges` | State badge second line: `낼 수 있음` / `선택됨` / `대상`; `flexDirection:'column'` layout |
| M4-PR1B | `pr1b-card-accessibility-helper-cleanup-main` | `cardInteractionLabel()` helper unifies badge and aria-label; adds `aria-disabled`, `aria-pressed` |
| M4-PR2 | `pr2-action-hint-bar` | New `ActionHint` component: context-sensitive guidance below status bar |
| M4-PR2A | `pr2a-action-hint-docs` | Document `ActionHint` in §4 visibility matrix and §8 of doc 14; update doc 13 |
| M4-PR3 | `pr3-gostop-panel-clarity` | Extract `GoStopPanel` from inline JSX; add guidance text |
| M4-PR3A | `pr3a-gostop-copy-docs` | Fix "승리 선언" → "게임 종료"; document `GoStopPanel` in doc 14 §9 |
| M4-PR4 | `pr4-result-panel-clarity` | `ResultPanel`: `<section aria-label>`, separated heading, outcome-aware styling |
| M4-PR5 | `pr5-captured-cards-display-clarity` | New `DisplayCard` (`<span>`); replaces `CardButton` in captured card rows |
| M4-PR5A | `pr5a-display-card-accessibility-docs` | `DisplayCard` `aria-label` + `title`; doc 14 §5 Display-only spec; doc 13 §10 |

---

## 3. Implementation vs Documentation Consistency Check

For each M4 component, verify that the implementation matches its spec in `docs/14_ui_state_matrix.md`.

### 3.1 `CardButton` (§5 Card Interactivity Matrix)

| Spec claim | Implementation | ✓/✗ |
|---|---|---|
| All states use `2px border` | `HIGHLIGHT_STYLES` — all four entries use `2px solid` | ✓ |
| `none` uses `opacity: 1` | `HIGHLIGHT_STYLES.none` includes `opacity: 1` | ✓ |
| `minHeight: 44`, `minWidth: 52` | Present in `style` object | ✓ |
| `aria-label` = `카드명 (interactionLabel)` | `aria-label={\`${cardLabel(card)} (${interactionLabel})\`}` | ✓ |
| `aria-disabled` mirrors `disabled` | `aria-disabled={!isInteractive}` | ✓ |
| `aria-pressed` only on `selected` | `aria-pressed={highlight === 'selected' ? true : undefined}` | ✓ |
| Badge text = `cardInteractionLabel(h)` | `badge = isInteractive ? interactionLabel : null` | ✓ |
| Badge: `none` → null | `badge = isInteractive ? interactionLabel : null` — `none` is not interactive | ✓ |

### 3.2 `DisplayCard` (§5 Display-only cards)

| Spec claim | Implementation | ✓/✗ |
|---|---|---|
| Element is `<span>` | `<span ...>` | ✓ |
| `aria-label` = `카드명, 획득 카드` | `` `${label}, 획득 카드` `` | ✓ |
| `title` = `카드명 획득 카드` | `` `${label} 획득 카드` `` | ✓ |
| `12px`, `#eee` bg, `1px solid #ddd` | `fontSize: 12`, `background: '#eee'`, `border: '1px solid #ddd'` | ✓ |
| Not clickable | `<span>` — no `onClick`, no button role | ✓ |

### 3.3 `ActionHint` (§8 Action Hint Display Rules)

| Spec claim | Implementation | ✓/✗ |
|---|---|---|
| `humanTurn` → `낼 카드를 선택하세요` | `HINT_TEXT.humanTurn` | ✓ |
| `isTargetSelectionPending` → `바닥패를 선택하세요` | `text = isTargetSelectionPending ? '바닥패를 선택하세요' : HINT_TEXT[statusKind]` | ✓ |
| `aiTurn` → `AI가 생각 중입니다…` | `HINT_TEXT.aiTurn` | ✓ |
| `humanGoStop` → `고 또는 스톱을 선택하세요` | `HINT_TEXT.humanGoStop` | ✓ |
| `aiGoStop` → `AI가 고/스톱을 결정 중입니다…` | `HINT_TEXT.aiGoStop` | ✓ |
| `ended` → null | `HINT_TEXT.ended = null` → returns null | ✓ |
| `role="status"`, `aria-live="polite"` | Present on `<div>` | ✓ |
| Border-left accent color from status palette | `ACCENT_COLOR` map matches `STATUS_COLOR` in `GameStatusBar` | ✓ |
| Priority: `isTargetSelectionPending` overrides `statusKind` | Ternary checks pending first | ✓ |

### 3.4 `GoStopPanel` (§9 GoStopPanel Display Rules)

| Spec claim | Implementation | ✓/✗ |
|---|---|---|
| Heading: `{N}점 달성 — 고 또는 스톱을 선택하세요` | `` `${humanScore}점 달성 — 고 또는 스톱을 선택하세요` `` | ✓ |
| Guidance — 고: `계속 플레이해서 더 많은 점수를 노립니다.` | Present as `<span>` | ✓ |
| Guidance — 스톱: `지금 점수로 게임을 종료합니다.` | Present as `<span>` | ✓ |
| 고 button: two-line `고 / 계속 플레이` | `<span>고</span>` + `<span>계속 플레이</span>` | ✓ |
| 스톱 button: two-line `스톱 / 게임 종료` | `<span>스톱</span>` + `<span>게임 종료</span>` | ✓ |
| 고 `aria-label` = `고 — 계속 플레이` | `aria-label="고 — 계속 플레이"` | ✓ |
| 스톱 `aria-label` = `스톱 — 게임 종료` | `aria-label="스톱 — 게임 종료"` | ✓ |
| `minHeight: 44` on both buttons | Both buttons have `minHeight: 44` | ✓ |

### 3.5 `ResultPanel` (§10 ResultPanel Display Rules)

| Spec claim | Implementation | ✓/✗ |
|---|---|---|
| `<section aria-label="게임 결과">` | `<section aria-label="게임 결과">` | ✓ |
| `<h2>게임 종료</h2>` | `<h2 ...>게임 종료</h2>` | ✓ |
| `결과: 승리/패배/무승부` with color | `결과: {OUTCOME_TEXT[outcomeKey]}` + `color` from `OUTCOME_STYLE` | ✓ |
| `종료 이유: 스톱` or `종료 이유: 덱 소진` | `종료 이유: {REASON_TEXT[reason]}` | ✓ |
| win: `#e8f5e9` / `#4caf50` / `#2a7` | `OUTCOME_STYLE.win` | ✓ |
| lose: `#fdecea` / `#e57373` / `#c33` | `OUTCOME_STYLE.lose` | ✓ |
| draw: `#f5f5f5` / `#bbb` / `#555` | `OUTCOME_STYLE.draw` | ✓ |
| `다시 하기` button `minHeight: 44` | `minHeight: 44` | ✓ |

### 3.6 Element Visibility Matrix (§4)

All M4 components are in the visibility matrix:

| Component | Listed in §4 | Correct visibility | ✓/✗ |
|---|---|---|---|
| `ActionHint` | ✓ | Idle=—, Ended=— (returns null), active states=✓ | ✓ |
| `GoStopPanel` | ✓ | Only Human Go/Stop state | ✓ |

`DisplayCard` is not a separate top-level region — it is rendered inside the "Captured cards (collapsible)" row, which is already in the matrix.

---

## 4. Accessibility Audit

| Component | Accessible name | Role | Interactive |
|---|---|---|---|
| `CardButton` (interactive) | `aria-label` = `카드명 (상태)` | `button` | Yes |
| `CardButton` (none) | `aria-label` = `카드명 (선택 불가)` | `button` (`disabled`) | No |
| `DisplayCard` | `aria-label` = `카드명, 획득 카드` | _(none — `span`)_ | No |
| `ActionHint` | _(hint text is the content)_ | `status` (`aria-live="polite"`) | No |
| `GoStopPanel` 고 button | `고 — 계속 플레이` | `button` | Yes |
| `GoStopPanel` 스톱 button | `스톱 — 게임 종료` | `button` | Yes |
| `ResultPanel` | `게임 결과` | `section` | No (contains `다시 하기` button) |
| `다시 하기` button | _(visible text)_ | `button` | Yes |

**Touch targets:** All interactive buttons have `minHeight: 44px`. `DisplayCard` chips intentionally do not — they are display-only.

**Known gap:** `GoStopPanel` has no wrapping ARIA landmark. `ResultPanel` uses `<section>`. `GoStopPanel` uses `<div>` — a minor accessibility improvement deferred to a later milestone.

---

## 5. Component Registry (M4 additions)

| Component | File | Type | Added in |
|---|---|---|---|
| `ActionHint` | `ActionHint.tsx` | Presentational | M4-PR2 |
| `GoStopPanel` | `GoStopPanel.tsx` | Presentational | M4-PR3 |
| `DisplayCard` | `DisplayCard.tsx` | Presentational | M4-PR5 |

All three are exported from `src/components/game/index.ts`.

Previously existing components improved in M4:

| Component | Improvements |
|---|---|
| `CardButton` | Touch size, 2px border consistency, `opacity:1`, `aria-label`, badge, `cardInteractionLabel()`, `aria-disabled`, `aria-pressed` |
| `ResultPanel` | `<section>` landmark, separated heading, outcome-aware colors, `종료 이유` wording |

---

## 6. M4 Completion Criteria

M4 is complete when all of the following hold:

- [ ] All 422+ tests pass (`npx vitest run`)
- [ ] `tsc --noEmit` reports 0 errors
- [ ] All M4 PRs are merged to `main`
- [ ] `docs/14_ui_state_matrix.md` §4 includes `ActionHint` and `GoStopPanel` rows ✓
- [ ] `docs/14_ui_state_matrix.md` §5 includes `DisplayCard` spec ✓
- [ ] `docs/14_ui_state_matrix.md` has §8 (ActionHint), §9 (GoStopPanel), §10 (ResultPanel) display rules ✓
- [ ] `docs/13_mvp_playtest_checklist.md` has check items for all M4 components ✓
- [ ] §3 consistency check in this document shows no ✗ rows ✓
- [ ] M4 decisions are logged in `docs/10_decision_log.md` (see below)

---

## 7. Deferred Items (Not M4 Scope)

The following were identified but intentionally deferred:

| Item | Reason deferred |
|---|---|
| `GoStopPanel` ARIA landmark (`<section>`) | Minor; `<div>` is functional | 
| Card images / artwork | M4 is text-only polish; images are a separate milestone |
| Animation between states | Same as above |
| `CardButton` keyboard navigation improvements | Beyond MVP scope |
| Captured cards collapsible UX (expand by default?) | Out of M4 scope |
| Go multiplier display in `GoStopPanel` | OD-5: multiplier tracked but not applied in MVP |

---

## 8. Documents Updated in M4

| Document | M4 changes |
|---|---|
| `docs/14_ui_state_matrix.md` | Added `ActionHint` to §4; added DisplayCard spec to §5; added §8 ActionHint rules, §9 GoStopPanel rules, §10 ResultPanel rules; renumbered subsequent sections |
| `docs/13_mvp_playtest_checklist.md` | Added ActionHint checks (§3, 4, 5, 6, 7, 8), GoStopPanel checks (§6), captured card checks (§10); updated regression checklist |
| `docs/10_decision_log.md` | M4 decisions to be added via this PR |
| `docs/15_milestone4_playability_review.md` | This document (created in M4-H1) |
