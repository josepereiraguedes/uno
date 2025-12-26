
import React from 'react';
import { Player, GameMode } from '../types';

interface GameOverProps {
  winner: Player;
  mode: GameMode;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, mode, onRestart }) => {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.2)_0%,transparent_70%)]"></div>
        {/* Confetes CSS */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-2 h-2 bg-yellow-400 rounded-sm animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-lg bg-white/5 border border-white/10 rounded-[3rem] p-8 sm:p-12 flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,1)] animate-scale-in">
        <h2 className="text-blue-400 font-black tracking-[0.4em] text-[10px] uppercase mb-2">Combate Encerrado</h2>
        <h1 className="text-6xl sm:text-8xl font-brand text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 italic mb-8 drop-shadow-2xl">VITÓRIA!</h1>

        <div className="relative mb-8">
          <div className="absolute inset-0 bg-yellow-500/20 blur-[50px] rounded-full animate-pulse"></div>
          <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 sm:border-8 border-yellow-500 p-1 bg-black shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-6xl sm:text-8xl">
              {winner.photoUrl ? <img src={winner.photoUrl} className="w-full h-full object-cover" /> : winner.avatar}
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full font-brand text-sm shadow-xl whitespace-nowrap">CAMPEÃO</div>
        </div>

        <h3 className="text-3xl sm:text-5xl font-brand text-white italic mb-10 truncate max-w-full px-4">{winner.name}</h3>

        <div className="grid grid-cols-2 gap-3 w-full mb-10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="block text-[8px] text-white/30 font-black uppercase tracking-widest mb-1">Recompensa</span>
            <span className="text-xl font-brand text-yellow-400 italic">🪙 {winner.score || 50}</span>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="block text-[8px] text-white/30 font-black uppercase tracking-widest mb-1">Arena MMR</span>
            <span className="text-xl font-brand text-emerald-400 italic">+25</span>
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="w-full py-5 bg-yellow-500 text-black font-brand text-2xl rounded-2xl transition-all active:scale-95 shadow-2xl"
        >
          CONTINUAR
        </button>
      </div>
    </div>
  );
};

export default GameOver;
