
import React, { useState, useEffect, useRef } from 'react';
import { GameState, CardColor, CardType, GameStatus, Player, OnlinePresence, GameMode, EphemeralReaction } from '../types';
import UnoCard from './UnoCard';
import { isMoveValid } from '../engine/unoLogic';
import { COLOR_CLASSES, VOICE_PHRASES } from '../constants';
import { audio } from '../services/audioService';

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

const GameTable: React.FC<GameTableProps> = ({ gameState, localPlayerId, equippedSkin, reactions, onPlayCard, onDrawCard, onCallUno, onSendReaction, onTimeout, onSendVoice, onStartGame, onLeaveRoom, onlinePlayers }) => {
  // Segurança: Evita crash caso o jogador local ainda não esteja no array (sincronização pendente)
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex] || gameState.players[0];
  const isMyTurn = gameState.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState.settings.turnTimeLimit);
  const [vol, setVol] = useState(audio.getVolume());
  const [copySuccess, setCopySuccess] = useState(false);
  
  const lastSecondRef = useRef<number>(-1);

  const ALL_EMOJIS = ['😂', '😈', '😡', '🃏', '😎', '💩', '👋', '🤫', '🤡', '💀', '🔥', '👑', '🤢', '👽', '👻', '💎'];

  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const remaining = Math.max(0, gameState.settings.turnTimeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0 && remaining !== lastSecondRef.current) {
        audio.play('tick');
        lastSecondRef.current = remaining;
      }
      if (remaining === 0 && lastSecondRef.current !== 0) {
        lastSecondRef.current = 0;
        onTimeout(currentPlayer.id);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.currentPlayerIndex, gameState.status]);

  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
    // REMOVIDO: showEmojiMenu e showVoiceMenu não fecham mais no turno dos outros
    if (isMyTurn) {
        audio.play('click');
        // Se eu abrir o menu e for meu turno, posso fechar se quiser, mas não automaticamente
    }
  }, [gameState.currentPlayerIndex]);

  // Se o localPlayer for undefined (ex: entrando na sala), mostra loading
  if (!localPlayer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#022c22]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(gameState.id);
    setCopySuccess(true);
    audio.play('click');
    setTimeout(() => setCopySuccess(false), 2000);
  };

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
    } else if (gameState.settings.mirrorRuleEnabled) {
      const firstCard = localPlayer.hand.find(c => c.id === selectedIds[0])!;
      const sameValue = card.type === firstCard.type && (card.type === CardType.NUMBER ? card.value === firstCard.value : true);
      if (sameValue && card.color !== CardColor.WILD) {
        setSelectedIds(prev => [...prev, id]);
        audio.play('click');
      }
    }
  };

  const renderHand = () => {
    const hand = localPlayer.hand;
    const screenWidth = window.innerWidth;
    const maxHandWidth = screenWidth * 0.9;
    const cardBaseWidth = screenWidth < 768 ? 65 : 100;
    const totalCards = hand.length;
    let overlap = screenWidth < 768 ? -40 : -60;
    if (totalCards * (cardBaseWidth + overlap) > maxHandWidth) overlap = (maxHandWidth / totalCards) - cardBaseWidth;
    return (
      <div className="flex justify-center items-end w-full max-w-full overflow-visible px-2 h-full">
        {hand.map((card, i) => {
          const isSelected = selectedIds.includes(card.id);
          const playable = isMyTurn && isMoveValid(card, gameState);
          return (
            <div 
              key={card.id} 
              onClick={() => handleCardSelect(card.id)} 
              className={`transition-all duration-200 relative transform-gpu ${isSelected ? '-translate-y-16 lg:-translate-y-28 z-[100] scale-110' : 'hover:-translate-y-8 z-10'}`} 
              style={{ marginLeft: i === 0 ? 0 : `${overlap}px`, zIndex: i + (isSelected ? 200 : 10) }}
            >
              <UnoCard card={card} skin={equippedSkin} size={screenWidth < 768 ? 'sm' : 'md'} playable={playable} disabled={!isMyTurn} />
            </div>
          );
        })}
      </div>
    );
  };

  const PlayerVisual = ({ p, isLocal }: { p: Player, isLocal?: boolean }) => {
    const reaction = reactions[p.id];
    const isCurrent = currentPlayer?.id === p.id;
    return (
      <div className={`relative flex flex-col items-center transition-all ${isCurrent ? 'scale-110 z-50' : 'opacity-70 z-10'}`}>
        {reaction?.reaction && <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-[300] animate-reaction text-4xl lg:text-5xl">{reaction.reaction}</div>}
        {reaction?.voicePhrase && <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-[300] animate-slide-up bg-white text-emerald-900 px-3 py-1.5 rounded-xl text-[8px] lg:text-[10px] font-black uppercase whitespace-nowrap shadow-2xl border-2 border-emerald-500">{reaction.voicePhrase}</div>}
        <div className="relative mb-1">
          <div className={`w-10 h-10 lg:w-20 lg:h-20 rounded-full border-4 ${isCurrent ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse' : 'border-white/10'} bg-black/40 flex items-center justify-center text-xl lg:text-4xl`}>{p.avatar}</div>
          {!isLocal && <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] lg:text-[10px] w-5 h-5 lg:w-7 lg:h-7 rounded-full flex items-center justify-center border-2 border-emerald-950 font-black">{p.hand.length}</div>}
        </div>
        <span className="text-[7px] lg:text-[10px] font-black uppercase truncate w-14 lg:w-24 text-center tracking-widest text-white drop-shadow-md">{p.name}</span>
      </div>
    );
  };

  if (gameState.status === GameStatus.LOBBY) {
    const humans = gameState.players.filter(p => !p.isBot).length;
    const bots = gameState.players.filter(p => p.isBot).length;
    const canStart = humans + bots >= 2;
    return (
        <div className="flex-1 flex flex-col lg:flex-row h-full animate-fade-in z-10 overflow-hidden relative">
          <button onClick={onLeaveRoom} className="absolute top-4 left-4 z-[200] bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-white px-4 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-widest">🚪 ABANDONAR ARENA</button>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 bg-black/20 text-center">
            <h1 className="text-5xl lg:text-8xl font-brand text-yellow-400 drop-shadow-2xl italic tracking-tighter">ARENA {gameState.id}</h1>
            
            <button 
              onClick={handleCopyInvite}
              className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
            >
              {copySuccess ? 'CÓDIGO COPIADO! ✓' : 'CONVIDAR AMIGOS 🔗'}
            </button>

            <div className="flex flex-wrap justify-center gap-3 max-w-2xl px-4 overflow-y-auto no-scrollbar max-h-[40vh]">
              {gameState.players.map(p => (
                <div key={p.id} className="bg-black/40 p-3 rounded-[2rem] border border-white/10 flex flex-col items-center gap-2 w-24 lg:w-36 animate-slide-up relative group">
                  <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-black/40 flex items-center justify-center text-2xl lg:text-4xl border-2 transition-all ${p.isHost ? 'border-yellow-500 shadow-lg' : 'border-white/10'}`}>{p.avatar}</div>
                  <div className="text-center"><p className="font-bold text-[8px] lg:text-xs truncate w-20 lg:w-28 uppercase tracking-widest">{p.name}</p></div>
                </div>
              ))}
            </div>
            
            {localPlayer.isHost && (
              <button 
                onClick={onStartGame} 
                disabled={!canStart} 
                className={`px-16 py-6 font-brand text-2xl lg:text-4xl rounded-3xl transition-all ${canStart ? 'bg-yellow-500 text-emerald-950 shadow-[0_8px_0_#a16207] active:translate-y-1 active:shadow-none' : 'bg-white/10 text-white/20 cursor-not-allowed border border-white/5 opacity-50'}`}
              >
                {canStart ? 'COMBATER' : `MÍNIMO 2 COMBATENTES`}
              </button>
            )}
          </div>
        </div>
    );
  }

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#022c22]">
      <div className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-500 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
      
      {/* Botões de Canto */}
      <div className="absolute top-4 right-4 flex gap-2 z-[200]">
        <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-xl border border-white/10 shadow-lg">⚙️</button>
      </div>

      {showAudioSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-6" onClick={() => setShowAudioSettings(false)}>
           <div className="bg-emerald-950 p-8 rounded-[3rem] border border-white/10 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-brand text-yellow-400 mb-6 italic text-center">AUDIO ARENA</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase text-white/30 block mb-2">Volume Geral</label>
                    <input type="range" min="0" max="1" step="0.1" value={vol} onChange={e => { const v = parseFloat(e.target.value); setVol(v); audio.setVolume(v); }} className="w-full accent-yellow-500" />
                 </div>
                 <button onClick={() => audio.nextTrack()} className="w-full py-4 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">Próxima Música 🎵</button>
                 <button onClick={() => audio.toggleMute()} className="w-full py-4 bg-red-600/20 text-red-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-600/40 transition-colors">Silenciar 🔇</button>
                 <button onClick={() => setShowAudioSettings(false)} className="w-full py-4 bg-yellow-500 text-emerald-950 rounded-2xl font-brand text-xl">SALVAR</button>
              </div>
           </div>
        </div>
      )}

      <div className="h-20 lg:h-28 flex justify-center items-center gap-3 lg:gap-12 px-2 z-50 pt-2">
        {gameState.players.filter(p => p.id !== localPlayerId).map((opp) => (
          <PlayerVisual key={opp.id} p={opp} />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center relative scale-85 lg:scale-100 z-20">
        <div className="flex items-center gap-10 lg:gap-20 relative">
          <button onClick={() => isMyTurn && onDrawCard(localPlayerId)} disabled={!isMyTurn} className={`transform active:scale-95 transition-all ${isMyTurn ? 'cursor-pointer hover:scale-110' : 'opacity-20'}`}>
            <UnoCard card={{} as any} hidden size="md" />
          </button>
          <div className="relative">
            <UnoCard card={topDiscard} skin={equippedSkin} size="md" disabled />
            <div className={`absolute -top-4 -right-4 lg:-top-6 lg:-right-6 w-10 h-10 lg:w-16 lg:h-16 rounded-full border-4 border-white shadow-2xl ${COLOR_CLASSES[gameState.currentColor]} animate-pulse`}></div>
          </div>
        </div>
      </div>

      <div className="h-[45%] flex flex-col items-center justify-end z-[100] relative pb-2">
        {isMyTurn && <div className="bg-yellow-500 text-emerald-950 px-6 py-1.5 rounded-full font-brand text-xs lg:text-xl shadow-2xl border-2 border-white animate-bounce mb-2">SUA VEZ!</div>}
        <div className="w-[95%] max-w-4xl bg-black/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-2 lg:p-3 flex items-center justify-between shadow-2xl mb-4">
           <div className="flex items-center gap-3">
              <PlayerVisual p={localPlayer} isLocal />
              <div className="flex gap-2">
                 <button onClick={() => setShowEmojiMenu(!showEmojiMenu)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showEmojiMenu ? 'bg-yellow-500 text-emerald-900' : 'bg-white/5'}`}>💬</button>
                 <button onClick={() => setShowVoiceMenu(!showVoiceMenu)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showVoiceMenu ? 'bg-blue-500 text-white' : 'bg-white/5'}`}>🗣️</button>
              </div>
           </div>
           <div className="flex items-center gap-3">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-5 py-2 bg-red-600 text-white font-brand text-xs lg:text-lg rounded-full animate-pulse shadow-xl">UNO!</button>
              )}
              {selectedIds.length > 0 && !showPicker && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-8 py-3 bg-yellow-500 text-emerald-950 font-brand text-sm lg:text-2xl rounded-full shadow-xl">JOGAR</button>
              )}
              {isMyTurn && <div className="bg-white/10 px-4 py-2 rounded-full font-brand text-sm lg:text-xl text-yellow-400 border border-white/5">{timeLeft}s</div>}
           </div>
        </div>
        <div className="w-full h-32 lg:h-40 overflow-visible">{renderHand()}</div>
      </div>

      {showEmojiMenu && (
        <div className="fixed inset-0 bg-black/40 z-[600]" onClick={() => setShowEmojiMenu(false)}>
          <div className="absolute bottom-40 left-10 bg-[#021a14] p-4 rounded-3xl border border-white/10 grid grid-cols-4 gap-2 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
             {ALL_EMOJIS.map(e => <button key={e} onClick={() => { onSendReaction(localPlayerId, e); setShowEmojiMenu(false); }} className="text-3xl p-2 hover:scale-125 transition-transform">{e}</button>)}
          </div>
        </div>
      )}

      {showVoiceMenu && (
        <div className="fixed inset-0 bg-black/40 z-[600]" onClick={() => setShowVoiceMenu(false)}>
          <div className="absolute bottom-40 left-10 bg-[#021a14] p-4 rounded-3xl border border-white/10 flex flex-col gap-1 animate-slide-up w-64 max-h-60 overflow-y-auto no-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
             {VOICE_PHRASES.map(v => <button key={v} onClick={() => { onSendVoice(localPlayerId, v); setShowVoiceMenu(false); }} className="text-left px-4 py-3 hover:bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest border border-white/5 text-white/60">{v}</button>)}
          </div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[600] flex items-center justify-center animate-fade-in p-6">
           <div className="bg-emerald-950/40 p-8 rounded-[3rem] border border-white/10 text-center max-w-sm w-full">
              <h3 className="text-2xl font-brand text-yellow-400 mb-8 italic uppercase">ESCOLHA A COR</h3>
              <div className="grid grid-cols-2 gap-4">
                {[CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW].map(c => <button key={c} onClick={() => { onPlayCard(localPlayerId, selectedIds, c, unoDeclared); setShowPicker(false); }} className={`w-full aspect-square rounded-3xl ${COLOR_CLASSES[c]} border-4 border-white/10 hover:border-white transition-all shadow-xl`}></button>)}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
