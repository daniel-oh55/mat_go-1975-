import type { Card } from '../types/card.js';

/**
 * Creates the canonical 48-card Hanafuda deck used in Korean Matgo.
 *
 * Card layout: 12 months × 4 cards.
 * Each card carries only rule-relevant metadata.
 *
 * Must NOT include: image paths, story text, NPC meanings,
 * regional lore, or any content-layer data.
 *
 * Scoring category counts in this deck:
 *   광 (brights):  5  — months 1, 3, 8, 11, 12
 *   열 (animals):  9  — months 2, 4, 5, 6, 7, 8, 9, 10, 11
 *   띠 (ribbons): 10  — months 1, 2, 3, 4, 5, 6, 7, 9, 10, 11
 *   피 (chaff):   24  — remainder
 *   Total:        48
 */
export function createDefaultDeck(): Card[] {
  return [
    // ─── 1월 (January / Pine / 松) ─────────────────────────────────────
    { id: 'm01-gwang',  month: 1,  category: 'gwang', name: '일월광',   scoreRole: 'standard',   matchingGroup: 1 },
    { id: 'm01-tti',    month: 1,  category: 'tti',   name: '일월홍띠', scoreRole: 'ribbon-red', matchingGroup: 1 },
    { id: 'm01-pi-1',   month: 1,  category: 'pi',    name: '일월피1',  scoreRole: 'standard',   matchingGroup: 1 },
    { id: 'm01-pi-2',   month: 1,  category: 'pi',    name: '일월피2',  scoreRole: 'standard',   matchingGroup: 1 },

    // ─── 2월 (February / Plum / 梅) ────────────────────────────────────
    { id: 'm02-yeol',   month: 2,  category: 'yeol',  name: '이월매조', scoreRole: 'godori',     matchingGroup: 2 },
    { id: 'm02-tti',    month: 2,  category: 'tti',   name: '이월홍띠', scoreRole: 'ribbon-red', matchingGroup: 2 },
    { id: 'm02-pi-1',   month: 2,  category: 'pi',    name: '이월피1',  scoreRole: 'standard',   matchingGroup: 2 },
    { id: 'm02-pi-2',   month: 2,  category: 'pi',    name: '이월피2',  scoreRole: 'standard',   matchingGroup: 2 },

    // ─── 3월 (March / Cherry / 桜) ─────────────────────────────────────
    { id: 'm03-gwang',  month: 3,  category: 'gwang', name: '삼월광',   scoreRole: 'standard',   matchingGroup: 3 },
    { id: 'm03-tti',    month: 3,  category: 'tti',   name: '삼월홍띠', scoreRole: 'ribbon-red', matchingGroup: 3 },
    { id: 'm03-pi-1',   month: 3,  category: 'pi',    name: '삼월피1',  scoreRole: 'standard',   matchingGroup: 3 },
    { id: 'm03-pi-2',   month: 3,  category: 'pi',    name: '삼월피2',  scoreRole: 'standard',   matchingGroup: 3 },

    // ─── 4월 (April / Wisteria / 藤) ───────────────────────────────────
    { id: 'm04-yeol',   month: 4,  category: 'yeol',  name: '사월두견', scoreRole: 'godori',     matchingGroup: 4 },
    { id: 'm04-tti',    month: 4,  category: 'tti',   name: '사월초단', scoreRole: 'ribbon-plant', matchingGroup: 4 },
    { id: 'm04-pi-1',   month: 4,  category: 'pi',    name: '사월피1',  scoreRole: 'standard',   matchingGroup: 4 },
    { id: 'm04-pi-2',   month: 4,  category: 'pi',    name: '사월피2',  scoreRole: 'standard',   matchingGroup: 4 },

    // ─── 5월 (May / Iris / 菖蒲) ───────────────────────────────────────
    { id: 'm05-yeol',   month: 5,  category: 'yeol',  name: '오월난초', scoreRole: 'standard',   matchingGroup: 5 },
    { id: 'm05-tti',    month: 5,  category: 'tti',   name: '오월초단', scoreRole: 'ribbon-plant', matchingGroup: 5 },
    { id: 'm05-pi-1',   month: 5,  category: 'pi',    name: '오월피1',  scoreRole: 'standard',   matchingGroup: 5 },
    { id: 'm05-pi-2',   month: 5,  category: 'pi',    name: '오월피2',  scoreRole: 'standard',   matchingGroup: 5 },

    // ─── 6월 (June / Peony / 牡丹) ─────────────────────────────────────
    { id: 'm06-yeol',   month: 6,  category: 'yeol',  name: '유월나비', scoreRole: 'standard',   matchingGroup: 6 },
    { id: 'm06-tti',    month: 6,  category: 'tti',   name: '유월청단', scoreRole: 'ribbon-blue', matchingGroup: 6 },
    { id: 'm06-pi-1',   month: 6,  category: 'pi',    name: '유월피1',  scoreRole: 'standard',   matchingGroup: 6 },
    { id: 'm06-pi-2',   month: 6,  category: 'pi',    name: '유월피2',  scoreRole: 'standard',   matchingGroup: 6 },

    // ─── 7월 (July / Bush Clover / 荻) ─────────────────────────────────
    { id: 'm07-yeol',   month: 7,  category: 'yeol',  name: '칠월멧돼지', scoreRole: 'standard', matchingGroup: 7 },
    { id: 'm07-tti',    month: 7,  category: 'tti',   name: '칠월초단', scoreRole: 'ribbon-plant', matchingGroup: 7 },
    { id: 'm07-pi-1',   month: 7,  category: 'pi',    name: '칠월피1',  scoreRole: 'standard',   matchingGroup: 7 },
    { id: 'm07-pi-2',   month: 7,  category: 'pi',    name: '칠월피2',  scoreRole: 'standard',   matchingGroup: 7 },

    // ─── 8월 (August / Silvergrass / 芒) ───────────────────────────────
    { id: 'm08-gwang',  month: 8,  category: 'gwang', name: '팔월공산광', scoreRole: 'standard', matchingGroup: 8 },
    { id: 'm08-yeol',   month: 8,  category: 'yeol',  name: '팔월기러기', scoreRole: 'godori',   matchingGroup: 8 },
    { id: 'm08-pi-1',   month: 8,  category: 'pi',    name: '팔월피1',  scoreRole: 'standard',   matchingGroup: 8 },
    { id: 'm08-pi-2',   month: 8,  category: 'pi',    name: '팔월피2',  scoreRole: 'standard',   matchingGroup: 8 },

    // ─── 9월 (September / Chrysanthemum / 菊) ──────────────────────────
    { id: 'm09-yeol',   month: 9,  category: 'yeol',  name: '구월국화',  scoreRole: 'standard',  matchingGroup: 9 },
    { id: 'm09-tti',    month: 9,  category: 'tti',   name: '구월청단',  scoreRole: 'ribbon-blue', matchingGroup: 9 },
    // 구월쌍피: counts as 2 pi — advanced rule, flagged for Ruleset expansion
    { id: 'm09-pi-ssang', month: 9, category: 'pi',   name: '구월쌍피', scoreRole: 'double-pi',  matchingGroup: 9, flags: ['double-pi'] },
    { id: 'm09-pi-1',   month: 9,  category: 'pi',    name: '구월피',   scoreRole: 'standard',   matchingGroup: 9 },

    // ─── 10월 (October / Maple / 紅葉) ─────────────────────────────────
    { id: 'm10-yeol',   month: 10, category: 'yeol',  name: '시월단풍사슴', scoreRole: 'standard', matchingGroup: 10 },
    { id: 'm10-tti',    month: 10, category: 'tti',   name: '시월청단', scoreRole: 'ribbon-blue', matchingGroup: 10 },
    { id: 'm10-pi-1',   month: 10, category: 'pi',    name: '시월피1',  scoreRole: 'standard',   matchingGroup: 10 },
    { id: 'm10-pi-2',   month: 10, category: 'pi',    name: '시월피2',  scoreRole: 'standard',   matchingGroup: 10 },

    // ─── 11월 (November / Willow–Rain / 柳) ────────────────────────────
    // 비광: the Rain Bright — special scoring in some rulesets (deferred)
    { id: 'm11-gwang',  month: 11, category: 'gwang', name: '십일월비광', scoreRole: 'bi-gwang', matchingGroup: 11, flags: ['bi-gwang'] },
    { id: 'm11-yeol',   month: 11, category: 'yeol',  name: '십일월제비', scoreRole: 'standard', matchingGroup: 11 },
    { id: 'm11-tti',    month: 11, category: 'tti',   name: '십일월띠',  scoreRole: 'standard',  matchingGroup: 11 },
    { id: 'm11-pi-1',   month: 11, category: 'pi',    name: '십일월피',  scoreRole: 'standard',  matchingGroup: 11 },

    // ─── 12월 (December / Paulownia / 桐) ──────────────────────────────
    { id: 'm12-gwang',  month: 12, category: 'gwang', name: '십이월오동광', scoreRole: 'standard', matchingGroup: 12 },
    { id: 'm12-pi-1',   month: 12, category: 'pi',    name: '십이월피1', scoreRole: 'standard',  matchingGroup: 12 },
    { id: 'm12-pi-2',   month: 12, category: 'pi',    name: '십이월피2', scoreRole: 'standard',  matchingGroup: 12 },
    { id: 'm12-pi-3',   month: 12, category: 'pi',    name: '십이월피3', scoreRole: 'standard',  matchingGroup: 12 },
  ] satisfies Card[];
}
