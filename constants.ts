
import { Card, CardColor, CardType } from './types';

export const COLORS = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

export const AVATARS = [
  '🦊', '🦁', '🐸', '🐼', '🐨', '🐯', '🐮', '🐵', '🐱', '🐶', '🦄', '🐲'
];

export const VOICE_PHRASES = [
  "Aceita esse presente!",
  "Boa sorte na próxima!",
  "Eu sou o rei da arena!",
  "Isso foi estratégico!",
  "Não chora agora...",
  "UNO na sua cara!",
  "Vem tranquilo!",
  "O jogo virou, não é mesmo?"
];

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;

  COLORS.forEach(color => {
    // 0-9
    for (let i = 0; i <= 9; i++) {
      const count = i === 0 ? 1 : 2;
      for (let j = 0; j < count; j++) {
        deck.push({ id: `card-${idCounter++}`, color, type: CardType.NUMBER, value: i });
      }
    }
    // Especiais de cor
    for (let j = 0; j < 2; j++) {
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.SKIP });
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.REVERSE });
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.DRAW_TWO });
    }
  });

  // Coringas
  for (let j = 0; j < 4; j++) {
    deck.push({ id: `card-${idCounter++}`, color: CardColor.WILD, type: CardType.WILD });
    deck.push({ id: `card-${idCounter++}`, color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR });
  }

  return shuffle(deck);
};

export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const COLOR_CLASSES: Record<CardColor, string> = {
  [CardColor.RED]: 'bg-red-600',
  [CardColor.BLUE]: 'bg-blue-600',
  [CardColor.GREEN]: 'bg-green-600',
  [CardColor.YELLOW]: 'bg-yellow-400',
  [CardColor.WILD]: 'bg-zinc-900',
};

export const CARD_LABELS: Record<CardType, string> = {
  [CardType.NUMBER]: '',
  [CardType.SKIP]: 'Ø',
  [CardType.REVERSE]: '⇄',
  [CardType.DRAW_TWO]: '+2',
  [CardType.WILD]: 'W',
  [CardType.WILD_DRAW_FOUR]: '+4',
};
