
import React, { useState } from 'react';
import { AppView } from '../types';
import { AVATARS } from '../constants';

interface ProfileProps {
  profile: any;
  onNavigate: (view: AppView) => void;
  onUpdateAvatar: (avatar: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ profile, onNavigate, onUpdateAvatar }) => {
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const winRate = profile.stats.totalGames > 0 
    ? ((profile.stats.wins / profile.stats.totalGames) * 100).toFixed(1) 
    : "0";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative z-10 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-start py-10">
        
        {/* LADO ESQUERDO: PERFIL */}
        <div className="lg:col-span-1 flex flex-col items-center space-y-6 bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl">
          <div className="relative group cursor-pointer" onClick={() => setShowAvatarSelect(true)}>
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-yellow-400 border-8 border-white shadow-2xl flex items-center justify-center text-7xl lg:text-8xl transition-transform group-hover:scale-105">
              {profile.avatar}
            </div>
            <div className="absolute bottom-1 right-1 bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#022c22] text-xs">✏️</div>
          </div>
          
          <div className="text-center">
            <h2 className="text-4xl font-brand text-white italic truncate w-full">{profile.name}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
               <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-[9px] font-black uppercase tracking-widest">{profile.rank}</span>
               <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest">LVL {profile.level}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full pt-4">
            <button onClick={() => onNavigate(AppView.LOBBY)} className="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-emerald-950 font-brand text-2xl rounded-2xl shadow-[0_6px_0_#a16207] active:translate-y-1 active:shadow-none transition-all italic">
              COMBATER
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate(AppView.STORE)} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 font-brand text-[9px] uppercase tracking-widest">Loja 🛒</button>
              <button onClick={() => onNavigate(AppView.RANKING)} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 font-brand text-[9px] uppercase tracking-widest">Rank 🏆</button>
            </div>
          </div>
        </div>

        {/* CENTRO: ESTATÍSTICAS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-xl">
             <h3 className="font-brand text-xl text-blue-400 mb-6 italic">REGISTRO DE GUERRA</h3>
             <div className="grid grid-cols-2 gap-3">
                <StatCard label="Vitórias" value={profile.stats.wins} color="text-emerald-400" />
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-yellow-400" />
                <StatCard label="MMR" value={profile.mmr} color="text-blue-400" />
                <StatCard label="Total Jogos" value={profile.stats.totalGames} color="text-white/40" />
             </div>
          </div>

          <div className="bg-black/20 p-8 rounded-[3rem] border border-white/5">
             <h3 className="font-brand text-xl text-yellow-400 mb-6 italic">MEDALHAS</h3>
             <div className="flex flex-wrap gap-3">
                <AchievementBadge icon="🎖️" name="VETERANO" unlocked={profile.stats.totalGames >= 5} />
                <AchievementBadge icon="🔥" name="SÉRIE" unlocked={false} />
                <AchievementBadge icon="💎" name="ELITE" unlocked={profile.mmr >= 1500} />
                <AchievementBadge icon="🃏" name="MESTRE" unlocked={profile.stats.totalCardsPlayed > 50} />
             </div>
          </div>
        </div>

        {/* DIREITO: HISTÓRICO */}
        <div className="lg:col-span-1 bg-black/40 p-8 rounded-[3rem] border border-white/5 flex flex-col h-full max-h-[500px]">
           <h3 className="font-brand text-xl text-white/40 mb-6 italic">ÚLTIMAS BATALHAS</h3>
           <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {profile.history.length === 0 ? (
                <p className="text-center text-white/10 font-black uppercase text-[8px] py-10 tracking-widest">Nenhum combate registrado</p>
              ) : (
                profile.history.map((h: any, i: number) => (
                  <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${h.result === 'WIN' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className="font-black uppercase text-[10px] tracking-tighter">{h.result === 'WIN' ? 'Vitória' : 'Derrota'}</span>
                     </div>
                     <div className="text-right">
                        <span className={`font-brand text-sm ${h.mmr > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{h.mmr > 0 ? '+' : ''}{h.mmr} MMR</span>
                        <p className="text-[7px] text-white/20 uppercase font-black">{new Date(h.date).toLocaleDateString()}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {showAvatarSelect && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-emerald-950/40 p-10 rounded-[3rem] border border-white/10 max-w-md w-full text-center">
            <h3 className="text-2xl font-brand text-yellow-400 mb-8 italic">MUDAR FACE</h3>
            <div className="grid grid-cols-4 gap-4">
              {AVATARS.map(a => (
                <button key={a} onClick={() => { onUpdateAvatar(a); setShowAvatarSelect(false); }} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${profile.avatar === a ? 'bg-yellow-400 scale-110 shadow-xl' : 'bg-white/5 hover:bg-white/10 grayscale'}`}>{a}</button>
              ))}
            </div>
            <button onClick={() => setShowAvatarSelect(false)} className="mt-8 text-white/20 uppercase font-black text-[9px] tracking-widest hover:text-white transition-colors">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
    <span className="text-[7px] font-black uppercase tracking-widest text-white/30 block mb-1">{label}</span>
    <span className={`text-xl font-brand ${color}`}>{value}</span>
  </div>
);

const AchievementBadge = ({ icon, name, unlocked }: any) => (
  <div className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center border transition-all ${unlocked ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/40 border-white/5 grayscale opacity-20'}`}>
     <span className="text-xl">{icon}</span>
     <span className="text-[6px] font-black uppercase mt-1 text-center px-1 text-white/40">{name}</span>
  </div>
);

export default Profile;
