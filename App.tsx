
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStatus, Player, Card, CardColor, CardType, GameSettings, GameMode, AppView, OnlinePresence, EphemeralReaction } from './types';
import { generateDeck, AVATARS } from './constants';
import { isMoveValid, getNextPlayerIndex, applyCardEffect, getRankFromMMR, calculateMMRGain } from './engine/unoLogic';
import { audio } from './services/audioService';
import { supabase, syncProfile, fetchProfile } from './services/supabase';
import Login from './components/Login';
import Profile from './components/Profile';
import Ranking from './components/Ranking';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import GameOver from './components/GameOver';
import Store from './components/Store';

const networkChannel = new BroadcastChannel('uno_arena_network');

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePresence>>({});
  const [reactions, setReactions] = useState<Record<string, EphemeralReaction>>({});
  
  const gameStateRef = useRef<GameState | null>(null);

  const [playerProfile, setPlayerProfile] = useState<any>({
    name: localStorage.getItem('uno_name') || '',
    avatar: localStorage.getItem('uno_avatar') || AVATARS[0],
    mmr: Number(localStorage.getItem('uno_mmr') || 1000),
    coins: Number(localStorage.getItem('uno_coins') || 500),
    level: Number(localStorage.getItem('uno_level') || 1),
    xp: Number(localStorage.getItem('uno_xp') || 0),
    inventory: JSON.parse(localStorage.getItem('uno_inventory') || '["default_skin"]'),
    equippedSkin: localStorage.getItem('uno_skin') || 'default',
    stats: JSON.parse(localStorage.getItem('uno_stats') || '{"wins":0,"losses":0,"totalGames":0,"totalCardsPlayed":0,"unosCalled":0,"highestMMR":1000}'),
    history: JSON.parse(localStorage.getItem('uno_history') || '[]'),
    achievements: JSON.parse(localStorage.getItem('uno_achievements') || '[]')
  });

  // Inicializar Player ID e carregar do Supabase
  useEffect(() => {
    const init = async () => {
      let savedId = localStorage.getItem('uno_player_id');
      if (!savedId) {
        savedId = Math.random().toString(36).substring(7);
        localStorage.setItem('uno_player_id', savedId);
      }
      setLocalPlayerId(savedId);

      // Tentar carregar perfil remoto
      const remoteProfile = await fetchProfile(savedId);
      if (remoteProfile) {
        setPlayerProfile(remoteProfile);
        setCurrentView(AppView.PROFILE);
      } else if (playerProfile.name) {
        setCurrentView(AppView.PROFILE);
      }
    };
    init();
  }, []);

  // Sincronizar sempre que o perfil mudar (com debounce)
  useEffect(() => {
    if (!localPlayerId || !playerProfile.name) return;
    
    const timeout = setTimeout(() => {
      syncProfile(localPlayerId, playerProfile);
      
      // Backup local
      localStorage.setItem('uno_name', playerProfile.name);
      localStorage.setItem('uno_avatar', playerProfile.avatar);
      localStorage.setItem('uno_mmr', String(playerProfile.mmr));
      localStorage.setItem('uno_coins', String(playerProfile.coins));
      localStorage.setItem('uno_level', String(playerProfile.level));
      localStorage.setItem('uno_xp', String(playerProfile.xp));
      localStorage.setItem('uno_inventory', JSON.stringify(playerProfile.inventory));
      localStorage.setItem('uno_stats', JSON.stringify(playerProfile.stats));
      localStorage.setItem('uno_history', JSON.stringify(playerProfile.history));
      localStorage.setItem('uno_achievements', JSON.stringify(playerProfile.achievements));
      localStorage.setItem('uno_skin', playerProfile.equippedSkin);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [playerProfile, localPlayerId]);

  useEffect(() => {
    const presenceInterval = setInterval(() => {
      if (localPlayerId && playerProfile.name) {
        networkChannel.postMessage({
          type: 'PRESENCE_PING',
          senderId: localPlayerId,
          payload: {
            id: localPlayerId,
            name: playerProfile.name,
            avatar: playerProfile.avatar,
            rank: getRankFromMMR(playerProfile.mmr),
            lastSeen: Date.now(),
            currentRoomId: (gameState?.status === GameStatus.LOBBY) ? gameState.id : undefined
          }
        });
      }
      setOnlinePlayers(prev => {
        const now = Date.now();
        const filtered = { ...prev };
        let changed = false;
        Object.keys(filtered).forEach(id => {
          if (now - filtered[id].lastSeen > 5000) { delete filtered[id]; changed = true; }
        });
        return changed ? filtered : prev;
      });
    }, 2000);

    const handleMessage = (event: MessageEvent) => {
      const { type, payload, senderId } = event.data;
      if (senderId === localPlayerId) return;

      switch (type) {
        case 'PRESENCE_PING': setOnlinePlayers(prev => ({ ...prev, [senderId]: payload })); break;
        case 'SYNC_STATE': setGameState(payload); break;
        case 'PLAYER_JOINED': 
          if (gameStateRef.current?.players[0].id === localPlayerId) {
            setGameState(prev => {
              if (!prev || prev.players.find(p => p.id === payload.id)) return prev;
              return { ...prev, players: [...prev.players, payload] };
            });
          }
          break;
        case 'PLAYER_LEFT':
          if (gameStateRef.current?.players[0].id === localPlayerId) {
            setGameState(prev => prev ? ({...prev, players: prev.players.filter(p => p.id !== senderId)}) : null);
          } else if (senderId === gameStateRef.current?.players[0].id) {
            setGameState(null);
            setCurrentView(AppView.PROFILE);
          }
          break;
        case 'PLAYER_ACTION':
          if (gameStateRef.current?.players[0].id === localPlayerId) processRemoteAction(payload);
          break;
        case 'REACTION':
          handleEphemeralReaction(senderId, payload.reaction, payload.voicePhrase);
          break;
      }
    };

    networkChannel.addEventListener('message', handleMessage);
    return () => { clearInterval(presenceInterval); networkChannel.removeEventListener('message', handleMessage); };
  }, [localPlayerId, playerProfile, gameState]);

  const handleEphemeralReaction = (pid: string, reaction?: string, voicePhrase?: string) => {
    if (voicePhrase) audio.speak(voicePhrase);
    setReactions(prev => ({
      ...prev,
      [pid]: { playerId: pid, reaction, voicePhrase, timestamp: Date.now() }
    }));
    setTimeout(() => {
      setReactions(prev => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    }, 3000);
  };

  const processRemoteAction = (action: any) => {
    if (action.type === 'PLAY') handlePlayCard(action.playerId, action.cardIds, action.chosenColor, action.didCallUno);
    if (action.type === 'DRAW') handleDrawCard(action.playerId);
    if (action.type === 'TIMEOUT') handleTimeout(action.playerId);
    if (action.type === 'START') startGame();
  };

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState && gameState.players[0].id === localPlayerId) {
      networkChannel.postMessage({ type: 'SYNC_STATE', payload: gameState, senderId: localPlayerId });
    }
  }, [gameState]);

  const handleWin = (winner: Player) => {
    if (winner.id === localPlayerId) {
      const mmrGain = calculateMMRGain(true, gameStateRef.current!);
      const xpGain = 150;
      const coinGain = 75;
      
      setPlayerProfile((prev: any) => {
        let newXp = prev.xp + xpGain;
        let newLevel = prev.level;
        if (newXp >= prev.level * 500) {
          newXp -= prev.level * 500;
          newLevel++;
          audio.play('win_fanfare');
        }
        return {
          ...prev,
          mmr: prev.mmr + mmrGain,
          xp: newXp,
          level: newLevel,
          coins: prev.coins + coinGain,
          stats: {
            ...prev.stats,
            wins: prev.stats.wins + 1,
            totalGames: prev.stats.totalGames + 1,
            highestMMR: Math.max(prev.stats.highestMMR, prev.mmr + mmrGain)
          },
          history: [{ date: Date.now(), result: 'WIN', mmr: mmrGain, coins: coinGain }, ...prev.history].slice(0, 10)
        };
      });
    } else if (!winner.isBot && gameStateRef.current?.players.find(p => p.id === localPlayerId)) {
       const mmrLoss = calculateMMRGain(false, gameStateRef.current!);
       setPlayerProfile((prev: any) => ({
         ...prev,
         mmr: Math.max(0, prev.mmr + mmrLoss),
         stats: { ...prev.stats, losses: prev.stats.losses + 1, totalGames: prev.stats.totalGames + 1 },
         history: [{ date: Date.now(), result: 'LOSS', mmr: mmrLoss, coins: 0 }, ...prev.history].slice(0, 10)
       }));
    }
  };

  const createRoom = (settings: GameSettings) => {
    const host: Player = { 
      ...playerProfile, 
      id: localPlayerId!, 
      hand: [], 
      isHost: true, 
      isBot: false, 
      rank: getRankFromMMR(playerProfile.mmr),
      hasCalledUno: false 
    } as any;
    
    let players = [host];
    if (settings.mode === GameMode.NORMAL && settings.botCount > 0) {
      for (let i = 0; i < settings.botCount; i++) {
        players.push({ id: `bot-${i}`, name: `Bot ${i + 1}`, avatar: AVATARS[i % AVATARS.length], hand: [], isBot: true, rank: 'Bronze III', hasCalledUno: false } as any);
      }
    }
    setGameState({
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      players,
      status: GameStatus.LOBBY,
      deck: generateDeck(),
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1,
      currentColor: CardColor.RED,
      winner: null,
      settings,
      turnStartTime: Date.now(),
      pendingDrawCount: 0
    });
    setCurrentView(AppView.GAME);
  };

  const handlePlayCard = (playerId: string, cardIds: string[], chosenColor?: CardColor, didCallUno?: boolean) => {
    if (gameStateRef.current?.players[0].id !== localPlayerId) {
        networkChannel.postMessage({ type: 'PLAYER_ACTION', payload: { type: 'PLAY', playerId, cardIds, chosenColor, didCallUno }, senderId: localPlayerId });
        return;
    }
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.currentPlayerIndex;
      const player = { ...prev.players[pIdx] };
      const cardsToPlay = cardIds.map(id => player.hand.find(c => c.id === id)).filter((c): c is Card => !!c);
      let newHand = player.hand.filter(c => !cardIds.includes(c.id));
      let currentDir = prev.direction;
      let newPendingDraw = prev.pendingDrawCount;
      let totalSkips = 0;

      cardsToPlay.forEach(card => {
        const effect = applyCardEffect(card, { ...prev, direction: currentDir });
        currentDir = effect.direction;
        if (effect.drawCount) newPendingDraw += effect.drawCount;
        if (effect.skipNext) totalSkips++;
      });

      if (newHand.length === 0) {
        handleWin(player);
        return { ...prev, status: GameStatus.FINISHED, winner: { ...player, hand: [] } };
      }

      let nextIdx = pIdx;
      const skipCount = totalSkips > 0 ? totalSkips + 1 : 1;
      for (let i = 0; i < skipCount; i++) nextIdx = getNextPlayerIndex(nextIdx, currentDir, prev.players.length);
      
      const lastCard = cardsToPlay[cardsToPlay.length - 1];
      return { 
        ...prev, 
        players: prev.players.map((p, i) => i === pIdx ? { ...p, hand: newHand, hasCalledUno: !!didCallUno } : p), 
        discardPile: [...prev.discardPile, ...cardsToPlay], 
        currentColor: lastCard.color === CardColor.WILD ? (chosenColor || prev.currentColor) : lastCard.color, 
        currentPlayerIndex: nextIdx, 
        direction: currentDir, 
        pendingDrawCount: newPendingDraw, 
        turnStartTime: Date.now() 
      };
    });
  };

  const handleDrawCard = (playerId: string) => {
    if (gameStateRef.current?.players[0].id !== localPlayerId) {
        networkChannel.postMessage({ type: 'PLAYER_ACTION', payload: { type: 'DRAW', playerId }, senderId: localPlayerId });
        return;
    }
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.currentPlayerIndex;
      let deck = [...prev.deck];
      if (deck.length < 5) deck = [...deck, ...generateDeck()];
      const player = { ...prev.players[pIdx], hasCalledUno: false };
      const drawAmount = prev.pendingDrawCount > 0 ? prev.pendingDrawCount : 1;
      player.hand = [...player.hand, ...deck.splice(0, drawAmount)];
      return { 
        ...prev, 
        players: prev.players.map((p, i) => i === pIdx ? player : p), 
        deck, 
        pendingDrawCount: 0, 
        currentPlayerIndex: getNextPlayerIndex(pIdx, prev.direction, prev.players.length), 
        turnStartTime: Date.now() 
      };
    });
  };

  const startGame = () => {
    if (!gameState) return;
    if (gameState.players[0].id !== localPlayerId) {
        networkChannel.postMessage({ type: 'PLAYER_ACTION', payload: { type: 'START' }, senderId: localPlayerId });
        return;
    }
    setGameState(prev => {
      if (!prev) return null;
      let deck = [...prev.deck];
      const players = prev.players.map(p => ({ ...p, hand: deck.splice(0, prev.settings.initialCardsCount) }));
      const initialCard = deck.splice(0, 1)[0];
      return { ...prev, players, deck, discardPile: [initialCard], status: GameStatus.PLAYING, currentColor: initialCard.color === CardColor.WILD ? CardColor.RED : initialCard.color, turnStartTime: Date.now() };
    });
  };

  const joinRoom = (roomId: string) => {
    const host = Object.values(onlinePlayers).find(p => p.currentRoomId === roomId);
    if (host) {
      networkChannel.postMessage({ 
        type: 'PLAYER_JOINED', 
        senderId: localPlayerId!, 
        payload: { ...playerProfile, id: localPlayerId!, hand: [], isHost: false, isBot: false, rank: getRankFromMMR(playerProfile.mmr), hasCalledUno: false } 
      });
      setCurrentView(AppView.GAME);
    }
  };

  const handleTimeout = (playerId: string) => { if (gameStateRef.current?.players[0].id === localPlayerId) handleDrawCard(playerId); };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#022c22] overflow-hidden text-white font-sans select-none">
      {currentView === AppView.LOGIN && <Login onLogin={(n, a) => { setPlayerProfile({...playerProfile, name: n, avatar: a}); setCurrentView(AppView.PROFILE); audio.startMusic(); }} />}
      {currentView === AppView.PROFILE && <Profile profile={{...playerProfile, rank: getRankFromMMR(playerProfile.mmr)}} onNavigate={setCurrentView} onUpdateAvatar={(a) => setPlayerProfile({...playerProfile, avatar: a})} />}
      {currentView === AppView.LOBBY && <Lobby onBack={() => setCurrentView(AppView.PROFILE)} onCreateRoom={createRoom} onJoinRoom={joinRoom} onlinePlayers={Object.values(onlinePlayers)} />}
      {currentView === AppView.RANKING && <Ranking onBack={() => setCurrentView(AppView.PROFILE)} currentMMR={playerProfile.mmr} />}
      {currentView === AppView.STORE && <Store profile={playerProfile} onUpdate={(upd) => setPlayerProfile({...playerProfile, ...upd})} onClose={() => setCurrentView(AppView.PROFILE)} />}
      
      {currentView === AppView.GAME && gameState && gameState.status !== GameStatus.FINISHED && (
        <GameTable 
            gameState={gameState} 
            localPlayerId={localPlayerId!} 
            reactions={reactions}
            onPlayCard={handlePlayCard} 
            onDrawCard={handleDrawCard} 
            onTimeout={handleTimeout}
            onStartGame={startGame}
            onCallUno={(pid) => {
              handleEphemeralReaction(pid, undefined, "UNO!");
              setGameState(p => p ? ({...p, players: p.players.map(pl => pl.id === pid ? {...pl, hasCalledUno: true} : pl)}) : null);
            }}
            onSendReaction={(pid, r) => {
              handleEphemeralReaction(pid, r);
              networkChannel.postMessage({ type: 'REACTION', payload: { reaction: r }, senderId: localPlayerId! });
            }}
            onSendVoice={(pid, v) => {
              handleEphemeralReaction(pid, undefined, v);
              networkChannel.postMessage({ type: 'REACTION', payload: { voicePhrase: v }, senderId: localPlayerId! });
            }}
            onLeaveRoom={() => { networkChannel.postMessage({type:'PLAYER_LEFT', senderId:localPlayerId!}); setGameState(null); setCurrentView(AppView.PROFILE); }}
            onlinePlayers={Object.values(onlinePlayers)}
        />
      )}

      {gameState && gameState.status === GameStatus.FINISHED && gameState.winner && (
        <GameOver winner={gameState.winner} mode={gameState.settings.mode} onRestart={() => { setGameState(null); setCurrentView(AppView.PROFILE); }} />
      )}
    </div>
  );
};

export default App;
