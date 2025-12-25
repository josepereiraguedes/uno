
import React, { useState } from 'react';
import { AVATARS } from '../constants';

interface LoginProps {
  onLogin: (name: string, avatar: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative z-10">
      <div className="text-center mb-12">
        <h1 className="text-9xl font-brand text-yellow-400 italic tracking-tighter drop-shadow-2xl">UNO!</h1>
        <p className="text-blue-400 uppercase tracking-[0.6em] text-xs font-black mt-2">BATTLE ARENA ONLINE</p>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest px-2">Nickname de Combate</label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: UnoKing..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl outline-none focus:border-yellow-400 transition-all text-center"
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest px-2">Escolha sua Face</label>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map(a => (
              <button 
                key={a}
                onClick={() => setAvatar(a)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${avatar === a ? 'bg-yellow-400 scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/10 grayscale'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button 
          disabled={!name.trim()}
          onClick={() => onLogin(name, avatar)}
          className={`w-full py-6 rounded-2xl font-brand text-3xl shadow-2xl transition-all border-b-8 ${name.trim() ? 'bg-yellow-500 text-emerald-950 border-yellow-700 active:translate-y-2 active:shadow-none' : 'bg-white/5 text-white/10 border-transparent cursor-not-allowed'}`}
        >
          ENTRAR NA ARENA
        </button>
      </div>
    </div>
  );
};

export default Login;
