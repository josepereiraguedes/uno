
import React from 'react';
import { Player, GameMode } from '../types';

interface GameOverProps {
  winner: Player;
  mode: GameMode;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, mode, onRestart }) => {
  return (
    <div className="fixed inset-0 bg-emerald-950/95 z-[200] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="space-y-8 animate-slide-up max-w-lg w-full">
        <div className="relative">
           <div className="w-56 h-56 rounded-full bg-yellow-400 mx-auto border-8 border-white shadow-[0_0_50px_rgba(250,204,21,0.5)] flex items-center justify-center text-8xl">
             🏆
           </div>
           <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-emerald-950 px-10 py-3 rounded-full font-brand text-2xl shadow-2xl border-2 border-emerald-900">
             VENCEDOR
           </div>
        </div>

        <div className="space-y-4">
           <h1 className="text-7xl font-brand text-yellow-400 tracking-tighter drop-shadow-2xl uppercase italic">
             {winner.name}
           </h1>
           <div className="flex flex-col items-center gap-2">
              <p className="text-white/60 text-xl font-bold uppercase tracking-widest">
                {mode === GameMode.RANKED ? 'Dominação Total!' : 'Jogo Finalizado!'}
              </p>
              <div className="flex gap-4 mt-2">
                 <div className="bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
                    <span className="block text-[10px] opacity-40 uppercase">Pontos Ganhos</span>
                    <span className="text-2xl font-brand text-yellow-400">+{winner.score}</span>
                 </div>
                 <div className="bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
                    <span className="block text-[10px] opacity-40 uppercase">Rank Atual</span>
                    <span className="text-2xl font-brand text-blue-400">{winner.rank}</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="pt-10">
           <button 
             onClick={onRestart}
             className="px-20 py-6 bg-yellow-500 hover:bg-yellow-400 text-emerald-950 font-brand text-3xl rounded-full shadow-[0_10px_0_#a16207] transition-all active:translate-y-2 active:shadow-none"
           >
             JOGAR NOVAMENTE
           </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
