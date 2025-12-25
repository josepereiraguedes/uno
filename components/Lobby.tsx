
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

  // Filtramos apenas jogadores que possuem um RoomId ativo (estão hosteando salas)
  const activeRooms = onlinePlayers.filter(p => p.currentRoomId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative z-10 overflow-hidden">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-[85vh] lg:h-[80vh]">
        
        {/* CONFIGURAÇÃO DA SALA */}
        <div className="bg-white/5 backdrop-blur-3xl p-8 lg:p-10 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-8">
            <h2 className="text-4xl font-brand text-yellow-400 italic text-center lg:text-left">CRIAR ARENA</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSettings({...settings, mode: GameMode.NORMAL, botCount: Math.max(1, settings.botCount)})}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${settings.mode === GameMode.NORMAL ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-black/20 border-transparent opacity-40 hover:opacity-60'}`}
              >
                <p className="font-brand text-2xl">CASUAL</p>
                <p className="text-[9px] uppercase tracking-widest font-black text-blue-400/60">Bots & Amigos</p>
              </button>
              <button 
                onClick={() => setSettings({...settings, mode: GameMode.RANKED, botCount: 0})}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${settings.mode === GameMode.RANKED ? 'bg-yellow-600/30 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-black/20 border-transparent opacity-40 hover:opacity-60'}`}
              >
                <p className="font-brand text-2xl text-yellow-400">RANKED</p>
                <p className="text-[9px] uppercase tracking-widest font-black text-yellow-500/60">Multijogador Real</p>
              </button>
            </div>

            <div className="space-y-4">
              {settings.mode === GameMode.NORMAL && (
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block text-center lg:text-left">Quantidade de Bots</label>
                  <div className="flex items-center justify-between px-4">
                     <button onClick={() => setSettings(s => ({...s, botCount: Math.max(1, s.botCount - 1)}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-3xl hover:bg-white/10 transition-colors border border-white/5">-</button>
                     <div className="text-center">
                       <span className="text-5xl font-brand text-blue-400 drop-shadow-lg">{settings.botCount}</span>
                       <p className="text-[8px] font-black text-white/20 uppercase mt-1">Oponentes</p>
                     </div>
                     <button onClick={() => setSettings(s => ({...s, botCount: Math.min(9, s.botCount + 1)}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-3xl hover:bg-white/10 transition-colors border border-white/5">+</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/40 p-4 rounded-2xl flex flex-col gap-2 border border-white/5">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Tempo de Turno</span>
                    <select 
                      value={settings.turnTimeLimit} 
                      onChange={(e) => setSettings({...settings, turnTimeLimit: Number(e.target.value)})} 
                      className="bg-[#021a14] text-yellow-400 font-brand text-lg outline-none p-2 rounded-xl border border-white/10 cursor-pointer hover:bg-black/60 transition-colors"
                    >
                      <option value={10}>10 Segundos</option>
                      <option value={15}>15 Segundos</option>
                      <option value={30}>30 Segundos</option>
                      <option value={60}>60 Segundos</option>
                    </select>
                 </div>
                 <button 
                  onClick={() => setSettings(s => ({...s, mirrorRuleEnabled: !s.mirrorRuleEnabled}))} 
                  className={`p-4 rounded-2xl flex flex-col gap-2 transition-all border group ${settings.mirrorRuleEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 opacity-60'}`}
                 >
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Regra Espelho</span>
                    <span className="font-brand text-lg">{settings.mirrorRuleEnabled ? 'ATIVADA' : 'DESATIVADA'}</span>
                 </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <button 
              onClick={() => canCreate && onCreateRoom(settings)} 
              disabled={!canCreate}
              className={`w-full py-6 rounded-2xl font-brand text-3xl shadow-2xl transition-all border-b-8 ${canCreate ? 'bg-yellow-500 text-emerald-950 border-yellow-700 active:translate-y-2 active:border-b-0 hover:scale-[1.02]' : 'bg-white/5 text-white/10 border-transparent opacity-50 cursor-not-allowed'}`}
            >
              {canCreate ? 'CRIAR SALA' : 'ADICIONE BOTS'}
            </button>
            <button onClick={onBack} className="w-full text-white/20 uppercase font-black text-[10px] tracking-[0.5em] hover:text-white transition-colors py-2">Voltar ao Menu</button>
          </div>
        </div>

        {/* LISTA DE ARENAS ATIVAS */}
        <div className="bg-black/40 backdrop-blur-3xl p-8 lg:p-10 rounded-[3rem] border border-white/10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-brand text-2xl text-blue-400 italic">ARENAS PÚBLICAS</h3>
             <span className="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-[9px] font-black animate-pulse border border-blue-500/20">{onlinePlayers.length} ONLINE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2">
            {activeRooms.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-7xl opacity-10">🔭</span>
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-[0.3em] text-[10px] text-white/20">Nenhuma sala ativa no momento</p>
                  <p className="text-[8px] text-white/10 uppercase tracking-widest">Seja o primeiro a criar uma arena!</p>
                </div>
              </div>
            ) : (
              activeRooms.map(p => (
                <div key={p.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group animate-slide-up shadow-lg">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center text-4xl border-2 border-white/10 transition-transform group-hover:scale-110">{p.avatar}</div>
                      <div className="space-y-1">
                        <p className="font-brand text-lg text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                        <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">{p.rank}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => onJoinRoom(p.currentRoomId!)} 
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-brand text-sm shadow-xl transition-all active:scale-90 border-b-4 border-blue-800"
                   >
                     ENTRAR
                   </button>
                </div>
              ))
            )}
            
            {/* Lista extra para jogadores no menu (opcional, menor destaque) */}
            {onlinePlayers.filter(p => !p.currentRoomId).length > 0 && (
              <div className="pt-8 opacity-20">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] mb-4 text-center">Jogadores no Menu</p>
                <div className="flex flex-wrap justify-center gap-2">
                   {onlinePlayers.filter(p => !p.currentRoomId).map(p => (
                     <div key={p.id} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm border border-white/5">{p.avatar}</div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
