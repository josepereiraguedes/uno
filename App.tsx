
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
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);

  const gameStateRef = useRef<GameState | null>(null);

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
      if (playerProfile.name || remote?.name) setCurrentView(AppView.PROFILE);
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

  // ENGINE DE BOTS COM SINCRONIZAÇÃO DE REF
  useEffect(() => {
    if (gameState?.status === GameStatus.PLAYING) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer?.isBot) {
        const timer = setTimeout(() => {
          const currentState = gameStateRef.current;
          if (!currentState || currentState.status !== GameStatus.PLAYING) return;

          const playableCards = currentPlayer.hand.filter(c => isMoveValid(c, currentState, currentPlayer.hand));
          
          if (playableCards.length > 0) {
            const nextIdx = getNextPlayerIndex(currentState.currentPlayerIndex, currentState.direction, currentState.players.length);
            const nextPlayer = currentState.players[nextIdx];
            
            let cardToPlay = playableCards[0];
            if (nextPlayer.hand.length <= 2) {
              const actionCard = playableCards.find(c => c.type === CardType.WILD_DRAW_FOUR || c.type === CardType.DRAW_TWO || c.type === CardType.SKIP);
              if (actionCard) cardToPlay = actionCard;
            }

            const chosenColor = (cardToPlay.color === CardColor.WILD || cardToPlay.type === CardType.WILD_DRAW_FOUR)
              ? [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW][Math.floor(Math.random() * 4)] 
              : undefined;
            
            const willCallUno = currentPlayer.hand.length === 2 && Math.random() > 0.2;
            handlePlayCard(currentPlayer.id, [cardToPlay.id], chosenColor, willCallUno);
          } else {
            handleDrawCard(currentPlayer.id);
          }
        }, 1200 + Math.random() * 600);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.currentPlayerIndex, gameState?.status, gameState?.id]);

  const handleEphemeralReaction = (playerId: string, reaction?: string, voicePhrase?: string) => {
    const timestamp = Date.now();
    setReactions(prev => ({
      ...prev,
      [playerId]: { playerId, reaction, voicePhrase, timestamp }
    }));
    setTimeout(() => {
      setReactions(prev => {
        const current = prev[playerId];
        if (current && current.timestamp === timestamp) {
          const next = { ...prev };
          delete next[playerId];
          return next;
        }
        return prev;
      });
    }, 3000);
  };

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

  const updateProfilePostGame = (winnerId: string, isRanked: boolean) => {
    const isWinner = localPlayerId === winnerId;
    const mmrChange = isRanked ? (isWinner ? 25 : -15) : 0;
    const coinsChange = isWinner ? 50 : 10;

    setPlayerProfile((prev: any) => {
      const newMMR = Math.max(0, (prev.mmr || 1000) + mmrChange);
      const newCoins = (prev.coins || 0) + coinsChange;
      const newStats = {
        ...prev.stats,
        wins: isWinner ? (prev.stats.wins + 1) : prev.stats.wins,
        losses: !isWinner ? (prev.stats.losses + 1) : prev.stats.losses,
        totalGames: (prev.stats.totalGames || 0) + 1,
        highestMMR: Math.max(prev.stats.highestMMR || 0, newMMR)
      };

      const updated = { ...prev, mmr: newMMR, coins: newCoins, stats: newStats, rank: getRankFromMMR(newMMR) };
      if (localPlayerId) syncProfile(localPlayerId, updated);
      return updated;
    });
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
      
      if (lastPlayed.type === CardType.WILD_DRAW_FOUR) triggerHype('PLUS_4', true);
      else if (lastPlayed.type === CardType.DRAW_TWO) triggerHype('PLUS_2');
      else if (lastPlayed.type === CardType.REVERSE) triggerHype('REVERSE');
      else if (lastPlayed.type === CardType.SKIP) triggerHype('SKIP');

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
        updateProfilePostGame(updatedPlayers[playerIndex].id, prev.settings.mode === GameMode.RANKED);
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

  const handleCreateRoom = (settings: GameSettings, invitedPlayer?: OnlinePresence) => {
    const deck = generateDeck();
    const players: Player[] = [{
      ...playerProfile,
      id: localPlayerId!,
      isHost: true,
      isBot: false,
      hand: [],
      score: 0,
      hasCalledUno: false,
      rank: getRankFromMMR(playerProfile.mmr || 1000)
    }];

    if (invitedPlayer) {
      players.push({
        ...invitedPlayer,
        isBot: invitedPlayer.id.startsWith('sim-'),
        hand: [], isHost: false, score: 0, hasCalledUno: false, mmr: 1000, level: 1, xp: 0, coins: 0, inventory: [], equippedSkin: 'default', equippedTable: 'default', equippedBadge: 'default', equippedEffect: 'none', equippedAvatarSkin: 'default', equippedFrame: 'default', stats: {wins:0,losses:0,totalGames:0,totalCardsPlayed:0,unosCalled:0,highestMMR:1000}, achievements: []
      } as any);
    }

    if (settings.mode === GameMode.NORMAL) {
      const botsNeeded = settings.botCount - (invitedPlayer ? 1 : 0);
      for (let i = 0; i < botsNeeded; i++) {
        players.push({
          id: `bot-${i}-${Math.random()}`,
          name: `Bot ${i + 1}`,
          avatar: AVATARS[i % AVATARS.length],
          hand: [], isHost: false, isBot: true, score: 0, level: 1, xp: 0, mmr: 1000, coins: 0, rank: 'Bronze III', inventory: [], equippedSkin: 'default', equippedTable: 'default', equippedBadge: 'default', equippedEffect: 'none', equippedAvatarSkin: 'default', equippedFrame: 'default', stats: { wins: 0, losses: 0, totalGames: 0, totalCardsPlayed: 0, unosCalled: 0, highestMMR: 1000 }, achievements: [], hasCalledUno: false
        });
      }
    }

    const firstCard = deck.shift()!;
    const initialState: GameState = {
      id: Math.random().toString(36).substring(7),
      players,
      status: GameStatus.LOBBY,
      deck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      direction: 1,
      currentColor: firstCard.color === CardColor.WILD ? CardColor.RED : firstCard.color,
      winner: null,
      settings,
      turnStartTime: Date.now(),
      pendingDrawCount: 0
    };
    setGameState(initialState);
    gameStateRef.current = initialState;
    setCurrentView(AppView.GAME);
  };

  const handleStartGame = () => {
    setGameState(prev => {
      if (!prev) return null;
      const deck = [...prev.deck];
      const updatedPlayers = prev.players.map(p => ({
        ...p,
        hand: deck.splice(0, prev.settings.initialCardsCount)
      }));
      
      const newState = { ...prev, players: updatedPlayers, deck, status: GameStatus.PLAYING, turnStartTime: Date.now() };
      gameStateRef.current = newState;
      return newState;
    });
    audio.play('click');
    audio.startMusic();
  };

  const handleLeaveRoom = () => {
    setGameState(null);
    gameStateRef.current = null;
    setCurrentView(AppView.PROFILE);
    audio.stopMusic();
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center font-brand text-yellow-500">CONECTANDO...</div>;

  return (
    <div className={`h-screen w-screen overflow-hidden bg-black text-white select-none ${isExploding ? 'shake-active' : ''}`}>
      {currentView === AppView.LOGIN && <Login onLogin={(n, a) => { setPlayerProfile({...playerProfile, name: n, avatar: a}); setCurrentView(AppView.PROFILE); }} />}
      {currentView === AppView.PROFILE && <Profile profile={{...playerProfile, rank: getRankFromMMR(playerProfile.mmr)}} onNavigate={setCurrentView} onUpdateProfile={(u) => setPlayerProfile({...playerProfile, ...u})} missions={[]} />}
      {currentView === AppView.LOBBY && <Lobby onBack={() => setCurrentView(AppView.PROFILE)} onCreateRoom={handleCreateRoom} onJoinRoom={() => {}} onlinePlayers={Object.values(onlinePlayers)} />}
      {currentView === AppView.GAME && gameState && (
        <GameTable 
          gameState={gameState} localPlayerId={localPlayerId!} reactions={reactions} equippedSkin={playerProfile.equippedSkin}
          onPlayCard={handlePlayCard} onDrawCard={handleDrawCard} onTimeout={handleDrawCard} onStartGame={handleStartGame}
          onCallUno={(pid) => handleEphemeralReaction(pid, undefined, "UNO!")}
          onSendReaction={(pid, r) => handleEphemeralReaction(pid, r)} 
          onSendVoice={(pid, v) => handleEphemeralReaction(pid, undefined, v)}
          onLeaveRoom={handleLeaveRoom}
          onlinePlayers={Object.values(onlinePlayers)}
        />
      )}
      {currentView === AppView.RANKING && <Ranking onBack={() => setCurrentView(AppView.PROFILE)} currentMMR={playerProfile.mmr} />}
      {currentView === AppView.STORE && <Store profile={playerProfile} onUpdate={(u) => setPlayerProfile({...playerProfile, ...u})} onClose={() => setCurrentView(AppView.PROFILE)} />}
      {currentView === AppView.INTEL && <IntelHub onBack={() => setCurrentView(AppView.PROFILE)} />}
      
      {gameState?.status === GameStatus.FINISHED && <GameOver winner={gameState.winner!} mode={gameState.settings.mode} onRestart={handleLeaveRoom} />}

      {hypeText && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center pointer-events-none p-4">
           <div className={`animate-scale-in text-center ${isExploding ? 'scale-150' : 'scale-110'}`}>
              <h2 className="text-5xl lg:text-9xl font-brand italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-orange-600 drop-shadow-[0_0_30px_rgba(234,179,8,1)] uppercase leading-none -rotate-2">
                {hypeText}
              </h2>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
