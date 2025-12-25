
import React, { useState } from 'react';
import { StoreItem, StoreCategory } from '../types';
import { audio } from '../services/audioService';

const STORE_ITEMS: StoreItem[] = [
  { id: 'neon_skin', name: 'Baralho Neon', price: 150, type: 'card_skin', value: 'neon', description: 'Cores vibrantes com brilho pulsante futurista. Perfeito para a noite.' },
  { id: 'gold_skin', name: 'Baralho Ouro', price: 500, type: 'card_skin', value: 'gold', description: 'O ápice da ostentação. Brilha como a vitória suprema na arena.' },
  { id: 'retro_skin', name: 'Baralho Retro', price: 100, type: 'card_skin', value: 'retro', description: 'Nostalgia pura em estilo pixel art 8-bit. Para os clássicos.' },
  { id: 'galaxy_bg', name: 'Mesa Galática', price: 300, type: 'table_bg', value: 'galaxy', description: 'Jogue em uma mesa que flutua no cosmos profundo.' },
  { id: 'fire_effect', name: 'Impacto Fogo', price: 600, type: 'visual_effect', value: 'fire', description: 'Suas jogadas incendeiam a mesa. Efeito visual lendário.' },
  { id: 'ninja_badge', name: 'Inígnia Ninja', price: 350, type: 'badge', value: 'ninja', description: 'Silencioso, mas mortal. Mostre que você é um mestre.' },
];

interface StoreProps {
  profile: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

const Store: React.FC<StoreProps> = ({ profile, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<StoreCategory>('card_skin');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const handleBuy = (item: StoreItem) => {
    if (profile.coins < item.price) {
      audio.play('penalty');
      return;
    }
    
    setBuyingId(item.id);
    setTimeout(() => {
      onUpdate({ 
        coins: profile.coins - item.price, 
        inventory: [...(profile.inventory || []), item.id] 
      });
      audio.play('win_fanfare');
      setBuyingId(null);
    }, 800);
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
    <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4 lg:p-8 animate-fade-in">
      <div className="w-full max-w-7xl bg-[#011a14]/90 rounded-[4rem] border border-white/10 flex flex-col h-full shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden relative">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[150px] rounded-full pointer-events-none"></div>

        {/* Store Header */}
        <div className="p-8 lg:p-12 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center bg-black/40 gap-8">
          <div className="flex flex-col items-center lg:items-start">
            <h2 className="text-5xl lg:text-7xl font-brand text-yellow-400 italic tracking-tighter drop-shadow-2xl">ARENA VAULT</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px]">Mercado Negro de Itens Lendários</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/5 px-10 py-4 rounded-3xl border border-yellow-500/20 flex items-center gap-5 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]">
               <span className="text-4xl drop-shadow-md">🪙</span>
               <span className="text-yellow-400 font-brand text-4xl italic">{profile.coins.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="w-16 h-16 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center text-3xl transition-all border border-white/10 group">
              <span className="group-hover:rotate-90 transition-transform">✕</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Sidebar */}
          <div className="w-28 lg:w-96 border-r border-white/5 bg-black/50 p-6 lg:p-10 space-y-6">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveTab(cat.id)} 
                className={`w-full flex flex-col lg:flex-row items-center gap-4 lg:gap-6 p-6 lg:p-8 rounded-[2.5rem] transition-all duration-500 relative group overflow-hidden ${activeTab === cat.id ? 'bg-yellow-500 text-emerald-950 shadow-[0_0_50px_rgba(234,179,8,0.2)] scale-[1.05]' : 'hover:bg-white/5 text-white/30 hover:text-white'}`}
              >
                <span className={`text-3xl lg:text-4xl transition-all duration-500 ${activeTab === cat.id ? 'scale-110' : 'group-hover:scale-125'}`}>{cat.icon}</span>
                <span className="font-brand text-[10px] lg:text-sm tracking-[0.2em] uppercase hidden lg:block">{cat.label}</span>
                {activeTab === cat.id && <div className="absolute right-0 top-1/4 bottom-1/4 w-1.5 bg-white/60 rounded-full"></div>}
              </button>
            ))}
          </div>

          {/* Item Grid - Ultra High Quality Cards */}
          <div className="flex-1 overflow-y-auto p-8 lg:p-16 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-12 lg:gap-16 no-scrollbar">
            {STORE_ITEMS.filter(item => item.type === activeTab).map(item => {
              const isOwned = (profile.inventory || []).includes(item.id);
              const isEquipped = profile.equippedSkin === item.id;
              const isBuying = buyingId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className={`group relative flex flex-col transition-all duration-500 ${isEquipped ? 'scale-[1.02]' : 'hover:scale-[1.05]'}`}
                >
                  {/* Card Main Body */}
                  <div className={`bg-[#021d18]/80 rounded-[4rem] p-6 border-2 transition-all duration-700 flex flex-col h-full relative overflow-hidden ${isEquipped ? 'border-blue-500 shadow-[0_0_60px_rgba(37,99,235,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                    
                    {/* Visual Preview */}
                    <div className={`h-64 rounded-[3.5rem] flex items-center justify-center text-9xl relative overflow-hidden mb-8 transition-all duration-700 ${getItemGradient(item.id)}`}>
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                       <span className="z-10 group-hover:scale-125 transition-transform duration-700 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{catIcon(item.id)}</span>
                       
                       {item.price > 400 && (
                         <div className="absolute top-6 right-6 bg-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-2xl animate-pulse">Lendário</div>
                       )}
                    </div>
                    
                    <div className="flex-1 flex flex-col px-4">
                      <h3 className="font-brand text-3xl lg:text-4xl text-white mb-3 uppercase italic tracking-tighter group-hover:text-yellow-400 transition-colors">{item.name}</h3>
                      <p className="text-[11px] lg:text-[13px] text-white/30 uppercase font-bold leading-relaxed mb-10">{item.description}</p>
                      
                      <div className="mt-auto">
                        {isOwned ? (
                          <button 
                            onClick={() => !isEquipped && handleEquip(item)} 
                            className={`w-full py-6 rounded-[2rem] font-black text-xs lg:text-sm uppercase tracking-[0.4em] transition-all duration-500 ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-2xl active:scale-95 text-white'}`}
                          >
                            {isEquipped ? '✓ SELECIONADO' : 'EQUIPAR'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBuy(item)} 
                            disabled={isBuying}
                            className={`w-full py-6 rounded-[2rem] font-brand text-2xl lg:text-3xl shadow-2xl transition-all duration-500 flex items-center justify-center gap-5 relative overflow-hidden ${isBuying ? 'bg-emerald-600' : 'bg-yellow-500 text-emerald-950 hover:bg-yellow-400 active:translate-y-1'}`}
                          >
                            {isBuying ? (
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                <span className="text-xl">PROCESSANDO...</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-3xl">🪙</span> {item.price.toLocaleString()}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Background Glow */}
                    <div className={`absolute -bottom-20 -right-20 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-1000 ${getGlowColor(item.id)}`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Store Status Footer */}
        <div className="p-8 bg-black/60 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-4">
             <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
             <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.4em]">Servidores de inventário online e sincronizados</p>
           </div>
           <p className="text-[10px] font-black text-yellow-500/40 uppercase tracking-widest italic">Prepare-se para o próximo combate em grande estilo</p>
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

const getGlowColor = (id: string) => {
  if (id.includes('neon')) return 'bg-purple-500';
  if (id.includes('gold')) return 'bg-yellow-500';
  if (id.includes('retro')) return 'bg-white';
  if (id.includes('galaxy')) return 'bg-indigo-500';
  if (id.includes('fire')) return 'bg-red-500';
  return 'bg-blue-500';
};

const getItemGradient = (id: string) => {
  if (id.includes('neon')) return 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-950 shadow-[inset_0_0_80px_rgba(168,85,247,0.4)]';
  if (id.includes('gold')) return 'bg-gradient-to-br from-yellow-700 via-yellow-400 to-yellow-800 shadow-[inset_0_0_80px_rgba(234,179,8,0.4)]';
  if (id.includes('retro')) return 'bg-gradient-to-br from-zinc-800 to-black shadow-[inset_0_0_60px_rgba(255,255,255,0.05)]';
  if (id.includes('galaxy')) return 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black';
  if (id.includes('fire')) return 'bg-gradient-to-br from-red-800 to-orange-600 shadow-[inset_0_0_80px_rgba(239,68,68,0.4)]';
  return 'bg-emerald-950';
};

export default Store;
