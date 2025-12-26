
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStatus, Player, Card, CardColor, CardType, GameSettings, GameMode, AppView, OnlinePresence, EphemeralReaction, DailyMission } from './types.ts';
import { generateDeck, AVATARS, NARRATION_PHRASES } from './constants.ts';
import { isMoveValid, getNextPlayerIndex, applyCardEffect, getRankFromMMR } from './engine/unoLogic.ts';
import { audio } from './services/audioService.ts';
import { supabase, syncProfile, fetchProfile } from './services/supabase.ts';
import { localDb } from './services/localDb.ts';
import Login from './components/Login.tsx';
import Profile from './components/Profile.tsx';
import Ranking from './components/Ranking.tsx';
import Lobby from './components/Lobby.tsx';
import GameTable from './components/GameTable.tsx';
import GameOver from './components/GameOver.tsx';
import Store from './components/Store.tsx';
import IntelHub from './components/IntelHub.tsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePresence>>({});
  const [reactions, setReactions] = useState<Record<string, EphemeralReaction>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [hypeText, setHypeText] = useState<string | null>(null);
  const [isExploding, setIsExploding] = useState(false);

  const gameStateRef = useRef<GameState | null>(null);
  const matchmakingTimeoutRef = useRef<any>(null);

  const [playerProfile, setPlayerProfile] = useState<any>(
    localDb.load('profile', {
      name: '', avatar: AVATARS[0], mmr: 1000, coins: 500, level: 1, xp: 0,
      inventory: ["default_skin"], equippedSkin: 'default',
      stats: {wins:0,losses:0,totalGames:0,totalCardsPlayed:0,unosCalled:0,highestMMR:1000}
    })
  );

  useEffect(() => {
    const init = async () => {
      let savedId = localStorage.getItem('uno_player_id');
      if (!savedId) {
        savedId = Math.random().toString(36).substring(7);
        localStorage.setItem('uno_player_id', savedId);
      }
      setLocalPlayerId(savedId);
      const remote = await fetchProfile(savedId);
      if (remote) setPlayerProfile(remote);
      if (playerProfile.name) setCurrentView(AppView.PROFILE);
      setIsLoading(false);

      const simulatedOnline: Record<string, OnlinePresence> = {};
      ["EpicGamer", "UnoMaster", "CardQueen", "RyuPlayer"].forEach((name, i) => {
        simulatedOnline[`sim-${i}`] = {
          id: `sim-${i}`, name, avatar: AVATARS[i % AVATARS.length], rank: 'Prata I', lastSeen: Date.now()
        };
      });
      setOnlinePlayers(simulatedOnline);
    };
    init();
  }, []);

  useEffect(() => {
    if (localPlayerId && playerProfile.name) {
      localDb.save('profile', playerProfile);
      syncProfile(localPlayerId, playerProfile);
    }
  }, [playerProfile, localPlayerId]);

  const triggerHype = (event: string, isBigExplosion: boolean = false) => {
    const pool = NARRATION_PHRASES[event];
    if (!pool) return;
    const phrase = pool[Math.floor(Math.random() * pool.length)];
    setHypeText(phrase);
    audio.play('hype');
    
    if (isBigExplosion) {
      setIsExploding(true);
      setTimeout(() => setIsExploding(false), 800);
    }
    
    setTimeout(() => setHypeText(null), 3000);
  };

  const handlePlayCard = (playerId: string, cardIds: string[], chosenColor?: CardColor, didCallUno?: boolean) => {
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const playerIndex = prev.players.findIndex(p => p.id === playerId);
      const player = prev.players[playerIndex];
      const playedCards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as Card[];
      if (playedCards.length === 0) return prev;
      
      let deck = [...prev.deck];
      let newHand = player.hand.filter(c => !cardIds.includes(c.id));

      if (newHand.length === 1 && !didCallUno) {
        const penalty = deck.splice(0, 2);
        newHand = [...newHand, ...penalty];
        audio.play('penalty');
        triggerHype('UNO_PENALTY');
        handleEphemeralReaction(playerId, undefined, "ESQUECI O UNO! 🤡");
      }

      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIndex] = { ...player, hand: newHand, hasCalledUno: didCallUno || false };

      let totalDraw = 0;
      let finalDir = prev.direction;
      let finalSkip = false;

      playedCards.forEach(c => {
        const { direction, skipNext, drawCount } = applyCardEffect(c, prev);
        totalDraw += drawCount;
        finalDir = direction;
        finalSkip = skipNext;
      });

      const lastPlayed = playedCards[playedCards.length - 1];
      
      const nextPlayerIdx = getNextPlayerIndex(prev.currentPlayerIndex, finalDir, prev.players.length);
      const nextPlayer = prev.players[nextPlayerIdx];

      // Detecção de +4 para explosão visual
      if (lastPlayed.type === CardType.WILD_DRAW_FOUR) {
        triggerHype('PLUS_4', true);
      } else if (lastPlayed.type === CardType.DRAW_TWO) {
        if (prev.pendingDrawCount > 0) triggerHype('STACKING');
        else triggerHype('PLUS_2');
      } else if (lastPlayed.type === CardType.REVERSE) {
        triggerHype('REVERSE');
      } else if (lastPlayed.type === CardType.SKIP) {
        triggerHype('SKIP');
      } else if (lastPlayed.type === CardType.WILD && chosenColor) {
        const hasColor = nextPlayer.hand.some(c => c.color === chosenColor || c.color === CardColor.WILD);
        if (!hasColor) triggerHype('FATAL_COLOR');
      }

      let nextPending = prev.pendingDrawCount + totalDraw;
      let nextIdx = nextPlayerIdx;
      
      if (finalSkip && nextPending === 0) {
        nextIdx = getNextPlayerIndex(nextIdx, finalDir, prev.players.length);
      }

      const newState: GameState = {
        ...prev,
        deck: deck.length > 0 ? deck : generateDeck(),
        players: updatedPlayers,
        discardPile: [...prev.discardPile, ...playedCards],
        direction: finalDir,
        currentPlayerIndex: nextIdx,
        currentColor: chosenColor || (lastPlayed.color === CardColor.WILD ? prev.currentColor : lastPlayed.color),
        pendingDrawCount: nextPending,
        turnStartTime: Date.now()
      };

      if (newHand.length === 0) {
        newState.status = GameStatus.FINISHED;
        newState.winner = updatedPlayers[playerIndex];
        audio.play('win_fanfare');
        triggerHype('WIN');
        audio.stopMusic();
      } else {
        audio.play('card_play');
      }

      gameStateRef.current = newState;
      return newState;
    });
  };

  const handleDrawCard = (playerId: string) => {
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const playerIndex = prev.players.findIndex(p => p.id === playerId);
      const player = prev.players[playerIndex];
      const deck = [...prev.deck];
      const count = Math.max(1, prev.pendingDrawCount);
      const drawn = deck.splice(0, count);
      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIndex] = { ...player, hand: [...player.hand, ...drawn], hasCalledUno: false };
      const nextIdx = getNextPlayerIndex(prev.currentPlayerIndex, prev.direction, prev.players.length);
      const newState: GameState = {
        ...prev,
        players: updatedPlayers,
        deck: deck.length > 0 ? deck : generateDeck(),
        pendingDrawCount: 0,
        currentPlayerIndex: nextIdx,
        turnStartTime: Date.now()
      };
      audio.play('card_draw');
      gameStateRef.current = newState;
      return newState;
    });
  };

  const handleEphemeralReaction = (playerId: string, reaction?: string, voicePhrase?: string) => {
    if (voicePhrase === "UNO!") triggerHype('UNO_CALL');
    setReactions(prev => ({ ...prev, [playerId]: { playerId, reaction, voicePhrase, timestamp: Date.now() } }));
    setTimeout(() => {
      setReactions(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }, 4000);
  };

  const cancelMatchmaking = () => {
    if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
    setIsMatchmaking(false);
    audio.play('click');
  };

  const createRoom = async (settings: GameSettings, invitedPlayer?: OnlinePresence) => {
    if (settings.mode === GameMode.RANKED && !invitedPlayer) {
      setIsMatchmaking(true);
      matchmakingTimeoutRef.current = setTimeout(() => {
        finalizeRoomCreation(settings);
      }, 2500);
    } else {
      finalizeRoomCreation(settings, invitedPlayer);
    }
  };

  const finalizeRoomCreation = (settings: GameSettings, invitedPlayer?: OnlinePresence) => {
    const deck = generateDeck();
    const host: Player = { ...playerProfile, id: localPlayerId!, hand: [], isHost: true, isBot: false, score: 0, hasCalledUno: false, rank: getRankFromMMR(playerProfile.mmr) };
    const players: Player[] = [host];
    
    if (invitedPlayer) {
      players.push({ 
        ...invitedPlayer, hand: [], isHost: false, isBot: true, score: 0, level: 1, xp: 0, mmr: 1000, coins: 0, inventory: [], equippedSkin: 'default', equippedTable: 'default', equippedBadge: 'default', equippedEffect: 'none', equippedAvatarSkin: 'default', equippedFrame: 'default', stats: {wins:0,losses:0,totalGames:0,totalCardsPlayed:0,unosCalled:0,highestMMR:1000}, achievements: [], hasCalledUno: false 
      } as any);
    }

    const count = settings.mode === GameMode.RANKED ? (invitedPlayer ? 2 : 3) : settings.botCount;
    for (let i = 0; i < count; i++) {
      players.push({ 
        id: `opponent-${i}-${Math.random()}`, name: settings.mode === GameMode.RANKED ? `Pro_${Math.floor(Math.random()*999)}` : `Bot ${i+1}`, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)], hand: [], isHost: false, isBot: true, score: 0, level: 1, xp: 0, mmr: 1000, coins: 0, rank: 'Bronze III', inventory: [], equippedSkin: 'default', equippedTable: 'default', equippedBadge: 'default', equippedEffect: 'none', equippedAvatarSkin: 'default', equippedFrame: 'default', stats: {wins:0,losses:0,totalGames:0,totalCardsPlayed:0,unosCalled:0,highestMMR:1000}, achievements: [], hasCalledUno: false 
      });
    }

    const state: GameState = { 
      id: Math.random().toString(36).substring(7), players, status: GameStatus.LOBBY, deck, discardPile: [], currentPlayerIndex: 0, direction: 1, currentColor: CardColor.RED, winner: null, settings, turnStartTime: Date.now(), pendingDrawCount: 0 
    };
    
    setGameState(state);
    gameStateRef.current = state;
    setIsMatchmaking(false);
    setCurrentView(AppView.GAME);
  };

  const startGame = () => {
    setGameState(prev => {
      if (!prev) return null;
      const deck = [...prev.deck];
      const players = prev.players.map(p => ({ ...p, hand: deck.splice(0, prev.settings.initialCardsCount) }));
      let first = deck.pop()!;
      while (first.type === CardType.WILD || first.type === CardType.WILD_DRAW_FOUR) {
        deck.unshift(first);
        first = deck.pop()!;
      }
      const state = { ...prev, players, deck, discardPile: [first], status: GameStatus.PLAYING, currentColor: first.color, turnStartTime: Date.now() };
      gameStateRef.current = state;
      audio.startMusic(); 
      return state;
    });
  };

  useEffect(() => {
    if (gameState?.status === GameStatus.PLAYING) {
      const p = gameState.players[gameState.currentPlayerIndex];
      if (p?.isBot) {
        const t = setTimeout(() => {
          const card = p.hand.find(c => isMoveValid(c, gameState, p.hand));
          if (card) {
            const color = card.color === CardColor.WILD ? [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW][Math.floor(Math.random()*4)] : undefined;
            handlePlayCard(p.id, [card.id], color, p.hand.length === 2);
          } else {
            handleDrawCard(p.id);
          }
        }, 1500);
        return () => clearTimeout(t);
      }
    }
  }, [gameState?.currentPlayerIndex, gameState?.status]);

  if (isLoading) return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-brand text-yellow-500">
      <div className="w-20 h-20 border-t-4 border-yellow-500 rounded-full animate-spin"></div>
    </div>
  );

  if (isMatchmaking) return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-brand p-6">
      <div className="relative w-40 h-40 mb-10">
        <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-yellow-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">⚔️</div>
      </div>
      <h2 className="text-3xl text-yellow-500 italic mb-2">BUSCANDO OPONENTES</h2>
      <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-12">Filtrando por MMR: {playerProfile.mmr}</p>
      <button onClick={cancelMatchmaking} className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-brand text-sm hover:bg-red-600/20 hover:text-red-500 transition-all active:scale-95">CANCELAR BUSCA</button>
    </div>
  );

  return (
    <div className={`h-screen w-screen overflow-hidden bg-black text-white select-none ${isExploding ? 'shake-active flash-active' : ''}`}>
      {isExploding && <div className="plus4-shockwave"></div>}
      {hypeText && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center pointer-events-none p-4 overflow-hidden">
           <div className={`animate-scale-in text-center transform ${isExploding ? 'scale-150' : 'scale-125'}`}>
              <h2 className="text-5xl lg:text-9xl font-brand italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-orange-600 drop-shadow-[0_0_40px_rgba(234,179,8,1)] uppercase tracking-tighter leading-none -rotate-3 animate-pulse">
                {hypeText}
              </h2>
           </div>
        </div>
      )}
      {currentView === AppView.LOGIN && <Login onLogin={(n, a) => { setPlayerProfile({...playerProfile, name: n, avatar: a}); setCurrentView(AppView.PROFILE); }} />}
      {currentView === AppView.PROFILE && <Profile profile={{...playerProfile, rank: getRankFromMMR(playerProfile.mmr)}} onNavigate={setCurrentView} onUpdateProfile={(u) => setPlayerProfile({...playerProfile, ...u})} missions={[]} />}
      {currentView === AppView.LOBBY && <Lobby onBack={() => setCurrentView(AppView.PROFILE)} onCreateRoom={createRoom} onJoinRoom={(id) => setCurrentView(AppView.GAME)} onlinePlayers={Object.values(onlinePlayers)} />}
      {currentView === AppView.RANKING && <Ranking onBack={() => setCurrentView(AppView.PROFILE)} currentMMR={playerProfile.mmr} />}
      {currentView === AppView.STORE && <Store profile={playerProfile} onUpdate={(u) => setPlayerProfile({...playerProfile, ...u})} onClose={() => setCurrentView(AppView.PROFILE)} />}
      {currentView === AppView.INTEL && <IntelHub onBack={() => setCurrentView(AppView.PROFILE)} />}
      {currentView === AppView.GAME && gameState && (
        <GameTable 
          gameState={gameState} localPlayerId={localPlayerId!} reactions={reactions} equippedSkin={playerProfile.equippedSkin}
          onPlayCard={handlePlayCard} onDrawCard={handleDrawCard} onTimeout={handleDrawCard} onStartGame={startGame}
          onCallUno={(pid) => handleEphemeralReaction(pid, undefined, "UNO!")}
          onSendReaction={handleEphemeralReaction} onSendVoice={(pid, v) => handleEphemeralReaction(pid, undefined, v)}
          onLeaveRoom={() => { setGameState(null); setCurrentView(AppView.PROFILE); audio.stopMusic(); }}
          onlinePlayers={Object.values(onlinePlayers)}
        />
      )}
      {gameState?.status === GameStatus.FINISHED && <GameOver winner={gameState.winner!} mode={gameState.settings.mode} onRestart={() => { setGameState(null); setCurrentView(AppView.PROFILE); }} />}
    </div>
  );
};

export default App;
