
import React, { useState, useEffect, useRef } from 'react';
import { GameState, CardColor, CardType, GameStatus, Player, OnlinePresence, EphemeralReaction } from '../types';
import UnoCard from './UnoCard';
import { isMoveValid } from '../engine/unoLogic';
import { COLOR_CLASSES } from '../constants';
import { audio } from '../services/audioService';

interface GameTableProps {
  gameState: GameState | null;
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

const GameTable: React.FC<GameTableProps> = ({ gameState, localPlayerId, equippedSkin, reactions, onPlayCard, onDrawCard, onCallUno, onSendReaction, onTimeout, onSendVoice, onStartGame, onLeaveRoom, onlinePlayers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const lastSecondRef = useRef<number>(-1);

  useEffect(() => {
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const limit = gameState.settings?.turnTimeLimit || 15;
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 5 && remaining > 0 && remaining !== lastSecondRef.current) {
        audio.play('tick');
        lastSecondRef.current = remaining;
      }
      if (remaining === 0 && lastSecondRef.current !== 0) {
        lastSecondRef.current = 0;
        const currentP = gameState.players[gameState.currentPlayerIndex];
        if (currentP?.id === localPlayerId) onTimeout(currentP.id);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState?.turnStartTime, gameState?.currentPlayerIndex, gameState?.status]);

  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
  }, [gameState?.currentPlayerIndex]);

  if (!gameState) return null;

  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  if (!localPlayer) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = gameState.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  const handleCardSelect = (id: string) => {
    if (!isMyTurn) return;
    const card = localPlayer.hand.find(c => c.id === id);
    if (!card) return;

    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
      return;
    }

    if (selectedIds.length === 0) {
      if (isMoveValid(card, gameState)) {
        if (card.color === CardColor.WILD) setShowPicker(true);
        setSelectedIds([id]);
        audio.play('click');
      }
    } else if (gameState.settings?.mirrorRuleEnabled) {
      const first = localPlayer.hand.find(c => c.id === selectedIds[0]);
      if (first && card.type === first.type && (card.type === CardType.NUMBER ? card.value === first.value : true)) {
        setSelectedIds(prev => [...prev, id]);
        audio.play('click');
      }
    }
  };

  if (gameState.status === GameStatus.LOBBY) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 bg-[#022c22] animate-fade-in relative">
        <button onClick={onLeaveRoom} className="absolute top-8 left-8 bg-white/5 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-red-500/20 transition-all">SAIR</button>
        <div className="text-center mb-16">
          <h1 className="text-8xl font-brand text-yellow-400 italic mb-4">ARENA {gameState.id}</h1>
          <p className="text-white/20 font-black uppercase tracking-[0.4em]">Aguardando combatentes...</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 mb-16 max-w-4xl">
          {gameState.players.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-4 bg-black/40 p-8 rounded-[3rem] border border-white/10 w-40 animate-slide-up shadow-2xl relative">
              <div className={`text-6xl ${p.isHost ? 'ring-4 ring-yellow-400' : ''} rounded-full p-2`}>{p.avatar}</div>
              <p className="font-bold text-sm uppercase truncate w-full text-center">{p.name}</p>
              {p.isHost && <span className="absolute -top-3 bg-yellow-400 text-emerald-950 text-[8px] font-black px-3 py-1 rounded-full">HOST</span>}
            </div>
          ))}
        </div>
        {localPlayer.isHost ? (
          <button onClick={onStartGame} className="px-20 py-8 bg-yellow-500 text-emerald-950 font-brand text-4xl rounded-3xl shadow-[0_12px_0_#a16207] active:translate-y-2 active:shadow-none hover:scale-105 transition-all">INICIAR COMBATE</button>
        ) : (
          <p className="text-yellow-400 font-brand text-2xl animate-pulse">O HOST ESTÁ PREPARANDO O BARALHO...</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[#022c22] overflow-hidden">
      {/* Background Dinâmico */}
      <div className={`absolute inset-0 opacity-10 transition-colors duration-1000 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
      
      {/* Oponentes Superior */}
      <div className="h-[25%] flex justify-center items-start gap-4 lg:gap-12 px-6 pt-10 relative z-10">
        {gameState.players.filter(p => p.id !== localPlayerId).map((opp) => (
          <div key={opp.id} className={`flex flex-col items-center transition-all duration-500 ${currentPlayer?.id === opp.id ? 'scale-110' : 'opacity-60 scale-90'}`}>
             <div className="relative">
                <div className={`w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-black/40 border-4 ${currentPlayer?.id === opp.id ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] animate-pulse' : 'border-white/10'} flex items-center justify-center text-3xl lg:text-5xl`}>
                  {opp.avatar}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-blue-600 w-8 h-8 rounded-full border-2 border-emerald-950 flex items-center justify-center font-black text-xs shadow-lg">{opp.hand.length}</div>
                {reactions[opp.id] && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-reaction whitespace-nowrap bg-white text-emerald-950 px-4 py-2 rounded-2xl font-bold shadow-2xl z-[200]">
                    {reactions[opp.id].reaction || reactions[opp.id].voicePhrase}
                  </div>
                )}
             </div>
             <p className="text-[10px] font-black uppercase mt-2 text-white/70 tracking-tighter">{opp.name}</p>
          </div>
        ))}
      </div>

      {/* Centro da Mesa: Baralho e Descarte */}
      <div className="flex-1 flex items-center justify-center gap-10 lg:gap-20 relative z-20">
        <div className={`transition-all duration-300 ${isMyTurn ? 'hover:scale-105 cursor-pointer' : 'opacity-50 grayscale'}`} onClick={() => isMyTurn && onDrawCard(localPlayerId)}>
          <UnoCard card={{} as any} hidden size="md" />
        </div>
        
        <div className="relative group">
           <UnoCard card={topDiscard || ({} as any)} skin={equippedSkin} size="md" disabled />
           <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full border-8 border-white shadow-2xl transition-all duration-500 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
           {gameState.pendingDrawCount > 0 && (
             <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-2 rounded-full font-brand text-2xl animate-bounce shadow-2xl border-4 border-white">+{gameState.pendingDrawCount}</div>
           )}
        </div>
      </div>

      {/* Área do Jogador Inferior */}
      <div className="h-[40%] flex flex-col items-center justify-end pb-8 relative z-30">
        {/* Barra de Ações do Player */}
        <div className="w-[90%] max-w-4xl bg-black/60 backdrop-blur-3xl rounded-[3rem] p-4 flex items-center justify-between mb-6 border border-white/10 shadow-2xl">
           <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full bg-black/40 border-4 ${isMyTurn ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 'border-white/10'} flex items-center justify-center text-3xl`}>{localPlayer.avatar}</div>
              <div className="hidden lg:block">
                 <p className="font-brand text-lg italic text-white/90">{localPlayer.name}</p>
                 <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{isMyTurn ? 'SEU TURNO!' : 'AGUARDANDO...'}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-8 py-3 bg-red-600 text-white font-brand text-xl rounded-2xl animate-bounce border-b-4 border-red-800 active:border-b-0 active:translate-y-1">UNO!</button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-12 py-3 bg-yellow-500 text-emerald-950 font-brand text-2xl rounded-2xl shadow-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1">JOGAR</button>
              )}
              {isMyTurn && <div className="bg-white/10 px-5 py-2 rounded-2xl font-brand text-2xl text-yellow-400 border border-white/5">{timeLeft}s</div>}
           </div>
           
           <button onClick={() => setShowEmojiMenu(!showEmojiMenu)} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10 transition-all border border-white/10">💬</button>
        </div>

        {/* Mão de Cartas */}
        <div className="w-full flex justify-center items-end px-4 overflow-x-auto no-scrollbar pb-4 min-h-[160px]">
          <div className="flex items-end justify-center">
            {localPlayer.hand.map((card, i) => (
              <div 
                key={card.id} 
                onClick={() => handleCardSelect(card.id)} 
                className={`transition-all duration-300 relative ${selectedIds.includes(card.id) ? '-translate-y-20 scale-110 z-50' : 'hover:-translate-y-8 z-10'} card-stack-offset`}
                style={{ marginLeft: i === 0 ? 0 : '-50px', zIndex: i }}
              >
                <UnoCard card={card} skin={equippedSkin} size="sm" playable={isMyTurn && isMoveValid(card, gameState)} disabled={!isMyTurn} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modais de UI */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[1000] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-[#021d18] p-12 rounded-[4rem] text-center border border-white/10 max-w-sm w-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <h3 className="text-4xl font-brand text-yellow-400 mb-12 italic uppercase tracking-tighter">Escolha a Cor</h3>
              <div className="grid grid-cols-2 gap-6">
                {[CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW].map(c => (
                  <button key={c} onClick={() => { onPlayCard(localPlayerId, selectedIds, c, unoDeclared); setShowPicker(false); }} className={`w-full aspect-square rounded-[2rem] ${COLOR_CLASSES[c]} border-8 border-white/10 hover:border-white hover:scale-105 transition-all shadow-2xl`}></button>
                ))}
              </div>
           </div>
        </div>
      )}

      {showEmojiMenu && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" onClick={() => setShowEmojiMenu(false)}>
           <div className="bg-black/90 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 grid grid-cols-4 gap-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              {['😂','😈','😱','🤡','🤫','🔥','💤','👎'].map(emoji => (
                <button key={emoji} onClick={() => { onSendReaction(localPlayerId, emoji); setShowEmojiMenu(false); }} className="w-16 h-16 rounded-2xl bg-white/5 hover:bg-white/20 text-4xl flex items-center justify-center transition-all">{emoji}</button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
