
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
  // SEGURANÇA: Busca o jogador local no estado sincronizado
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  // SEGURANÇA: Busca o jogador atual do turno
  const currentPlayer = gameState.players[gameState.currentPlayerIndex] || gameState.players[0];
  const isMyTurn = gameState.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState.settings?.turnTimeLimit || 15);
  const [vol, setVol] = useState(audio.getVolume());
  const [copySuccess, setCopySuccess] = useState(false);
  
  const lastSecondRef = useRef<number>(-1);
  const ALL_EMOJIS = ['😂', '😈', '😡', '🃏', '😎', '💩', '👋', '🤫', '🤡', '💀', '🔥', '👑', '🤢', '👽', '👻', '💎'];

  // Timer de Turno
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING || !currentPlayer) return;
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
  }, [gameState.turnStartTime, gameState.currentPlayerIndex, gameState.status]);

  // Reset de seleção ao mudar de turno
  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
    // Nota: Menus de Emoji e Voz não resetam mais aqui para evitar fechar sozinhos
    if (isMyTurn) audio.play('click');
  }, [gameState.currentPlayerIndex]);

  // Bloqueio de renderização se os dados básicos não estiverem prontos (Evita a Tela Verde)
  if (!localPlayer || !gameState.settings || gameState.players.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#022c22] gap-6 animate-fade-in">
        <div className="w-20 h-20 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <p className="font-brand text-yellow-500 text-2xl animate-pulse italic uppercase tracking-widest">Sincronizando Arena</p>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Aguardando dados do servidor...</p>
        </div>
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
      const firstCard = localPlayer.hand.find(c => c.id === selectedIds[0])!;
      const sameValue = card.type === firstCard.type && (card.type === CardType.NUMBER ? card.value === firstCard.value : true);
      if (sameValue && card.color !== CardColor.WILD) {
        setSelectedIds(prev => [...prev, id]);
        audio.play('click');
      }
    }
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

  // TELA DE LOBBY (PRÉ-JOGO)
  if (gameState.status === GameStatus.LOBBY) {
    const humans = gameState.players.filter(p => !p.isBot).length;
    const bots = gameState.players.filter(p => p.isBot).length;
    const canStart = humans + bots >= 2;
    return (
        <div className="flex-1 flex flex-col lg:flex-row h-full animate-fade-in z-10 overflow-hidden relative bg-[#022c22]">
          <button onClick={onLeaveRoom} className="absolute top-4 left-4 z-[200] bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-white px-4 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-widest">🚪 SAIR</button>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 bg-black/20 text-center">
            <div className="space-y-2">
              <h1 className="text-5xl lg:text-8xl font-brand text-yellow-400 drop-shadow-2xl italic tracking-tighter uppercase">Arena {gameState.id}</h1>
              <button onClick={handleCopyCode} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors py-2 px-4 rounded-full ${copySuccess ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                {copySuccess ? '✓ CÓDIGO COPIADO' : 'CONVIDAR AMIGOS 🔗'}
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 max-w-2xl px-4 overflow-y-auto no-scrollbar max-h-[40vh] py-4">
              {gameState.players.map(p => (
                <div key={p.id} className="bg-black/40 p-3 rounded-[2rem] border border-white/10 flex flex-col items-center gap-2 w-24 lg:w-36 animate-slide-up relative group shadow-xl">
                  <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-black/40 flex items-center justify-center text-2xl lg:text-4xl border-2 transition-all ${p.isHost ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>{p.avatar}</div>
                  <div className="text-center"><p className="font-bold text-[8px] lg:text-xs truncate w-20 lg:w-28 uppercase tracking-widest text-white/80">{p.name}</p></div>
                  {p.isHost && <span className="absolute -top-2 bg-yellow-500 text-emerald-900 text-[6px] font-black px-2 py-0.5 rounded-full uppercase">LÍDER</span>}
                </div>
              ))}
            </div>
            
            {localPlayer.isHost && (
              <button 
                onClick={onStartGame} 
                disabled={!canStart} 
                className={`px-16 py-6 font-brand text-2xl lg:text-4xl rounded-3xl transition-all ${canStart ? 'bg-yellow-500 text-emerald-950 shadow-[0_8px_0_#a16207] active:translate-y-1 active:shadow-none hover:scale-105' : 'bg-white/10 text-white/20 cursor-not-allowed border border-white/5 opacity-50'}`}
              >
                {canStart ? 'INICIAR COMBATE' : `AGUARDANDO JOGADORES...`}
              </button>
            )}
          </div>
        </div>
    );
  }

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  // TELA DE JOGO ATIVO
  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#022c22]">
      <div className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
      
      {/* Botão de Configurações */}
      <div className="absolute top-4 right-4 flex gap-2 z-[200]">
        <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-2xl border border-white/10 shadow-2xl hover:bg-black/80 transition-all active:scale-90">⚙️</button>
      </div>

      {/* Modal de Áudio */}
      {showAudioSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAudioSettings(false)}>
           <div className="bg-emerald-950 p-10 rounded-[3.5rem] border border-white/10 w-full max-w-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
              <h3 className="text-3xl font-brand text-yellow-400 mb-8 italic text-center tracking-widest uppercase">Central de Som</h3>
              
              <div className="space-y-8">
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Volume Master</label>
                      <span className="text-yellow-400 font-brand">{Math.round(vol * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={vol} 
                      onChange={e => { 
                        const v = parseFloat(e.target.value); 
                        setVol(v); 
                        audio.setVolume(v); 
                      }} 
                      className="w-full h-2 bg-white/10 rounded-full appearance-none accent-yellow-500 cursor-pointer" 
                    />
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                   <button onClick={() => audio.nextTrack()} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-widest text-white/60 transition-all border border-white/5">Trocar Música 🎵</button>
                   <button onClick={() => { audio.toggleMute(); setVol(audio.getVolume()); }} className={`w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border ${audio.getMuteStatus() ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-red-600/20 text-red-400 border-red-500/20'}`}>
                      {audio.getMuteStatus() ? 'Ativar Som 🔊' : 'Silenciar Tudo 🔇'}
                   </button>
                 </div>

                 <button onClick={() => setShowAudioSettings(false)} className="w-full py-5 bg-yellow-500 text-emerald-950 rounded-2xl font-brand text-2xl shadow-xl hover:bg-yellow-400 transition-all">SALVAR</button>
              </div>
           </div>
        </div>
      )}

      {/* Jogadores Oponentes */}
      <div className="h-24 lg:h-32 flex justify-center items-center gap-3 lg:gap-16 px-4 z-50 pt-4">
        {gameState.players.filter(p => p.id !== localPlayerId).map((opp) => (
          <PlayerVisual key={opp.id} p={opp} />
        ))}
      </div>

      {/* Centro da Mesa */}
      <div className="flex-1 flex items-center justify-center relative scale-90 lg:scale-100 z-20">
        <div className="flex items-center gap-12 lg:gap-24 relative">
          <button onClick={() => isMyTurn && onDrawCard(localPlayerId)} disabled={!isMyTurn} className={`transform active:scale-95 transition-all ${isMyTurn ? 'cursor-pointer hover:scale-110' : 'opacity-20'}`}>
            <UnoCard card={{} as any} hidden size="md" />
          </button>
          <div className="relative group">
            <UnoCard card={topDiscard} skin={equippedSkin} size="md" disabled />
            <div className={`absolute -top-4 -right-4 lg:-top-6 lg:-right-6 w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-white shadow-2xl ${COLOR_CLASSES[gameState.currentColor]} animate-pulse`}></div>
            {gameState.pendingDrawCount > 0 && (
              <div className="absolute -bottom-4 -left-4 bg-red-600 text-white px-4 py-1.5 rounded-full font-brand text-xl shadow-2xl animate-bounce border-2 border-white">+{gameState.pendingDrawCount}</div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé do Jogador */}
      <div className="h-[45%] flex flex-col items-center justify-end z-[100] relative pb-4">
        {isMyTurn && <div className="bg-yellow-500 text-emerald-950 px-8 py-2 rounded-full font-brand text-sm lg:text-2xl shadow-2xl border-2 border-white animate-bounce mb-3 uppercase tracking-tighter">Sua Vez!</div>}
        
        <div className="w-[95%] max-w-5xl bg-black/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-2 lg:p-4 flex items-center justify-between shadow-2xl mb-4">
           <div className="flex items-center gap-4 px-4">
              <PlayerVisual p={localPlayer} isLocal />
              <div className="flex gap-2">
                 <button onClick={() => setShowEmojiMenu(!showEmojiMenu)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${showEmojiMenu ? 'bg-yellow-400 text-emerald-950 scale-110 shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>💬</button>
                 <button onClick={() => setShowVoiceMenu(!showVoiceMenu)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${showVoiceMenu ? 'bg-blue-500 text-white scale-110 shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>🗣️</button>
              </div>
           </div>
           
           <div className="flex items-center gap-4 px-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-6 py-3 bg-red-600 text-white font-brand text-sm lg:text-2xl rounded-full animate-pulse shadow-xl border-2 border-white/20">UNO!</button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-10 py-4 bg-yellow-500 text-emerald-950 font-brand text-sm lg:text-3xl rounded-full shadow-2xl hover:scale-105 transition-all">JOGAR</button>
              )}
              {isMyTurn && <div className="bg-white/5 px-5 py-2 rounded-full font-brand text-sm lg:text-2xl text-yellow-400 border border-white/10 shadow-inner">{timeLeft}s</div>}
           </div>
        </div>

        {/* Mão de Cartas */}
        <div className="w-full h-36 lg:h-48 overflow-visible">
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

      {/* Menus de Interação */}
      {showEmojiMenu && (
        <div className="fixed inset-0 bg-black/40 z-[600]" onClick={() => setShowEmojiMenu(false)}>
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 lg:left-24 lg:translate-x-0 bg-[#011a14] p-5 rounded-[2.5rem] border border-white/10 grid grid-cols-4 gap-3 animate-slide-up shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
             {ALL_EMOJIS.map(e => <button key={e} onClick={() => { onSendReaction(localPlayerId, e); setShowEmojiMenu(false); }} className="text-4xl p-2 hover:scale-125 transition-transform active:scale-90">{e}</button>)}
          </div>
        </div>
      )}

      {showVoiceMenu && (
        <div className="fixed inset-0 bg-black/40 z-[600]" onClick={() => setShowVoiceMenu(false)}>
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 lg:left-24 lg:translate-x-0 bg-[#011a14] p-5 rounded-[2.5rem] border border-white/10 flex flex-col gap-2 animate-slide-up w-72 max-h-72 overflow-y-auto no-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
             {VOICE_PHRASES.map(v => <button key={v} onClick={() => { onSendVoice(localPlayerId, v); setShowVoiceMenu(false); }} className="text-left px-5 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/5 text-white/50 hover:text-white transition-colors">{v}</button>)}
          </div>
        </div>
      )}

      {/* Seletor de Cores Coringa */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[1100] flex items-center justify-center animate-fade-in p-6">
           <div className="bg-emerald-950/40 p-10 rounded-[4rem] border border-white/10 text-center max-w-sm w-full shadow-2xl">
              <h3 className="text-3xl font-brand text-yellow-400 mb-10 italic uppercase tracking-tighter">Escolha a Cor</h3>
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
    </div>
  );
};

export default GameTable;
