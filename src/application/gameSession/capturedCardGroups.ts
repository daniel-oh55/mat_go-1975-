import type { Card, CardCategory } from '../../engine/types/card.js';

export interface CapturedGroup {
  readonly category: CardCategory;
  readonly label: string;
  readonly cards: ReadonlyArray<Card>;
}

const CATEGORY_ORDER: ReadonlyArray<CardCategory> = ['gwang', 'yeol', 'tti', 'pi'];

export const CAPTURED_GROUP_LABEL: Record<CardCategory, string> = {
  gwang: '광',
  yeol: '열',
  tti: '띠',
  pi: '피',
};

/**
 * Groups captured cards into the four scoring categories in display order
 * (gwang → yeol → tti → pi). Groups with zero cards are omitted.
 */
export function groupCapturedCards(cards: ReadonlyArray<Card>): ReadonlyArray<CapturedGroup> {
  const buckets = new Map<CardCategory, Card[]>();
  for (const cat of CATEGORY_ORDER) {
    buckets.set(cat, []);
  }
  for (const card of cards) {
    buckets.get(card.category)?.push(card);
  }
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      label: CAPTURED_GROUP_LABEL[category],
      cards: buckets.get(category) ?? [],
    }))
    .filter((group) => group.cards.length > 0);
}
