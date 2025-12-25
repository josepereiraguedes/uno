
import React, { useState } from 'react';
import { StoreItem, StoreCategory } from '../types';
import { audio } from '../services/audioService';

const STORE_ITEMS: StoreItem[] = [
  { id: 'neon_skin', name: 'Baralho Neon', price: 150, type: 'card_skin', value: 'neon', description: 'Cores vibrantes e brilho futurista neon.' },
  { id: 'gold_skin', name: 'Baralho Ouro', price: 500, type: 'card_skin', value: 'gold', description: 'Puro luxo para quem ostenta vitórias.' },
  { id: 'retro_skin', name: 'Baralho Retro', price: 100, type: 'card_skin', value: 'retro', description: 'Estilo clássico pixelado 8-bit.' },
  { id: 'galaxy_bg', name: 'Mesa Galática', price: 300, type: 'table_bg', value: 'galaxy', description: 'Jogue entre as estrelas distantes.' },
  { id: 'fire_effect', name: 'Impacto Fogo', price: 600, type: 'visual_effect', value: 'fire', description: 'Explosões de chamas ao jogar cartas.' },
  { id: 'ninja_badge', name: 'Inígnia Ninja', price: 350, type: 'badge', value: 'ninja', description: 'Para os mestres do silêncio.' },
];

interface StoreProps {
  profile: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

const Store: React.FC<StoreProps> = ({ profile, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<StoreCategory>('card_skin');

  const handleBuy = (item: StoreItem) => {
    if (profile.coins < item.price) {
      audio.play('penalty');
      return;
    }
    onUpdate({ 
      coins: profile.coins - item.price, 
      inventory: [...profile.inventory, item.id] 
    });
    audio.play('win_fanfare'); // Efeito sonoro de sucesso
  };

  const handleEquip = (item: StoreItem) => {
    onUpdate({ equippedSkin: item.id });
    audio.play('click');
  };

  const categories: { id: StoreCategory; label: string; icon: string }[] = [
    { id: 'card_skin', label: 'BARALHOS', icon: '🃏' },
    { id: 'table_bg', label: 'MESAS', icon: '🖼️' },
    { id: 'visual_effect', label: 'EFEITOS', icon: '✨' },
    { id: 'badge', label: 'INSÍGNIAS', icon: '🏅' },
  ];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[300] flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-6xl bg-[#022c22]/60 rounded-[4rem] border border-white/10 flex flex-col h-[90vh] shadow-2xl overflow-hidden relative">
        
        {/* Header Loja */}
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <h2 className="text-5xl font-brand text-yellow-400 italic drop-shadow-lg tracking-tighter">ARENA SHOP</h2>
            <div className="bg-yellow-500/10 px-6 py-2 rounded-2xl border border-yellow-500/30 flex items-center gap-3">
               <span className="text-2xl">🪙</span>
               <span className="text-yellow-400 font-brand text-2xl italic">{profile.coins}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-3xl transition-all border border-white/10">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Categorias */}
          <div className="w-72 border-r border-white/5 bg-black/20 p-6 space-y-3">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveTab(cat.id)} 
                className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all font-brand text-[12px] tracking-widest uppercase ${activeTab === cat.id ? 'bg-yellow-500 text-emerald-950 shadow-xl' : 'hover:bg-white/5 text-white/40'}`}
              >
                <span className="text-2xl">{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Produtos */}
          <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-scrollbar">
            {STORE_ITEMS.filter(item => item.type === activeTab).map(item => {
              const isOwned = profile.inventory.includes(item.id);
              const isEquipped = profile.equippedSkin === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className={`group bg-black/40 p-1 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col ${isEquipped ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-white/5 hover:border-white/20'}`}
                >
                  <div className={`h-48 rounded-[3rem] m-1 flex items-center justify-center text-8xl relative overflow-hidden ${getItemGradient(item.id)}`}>
                     <span className="z-10 group-hover:scale-125 transition-transform duration-500">{catIcon(item.id)}</span>
                     {/* Efeito de brilho animado */}
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
                  </div>
                  
                  <div className="p-6 text-center flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-brand text-2xl text-white mb-1 uppercase italic tracking-tight">{item.name}</h3>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-6 px-4">{item.description}</p>
                    </div>
                    
                    {isOwned ? (
                      <button 
                        onClick={() => !isEquipped && handleEquip(item)} 
                        className={`w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-xl active:scale-95'}`}
                      >
                        {isEquipped ? '✓ EQUIPADO' : 'EQUIPAR'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBuy(item)} 
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-emerald-950 py-5 rounded-2xl font-brand text-2xl shadow-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                      >
                        <span className="text-xl">🪙</span> {item.price}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const catIcon = (id: string) => {
  if (id.includes('neon')) return '💫';
  if (id.includes('gold')) return '🏆';
  if (id.includes('retro')) return '🕹️';
  if (id.includes('galaxy')) return '🌌';
  if (id.includes('fire')) return '🔥';
  return '🎖️';
};

const getItemGradient = (id: string) => {
  if (id.includes('neon')) return 'bg-gradient-to-br from-purple-600 to-blue-500 shadow-[inset_0_0_40px_rgba(168,85,247,0.4)]';
  if (id.includes('gold')) return 'bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-700 shadow-[inset_0_0_40px_rgba(234,179,8,0.4)]';
  if (id.includes('retro')) return 'bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-[inset_0_0_40px_rgba(255,255,255,0.1)]';
  if (id.includes('galaxy')) return 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black';
  if (id.includes('fire')) return 'bg-gradient-to-br from-red-600 to-orange-500 shadow-[inset_0_0_40px_rgba(239,68,68,0.4)]';
  return 'bg-zinc-800';
};

export default Store;
