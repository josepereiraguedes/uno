
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePresence>>({});
  const [reactions, setReactions] = useState<Record<string, EphemeralReaction>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const gameStateRef = useRef<GameState | null>(null);
  const profileRef = useRef<any>(null);
  const lobbyChannelRef = useRef<any>(null);
  const roomChannelRef = useRef<any>(null);

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

  // Mantém o Ref atualizado para callbacks de rede sem causar re-subscrições
  useEffect(() => {
    profileRef.current = playerProfile;
    gameStateRef.current = gameState;
  }, [playerProfile, gameState]);

  // IA dos Bots - Lógica robusta executada pelo Host
  useEffect(() => {
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHost = gameState.players[0]?.id === localPlayerId;
    
    if (currentPlayer?.isBot && isHost) {
      const botThinkTime = Math.random() * 1000 + 1500;
      const timeout = setTimeout(() => {
        const latestState = gameStateRef.current;
        if (!latestState || latestState.players[latestState.currentPlayerIndex]?.id !== currentPlayer.id) return;
        
        const validCards = currentPlayer.hand.filter(c => isMoveValid(c, latestState));
        if (validCards.length > 0) {
          const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
          let chosenColor: CardColor | undefined;
          if (cardToPlay.color === CardColor.WILD) {
            const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];
            chosenColor = colors[Math.floor(Math.random() * colors.length)];
          }
          handlePlayCard(currentPlayer.id, [cardToPlay.id], chosenColor, currentPlayer.hand.length === 2);
        } else {
          handleDrawCard(currentPlayer.id);
        }
      }, botThinkTime);
      return () => clearTimeout(timeout);
    }
  }, [gameState?.currentPlayerIndex, gameState?.status, localPlayerId]);

  // Inicialização única
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

  // Sincronização de Perfil com Supabase
  useEffect(() => {
    if (localPlayerId && playerProfile.name) {
      syncProfile(localPlayerId, playerProfile);
      localStorage.setItem('uno_name', playerProfile.name);
      localStorage.setItem('uno_avatar', playerProfile.avatar);
      localStorage.setItem('uno_mmr', playerProfile.mmr.toString());
      localStorage.setItem('uno_coins', playerProfile.coins.toString());
      localStorage.setItem('uno_skin', playerProfile.equippedSkin);
    }
  }, [playerProfile.name, playerProfile.avatar, playerProfile.mmr, localPlayerId]);

  // CANAL DE LOBBY: INSCRITO APENAS UMA VEZ
  useEffect(() => {
    if (!localPlayerId || !playerProfile.name) return;

    const lobbyChannel = supabase.channel('uno_universal_lobby', {
      config: { presence: { key: localPlayerId } }
    });

    lobbyChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = lobbyChannel.presenceState();
        const players: Record<string, OnlinePresence> = {};
        Object.keys(presenceState).forEach((key) => {
          players[key] = (presenceState[key] as any)[0];
        });
        setOnlinePlayers(players);
      })
      .on('broadcast', { event: 'player_joined_request' }, ({ payload }) => {
        // Host responde ao pedido
        if (gameStateRef.current?.id === payload.roomId && gameStateRef.current.players[0]?.id === localPlayerId) {
          setGameState(prev => {
            if (!prev || prev.players.find(p => p.id === payload.id)) return prev;
            const newState = { ...prev, players: [...prev.players, payload] };
            // Envia estado atualizado imediatamente via canal da sala
            roomChannelRef.current?.send({
              type: 'broadcast',
              event: 'sync_state',
              payload: { state: newState, senderId: localPlayerId }
            });
            return newState;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await lobbyChannel.track({
            id: localPlayerId,
            name: profileRef.current.name,
            avatar: profileRef.current.avatar,
            rank: getRankFromMMR(profileRef.current.mmr),
            currentRoomId: gameStateRef.current?.id || null,
            isOnline: true
          });
        }
      });

    lobbyChannelRef.current = lobbyChannel;
    return () => { lobbyChannel.unsubscribe(); };
  }, [localPlayerId, !!playerProfile.name]);

  // Atualização silenciosa de Presença (quando cria sala ou muda avatar)
  useEffect(() => {
    if (lobbyChannelRef.current && localPlayerId && playerProfile.name) {
      lobbyChannelRef.current.track({
        id: localPlayerId,
        name: playerProfile.name,
        avatar: playerProfile.avatar,
        rank: getRankFromMMR(playerProfile.mmr),
        currentRoomId: gameState?.id || null,
        isOnline: true
      });
    }
  }, [gameState?.id, playerProfile.name, playerProfile.avatar]);

  // CANAL DA SALA ESPECÍFICA
  useEffect(() => {
    if (!gameState?.id || !localPlayerId) return;

    if (roomChannelRef.current) roomChannelRef.current.unsubscribe();

    const roomChannel = supabase.channel(`room_${gameState.id}`);
    roomChannel
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        if (payload?.senderId !== localPlayerId) processRemoteAction(payload);
      })
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        if (payload?.senderId !== localPlayerId) setGameState(payload.state);
      })
      .subscribe();

    roomChannelRef.current = roomChannel;
    return () => { roomChannel.unsubscribe(); };
  }, [gameState?.id, localPlayerId]);

  // Sync automático do Host
  useEffect(() => {
    if (gameState && gameState.players[0]?.id === localPlayerId && roomChannelRef.current) {
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'sync_state',
        payload: { state: gameState, senderId: localPlayerId }
      });
    }
  }, [gameState, localPlayerId]);

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

  const handlePlayCard = (playerId: string, cardIds: string[], chosenColor?: CardColor, didCallUno?: boolean) => {
    if (gameStateRef.current?.players[0]?.id !== localPlayerId) {
      roomChannelRef.current?.send({
        type: 'broadcast',
        event: 'game_action',
        payload: { type: 'PLAY', playerId, cardIds, chosenColor, didCallUno, senderId: localPlayerId }
      });
      return;
    }

    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.players.findIndex(p => p.id === playerId);
      if (pIdx === -1) return prev;
      
      const player = { ...prev.players[pIdx] };
      const cardsToPlay = cardIds.map(id => player.hand.find(c => c.id === id)).filter((c): c is Card => !!c);
      if (cardsToPlay.length === 0) return prev;
      
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
        const updatedWinner = { ...player, hand: [], score: 100 };
        handleWin(updatedWinner);
        return { ...prev, status: GameStatus.FINISHED, winner: updatedWinner };
      }

      let nextIdx = pIdx;
      const jump = totalSkips > 0 ? totalSkips + 1 : 1;
      for (let i = 0; i < jump; i++) nextIdx = getNextPlayerIndex(nextIdx, currentDir, prev.players.length);
      
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
    if (gameStateRef.current?.players[0]?.id !== localPlayerId) {
      roomChannelRef.current?.send({
        type: 'broadcast',
        event: 'game_action',
        payload: { type: 'DRAW', playerId, senderId: localPlayerId }
      });
      return;
    }

    setGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING) return prev;
      const pIdx = prev.currentPlayerIndex;
      let deck = [...prev.deck];
      if (deck.length < 15) deck = [...deck, ...generateDeck()];
      
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
    if (gameStateRef.current?.players[0]?.id !== localPlayerId) {
      roomChannelRef.current?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'START', senderId: localPlayerId } });
      return;
    }
    setGameState(prev => {
      if (!prev) return null;
      let deck = [...prev.deck];
      const players = prev.players.map(p => ({ ...p, hand: deck.splice(0, prev.settings.initialCardsCount) }));
      const initialCard = deck.splice(0, 1)[0] || { id: 'init', color: CardColor.RED, type: CardType.NUMBER, value: 7 };
      return { ...prev, players, deck, discardPile: [initialCard], status: GameStatus.PLAYING, currentColor: initialCard.color === CardColor.WILD ? CardColor.RED : initialCard.color, turnStartTime: Date.now() };
    });
  };

  const handleWin = (winner: Player) => {
    if (winner.id === localPlayerId) {
      audio.play('win_fanfare');
      setPlayerProfile((prev: any) => ({
        ...prev,
        mmr: prev.mmr + 25,
        coins: prev.coins + 100,
        stats: { ...prev.stats, wins: prev.stats.wins + 1, totalGames: prev.stats.totalGames + 1 }
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
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameState({ id: roomId, players, status: GameStatus.LOBBY, deck: generateDeck(), discardPile: [], currentPlayerIndex: 0, direction: 1, currentColor: CardColor.RED, winner: null, settings, turnStartTime: Date.now(), pendingDrawCount: 0 });
    setCurrentView(AppView.GAME);
  };

  const joinRoom = (roomId: string) => {
    setGameState({ 
      id: roomId, players: [], status: GameStatus.LOBBY, deck: [], discardPile: [], currentPlayerIndex: 0, 
      direction: 1, currentColor: CardColor.RED, winner: null, settings: { mode: GameMode.RANKED } as any, 
      turnStartTime: Date.now(), pendingDrawCount: 0 
    });
    const payload = { ...playerProfile, id: localPlayerId!, hand: [], isHost: false, isBot: false, hasCalledUno: false, roomId, score: 0 };
    lobbyChannelRef.current?.send({ type: 'broadcast', event: 'player_joined_request', payload });
    setCurrentView(AppView.GAME);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#022c22] flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="font-brand text-yellow-400 text-2xl animate-pulse">CARREGANDO ARENA...</p>
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
              roomChannelRef.current?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'REACTION', playerId: pid, reaction: r, senderId: localPlayerId } });
            }}
            onSendVoice={(pid, v) => {
              handleEphemeralReaction(pid, undefined, v);
              roomChannelRef.current?.send({ type: 'broadcast', event: 'game_action', payload: { type: 'REACTION', playerId: pid, voicePhrase: v, senderId: localPlayerId } });
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
