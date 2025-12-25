
import React, { useState, useEffect, useRef } from 'react';
import { GameState, CardColor, CardType, GameStatus, Player, OnlinePresence, GameMode, EphemeralReaction } from '../types';
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
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [unoDeclared, setUnoDeclared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [vol, setVol] = useState(audio.getVolume());
  const [copySuccess, setCopySuccess] = useState(false);
  
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
        if (currentP) onTimeout(currentP.id);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState?.turnStartTime, gameState?.currentPlayerIndex, gameState?.status]);

  useEffect(() => {
    setSelectedIds([]);
    setUnoDeclared(false);
  }, [gameState?.currentPlayerIndex]);

  if (!gameState || !gameState.players) {
    return <div className="h-screen w-screen bg-[#022c22] flex items-center justify-center font-brand text-yellow-500">CARREGANDO ARENA...</div>;
  }

  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  if (!localPlayer) return <div className="h-screen w-screen bg-[#022c22] flex items-center justify-center font-brand text-yellow-500">IDENTIFICANDO JOGADOR...</div>;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = gameState.status === GameStatus.PLAYING && currentPlayer?.id === localPlayerId;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

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
      const first = localPlayer.hand.find(c => c.id === selectedIds[0]);
      if (first && card.type === first.type && (card.type === CardType.NUMBER ? card.value === first.value : true)) {
        setSelectedIds(prev => [...prev, id]);
        audio.play('click');
      }
    }
  };

  if (gameState.status === GameStatus.LOBBY) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full animate-fade-in relative bg-[#022c22] p-10">
          <button onClick={onLeaveRoom} className="absolute top-4 left-4 z-[200] bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-white px-4 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-widest">🚪 SAIR</button>
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-6xl lg:text-9xl font-brand text-yellow-400 drop-shadow-2xl italic tracking-tighter uppercase">Arena {gameState.id}</h1>
            <button onClick={handleCopyCode} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white">{copySuccess ? '✓ COPIADO' : 'CÓDIGO DE CONVITE 🔗'}</button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-12 max-w-4xl">
            {gameState.players.map(p => (
              <div key={p.id} className="bg-black/40 p-4 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-3 w-32 shadow-xl">
                <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl border-2 ${p.isHost ? 'border-yellow-500' : 'border-white/10'}`}>{p.avatar}</div>
                <p className="font-bold text-[10px] uppercase text-white/80">{p.name}</p>
                {p.isHost && <span className="bg-yellow-500 text-emerald-950 text-[6px] font-black px-2 py-1 rounded-full">HOST</span>}
              </div>
            ))}
          </div>
          {localPlayer.isHost ? (
            <button onClick={onStartGame} className="px-16 py-6 font-brand text-4xl rounded-3xl bg-yellow-500 text-emerald-950 border-b-8 border-yellow-700 active:translate-y-2 active:border-b-0 hover:scale-[1.05]">INICIAR</button>
          ) : (
            <div className="text-white/20 font-black uppercase animate-pulse">Aguardando Host...</div>
          )}
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#022c22]">
      <div className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000 ${COLOR_CLASSES[gameState.currentColor]}`}></div>
      <div className="h-24 lg:h-32 flex justify-center items-center gap-4 lg:gap-16 px-4 pt-4">
        {gameState.players.filter(p => p.id !== localPlayerId).map((opp) => (
          <div key={opp.id} className={`relative flex flex-col items-center transition-all ${currentPlayer?.id === opp.id ? 'scale-110 z-50' : 'opacity-70'}`}>
            <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-full border-4 ${currentPlayer?.id === opp.id ? 'border-yellow-400 shadow-xl' : 'border-white/10'} bg-black/40 flex items-center justify-center text-2xl lg:text-5xl`}>{opp.avatar}</div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] w-5 h-5 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border-2 border-emerald-950 font-black">{opp.hand.length}</div>
            <span className="text-[7px] font-black uppercase mt-1 text-white/80">{opp.name}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center relative scale-90 z-20">
        <div className="flex items-center gap-10">
          <button onClick={() => isMyTurn && onDrawCard(localPlayerId)} disabled={!isMyTurn} className={isMyTurn ? 'cursor-pointer hover:scale-105 transition-all' : 'opacity-20'}>
            <UnoCard card={{} as any} hidden size="md" />
          </button>
          <div className="relative">
            <UnoCard card={topDiscard || ({} as any)} skin={equippedSkin} size="md" disabled />
            <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full border-4 border-white ${COLOR_CLASSES[gameState.currentColor]} animate-pulse`}></div>
            {gameState.pendingDrawCount > 0 && <div className="absolute -bottom-4 -left-4 bg-red-600 text-white px-4 py-1.5 rounded-full font-brand text-xl shadow-2xl animate-bounce">+{gameState.pendingDrawCount}</div>}
          </div>
        </div>
      </div>
      <div className="h-[40%] flex flex-col items-center justify-end z-[100] pb-6">
        <div className="w-[95%] max-w-4xl bg-black/80 backdrop-blur-3xl rounded-[2.5rem] p-4 flex items-center justify-between mb-4">
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full border-4 ${isMyTurn ? 'border-yellow-400' : 'border-white/10'} bg-black/40 flex items-center justify-center text-3xl`}>{localPlayer.avatar}</div>
              <div className="flex gap-2">
                 <button onClick={() => setShowEmojiMenu(!showEmojiMenu)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">💬</button>
              </div>
           </div>
           <div className="flex items-center gap-4">
              {localPlayer.hand.length === 2 && isMyTurn && !unoDeclared && (
                <button onClick={() => { setUnoDeclared(true); onCallUno(localPlayerId); }} className="px-6 py-2 bg-red-600 text-white font-brand text-xl rounded-full animate-bounce">UNO!</button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={() => onPlayCard(localPlayerId, selectedIds, undefined, unoDeclared)} className="px-10 py-3 bg-yellow-500 text-emerald-950 font-brand text-2xl rounded-full shadow-2xl">JOGAR</button>
              )}
              {isMyTurn && <div className="bg-white/10 px-4 py-1 rounded-full font-brand text-xl text-yellow-400">{timeLeft}s</div>}
           </div>
        </div>
        <div className="w-full flex justify-center items-end px-4 h-32 lg:h-40 overflow-visible">
          {localPlayer.hand.map((card, i) => (
            <div key={card.id} onClick={() => handleCardSelect(card.id)} className={`transition-all duration-300 relative ${selectedIds.includes(card.id) ? '-translate-y-16 scale-110 z-50' : 'hover:-translate-y-6 z-10'}`} style={{ marginLeft: i === 0 ? 0 : '-40px' }}>
              <UnoCard card={card} skin={equippedSkin} size="sm" playable={isMyTurn && isMoveValid(card, gameState)} disabled={!isMyTurn} />
            </div>
          ))}
        </div>
      </div>
      {showPicker && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[1100] flex items-center justify-center p-6">
           <div className="bg-emerald-950/40 p-10 rounded-[4rem] text-center max-w-sm w-full">
              <h3 className="text-3xl font-brand text-yellow-400 mb-10 italic uppercase">Próxima Cor</h3>
              <div className="grid grid-cols-2 gap-5">
                {[CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW].map(c => (
                  <button key={c} onClick={() => { onPlayCard(localPlayerId, selectedIds, c, unoDeclared); setShowPicker(false); }} className={`w-full aspect-square rounded-3xl ${COLOR_CLASSES[c]} border-4 border-white/10 hover:border-white transition-all`}></button>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
