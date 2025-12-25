
import React, { useState, useEffect, useRef } from 'react';
import { GameState, CardColor, CardType, GameStatus, Player, OnlinePresence, GameMode, EphemeralReaction } from '../types';
import UnoCard from './UnoCard';
import { isMoveValid } from '../engine/unoLogic';
import { COLOR_CLASSES, VOICE_PHRASES } from '../constants';
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
  const localPlayer = gameState?.players.find(p => p.id === localPlayerId);
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex] || gameState?.players[0];
  const isMyTurn = gameState?.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState?.settings?.turnTimeLimit || 15);
  const [vol, setVol] = useState(audio.getVolume());
  const [copySuccess, setCopySuccess] = useState(false);
  
  const lastSecondRef = useRef<number>(-1);
  const ALL_EMOJIS = ['😂', '😈', '😡', '🃏', '😎', '💩', '👋', '🤫', '🤡', '💀', '🔥', '👑', '🤢', '👽', '👻', '💎'];

  useEffect(() => {
    if (!gameState || gameState.status !== GameStatus.PLAYING || !currentPlayer) return;
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
        onTimeout(currentPlayer.id);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState?.turnStartTime, gameState?.currentPlayerIndex, gameState?.status]);

  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
    if (isMyTurn) audio.play('click');
  }, [gameState?.currentPlayerIndex, isMyTurn]);

  // Fallback de Segurança - Se os dados fundamentais sumirem, mostra tela de carregamento amigável
  if (!gameState || !localPlayer || !gameState.players.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#022c22] gap-6 animate-fade-in h-screen w-screen">
        <div className="w-20 h-20 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <p className="font-brand text-yellow-400 text-2xl animate-pulse italic uppercase tracking-widest">Sincronizando Arena</p>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Aguardando dados do Host...</p>
        </div>
        <button onClick={onLeaveRoom} className="mt-8 px-8 py-3 bg-red-600/20 text-red-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600/40 transition-all border border-red-500/20">Sair da Fila</button>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.id);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    audio.play('click');
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
    } else if (gameState.settings?.mirrorRuleEnabled) {
      const firstCard = localPlayer.hand.find(c => c.id === selectedIds[0]);
      if (firstCard) {
        const sameValue = card.type === firstCard.type && (card.type === CardType.NUMBER ? card.value === firstCard.value : true);
        if (sameValue && card.color !== CardColor.WILD) {
          setSelectedIds(prev => [...prev, id]);
          audio.play('click');
        }
      } else {
        setSelectedIds([id]);
      }
    }
  };

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  // LOBBY DE ESPERA DA SALA
  if (gameState.status === GameStatus.LOBBY) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full animate-fade-in z-10 overflow-hidden relative bg-[#022c22] p-10">
          <button onClick={onLeaveRoom} className="absolute top-4 left-4 z-[200] bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-white px-4 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-widest">🚪 SAIR DA SALA</button>
          
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-6xl lg:text-9xl font-brand text-yellow-400 drop-shadow-2xl italic tracking-tighter uppercase">Arena {gameState.id}</h1>
            <button onClick={handleCopyCode} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors py-2 px-4 rounded-full ${copySuccess ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
              {copySuccess ? '✓ CÓDIGO COPIADO' : 'CÓDIGO DE CONVITE 🔗'}
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-12 max-w-4xl px-4">
            {gameState.players.map(p => (
              <div key={p.id} className="bg-black/40 p-4 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-3 w-28 lg:w-40 animate-slide-up relative shadow-xl">
                <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-black/40 flex items-center justify-center text-3xl lg:text-5xl border-2 transition-all ${p.isHost ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>{p.avatar}</div>
                <div className="text-center">
                   <p className="font-bold text-[10px] lg:text-xs truncate w-24 lg:w-32 uppercase tracking-widest text-white/80">{p.name}</p>
                   <p className="text-[7px] text-white/30 font-black uppercase tracking-tighter">{p.isBot ? 'IA BOT' : p.rank}</p>
                </div>
                {p.isHost && <span className="absolute -top-2 bg-yellow-500 text-emerald-950 text-[6px] font-black px-3 py-1 rounded-full uppercase">LÍDER</span>}
              </div>
            ))}
          </div>
          
          {localPlayer.isHost ? (
            <button 
              onClick={onStartGame} 
              className="px-20 py-8 font-brand text-3xl lg:text-5xl rounded-3xl bg-yellow-500 text-emerald-950 border-b-8 border-yellow-700 active:translate-y-2 active:border-b-0 hover:scale-[1.05] transition-all"
            >
              INICIAR COMBATE
            </button>
          ) : (
            <div className="text-white/20 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Aguardando o Líder iniciar...</div>
          )}
        </div>
    );
  }

  // JOGO ATIVO
  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#022c22]">
      <div className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
      
      {/* Botão de Configurações */}
      <div className="absolute top-4 right-4 flex gap-2 z-[200]">
        <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-2xl border border-white/10 shadow-2xl hover:bg-black/80 transition-all active:scale-90">⚙️</button>
      </div>

      {/* Jogadores Oponentes */}
      <div className="h-24 lg:h-32 flex justify-center items-center gap-4 lg:gap-16 px-4 z-50 pt-4">
        {gameState.players.filter(p => p.id !== localPlayerId).map((opp) => (
          <div key={opp.id} className={`relative flex flex-col items-center transition-all ${currentPlayer?.id === opp.id ? 'scale-110 z-50' : 'opacity-70'}`}>
            <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-full border-4 ${currentPlayer?.id === opp.id ? 'border-yellow-400 shadow-xl' : 'border-white/10'} bg-black/40 flex items-center justify-center text-2xl lg:text-5xl`}>{opp.avatar}</div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] lg:text-[10px] w-5 h-5 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border-2 border-emerald-950 font-black">{opp.hand.length}</div>
            <span className="text-[7px] lg:text-[10px] font-black uppercase mt-1 tracking-widest text-white/80">{opp.name}</span>
          </div>
        ))}
      </div>

      {/* Centro da Mesa */}
      <div className="flex-1 flex items-center justify-center relative scale-90 lg:scale-110 z-20">
        <div className="flex items-center gap-10 lg:gap-24">
          <button onClick={() => isMyTurn && onDrawCard(localPlayerId)} disabled={!isMyTurn} className={`transform active:scale-95 transition-all ${isMyTurn ? 'cursor-pointer hover:scale-105' : 'opacity-20'}`}>
            <UnoCard card={{} as any} hidden size="md" />
          </button>
          <div className="relative group">
            <UnoCard card={topDiscard || ({} as any)} skin={equippedSkin} size="md" disabled />
            {topDiscard && (
              <div className={`absolute -top-4 -right-4 lg:-top-6 lg:-right-6 w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-white shadow-2xl ${COLOR_CLASSES[gameState.currentColor]} animate-pulse`}></div>
            )}
            {gameState.pendingDrawCount > 0 && (
              <div className="absolute -bottom-4 -left-4 bg-red-600 text-white px-4 py-1.5 rounded-full font-brand text-xl shadow-2xl animate-bounce border-2 border-white">+{gameState.pendingDrawCount}</div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé do Jogador */}
      <div className="h-[45%] flex flex-col items-center justify-end z-[100] relative pb-6">
        <div className="w-[95%] max-w-5xl bg-black/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-3 lg:p-5 flex items-center justify-between shadow-2xl mb-6">
           <div className="flex items-center gap-4 px-4">
              <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 ${isMyTurn ? 'border-yellow-400 shadow-xl' : 'border-white/10'} bg-black/40 flex items-center justify-center text-3xl lg:text-4xl`}>{localPlayer.avatar}</div>
              <div className="flex gap-2">
                 <button onClick={() => setShowEmojiMenu(!showEmojiMenu)} className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">💬</button>
                 <button onClick={() => setShowVoiceMenu(!showVoiceMenu)} className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">🗣️</button>
              </div>
           </div>
           
           <div className="flex items-center gap-4 px-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-6 py-3 bg-red-600 text-white font-brand text-xl rounded-full animate-pulse shadow-xl border-2 border-white">UNO!</button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-10 py-4 bg-yellow-500 text-emerald-950 font-brand text-2xl lg:text-3xl rounded-full shadow-2xl hover:scale-105 transition-all">JOGAR</button>
              )}
              {isMyTurn && <div className="bg-white/10 px-6 py-2 rounded-full font-brand text-2xl text-yellow-400 border border-white/20 shadow-inner">{timeLeft}s</div>}
           </div>
        </div>

        <div className="w-full h-40 lg:h-48 overflow-visible">
          <div className="flex justify-center items-end w-full max-w-full overflow-visible px-4 h-full">
            {localPlayer.hand.map((card, i) => {
              const isSelected = selectedIds.includes(card.id);
              const playable = isMyTurn && isMoveValid(card, gameState);
              const overlap = window.innerWidth < 768 ? '-45px' : '-55px';
              
              return (
                <div 
                  key={card.id} 
                  onClick={() => handleCardSelect(card.id)} 
                  className={`transition-all duration-300 relative transform-gpu ${isSelected ? '-translate-y-20 lg:-translate-y-32 z-[200] scale-110' : 'hover:-translate-y-10 z-10'}`} 
                  style={{ marginLeft: i === 0 ? 0 : overlap }}
                >
                  <UnoCard card={card} skin={equippedSkin} size={window.innerWidth < 768 ? 'sm' : 'md'} playable={playable} disabled={!isMyTurn} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seletor de Cores Coringa */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[1100] flex items-center justify-center animate-fade-in p-6">
           <div className="bg-emerald-950/40 p-10 rounded-[4rem] border border-white/10 text-center max-w-sm w-full shadow-2xl">
              <h3 className="text-3xl font-brand text-yellow-400 mb-10 italic uppercase tracking-tighter">Escolha a Próxima Cor</h3>
              <div className="grid grid-cols-2 gap-5">
                {[CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW].map(c => (
                  <button 
                    key={c} 
                    onClick={() => { onPlayCard(localPlayerId, selectedIds, c, unoDeclared); setShowPicker(false); }} 
                    className={`w-full aspect-square rounded-3xl ${COLOR_CLASSES[c]} border-4 border-white/10 hover:border-white hover:scale-105 active:scale-95 transition-all shadow-xl`}
                  ></button>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Modal de Áudio */}
      {showAudioSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAudioSettings(false)}>
           <div className="bg-emerald-950 p-10 rounded-[3.5rem] border border-white/10 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-3xl font-brand text-yellow-400 mb-8 italic text-center uppercase tracking-widest">Som da Arena</h3>
              <div className="space-y-8">
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Volume Geral</label>
                      <span className="text-yellow-400 font-brand">{Math.round(vol * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" value={vol} 
                      onChange={e => { 
                        const v = parseFloat(e.target.value); 
                        setVol(v); 
                        audio.setVolume(v); 
                      }} 
                      className="w-full h-2 bg-white/10 rounded-full appearance-none accent-yellow-500 cursor-pointer" 
                    />
                 </div>
                 <button onClick={() => setShowAudioSettings(false)} className="w-full py-5 bg-yellow-500 text-emerald-950 rounded-2xl font-brand text-2xl shadow-xl hover:bg-yellow-400 transition-all">SALVAR</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
