
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStatus, Player, Card, CardColor, CardType, GameSettings, GameMode, AppView, OnlinePresence, EphemeralReaction } from './types';
import { generateDeck, AVATARS } from './constants';
import { isMoveValid, getNextPlayerIndex, applyCardEffect, getRankFromMMR } from './engine/unoLogic';
import { audio } from './services/audioService';
import { supabase, syncProfile, fetchProfile } from './services/supabase';
import Login from './components/Login';
import Profile from './components/Profile';
import Ranking from './components/Ranking';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import GameOver from './components/GameOver';
import Store from './components/Store';

let lobbyChannel: any = null;
let roomChannel: any = null;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePresence>>({});
  const [reactions, setReactions] = useState<Record<string, EphemeralReaction>>({});
  const [isLoading, setIsLoading] = useState(true);
  
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

  // IA DOS BOTS
  useEffect(() => {
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHost = gameState.players[0]?.id === localPlayerId;
    if (currentPlayer && currentPlayer.isBot && isHost) {
      const botThinkTime = Math.random() * 1500 + 1500;
      const timeout = setTimeout(() => {
        const latestState = gameStateRef.current;
        if (!latestState || latestState.players[latestState.currentPlayerIndex]?.id !== currentPlayer.id) return;
        const validCards = currentPlayer.hand.filter(c => isMoveValid(c, latestState));
        if (validCards.length > 0) {
          const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
          let chosenColor: CardColor | undefined;
          if (cardToPlay.color === CardColor.WILD) {
            const colorCounts: any = {};
            currentPlayer.hand.forEach(c => { if(c.color !== CardColor.WILD) colorCounts[c.color] = (colorCounts[c.color] || 0) + 1; });
            chosenColor = (Object.keys(colorCounts).reduce((a, b) => (colorCounts[a] || 0) > (colorCounts[b] || 0) ? a : b, CardColor.RED)) as CardColor;
          }
          handlePlayCard(currentPlayer.id, [cardToPlay.id], chosenColor, currentPlayer.hand.length === 2);
        } else {
          handleDrawCard(currentPlayer.id);
        }
      }, botThinkTime);
      return () => clearTimeout(timeout);
    }
  }, [gameState?.currentPlayerIndex, gameState?.status, localPlayerId]);

  useEffect(() => {
    if (localPlayerId && playerProfile.name) {
      syncProfile(localPlayerId, playerProfile);
      localStorage.setItem('uno_name', playerProfile.name);
      localStorage.setItem('uno_avatar', playerProfile.avatar);
      localStorage.setItem('uno_mmr', playerProfile.mmr.toString());
      localStorage.setItem('uno_coins', playerProfile.coins.toString());
      localStorage.setItem('uno_skin', playerProfile.equippedSkin);
    }
  }, [playerProfile]);

  useEffect(() => {
    const init = async () => {
      let savedId = localStorage.getItem('uno_player_id');
      if (!savedId) {
        savedId = Math.random().toString(36).substring(7);
        localStorage.setItem('uno_player_id', savedId);
      }
      setLocalPlayerId(savedId);
      const remote = await fetchProfile(savedId);
      if (remote) setPlayerProfile({ ...remote, equippedSkin: remote.equipped_skin || 'default' });
      if (remote?.name || playerProfile.name) setCurrentView(AppView.PROFILE);
      setIsLoading(false);
    };
    init();
  }, []);

  // LOBBY & PRESENCE
  useEffect(() => {
    if (!localPlayerId || !playerProfile.name) return;
    const channel = supabase.channel('uno_lobby', { config: { presence: { key: localPlayerId } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const presences: any = {};
      Object.keys(state).forEach(key => { presences[key] = (state[key] as any)[0]; });
      setOnlinePlayers(presences);
    }).on('broadcast', { event: 'player_joined_request' }, ({ payload }) => {
      const currentRoom = gameStateRef.current;
      // Somente o Host processa o pedido de entrada
      if (currentRoom && currentRoom.id === payload.roomId && currentRoom.players[0].id === localPlayerId) {
         setGameState(prev => {
           if (!prev || prev.players.find(p => p.id === payload.id)) return prev;
           const newPlayers = [...prev.players, payload];
           const newState = { ...prev, players: newPlayers };
           // Força sincronização imediata para o novo jogador
           roomChannel?.send({ type: 'broadcast', event: 'sync_state', payload: { state: newState, senderId: localPlayerId } });
           return newState;
         });
      }
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ id: localPlayerId, name: playerProfile.name, avatar: playerProfile.avatar, rank: getRankFromMMR(playerProfile.mmr), currentRoomId: gameStateRef.current?.id });
      }
    });
    lobbyChannel = channel;
    return () => { channel.unsubscribe(); };
  }, [localPlayerId, playerProfile.name, gameState?.id]);

  // ROOM SYNC
  useEffect(() => {
    if (!gameState?.id || !localPlayerId) return;
    if (roomChannel) roomChannel.unsubscribe();
    
    const channel = supabase.channel(`uno_room_${gameState.id}`);
    channel.on('broadcast', { event: 'game_action' }, ({ payload }) => {
      if (payload.senderId === localPlayerId) return;
      processRemoteAction(payload);
    }).on('broadcast', { event: 'sync_state' }, ({ payload }) => {
      if (payload.senderId === localPlayerId) return;
      // Guest recebe o estado completo do Host aqui
      setGameState(payload.state);
    }).subscribe();
    
    roomChannel = channel;
    return () => { channel.unsubscribe(); };
  }, [gameState?.id, localPlayerId]);

  useEffect(() => {
    gameStateRef.current = gameState;
    // Somente o Host faz o broadcast automático do estado ao mudar
    if (gameState && gameState.players.length > 0 && gameState.players[0].id === localPlayerId && roomChannel) {
      roomChannel.send({ type: 'broadcast', event: 'sync_state', payload: { state: gameState, senderId: localPlayerId } });
    }
  }, [gameState]);

  const processRemoteAction = (action: any) => {
    if (action.type === 'PLAY') handlePlayCard(action.playerId, action.cardIds, action.chosenColor, action.didCallUno);
    if (action.type === 'DRAW') handleDrawCard(action.playerId);
    if (action.type === 'START') startGame();
    if (action.type === 'REACTION') handleEphemeralReaction(action.playerId, action.reaction, action.voicePhrase);
  };

  const handleEphemeralReaction = (pid: string, reaction?: string, voicePhrase?: string) => {
    if (voicePhrase) audio.speak(voicePhrase);
    setReactions(prev => ({ ...prev, [pid]: { playerId: pid, reaction, voicePhrase, timestamp: Date.now() } }));
    setTimeout(() => { setReactions(prev => { const n = {...prev}; delete n[pid]; return n; }); }, 3000);
  };

  const calculateWinnerScore = (winnerId: string, allPlayers: Player[]): number => {
    let score = 0;
    allPlayers.forEach(p => {
      if (p.id === winnerId) return;
      p.hand.forEach(card => {
        if (card.type === CardType.NUMBER) score += (card.value || 0);
        else if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) score += 50;
        else score += 20;
      });
    });
    return Math.max(score, 50);
  };

  const handlePlayCard = (playerId: string, cardIds: string[], chosenColor?: CardColor, didCallUno?: boolean) => {
    if (gameStateRef.current?.players[0].id !== localPlayerId) {
      roomChannel?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'PLAY', playerId, cardIds, chosenColor, didCallUno, senderId: localPlayerId } });
      return;
    }
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.players.findIndex(p => p.id === playerId);
      if (pIdx === -1) return prev;
      const player = { ...prev.players[pIdx] };
      const cardsToPlay = cardIds.map(id => player.hand.find(c => c.id === id)).filter((c): c is Card => !!c);
      const newHand = player.hand.filter(c => !cardIds.includes(c.id));
      
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
        const finalScore = calculateWinnerScore(playerId, prev.players);
        const updatedWinner = { ...player, hand: [], score: finalScore };
        handleWin(updatedWinner);
        return { ...prev, status: GameStatus.FINISHED, winner: updatedWinner };
      }

      let nextIdx = pIdx;
      const jump = totalSkips > 0 ? totalSkips + 1 : 1;
      for (let i = 0; i < jump; i++) nextIdx = getNextPlayerIndex(nextIdx, currentDir, prev.players.length);
      const lastCard = cardsToPlay[cardsToPlay.length - 1];
      return { ...prev, players: prev.players.map((p, i) => i === pIdx ? { ...p, hand: newHand, hasCalledUno: !!didCallUno } : p), discardPile: [...prev.discardPile, ...cardsToPlay], currentColor: lastCard.color === CardColor.WILD ? (chosenColor || prev.currentColor) : lastCard.color, currentPlayerIndex: nextIdx, direction: currentDir, pendingDrawCount: newPendingDraw, turnStartTime: Date.now() };
    });
  };

  const handleDrawCard = (playerId: string) => {
    if (gameStateRef.current?.players[0].id !== localPlayerId) {
      roomChannel?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'DRAW', playerId, senderId: localPlayerId } });
      return;
    }
    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.currentPlayerIndex;
      let deck = [...prev.deck];
      if (deck.length < 10) deck = [...deck, ...generateDeck()];
      const player = { ...prev.players[pIdx], hasCalledUno: false };
      const drawAmount = prev.pendingDrawCount > 0 ? prev.pendingDrawCount : 1;
      player.hand = [...player.hand, ...deck.splice(0, drawAmount)];
      return { ...prev, players: prev.players.map((p, i) => i === pIdx ? player : p), deck, pendingDrawCount: 0, currentPlayerIndex: getNextPlayerIndex(pIdx, prev.direction, prev.players.length), turnStartTime: Date.now() };
    });
  };

  const startGame = () => {
    if (gameStateRef.current?.players[0].id !== localPlayerId) {
      roomChannel?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'START', senderId: localPlayerId } });
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

  const handleWin = (winner: Player) => {
    if (winner.id === localPlayerId) {
      audio.play('win_fanfare');
      setPlayerProfile((prev: any) => ({
        ...prev,
        mmr: prev.mmr + 25,
        coins: prev.coins + (winner.score || 50),
        stats: { ...prev.stats, wins: prev.stats.wins + 1, totalGames: prev.stats.totalGames + 1 }
      }));
    } else if (!winner.isBot) {
       setPlayerProfile((prev: any) => ({
        ...prev,
        mmr: Math.max(0, prev.mmr - 15),
        stats: { ...prev.stats, losses: prev.stats.losses + 1, totalGames: prev.stats.totalGames + 1 }
      }));
    }
  };

  const createRoom = (settings: GameSettings) => {
    const host: Player = { ...playerProfile, id: localPlayerId!, hand: [], isHost: true, isBot: false, hasCalledUno: false, score: 0 } as any;
    let players = [host];
    if (settings.mode === GameMode.NORMAL) {
      for (let i = 0; i < settings.botCount; i++) {
        players.push({ id: `bot-${i}`, name: `IA-${i+1}`, avatar: AVATARS[i % AVATARS.length], hand: [], isBot: true, mmr: 1000, hasCalledUno: false, score: 0 } as any);
      }
    }
    setGameState({ id: Math.random().toString(36).substring(2, 8).toUpperCase(), players, status: GameStatus.LOBBY, deck: generateDeck(), discardPile: [], currentPlayerIndex: 0, direction: 1, currentColor: CardColor.RED, winner: null, settings, turnStartTime: Date.now(), pendingDrawCount: 0 });
    setCurrentView(AppView.GAME);
  };

  const joinRoom = (roomId: string) => {
    // IMPORTANTE: Criamos um estado parcial para forçar o useEffect a se inscrever no canal da sala
    // sem isso, o roomChannel ficaria null e o broadcast do host nunca chegaria.
    setGameState({ 
        id: roomId, 
        players: [], 
        status: GameStatus.LOBBY, 
        deck: [], 
        discardPile: [], 
        currentPlayerIndex: 0, 
        direction: 1, 
        currentColor: CardColor.RED, 
        winner: null, 
        settings: { mode: GameMode.RANKED } as any, 
        turnStartTime: Date.now(), 
        pendingDrawCount: 0 
    });
    
    const payload = { ...playerProfile, id: localPlayerId!, hand: [], isHost: false, isBot: false, hasCalledUno: false, roomId, score: 0 };
    lobbyChannel?.send({ type: 'broadcast', event: 'player_joined_request', payload });
    setCurrentView(AppView.GAME);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#022c22] flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="font-brand text-yellow-400 text-2xl animate-pulse">UNO ARENA...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#022c22] overflow-hidden text-white select-none">
      {currentView === AppView.LOGIN && <Login onLogin={(n, a) => { setPlayerProfile({...playerProfile, name: n, avatar: a}); setCurrentView(AppView.PROFILE); audio.startMusic(); }} />}
      {currentView === AppView.PROFILE && <Profile profile={{...playerProfile, rank: getRankFromMMR(playerProfile.mmr)}} onNavigate={setCurrentView} onUpdateAvatar={(a) => setPlayerProfile({...playerProfile, avatar: a})} />}
      {currentView === AppView.LOBBY && <Lobby onBack={() => setCurrentView(AppView.PROFILE)} onCreateRoom={createRoom} onJoinRoom={joinRoom} onlinePlayers={Object.values(onlinePlayers)} />}
      {currentView === AppView.RANKING && <Ranking onBack={() => setCurrentView(AppView.PROFILE)} currentMMR={playerProfile.mmr} />}
      {currentView === AppView.STORE && <Store profile={playerProfile} onUpdate={(u) => setPlayerProfile({...playerProfile, ...u})} onClose={() => setCurrentView(AppView.PROFILE)} />}
      
      {currentView === AppView.GAME && (
        <GameTable 
            gameState={gameState} 
            localPlayerId={localPlayerId!} 
            reactions={reactions}
            equippedSkin={playerProfile.equippedSkin}
            onPlayCard={handlePlayCard} 
            onDrawCard={handleDrawCard} 
            onTimeout={(pid) => handleDrawCard(pid)}
            onStartGame={startGame}
            onCallUno={(pid) => handleEphemeralReaction(pid, undefined, "UNO!")}
            onSendReaction={(pid, r) => {
              handleEphemeralReaction(pid, r);
              roomChannel?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'REACTION', playerId: pid, reaction: r, senderId: localPlayerId } });
            }}
            onSendVoice={(pid, v) => {
              handleEphemeralReaction(pid, undefined, v);
              roomChannel?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'REACTION', playerId: pid, voicePhrase: v, senderId: localPlayerId } });
            }}
            onLeaveRoom={() => { setGameState(null); setCurrentView(AppView.PROFILE); }}
            onlinePlayers={Object.values(onlinePlayers)}
        />
      )}

      {gameState?.status === GameStatus.FINISHED && gameState.winner && (
        <GameOver winner={gameState.winner} mode={gameState.settings.mode} onRestart={() => { setGameState(null); setCurrentView(AppView.PROFILE); }} />
      )}
    </div>
  );
};

export default App;
