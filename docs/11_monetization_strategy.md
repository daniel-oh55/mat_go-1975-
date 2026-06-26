# Monetization Strategy

## 1. Purpose

This document defines the design principles for ad revenue and simple in-app purchase revenue.

**Goals:**
- Allow the developer to earn revenue through ads and simple purchases.
- Ensure monetization does not damage the game engine, fairness, or player experience.
- Ads and payments are handled in the Platform and Application layers — never in the engine.

---

## 2. Monetization Principles

- Monetization must never affect shuffle, hand distribution, scoring, or win/loss outcome.
- No pay-to-win.
- No paid good-hand probability.
- No paid AI weakening.
- No paid score correction.
- Ads must not interrupt active card play.
- Ads should appear only at natural breaks (e.g., after match result).
- Rewarded ads must be opt-in — the player explicitly requests them.
- Paid products should focus on convenience, cosmetics, developer support, or optional extra content.
- Monetization implementation is deferred until release preparation.

---

## 3. MVP Scope

**MVP does not implement ads or in-app purchases.**

| | Status |
|---|---|
| Monetization strategy documentation | Included in MVP |
| AdMob SDK | Not in MVP |
| Google Play Billing | Not in MVP |
| Product IDs | Not in MVP |
| Purchase restore implementation | Not in MVP |
| Ad placement UI | Not in MVP |
| Payment UI | Not in MVP |
| Store assets | Not in MVP |
| Server receipt validation | Not in MVP |
| Subscription system | Not in MVP |

---

## 4. Revenue Model Overview

| Model | Description | In MVP? | Future Milestone |
|---|---|---|---|
| Interstitial ads | Shown after match result screen — not during play | No | Release preparation |
| Rewarded ads | Player taps button to watch ad for optional bonus | No | Release preparation |
| Remove Ads (one-time purchase) | Permanently removes interstitial and banner ads | No | Release preparation |
| Supporter Pack | Optional purchase to support development; includes cosmetic badge or title | No | Release preparation |
| Cosmetic Theme Pack | Visual theme for table, card backs, UI — no gameplay effect | No | Content milestone |
| Story / Region Side Content Pack | Optional paid extra story content after content milestone | No | Post-content milestone |
| Subscriptions | Not planned for initial release | No | Not planned |
| Loot boxes | Prohibited — unfair to player | Never | Never |
| Pay-to-win items | Prohibited — violates fairness policy | Never | Never |

---

## 5. Ad Strategy

### Allowed ad placements

- Rewarded ad triggered by an explicit player-tapped button
- Interstitial ad displayed after the match result screen
- Optional ad to earn a minor non-competitive reward (e.g., cosmetic unlock preview)
- Optional ad to access a side content preview

### Forbidden ad placements

- Ads during active card play
- Ads before a card action resolves
- Ads before or during a Go/Stop decision
- Ads immediately after tapping Start Game
- Ads that block app exit
- Ads that mimic UI elements (deceptive overlay)
- Ads that are not clearly dismissible
- Consecutive interstitial ads without natural break
- Ads required to continue the core game (paywall for core loop)

---

## 6. In-App Purchase Strategy

### Candidate products

| Product | Type | Effect |
|---|---|---|
| Remove Ads | One-time purchase | Disables interstitial and banner ads permanently |
| Supporter Pack | One-time purchase | Cosmetic badge/title; supports development |
| Premium Theme Pack | One-time purchase | Visual theme for table and UI — no gameplay effect |
| Card Back / Table Skin Pack | One-time purchase | Visual cosmetics only |
| Optional Side Story Pack | One-time purchase | Extra story content — available after content milestone |

### Forbidden products

| Product | Reason |
|---|---|
| Better hand probability | Violates fairness policy |
| AI weakening | Violates fairness policy |
| See opponent's hand | Violates fairness policy |
| Redraw cards | Violates fairness policy |
| Score boost | Violates fairness policy |
| Extra Go/Stop advantage | Violates fairness policy |
| Paid win guarantee | Violates fairness policy |
| Randomized paid loot box | Prohibited — predatory; violates fairness |

---

## 7. Product Data Boundary

Product metadata is managed in the Product, Content, or Application layer — never in the engine.

### Product metadata may include

- `productId` — platform product identifier
- `title` — display name
- `description` — short description
- `type` — one-time, consumable, or subscription
- `priceDisplayKey` — localization key for price display
- `entitlementKey` — what this purchase unlocks
- `platformProductReference` — Google Play or App Store product reference

### Engine must never know

- `productId`
- Purchase status
- Ad status
- Premium user state
- Payment result

---

## 8. Entitlement Design

Purchase results are expressed as entitlements. The Application Layer uses entitlements to determine what UI or content is unlocked.

**Example entitlement keys:**

```
ads_removed
supporter_badge
theme_pack_1975
card_back_classic
side_story_pack_01
```

**Constraints:**
- Entitlements unlock only: convenience, cosmetics, developer support, or optional content.
- Entitlements must never affect engine rules, scoring, shuffle, AI difficulty, or win/loss outcome.

---

## 9. Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Engine** | No monetization responsibility. Engine is unaware of ads, purchases, product IDs, entitlements, and premium status. |
| **Application** | Decide when an ad may be requested (natural break detection). Check entitlement state to unlock cosmetic or content access. Must never alter engine fairness or inject monetization into game logic. |
| **Platform** | AdMob integration. Google Play Billing integration. Purchase restore. Ad loading and display. Platform compliance. |
| **Content** | Product copy and descriptions. Reward messages. Cosmetic metadata. Side content metadata. |
| **UI** | Show purchase buttons. Show rewarded ad opt-in buttons. Show clear user consent before rewarded ads. Show purchase restore and status. |

---

## 10. Player Experience Rules

- Free players can complete the full core game without paying or watching ads.
- Paying players do not gain any unfair gameplay advantage.
- Ads are predictable — players know when an ad might appear.
- Rewarded ads are always optional — never forced.
- Purchases are clear and honest — no dark patterns.
- Remove Ads must work exactly as described.
- Monetization must support the mood and atmosphere of the game — not break immersion.

---

## 11. Compliance Notes

These are directional guidelines. Final verification is required before implementation.

- In-app purchases for digital features must use Google Play Billing (required by Google Play policy).
- Ads must comply with Google Play policies and the applicable ad network's policies.
- Rewarded ads must be genuinely opt-in.
- Ads must not be deceptive, disruptive, or interruptive of core gameplay.
- A privacy policy and data disclosure document must be prepared before any ad SDK or billing SDK is integrated.
- Final policy and legal verification is required before monetization implementation begins.

---

## 12. Deferred Implementation

Actual monetization implementation is planned for **Milestone 9 (Release Preparation)**.

Future implementation tasks:

- Set up AdMob account and app configuration
- Define ad unit IDs and placement logic
- Integrate Google Play Billing SDK
- Define product IDs and catalog
- Implement purchase restore flow
- Implement entitlement storage and state management
- Write and integrate privacy policy
- Complete release compliance checklist (Google Play policies)

---

## 13. PR Review Checklist

Before merging any PR during Milestone 2 through 8, verify:

- [ ] No monetization code in the engine.
- [ ] No ad SDK (AdMob) added before release milestone.
- [ ] No billing SDK (Google Play Billing) added before release milestone.
- [ ] No pay-to-win products defined or implemented.
- [ ] No monetization effect on shuffle, scoring, or win/loss.
- [ ] Ad placements are natural-break-only.
- [ ] Rewarded ads are opt-in only.
- [ ] Purchase entitlements unlock only convenience, cosmetics, developer support, or content.
