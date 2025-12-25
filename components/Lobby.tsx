
import React, { useState } from 'react';
import { GameSettings, GameMode, OnlinePresence } from '../types';

interface LobbyProps {
  onBack: () => void;
  onCreateRoom: (settings: GameSettings) => void;
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

  const isCasual = settings.mode === GameMode.NORMAL;
  const canCreate = isCasual ? settings.botCount >= 1 : true;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative z-10 overflow-hidden">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
        
        {/* Painel de Configuração */}
        <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col justify-between">
          <div className="space-y-8">
            <h2 className="text-4xl font-brand text-yellow-400 italic">SALA DE GUERRA</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSettings({...settings, mode: GameMode.NORMAL, botCount: Math.max(1, settings.botCount)})}
                className={`p-6 rounded-3xl border-2 transition-all ${settings.mode === GameMode.NORMAL ? 'bg-blue-600/30 border-blue-500' : 'bg-black/20 border-transparent opacity-40'}`}
              >
                <p className="font-brand text-xl">CASUAL</p>
                <p className="text-[9px] uppercase tracking-widest mt-1">Vs Bots / Amigos</p>
              </button>
              <button 
                onClick={() => setSettings({...settings, mode: GameMode.RANKED, botCount: 0})}
                className={`p-6 rounded-3xl border-2 transition-all ${settings.mode === GameMode.RANKED ? 'bg-yellow-600/30 border-yellow-500' : 'bg-black/20 border-transparent opacity-40'}`}
              >
                <p className="font-brand text-xl text-yellow-400">RANKED</p>
                <p className="text-[9px] uppercase tracking-widest mt-1">Arena Pública</p>
              </button>
            </div>

            {settings.mode === GameMode.NORMAL && (
              <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Quantidade de Bots</label>
                <div className="flex items-center justify-between">
                   <button onClick={() => setSettings(s => ({...s, botCount: Math.max(1, s.botCount - 1)}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10">-</button>
                   <div className="text-center">
                     <span className="text-5xl font-brand text-blue-400">{settings.botCount}</span>
                     <p className="text-[7px] text-white/20 font-black uppercase">Oponentes</p>
                   </div>
                   <button onClick={() => setSettings(s => ({...s, botCount: Math.min(9, s.botCount + 1)}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10">+</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-black/40 p-4 rounded-2xl flex flex-col gap-1 border border-white/5">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Tempo de Turno</span>
                  <select 
                    value={settings.turnTimeLimit} 
                    onChange={(e) => setSettings({...settings, turnTimeLimit: Number(e.target.value)})} 
                    className="bg-[#021a14] text-white font-bold text-sm outline-none p-1 rounded border border-white/10"
                  >
                    <option value={10} className="bg-[#021a14]">10 Segundos</option>
                    <option value={15} className="bg-[#021a14]">15 Segundos</option>
                    <option value={30} className="bg-[#021a14]">30 Segundos</option>
                  </select>
               </div>
               <button onClick={() => setSettings(s => ({...s, mirrorRuleEnabled: !s.mirrorRuleEnabled}))} className={`p-4 rounded-2xl flex flex-col gap-1 transition-all border ${settings.mirrorRuleEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 opacity-50'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest">Regra Espelho</span>
                  <span className="font-bold text-sm">{settings.mirrorRuleEnabled ? 'ATIVADA' : 'DESATIVADA'}</span>
               </button>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => canCreate && onCreateRoom(settings)} 
              disabled={!canCreate}
              className={`w-full py-6 rounded-2xl font-brand text-3xl shadow-xl transition-all border-b-8 ${canCreate ? 'bg-yellow-500 text-emerald-950 border-yellow-700 active:translate-y-2 active:border-b-0' : 'bg-white/5 text-white/10 border-transparent opacity-50 cursor-not-allowed'}`}
            >
              {canCreate ? 'CRIAR ARENA' : 'FALTA OPONENTE'}
            </button>
            <button onClick={onBack} className="w-full text-white/20 uppercase font-black text-[10px] tracking-widest hover:text-white transition-colors">Voltar para o Perfil</button>
          </div>
        </div>

        {/* Painel de Jogadores Online */}
        <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-brand text-2xl text-blue-400">LENDAS ONLINE</h3>
             <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black animate-pulse">{onlinePlayers.length} ATIVOS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-2">
            {onlinePlayers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                <span className="text-6xl animate-pulse">🔭</span>
                <p className="font-bold uppercase tracking-widest text-[9px] px-10">Buscando oponentes nos servidores...</p>
              </div>
            ) : (
              onlinePlayers.map(p => (
                <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-3xl border-2 border-white/10">{p.avatar}</div>
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-[9px] text-yellow-500 font-black uppercase tracking-widest">{p.rank}</p>
                      </div>
                   </div>
                   {p.currentRoomId ? (
                     <button onClick={() => onJoinRoom(p.currentRoomId!)} className="px-6 py-2 bg-blue-600 rounded-full font-brand text-xs hover:bg-blue-500 shadow-lg transition-transform active:scale-90">ENTRAR</button>
                   ) : (
                     <span className="text-[9px] font-black text-white/20 uppercase bg-white/5 px-3 py-1 rounded-full">No Menu</span>
                   )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
