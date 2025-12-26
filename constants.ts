
import { Card, CardColor, CardType } from './types';

export const COLORS = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

export const AVATARS = [
  '🦊', '🦁', '🐸', '🐼', '🐨', '🐯', '🐮', '🐵', '🐱', '🐶', '🦄', '🐲'
];

export const NARRATION_PHRASES: Record<string, string[]> = {
  FATAL_COLOR: ["ELE MUDOU A COR… E O ADVERSÁRIO FICOU SEM SAÍDA!", "Escolha fria, cálculo perfeito… essa cor muda o rumo!"],
  PLUS_2: ["E LÁ VEM O +2! O jogo vira completamente!", "Ataque estratégico! Quebrou a sequência!"],
  STACKING: ["EMPILHAMENTO ATIVO! A bomba só aumenta!", "A bomba tá crescendo! Quem vai segurar?"],
  PLUS_4: ["+4 NA VEIA! ISSO É CRUELDADE PURA!", "FINAL BRUTAL! Não deu tempo de reagir!"],
  REVERSE: ["REVERTEU O JOGO! AGORA É OUTRA HISTÓRIA!", "Mudou o fluxo! O contra-ataque começou!"],
  SKIP: ["BLOQUEADO! ELE NÃO VAI JOGAR AGORA!", "Dormiu no ponto! Perdeu a vez!"],
  UNO_CALL: ["UNO DECLARADO! A PRESSÃO ESTÁ LANÇADA!", "Ele tá por uma! O clímax chegou!"],
  UNO_PENALTY: ["VACILOU! PENALIDADE APLICADA!", "Dormiu no ponto! Leva 2 pra casa!"],
  WIN: ["VIRADA HISTÓRICA! NINGUÉM ACREDITAVA!", "JOGADA LIMPA, VITÓRIA MERECIDA!", "FINAL ABSURDO! QUE PARTIDA!"],
  ESPELHO: ["ESPELHO ATIVADO! A CARTA VOLTOU!", "TIMING PERFEITO! ESPELHO IMPECÁVEL!"]
};

export const VOICE_PHRASES = [
  "🛒 Compra 4 e não bufa!",
  "😴 Dormiu no ponto, hein?",
  "🤫 Silêncio na arena!",
  "🤡 O palhaço aqui é você!",
  "🔥 Tá pegando fogo, bicho!",
  "👑 Respeita o pai!",
  "🧨 Essa vai doer...",
  "🚑 Alguém chama a ambulância?",
  "🥱 Ganho até de olho fechado.",
  "🃏 Meu baralho, minhas regras!",
  "👋 Tchau, obrigado!",
  "🤨 Sério que você jogou isso?"
];

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;

  COLORS.forEach(color => {
    for (let i = 0; i <= 9; i++) {
      const count = i === 0 ? 1 : 2;
      for (let j = 0; j < count; j++) {
        deck.push({ id: `card-${idCounter++}`, color, type: CardType.NUMBER, value: i });
      }
    }
    for (let j = 0; j < 2; j++) {
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.SKIP });
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.REVERSE });
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.DRAW_TWO });
    }
  });

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
