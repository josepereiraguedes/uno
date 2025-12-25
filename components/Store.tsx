
import React, { useState } from 'react';
import { StoreItem, StoreCategory } from '../types';
import { audio } from '../services/audioService';

const STORE_ITEMS: StoreItem[] = [
  { id: 'neon_skin', name: 'Baralho Neon', price: 150, type: 'card_skin', value: 'neon', description: 'Cores vibrantes com brilho pulsante futurista.' },
  { id: 'gold_skin', name: 'Baralho Ouro', price: 500, type: 'card_skin', value: 'gold', description: 'O ápice da ostentação. Brilha como a vitória.' },
  { id: 'retro_skin', name: 'Baralho Retro', price: 100, type: 'card_skin', value: 'retro', description: 'Nostalgia pura em estilo pixel art 8-bit.' },
  { id: 'galaxy_bg', name: 'Mesa Galática', price: 300, type: 'table_bg', value: 'galaxy', description: 'Jogue em uma mesa que flutua no cosmos.' },
  { id: 'fire_effect', name: 'Impacto Fogo', price: 600, type: 'visual_effect', value: 'fire', description: 'Sua jogada incendeia a mesa literalmente.' },
  { id: 'ninja_badge', name: 'Inígnia Ninja', price: 350, type: 'badge', value: 'ninja', description: 'Mostre que você é um mestre da estratégia.' },
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
        inventory: [...profile.inventory, item.id] 
      });
      audio.play('win_fanfare');
      setBuyingId(null);
    }, 600);
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
    <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4 lg:p-10 animate-fade-in">
      <div className="w-full max-w-7xl bg-[#011a14]/90 rounded-[3rem] border border-white/10 flex flex-col h-full shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden relative">
        
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Header Profissional */}
        <div className="p-6 lg:p-10 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center bg-black/40 gap-6">
          <div className="flex flex-col items-center lg:items-start">
            <h2 className="text-4xl lg:text-6xl font-brand text-yellow-400 italic tracking-tighter drop-shadow-2xl">ARENA VAULT</h2>
            <p className="text-white/30 font-black uppercase tracking-[0.4em] text-[8px] lg:text-[10px] mt-2">Coleções Exclusivas e Personalização</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 px-8 py-3 rounded-2xl border border-yellow-500/30 flex items-center gap-4 shadow-inner">
               <span className="text-3xl drop-shadow-md">🪙</span>
               <span className="text-yellow-400 font-brand text-3xl italic">{profile.coins.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 flex items-center justify-center text-3xl transition-all border border-white/10 group">
              <span className="group-hover:rotate-90 transition-transform">✕</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Categorias - Estilo Moderno */}
          <div className="w-24 lg:w-80 border-r border-white/5 bg-black/40 p-4 lg:p-8 space-y-4">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveTab(cat.id)} 
                className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-5 p-4 lg:p-6 rounded-3xl transition-all duration-300 relative group overflow-hidden ${activeTab === cat.id ? 'bg-yellow-500 text-emerald-950 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'hover:bg-white/5 text-white/40'}`}
              >
                <span className={`text-2xl lg:text-3xl transition-transform group-hover:scale-125 ${activeTab === cat.id ? 'scale-110' : ''}`}>{cat.icon}</span>
                <span className="font-brand text-[8px] lg:text-[12px] tracking-widest uppercase hidden lg:block">{cat.label}</span>
                {activeTab === cat.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40"></div>}
              </button>
            ))}
          </div>

          {/* Galeria de Itens Premium */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10 no-scrollbar">
            {STORE_ITEMS.filter(item => item.type === activeTab).map(item => {
              const isOwned = profile.inventory.includes(item.id);
              const isEquipped = profile.equippedSkin === item.id;
              const isBuying = buyingId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className={`group bg-gradient-to-b from-white/10 to-transparent p-[1px] rounded-[3rem] transition-all duration-500 ${isEquipped ? 'from-blue-500' : 'hover:from-white/30'}`}
                >
                  <div className="bg-[#021d18] h-full rounded-[3rem] p-4 flex flex-col overflow-hidden relative">
                    
                    {/* Visual Card Wrapper */}
                    <div className={`h-56 rounded-[2.5rem] flex items-center justify-center text-8xl relative overflow-hidden transition-all duration-700 ${getItemGradient(item.id)} ${isEquipped ? 'scale-[0.98]' : 'group-hover:scale-[1.02]'}`}>
                       
                       {/* Efeito de Reflexo (Shine) */}
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                       
                       <span className={`z-10 transition-all duration-500 ${isEquipped ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 'group-hover:scale-125 drop-shadow-2xl'}`}>
                         {catIcon(item.id)}
                       </span>

                       {/* Etiquetas Especiais */}
                       {item.price > 400 && !isOwned && (
                         <div className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-xl">Raro</div>
                       )}
                    </div>
                    
                    {/* Info & Ação */}
                    <div className="mt-6 px-4 flex-1 flex flex-col">
                      <h3 className="font-brand text-2xl lg:text-3xl text-white mb-2 uppercase italic tracking-tighter group-hover:text-yellow-400 transition-colors">{item.name}</h3>
                      <p className="text-[9px] lg:text-[11px] text-white/40 uppercase font-bold leading-relaxed mb-8 flex-1">{item.description}</p>
                      
                      <div className="mt-auto">
                        {isOwned ? (
                          <button 
                            onClick={() => !isEquipped && handleEquip(item)} 
                            disabled={isEquipped}
                            className={`w-full py-5 rounded-2xl font-black text-[10px] lg:text-[12px] uppercase tracking-[0.3em] transition-all duration-300 ${isEquipped ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-95 border-b-4 border-blue-800'}`}
                          >
                            {isEquipped ? '✓ EQUIPADO' : 'EQUIPAR ITEM'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBuy(item)} 
                            disabled={isBuying}
                            className={`w-full py-5 rounded-2xl font-brand text-xl lg:text-2xl shadow-xl transition-all duration-300 flex items-center justify-center gap-4 relative overflow-hidden ${isBuying ? 'bg-emerald-500' : 'bg-yellow-500 text-emerald-950 border-b-4 border-yellow-700 hover:bg-yellow-400 active:border-b-0 active:translate-y-1'}`}
                          >
                            {isBuying ? (
                              <span className="animate-pulse">COMPRANDO...</span>
                            ) : (
                              <>
                                <span className="text-2xl">🪙</span> {item.price.toLocaleString()}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Glow de Fundo conforme o item */}
                    <div className={`absolute -bottom-10 -left-10 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${getGlowColor(item.id)}`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer com Status */}
        <div className="p-6 bg-black/60 border-t border-white/5 flex justify-center lg:justify-end">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Ouro e Glória aguardam na arena</p>
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
  if (id.includes('blue')) return 'bg-blue-500';
  if (id.includes('fire')) return 'bg-red-500';
  return 'bg-white';
};

const getItemGradient = (id: string) => {
  if (id.includes('neon')) return 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 shadow-[inset_0_0_50px_rgba(168,85,247,0.3)]';
  if (id.includes('gold')) return 'bg-gradient-to-br from-yellow-700 via-yellow-400 to-yellow-800 shadow-[inset_0_0_50px_rgba(234,179,8,0.3)]';
  if (id.includes('retro')) return 'bg-gradient-to-br from-zinc-800 to-black shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]';
  if (id.includes('galaxy')) return 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black';
  if (id.includes('fire')) return 'bg-gradient-to-br from-red-800 to-orange-600 shadow-[inset_0_0_50px_rgba(239,68,68,0.3)]';
  return 'bg-emerald-950';
};

export default Store;
