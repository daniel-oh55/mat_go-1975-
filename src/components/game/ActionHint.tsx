import type { GameStatusKind } from '../../application/gameSession/index.js';

interface ActionHintProps {
  statusKind: GameStatusKind;
  isTargetSelectionPending: boolean;
}

const HINT_TEXT: Record<GameStatusKind, string | null> = {
  humanTurn:   '낼 카드를 선택하세요',
  aiTurn:      'AI가 생각 중입니다…',
  humanGoStop: '고 또는 스톱을 선택하세요',
  aiGoStop:    'AI가 고/스톱을 결정 중입니다…',
  ended:       null,
};

const ACCENT_COLOR: Record<GameStatusKind, string> = {
  humanTurn:   '#2a7',
  aiTurn:      '#a72',
  humanGoStop: '#c8860a',
  aiGoStop:    '#888',
  ended:       '#555',
};

export function ActionHint({ statusKind, isTargetSelectionPending }: ActionHintProps) {
  const text = isTargetSelectionPending ? '바닥패를 선택하세요' : HINT_TEXT[statusKind];
  if (text === null) return null;

  const accentColor = ACCENT_COLOR[statusKind];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '5px 10px',
        marginBottom: 8,
        background: '#fafafa',
        borderRadius: 4,
        borderLeft: `3px solid ${accentColor}`,
        fontSize: 12,
        color: '#444',
      }}
    >
      {text}
    </div>
  );
}
