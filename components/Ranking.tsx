
import React, { useMemo } from 'react';
import { getRankFromMMR } from '../engine/unoLogic';
import { audio } from '../services/audioService';

interface RankingProps {
  onBack: () => void;
  currentMMR: number;
}

const ELITE_BOTS = [
  { name: 'UnoLegend', mmr: 45200, avatar: '🦁', badge: '🐋' },
  { name: 'CardShark', mmr: 41000, avatar: '🐯', badge: '🥷' },
  { name: 'ZeroMistake', mmr: 38500, avatar: '🦊', badge: '💎' },
  { name: 'LuckyStrike', mmr: 25000, avatar: '🐸', badge: '🍀' },
  { name: 'BotBuster', mmr: 18000, avatar: '🐵', badge: '' },
];

const Ranking: React.FC<RankingProps> = ({ onBack, currentMMR }) => {
  const localPlayerName = localStorage.getItem('uno_name') || 'Você';
  const localPlayerAvatar = localStorage.getItem('uno_avatar') || '👤';
  const localPlayerPhoto = localStorage.getItem('uno_photo_url');

  const rankingList = useMemo(() => {
    const list = [
      ...ELITE_BOTS,
      { 
        name: localPlayerName, 
        mmr: currentMMR, 
        avatar: localPlayerAvatar, 
        photoUrl: localPlayerPhoto,
        isLocal: true 
      }
    ];
    return list.sort((a, b) => b.mmr - a.mmr);
  }, [currentMMR, localPlayerName, localPlayerAvatar, localPlayerPhoto]);

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col animate-fade-in safe-area-inset overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/60">
        <h2 className="text-2xl font-brand text-yellow-400 italic uppercase">HALL OF FAME</h2>
        <button onClick={() => { audio.play('click'); onBack(); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-10">
        {rankingList.map((player, i) => {
          const isLocal = (player as any).isLocal;
          const isTop3 = i < 3;
          return (
            <div key={`${player.name}-${i}`} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isLocal ? 'bg-blue-600/20 border-blue-400 shadow-lg shadow-blue-500/10' : isTop3 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/5'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-brand text-lg ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-zinc-300 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-black/40 text-white/40'}`}>
                {i + 1}
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-3xl bg-black border border-white/10 shadow-inner">
                {(player as any).photoUrl ? <img src={(player as any).photoUrl} className="w-full h-full object-cover" /> : player.avatar}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white truncate">{player.name}</h4>
                <p className="text-[9px] text-white/30 uppercase font-black tracking-wider">{getRankFromMMR(player.mmr)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-brand text-yellow-400">{player.mmr.toLocaleString()}</p>
                <p className="text-[7px] text-white/20 uppercase font-black tracking-[0.2em]">MMR</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Ranking;
