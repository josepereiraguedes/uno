
export enum CardColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  WILD = 'wild'
}

export enum CardType {
  NUMBER = 'number',
  SKIP = 'skip',
  REVERSE = 'reverse',
  DRAW_TWO = 'draw_two',
  WILD = 'wild',
  WILD_DRAW_FOUR = 'wild_draw_four'
}

export enum GameMode {
  NORMAL = 'normal',
  RANKED = 'ranked'
}

export enum AppView {
  LOGIN = 'login',
  PROFILE = 'profile',
  RANKING = 'ranking',
  STORE = 'store',
  LOBBY = 'lobby',
  GAME = 'game',
  INTEL = 'intel'
}

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface DailyMission {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  totalGames: number;
  totalCardsPlayed: number;
  unosCalled: number;
  highestMMR: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  photoUrl?: string | null;
  hand: Card[];
  isHost: boolean;
  isBot: boolean;
  score: number;
  level: number;
  xp: number;
  mmr: number;
  coins: number;
  rank: string;
  inventory: string[];
  equippedSkin: string;
  equippedTable: string;
  equippedBadge: string;
  equippedEffect: string;
  equippedAvatarSkin: string;
  equippedFrame: string;
  stats: PlayerStats;
  achievements: Achievement[];
  hasCalledUno: boolean;
}

export interface EphemeralReaction {
  playerId: string;
  reaction?: string;
  voicePhrase?: string;
  timestamp: number;
}

export interface GameSettings {
  mode: GameMode;
  turnTimeLimit: number;
  stackingEnabled: boolean;
  drawUntilPlayable: boolean;
  mandatoryUno: boolean;
  chaosMode: boolean;
  initialCardsCount: number;
  mirrorRuleEnabled: boolean;
  botCount: number;
}

export enum GameStatus {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export interface GameState {
  id: string;
  players: Player[];
  status: GameStatus;
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: CardColor;
  winner: Player | null;
  settings: GameSettings;
  turnStartTime: number;
  pendingDrawCount: number;
}

export interface OnlinePresence {
  id: string;
  name: string;
  avatar: string;
  photoUrl?: string | null;
  rank: string;
  lastSeen: number;
  currentRoomId?: string;
}

export type StoreCategory = 'card_skin' | 'table_bg' | 'visual_effect' | 'badge' | 'avatar_skin';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: StoreCategory;
  value: string;
  description: string;
}
