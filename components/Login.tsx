
import React, { useState } from 'react';
import { AVATARS } from '../constants';

interface LoginProps {
  onLogin: (name: string, avatar: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black overflow-y-auto no-scrollbar">
      <div className="text-center mb-10 mt-10">
        <h1 className="text-8xl font-brand text-yellow-400 italic tracking-tighter drop-shadow-2xl">UNO!</h1>
        <p className="text-blue-400 uppercase tracking-widest text-[10px] font-black mt-1">BATTLE ARENA</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-widest px-2">Nickname</label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome..."
            maxLength={12}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl text-center outline-none focus:border-yellow-400 transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-widest px-2">Escolha seu Avatar</label>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map(a => (
              <button 
                key={a}
                onClick={() => setAvatar(a)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${avatar === a ? 'bg-yellow-400 scale-110 shadow-lg' : 'bg-white/5 opacity-50'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button 
          disabled={!name.trim()}
          onClick={() => onLogin(name, avatar)}
          className={`w-full py-5 rounded-2xl font-brand text-2xl shadow-xl transition-all ${name.trim() ? 'bg-yellow-500 text-black active:scale-95' : 'bg-white/5 text-white/10 grayscale'}`}
        >
          ENTRAR
        </button>
      </div>
    </div>
  );
};

export default Login;
