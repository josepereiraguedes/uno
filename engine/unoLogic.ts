
import { Card, GameState, CardColor, CardType, GameMode } from '../types';

export const RANKS = [
  { name: 'Bronze III', min: 0 },
  { name: 'Bronze II', min: 300 },
  { name: 'Bronze I', min: 600 },
  { name: 'Prata III', min: 1000 },
  { name: 'Prata II', min: 1500 },
  { name: 'Prata I', min: 2000 },
  { name: 'Ouro III', min: 3000 },
  { name: 'Ouro II', min: 4500 },
  { name: 'Ouro I', min: 6000 },
  { name: 'Platina III', min: 8000 },
  { name: 'Platina II', min: 11000 },
  { name: 'Platina I', min: 15000 },
  { name: 'Diamante', min: 20000 },
  { name: 'Mestre Diamante', min: 30000 },
];

export const getRankFromMMR = (mmr: number): string => {
  const rank = [...RANKS].reverse().find(r => mmr >= r.min);
  return rank ? rank.name : 'Iniciante';
};

/**
 * Validação de Coerência Estrita
 */
export const isMoveValid = (card: Card, gameState: GameState, playerHand: Card[]): boolean => {
  if (!card || !gameState) return false;
  
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!topDiscard) return true;

  const currentColor = gameState.currentColor;

  // 1. REGRA DE ACÚMULO (STACKING)
  if (gameState.pendingDrawCount > 0 && gameState.settings.stackingEnabled) {
    if (topDiscard.type === CardType.DRAW_TWO) {
      return card.type === CardType.DRAW_TWO || card.type === CardType.WILD_DRAW_FOUR;
    }
    if (topDiscard.type === CardType.WILD_DRAW_FOUR) {
      return card.type === CardType.WILD_DRAW_FOUR;
    }
    return false;
  }

  // 2. CORINGAS
  if (card.type === CardType.WILD) return true;

  if (card.type === CardType.WILD_DRAW_FOUR) {
    // Só pode se não tiver a cor atual na mão
    const hasCurrentColor = playerHand.some(c => 
      c.color === currentColor && 
      c.type !== CardType.WILD && 
      c.type !== CardType.WILD_DRAW_FOUR
    );
    return !hasCurrentColor;
  }

  // 3. COERÊNCIA DE COR (Sempre válido se a cor bater)
  if (card.color === currentColor) return true;

  // 4. COERÊNCIA DE VALOR/TIPO (Só se a cor for diferente)
  // Para números: Valor deve ser igual
  if (card.type === CardType.NUMBER && topDiscard.type === CardType.NUMBER) {
    return card.value === topDiscard.value;
  }

  // Para ações: Tipo deve ser igual (Skip com Skip, Reverse com Reverse, etc)
  if (card.type !== CardType.NUMBER && card.type === topDiscard.type) {
    return true;
  }

  return false;
};

export const getNextPlayerIndex = (currentIndex: number, direction: 1 | -1, totalPlayers: number): number => {
  let next = currentIndex + direction;
  if (next >= totalPlayers) next = 0;
  if (next < 0) next = totalPlayers - 1;
  return next;
};

export const applyCardEffect = (card: Card, state: GameState): { direction: 1 | -1; skipNext: boolean; drawCount: number } => {
  let direction: 1 | -1 = state.direction;
  let skipNext = false;
  let drawCount = 0;

  if (!card) return { direction, skipNext, drawCount };

  switch (card.type) {
    case CardType.SKIP: skipNext = true; break;
    case CardType.REVERSE:
      if (state.players.length === 2) skipNext = true;
      else direction = (direction === 1 ? -1 : 1);
      break;
    case CardType.DRAW_TWO:
      drawCount = 2;
      skipNext = true; 
      break;
    case CardType.WILD_DRAW_FOUR:
      drawCount = 4;
      skipNext = true;
      break;
  }

  return { direction, skipNext, drawCount };
};
