
import React, { useMemo } from 'react';
import { AVATARS } from '../constants';
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
  { name: 'WildPlayer', mmr: 12000, avatar: '🐨', badge: '' },
  { name: 'UnoNinja', mmr: 9500, avatar: '🥷', badge: '🥷' },
  { name: 'AcePlayer', mmr: 7200, avatar: '🎩', badge: '' },
  { name: 'DraftKing', mmr: 5400, avatar: '👑', badge: '' },
];

const Ranking: React.FC<RankingProps> = ({ onBack, currentMMR }) => {
  const localPlayerName = localStorage.getItem('uno_name') || 'Você';
  const localPlayerAvatar = localStorage.getItem('uno_avatar') || '👤';
  const localPlayerBadgeId = localStorage.getItem('uno_badge') || 'default_badge';

  const badgeMap: Record<string, string> = {
    'whale_badge': '🐋',
    'ninja_badge': '🥷',
    'default_badge': '',
  };

  const rankingList = useMemo(() => {
    const list = [
      ...ELITE_BOTS,
      { 
        name: localPlayerName, 
        mmr: currentMMR, 
        avatar: localPlayerAvatar, 
        badge: badgeMap[localPlayerBadgeId], 
        isLocal: true 
      }
    ];
    return list.sort((a, b) => b.mmr - a.mmr);
  }, [currentMMR, localPlayerName, localPlayerAvatar, localPlayerBadgeId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative z-10">
      <div className="w-full max-w-5xl bg-black/60 backdrop-blur-3xl rounded-[4rem] border border-white/10 overflow-hidden flex flex-col h-[88vh] shadow-2xl">
        <div className="p-12 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-6xl font-brand text-yellow-400 italic tracking-tighter">HALL DA FAMA</h2>
            <p className="text-blue-400 text-xs tracking-[0.5em] uppercase font-black mt-1">LENDAS DA ARENA UNO</p>
          </div>
          <button onClick={() => { audio.play('click'); onBack(); }} className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-3xl transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-4 no-scrollbar">
          {rankingList.map((player, i) => {
            const isLocal = (player as any).isLocal;
            const isTop3 = i < 3;
            
            return (
              <div 
                key={`${player.name}-${i}`} 
                className={`flex items-center gap-8 p-8 rounded-[3rem] border transition-all animate-slide-up ${
                  isLocal ? 'bg-blue-600/20 border-blue-400 shadow-xl scale-[1.02] z-10' : 
                  isTop3 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/5 opacity-80'
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-brand text-3xl ${
                  i === 0 ? 'bg-yellow-500 text-emerald-950 scale-125 ring-4 ring-yellow-400/20' : 
                  i === 1 ? 'bg-zinc-300 text-zinc-800' : 
                  i === 2 ? 'bg-orange-700 text-white' : 'bg-black/40 text-white/40'
                }`}>
                  {i + 1}
                </div>
                
                <div className="text-6xl drop-shadow-2xl">{player.avatar}</div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-brand text-2xl text-white">{player.name}</h4>
                    {player.badge && <span className="text-2xl drop-shadow-md">{player.badge}</span>}
                  </div>
                  <p className={`text-[10px] uppercase font-black tracking-widest ${isTop3 ? 'text-yellow-500' : 'text-white/30'}`}>
                    {getRankFromMMR(player.mmr)}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-4xl font-brand ${isTop3 ? 'text-yellow-400' : 'text-blue-400'}`}>{player.mmr.toLocaleString()}</p>
                  <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">RANK PONTOS</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Ranking;
