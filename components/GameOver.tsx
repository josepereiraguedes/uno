
import React from 'react';
import { Player, GameMode } from '../types';

interface GameOverProps {
  winner: Player;
  mode: GameMode;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, mode, onRestart }) => {
  return (
    <div className="fixed inset-0 bg-emerald-950/98 z-[200] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="space-y-8 animate-slide-up max-w-xl w-full">
        <div className="relative">
           <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full bg-yellow-400 mx-auto border-8 border-white shadow-[0_0_80px_rgba(250,204,21,0.5)] flex items-center justify-center text-7xl lg:text-9xl animate-bounce">
             🏆
           </div>
           <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-emerald-950 px-12 py-4 rounded-full font-brand text-3xl shadow-2xl border-4 border-emerald-900 rotate-[-2deg]">
             VENCEDOR
           </div>
        </div>

        <div className="space-y-4 pt-6">
           <h1 className="text-6xl lg:text-8xl font-brand text-yellow-400 tracking-tighter drop-shadow-2xl uppercase italic">
             {winner.name}
           </h1>
           <p className="text-white/40 text-xs font-black uppercase tracking-[0.5em] mb-10">Lenda Consagrada na Arena</p>
           
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <div className="bg-black/60 p-6 rounded-[2rem] border border-yellow-500/30">
                 <span className="block text-[8px] lg:text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Moedas Ganhas</span>
                 <span className="text-3xl lg:text-4xl font-brand text-yellow-400">🪙 {winner.score || 50}</span>
              </div>
              <div className="bg-black/60 p-6 rounded-[2rem] border border-blue-500/30">
                 <span className="block text-[8px] lg:text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Rank Atual</span>
                 <span className="text-3xl lg:text-4xl font-brand text-blue-400">{winner.rank}</span>
              </div>
              <div className="bg-black/60 p-6 rounded-[2rem] border border-emerald-500/30 col-span-2 lg:col-span-1">
                 <span className="block text-[8px] lg:text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">MMR Ganhos</span>
                 <span className="text-3xl lg:text-4xl font-brand text-emerald-400">+25</span>
              </div>
           </div>
        </div>

        <div className="pt-12">
           <button 
             onClick={onRestart}
             className="px-16 lg:px-24 py-6 lg:py-8 bg-yellow-500 hover:bg-yellow-400 text-emerald-950 font-brand text-3xl lg:text-5xl rounded-[2.5rem] shadow-[0_12px_0_#a16207] transition-all active:translate-y-2 active:shadow-none hover:scale-105"
           >
             NOVA ARENA
           </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
