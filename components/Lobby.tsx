
import React, { useState } from 'react';
import { GameSettings, GameMode, OnlinePresence } from '../types';
import { audio } from '../services/audioService';

interface LobbyProps {
  onBack: () => void;
  onCreateRoom: (settings: GameSettings, invitedPlayer?: OnlinePresence) => void;
  onJoinRoom: (roomId: string) => void;
  onlinePlayers: OnlinePresence[];
}

const Lobby: React.FC<LobbyProps> = ({ onBack, onCreateRoom, onJoinRoom, onlinePlayers }) => {
  const [settings, setSettings] = useState<GameSettings>({
    mode: GameMode.NORMAL,
    turnTimeLimit: 15,
    stackingEnabled: true,
    drawUntilPlayable: false,
    mandatoryUno: true,
    chaosMode: false,
    initialCardsCount: 7,
    mirrorRuleEnabled: true,
    botCount: 3
  });

  const handleInvite = (player: OnlinePresence) => {
    audio.play('click');
    onCreateRoom({...settings, mode: GameMode.NORMAL}, player);
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in overflow-y-auto no-scrollbar safe-area-inset p-4 gap-6 bg-black">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2 pt-2">
        <h2 className="text-3xl font-brand text-yellow-400 italic">ARENA</h2>
        <button onClick={onBack} className="bg-white/5 px-4 py-2 rounded-full border border-white/10 text-white/60 uppercase font-black text-[10px] active:scale-95 transition-all">Voltar</button>
      </div>

      {/* Configurações da Sala */}
      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setSettings({...settings, mode: GameMode.NORMAL})}
            className={`py-5 rounded-2xl border-2 transition-all font-brand text-sm ${settings.mode === GameMode.NORMAL ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-black/20 border-transparent opacity-40'}`}
          >
            CASUAL
          </button>
          <button 
            onClick={() => setSettings({...settings, mode: GameMode.RANKED, botCount: 0})}
            className={`py-5 rounded-2xl border-2 transition-all font-brand text-sm ${settings.mode === GameMode.RANKED ? 'bg-yellow-600/30 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/20 border-transparent opacity-40'}`}
          >
            RANKED
          </button>
        </div>

        {settings.mode === GameMode.NORMAL && (
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-white/30 tracking-widest block text-center">Inimigos I.A.</label>
             <div className="flex items-center justify-center gap-8">
                <button onClick={() => setSettings(s => ({...s, botCount: Math.max(1, s.botCount - 1)}))} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl active:bg-white/10">-</button>
                <span className="text-5xl font-brand text-blue-400">{settings.botCount}</span>
                <button onClick={() => setSettings(s => ({...s, botCount: Math.min(9, s.botCount + 1)}))} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl active:bg-white/10">+</button>
             </div>
          </div>
        )}

        {settings.mode === GameMode.RANKED && (
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
             <p className="text-[10px] text-yellow-500/80 font-bold uppercase text-center leading-relaxed italic">Matchmaking Global Ativo: Buscando oponentes do seu nível MMR.</p>
          </div>
        )}

        <button 
          onClick={() => onCreateRoom(settings)} 
          className={`w-full py-5 text-black rounded-2xl font-brand text-2xl shadow-xl active:scale-95 transition-all uppercase italic border-b-4 ${settings.mode === GameMode.RANKED ? 'bg-yellow-600 border-yellow-800' : 'bg-yellow-500 border-yellow-700'}`}
        >
          {settings.mode === GameMode.RANKED ? 'BUSCAR PARTIDA' : 'CRIAR ARENA'}
        </button>
      </div>

      {/* Lista de Jogadores Mobile */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="font-brand text-blue-400 text-xl italic">LENDAS ONLINE</h3>
           <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-4 py-1.5 rounded-full border border-blue-500/30">
             {onlinePlayers.length} ATIVOS
           </span>
        </div>

        <div className="space-y-3 pb-10">
          {onlinePlayers.length === 0 ? (
            <div className="py-10 text-center text-white/20 italic text-xs">Ninguém online no momento...</div>
          ) : (
            onlinePlayers.map(p => (
              <div key={p.id} className="bg-white/5 p-4 rounded-3xl flex items-center justify-between border border-white/5 shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-2xl overflow-hidden border border-white/10 shadow-lg">
                    {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : p.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white/90">{p.name}</p>
                    <p className="text-[8px] text-yellow-500 font-black uppercase tracking-tighter">{p.rank}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleInvite(p)}
                  className="bg-blue-600/20 border border-blue-500 text-blue-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase active:scale-90 transition-all"
                >
                  CONVIDAR
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
