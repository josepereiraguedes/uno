
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
  
  const [audioVolume, setAudioVolume] = useState(audio.getVolume());
  const [audioMuted, setAudioMuted] = useState(audio.getMuteStatus());

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

  const handleCardSelect = (id: string) => {
    if (!isMyTurn) return;
    const card = localPlayer.hand.find(c => c.id === id);
    if (!card) return;

    if (selectedIds.includes(id)) {
      const updated = selectedIds.filter(i => i !== id);
      setSelectedIds(updated);
      if (updated.length === 0) setShowPicker(false);
      return;
    }

    if (selectedIds.length > 0) {
      const firstCard = localPlayer.hand.find(c => c.id === selectedIds[0]);
      if (firstCard && (card.type === firstCard.type && (card.type === CardType.NUMBER ? card.value === firstCard.value : true))) {
        setSelectedIds(prev => [...prev, id]);
        audio.play('click');
        return;
      }
    }

    if (isMoveValid(card, gameState, localPlayer.hand)) {
      setSelectedIds([id]);
      setShowPicker(card.color === CardColor.WILD);
      audio.play('click');
    }
  };

  const otherPlayers = gameState.players.filter(p => p.id !== localPlayerId);
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  if (gameState.status === GameStatus.LOBBY) {
    const isRanked = gameState.settings.mode === GameMode.RANKED;
    return (
      <div className="h-full w-full flex flex-col items-center justify-center relative bg-black">
         <div className="arena-table"><div className="arena-facet"></div></div>
         
         <button onClick={onLeaveRoom} className="absolute top-10 left-6 z-[100] text-white/40 uppercase font-black text-[10px] flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 active:scale-95 transition-all">
            <span className="text-lg">←</span> VOLTAR
         </button>

         <div className="z-10 text-center space-y-8 p-6">
            <div className="space-y-2">
              <h1 className={`text-7xl lg:text-9xl font-brand italic drop-shadow-2xl ${isRanked ? 'text-yellow-500' : 'text-yellow-400'}`}>ARENA UNO</h1>
              <p className="text-blue-400 font-black tracking-widest text-[10px] uppercase">
                {isRanked ? 'Sessão Competitiva • Rankeada' : 'Sessão Casual • Treinamento'}
              </p>
            </div>

            <div className="flex gap-4 justify-center flex-wrap max-w-sm">
               {gameState.players.map(p => (
                 <div key={p.id} className={`w-14 h-14 bg-white/5 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-xl animate-scale-in ${p.isHost ? 'border-yellow-500' : 'border-white/10'}`}>
                    {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover rounded-xl" alt={p.name} /> : p.avatar}
                 </div>
               ))}
               {[...Array(Math.max(0, 4 - gameState.players.length))].map((_, i) => (
                 <div key={i} className="w-14 h-14 bg-white/5 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center text-white/10 animate-pulse text-xs">?</div>
               ))}
            </div>

            {localPlayer.isHost && (
              <button 
                onClick={onStartGame} 
                disabled={gameState.players.length < 2} 
                className={`w-full py-5 text-black font-brand text-2xl rounded-2xl shadow-2xl active:scale-95 transition-all uppercase italic border-b-4 ${isRanked ? 'bg-yellow-600 border-yellow-800' : 'bg-yellow-500 border-yellow-700'}`}
              >
                Iniciar Combate
              </button>
            )}
            
            {!localPlayer.isHost && (
              <p className="text-white/40 font-brand text-xs animate-pulse italic">Aguardando mestre da arena...</p>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-black flex flex-col">
      <div className="flex-1 relative">
        <div className="arena-table"><div className="arena-facet"></div></div>

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

        {showPicker && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto" onClick={() => setShowPicker(false)}></div>
            <div className="relative w-80 h-80 lg:w-[450px] lg:h-[450px] animate-scale-in pointer-events-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-white/10 animate-spin-slow"></div>
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-3 p-3">
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.RED, unoDeclared); setShowPicker(false); }} 
                  className="bg-red-600 rounded-tl-full border-4 border-white/40 active:scale-90 transition-all shadow-2xl hover:brightness-125"
                ></button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.BLUE, unoDeclared); setShowPicker(false); }} 
                  className="bg-blue-600 rounded-tr-full border-4 border-white/40 active:scale-90 transition-all shadow-2xl hover:brightness-125"
                ></button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.GREEN, unoDeclared); setShowPicker(false); }} 
                  className="bg-green-600 rounded-bl-full border-4 border-white/40 active:scale-90 transition-all shadow-2xl hover:brightness-125"
                ></button>
                <button 
                  onClick={() => { onPlayCard(localPlayerId, selectedIds, CardColor.YELLOW, unoDeclared); setShowPicker(false); }} 
                  className="bg-yellow-400 rounded-br-full border-4 border-white/40 active:scale-90 transition-all shadow-2xl hover:brightness-125"
                ></button>
              </div>
              <div className="absolute w-24 h-24 bg-black rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)] z-10 text-4xl">🎨</div>
            </div>
          </div>
        )}
      </div>

      <div className="h-[40vh] bg-gradient-to-t from-black via-black/95 to-transparent relative z-[200] flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/60">
           <div className="flex items-center gap-4">
              <PlayerVisual p={localPlayer} isCurrent={isMyTurn} isLocal reaction={reactions[localPlayerId]} />
              <div className="flex flex-col gap-1">
                 <p className="text-xs font-brand text-white italic truncate max-w-[80px]">{localPlayer.name}</p>
                 <div className="flex gap-2">
                    <button onClick={() => { audio.play('click'); setActiveMenu('emoji'); }} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-sm flex items-center justify-center shadow-xl active:scale-90 transition-transform">💬</button>
                    <button onClick={() => { audio.play('click'); setActiveMenu('voice'); }} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-sm flex items-center justify-center shadow-xl active:scale-90 transition-transform">🗣️</button>
                    <button onClick={() => { audio.play('click'); setActiveMenu('audio'); }} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-sm flex items-center justify-center shadow-xl active:scale-90 transition-transform">🎵</button>
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-4 py-2 bg-red-600 text-white font-brand text-xs rounded-xl animate-bounce border-2 border-white shadow-2xl">UNO!</button>
              )}
              {selectedIds.length > 0 && !showPicker && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-6 py-3 bg-yellow-500 text-black font-brand text-sm rounded-xl shadow-2xl uppercase active:scale-95 italic border-b-4 border-yellow-700">LANÇAR</button>
              )}
              {isMyTurn && <div className="bg-yellow-500/20 border-2 border-yellow-500/40 px-4 py-2 rounded-xl font-brand text-yellow-400 text-lg tabular-nums shadow-inner">{timeLeft}s</div>}
           </div>
        </div>

        <div className="flex-1 flex justify-center items-end relative overflow-visible px-4 pb-8">
          <div className="flex justify-center items-end h-full">
            {localPlayer.hand.map((card, i) => {
              const total = localPlayer.hand.length;
              const mid = (total - 1) / 2;
              const angle = (i - mid) * (total > 10 ? 2 : 4);
              const isSelected = selectedIds.includes(card.id);
              
              return (
                <div 
                  key={card.id} onClick={() => handleCardSelect(card.id)}
                  className={`transition-all duration-300 relative transform-gpu cursor-pointer group 
                    ${isSelected ? '-translate-y-16 scale-110 z-[1000]' : 'hover:-translate-y-12 hover:z-[5000] hover:scale-125'}`}
                  style={{ 
                    marginLeft: i === 0 ? 0 : '-40px', 
                    transform: !isSelected ? `rotate(${angle}deg) translateY(${Math.abs(i - mid) * 3}px)` : 'none',
                    zIndex: isSelected ? 1000 : i
                  }}
                >
                  <UnoCard card={card} size="sm" playable={isMyTurn && isMoveValid(card, gameState, localPlayer.hand)} disabled={!isMyTurn} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-[10000] transition-opacity duration-300 ${activeMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveMenu(null)}></div>
         <div className={`absolute bottom-0 left-0 right-0 bg-[#120000] border-t-4 border-white/10 rounded-t-[3rem] p-8 pb-12 transition-transform duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] ${activeMenu ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-8"></div>
            
            {activeMenu === 'emoji' && (
              <div className="grid grid-cols-4 gap-6 animate-fade-in justify-items-center">
                {['😂', '😈', '😡', '🥱', '🤫', '💀', '🔥', '👑', '💣', '💩', '🤝', '🍀', '🤡', '🤑', '🤬', '🚀'].map(e => (
                  <button key={e} onClick={() => { onSendReaction(localPlayerId, e); setActiveMenu(null); }} className="text-5xl active:scale-150 transition-transform p-3 hover:bg-white/5 rounded-2xl">{e}</button>
                ))}
              </div>
            )}
            
            {activeMenu === 'voice' && (
              <div className="flex flex-col gap-3 animate-fade-in max-h-[50vh] overflow-y-auto no-scrollbar pr-2">
                {VOICE_PHRASES.map(v => (
                  <button key={v} onClick={() => { onSendVoice(localPlayerId, v); setActiveMenu(null); }} className="text-left p-5 bg-white/5 rounded-2xl text-xs font-black uppercase text-white/70 active:bg-yellow-500 active:text-black border border-white/10 transition-all">{v}</button>
                ))}
              </div>
            )}
            
            {activeMenu === 'audio' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <h4 className="text-yellow-400 font-brand text-center italic uppercase tracking-widest text-xl">Controle da Arena</h4>
                <div className="space-y-6 px-4">
                  <div className="flex justify-between text-xs font-black text-white/50 uppercase tracking-widest">
                    <span>Master Volume</span>
                    <span className="text-yellow-400">{Math.round(audioVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" value={audioVolume} 
                    onChange={(e) => { const v = parseFloat(e.target.value); setAudioVolume(v); audio.setVolume(v); }} 
                    className="w-full h-3 bg-white/10 rounded-full appearance-none accent-yellow-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => { audio.play('click'); setAudioMuted(audio.toggleMute()); }} className={`py-6 rounded-3xl font-brand text-sm border-2 transition-all flex items-center justify-center gap-3 ${audioMuted ? 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-white'}`}>{audioMuted ? '🔇 MUDO' : '🔊 ÁUDIO'}</button>
                  <button onClick={() => { audio.play('click'); audio.nextTrack(); }} className="py-6 bg-yellow-500 text-black rounded-3xl font-brand text-sm shadow-2xl active:scale-95 border-b-4 border-yellow-700">⏭️ TROCAR FAIXA</button>
                </div>
                <button onClick={() => setActiveMenu(null)} className="w-full py-6 bg-white/10 rounded-3xl font-brand text-lg border border-white/20 uppercase italic mt-4">Fechar Configurações</button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default GameTable;
