
import React, { useState, useEffect } from 'react';
import { GameState, CardColor, CardType, GameStatus, Player, OnlinePresence, EphemeralReaction, Card, GameMode } from '../types.ts';
import UnoCard from './UnoCard.tsx';
import { isMoveValid } from '../engine/unoLogic.ts';
import { COLOR_CLASSES, VOICE_PHRASES } from '../constants.ts';
import { audio } from '../services/audioService.ts';

interface GameTableProps {
  gameState: GameState;
  localPlayerId: string;
  equippedSkin: string;
  reactions: Record<string, EphemeralReaction>;
  onPlayCard: (playerId: string, cardIds: string[], chosenColor?: CardColor, didCallUno?: boolean) => void;
  onDrawCard: (playerId: string) => void;
  onCallUno: (playerId: string) => void;
  onSendReaction: (playerId: string, reaction: string) => void;
  onTimeout: (playerId: string) => void;
  onSendVoice: (playerId: string, phrase: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onlinePlayers: OnlinePresence[];
}

const PlayerVisual: React.FC<{ p: Player, reaction?: EphemeralReaction, isCurrent: boolean, positionStyle?: React.CSSProperties, isLocal?: boolean }> = ({ p, reaction, isCurrent, positionStyle, isLocal }) => {
  const skinClass = p.equippedAvatarSkin === 'fire_aura' ? 'animate-pulse bg-gradient-to-br from-red-600 to-orange-400' : 'bg-yellow-400';

  return (
    <div className={`${positionStyle ? 'player-node' : 'relative'} flex flex-col items-center z-[150]`} style={positionStyle}>
      <div className={`relative transition-all duration-300 ${isCurrent ? 'scale-110' : 'opacity-90 scale-95'}`}>
        
        {reaction && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-[500] animate-bounce pointer-events-none">
            <div className="bg-black border-2 border-yellow-500 rounded-3xl p-3 shadow-[0_0_30px_rgba(234,179,8,0.7)] flex flex-col items-center min-w-[80px]">
              {reaction.reaction && <span className="text-5xl mb-1 filter drop-shadow-md">{reaction.reaction}</span>}
              {reaction.voicePhrase && (
                <span className="text-[8px] font-black uppercase text-yellow-400 whitespace-nowrap bg-zinc-900 px-3 py-1 rounded-full border border-white/20 mt-1">
                  {reaction.voicePhrase}
                </span>
              )}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-black"></div>
            </div>
          </div>
        )}

        <div className={`bg-black/60 border-2 rounded-xl overflow-hidden flex flex-col w-14 lg:w-28 shadow-2xl relative ${isCurrent ? 'border-yellow-400 ring-4 ring-yellow-400/30' : 'border-white/20'}`}>
          <div className={`h-12 lg:h-24 flex items-center justify-center text-3xl lg:text-6xl ${skinClass}`}>
            {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : p.avatar}
          </div>
          {!isLocal && (
            <div className="bg-black/80 py-0.5 text-center border-t border-white/5">
              <span className="text-[6px] lg:text-[10px] font-black uppercase text-white/80">{p.name}</span>
            </div>
          )}
        </div>
        {!isLocal && (
          <div className="absolute -right-2 -top-2 bg-red-600 text-white font-brand text-[10px] w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center shadow-xl">
            {p.hand.length}
          </div>
        )}
      </div>
    </div>
  );
};

const GameTable: React.FC<GameTableProps> = ({ gameState, localPlayerId, equippedSkin, reactions, onPlayCard, onDrawCard, onCallUno, onSendReaction, onTimeout, onSendVoice, onStartGame, onLeaveRoom }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'emoji' | 'voice' | 'audio' | null>(null);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState.settings.turnTimeLimit);
  
  // Estados de Música Independentes
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [showMusicHub, setShowMusicHub] = useState(false);
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = gameState.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);

  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const remaining = Math.max(0, gameState.settings.turnTimeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0 && isMyTurn) onTimeout(localPlayerId);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.currentPlayerIndex, gameState.status, isMyTurn]);

  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
    setShowPicker(false);
  }, [gameState.currentPlayerIndex, gameState.discardPile.length]);

  if (!localPlayer) return null;

  const toggleMusic = () => {
    if (isMusicPlaying) {
      audio.stopMusic();
      setIsMusicPlaying(false);
    } else {
      audio.startMusic();
      setIsMusicPlaying(true);
    }
  };

  const nextTrack = () => {
    audio.nextTrack();
    audio.play('click');
  };

  const handleCardSelect = (id: string) => {
    if (!isMyTurn) return;
    const card = localPlayer.hand.find(c => c.id === id);
    if (!card) return;

    if (selectedIds.includes(id)) {
      setSelectedIds([]);
      setShowPicker(false);
      return;
    }

    if (isMoveValid(card, gameState, localPlayer.hand)) {
      setSelectedIds([id]);
      if (card.color === CardColor.WILD || card.type === CardType.WILD_DRAW_FOUR) {
        setShowPicker(true);
      } else {
        setShowPicker(false);
      }
      audio.play('click');
    }
  };

  const otherPlayers = gameState.players.filter(p => p.id !== localPlayerId);
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  if (gameState.status === GameStatus.LOBBY) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center relative bg-black">
         <div className="arena-table"><div className="arena-facet"></div></div>
         <button onClick={onLeaveRoom} className="absolute top-10 left-6 z-[100] text-white/40 uppercase font-black text-[10px] flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 active:scale-95 transition-all">VOLTAR</button>
         
         {/* Hub de Música no Lobby */}
         <div className="absolute top-10 right-6 z-[100] flex gap-2">
            <button onClick={nextTrack} className="w-10 h-10 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-xs active:scale-95 transition-all">⏭️</button>
            <button onClick={toggleMusic} className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl active:scale-95 transition-all ${isMusicPlaying ? 'bg-blue-600/20' : 'bg-white/5 opacity-40'}`}>
              {isMusicPlaying ? '🎵' : '🔇'}
            </button>
         </div>

         <div className="z-10 text-center space-y-8 p-6">
            <h1 className="text-7xl lg:text-9xl font-brand italic drop-shadow-2xl text-yellow-400">ARENA UNO</h1>
            <div className="flex gap-4 justify-center flex-wrap max-w-sm">
               {gameState.players.map(p => (
                 <div key={p.id} className={`w-14 h-14 bg-white/5 rounded-2xl border-2 flex items-center justify-center text-2xl animate-scale-in ${p.isHost ? 'border-yellow-500' : 'border-white/10'}`}>{p.avatar}</div>
               ))}
            </div>
            {localPlayer.isHost && (
              <button onClick={onStartGame} disabled={gameState.players.length < 2} className="w-full py-5 text-black font-brand text-2xl bg-yellow-500 rounded-2xl shadow-2xl active:scale-95 transition-all uppercase italic border-b-4 border-yellow-700">Iniciar Combate</button>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-black flex flex-col">
      <div className="flex-1 relative">
        <div className="arena-table"><div className="arena-facet"></div></div>

        {/* Header de Ação e Hub de Música */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-[500]">
           <button onClick={onLeaveRoom} className="text-white/40 uppercase font-black text-[10px] flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 active:scale-95 transition-all">SAIR</button>
           
           <div className="flex gap-2 items-center">
              {showMusicHub && (
                <div className="flex gap-2 animate-scale-in">
                   <button onClick={nextTrack} className="w-10 h-10 bg-white/10 rounded-full border border-white/10 flex items-center justify-center text-sm active:scale-95 transition-all" title="Próxima Música">⏭️</button>
                </div>
              )}
              <button 
                onClick={() => setShowMusicHub(!showMusicHub)}
                onDoubleClick={toggleMusic}
                className={`w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-sm transition-all shadow-lg ${isMusicPlaying ? 'bg-blue-600/30 border-blue-400 animate-pulse' : 'bg-white/5 border-white/10'}`}
              >
                {isMusicPlaying ? '🎵' : '🔇'}
              </button>
           </div>
        </div>

        {otherPlayers.map((p, i) => {
          const total = otherPlayers.length;
          const radiusX = window.innerWidth < 768 ? 35 : 40;
          const radiusY = window.innerWidth < 768 ? 20 : 25;
          const angle = (180 / (total + 1)) * (i + 1);
          const radian = ((180 - angle) * Math.PI) / 180;
          const x = 50 + radiusX * Math.cos(radian);
          const y = 40 - radiusY * Math.sin(radian);
          return <PlayerVisual key={p.id} p={p} isCurrent={currentPlayer?.id === p.id} positionStyle={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }} reaction={reactions[p.id]} />;
        })}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] flex items-center gap-8 lg:gap-32">
           <button onClick={() => isMyTurn && onDrawCard(localPlayerId)} disabled={!isMyTurn} className={`active:scale-95 transition-all ${!isMyTurn ? 'opacity-40 grayscale' : ''}`}>
              <UnoCard card={{} as any} hidden size="sm" />
           </button>
           <div className="relative">
              <UnoCard card={topDiscard} skin={equippedSkin} size="sm" />
              <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 border-white shadow-xl ${COLOR_CLASSES[gameState.currentColor]}`}></div>
           </div>
        </div>

        {/* SELETOR DE CORES 3D TRANSPARENTE CENTRALIZADO */}
        {showPicker && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] flex items-center justify-center pointer-events-auto">
            <div className="absolute -inset-20 bg-black/40 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="relative w-[220px] h-[220px] lg:w-[300px] lg:h-[300px] flex items-center justify-center animate-scale-in" style={{ perspective: '1200px' }}>
              <div className="absolute inset-0 rounded-full border-4 border-white/5 shadow-[0_0_60px_rgba(255,255,255,0.05)] animate-spin-slow"></div>
              <div className="relative w-full h-full flex flex-wrap" style={{ transform: 'rotateX(25deg)' }}>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.RED, unoDeclared); setShowPicker(false); }}
                  className="w-1/2 h-1/2 bg-red-600/30 hover:bg-red-500 hover:scale-110 active:scale-95 transition-all duration-300 rounded-tl-full border-2 border-white/20 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,0,0,0.3)] flex items-center justify-center group z-10"
                >
                  <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">🔥</span>
                </button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.BLUE, unoDeclared); setShowPicker(false); }}
                  className="w-1/2 h-1/2 bg-blue-600/30 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all duration-300 rounded-tr-full border-2 border-white/20 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,0,255,0.3)] flex items-center justify-center group z-10"
                >
                  <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">💧</span>
                </button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.GREEN, unoDeclared); setShowPicker(false); }}
                  className="w-1/2 h-1/2 bg-green-600/30 hover:bg-green-500 hover:scale-110 active:scale-95 transition-all duration-300 rounded-bl-full border-2 border-white/20 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,255,0,0.3)] flex items-center justify-center group z-10"
                >
                  <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">🌿</span>
                </button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.YELLOW, unoDeclared); setShowPicker(false); }}
                  className="w-1/2 h-1/2 bg-yellow-400/30 hover:bg-yellow-300 hover:scale-110 active:scale-95 transition-all duration-300 rounded-br-full border-2 border-white/20 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,0,0.3)] flex items-center justify-center group z-10"
                >
                  <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">⚡</span>
                </button>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/5 rounded-full border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-3xl z-20 pointer-events-none">
                   <div className="w-full h-full rounded-full border-t border-white/40 animate-spin"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ DO JOGADOR */}
      <div className="h-[40vh] bg-gradient-to-t from-black via-black/95 to-transparent relative z-[200] flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/60">
           <div className="flex items-center gap-4">
              <PlayerVisual p={localPlayer} isCurrent={isMyTurn} isLocal reaction={reactions[localPlayerId]} />
              <div className="flex gap-2">
                 <button onClick={() => setActiveMenu('emoji')} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-sm">💬</button>
                 <button onClick={() => setActiveMenu('voice')} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-sm">🗣️</button>
              </div>
           </div>
           <div className="flex items-center gap-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-4 py-2 bg-red-600 text-white font-brand text-xs rounded-xl animate-bounce border-2 border-white shadow-2xl">UNO!</button>
              )}
              {selectedIds.length > 0 && !showPicker && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-6 py-3 bg-yellow-500 text-black font-brand text-sm rounded-xl shadow-2xl uppercase italic border-b-4 border-yellow-700">LANÇAR</button>
              )}
              {isMyTurn && <div className="bg-yellow-500/20 border-2 border-yellow-500/40 px-4 py-2 rounded-xl font-brand text-yellow-400 text-lg shadow-inner">{timeLeft}s</div>}
           </div>
        </div>

        <div className="flex-1 flex justify-center items-end px-4 pb-8 overflow-x-auto no-scrollbar">
          <div className="flex items-end h-full">
            {localPlayer.hand.map((card, i) => {
              const isSelected = selectedIds.includes(card.id);
              return (
                <div 
                  key={card.id} onClick={() => handleCardSelect(card.id)}
                  className={`transition-all duration-300 relative transform-gpu cursor-pointer ${isSelected ? '-translate-y-12 z-[1000] scale-110' : 'hover:-translate-y-6'}`}
                  style={{ marginLeft: i === 0 ? 0 : '-40px' }}
                >
                  <UnoCard card={card} size="sm" playable={isMyTurn && isMoveValid(card, gameState, localPlayer.hand)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTable;
