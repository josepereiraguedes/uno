
import React, { useState } from 'react';
import { StoreItem, StoreCategory } from '../types';
import { audio } from '../services/audioService';

const STORE_ITEMS: StoreItem[] = [
  { id: 'neon_skin', name: 'Baralho Neon', price: 150, type: 'card_skin', value: 'neon', description: 'Cores vibrantes pulsantes.' },
  { id: 'gold_skin', name: 'Baralho Ouro', price: 500, type: 'card_skin', value: 'gold', description: 'O ápice da ostentação.' },
  { id: 'retro_skin', name: 'Baralho Retro', price: 100, type: 'card_skin', value: 'retro', description: 'Estilo pixel art clássico.' },
  { id: 'galaxy_bg', name: 'Mesa Galática', price: 300, type: 'table_bg', value: 'galaxy', description: 'Jogue flutuando no cosmos.' },
  { id: 'fire_effect', name: 'Impacto Fogo', price: 600, type: 'visual_effect', value: 'fire', description: 'Jogadas que incendeiam.' },
  { id: 'whale_badge', name: 'Inígnia Baleia', price: 200, type: 'badge', value: 'whale', description: 'Prestígio internacional.' },
  { id: 'fire_aura', name: 'Aura Flamejante', price: 400, type: 'avatar_skin', value: 'fire', description: 'Avatar envolto em chamas.' },
  { id: 'diamond_frame', name: 'Moldura Diamante', price: 750, type: 'avatar_skin', value: 'diamond', description: 'Brilho eterno ao redor.' },
  { id: 'glitch_skin', name: 'Efeito Glitch', price: 300, type: 'avatar_skin', value: 'glitch', description: 'Instabilidade digital.' },
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
      onUpdate({ coins: profile.coins - item.price, inventory: [...(profile.inventory || []), item.id] });
      audio.play('win_fanfare');
      setBuyingId(null);
    }, 800);
  };

  const handleEquip = (item: StoreItem) => {
    let updates: any = {};
    switch (item.type) {
      case 'card_skin': updates.equippedSkin = item.id; break;
      case 'table_bg': updates.equippedTable = item.id; break;
      case 'badge': updates.equippedBadge = item.id; break;
      case 'visual_effect': updates.equippedEffect = item.id; break;
      case 'avatar_skin': updates.equippedAvatarSkin = item.id; break;
    }
    onUpdate(updates);
    audio.play('click');
  };

  const categories: { id: StoreCategory; label: string; icon: string }[] = [
    { id: 'card_skin', label: 'Cartas', icon: '🃏' },
    { id: 'avatar_skin', label: 'Perfis', icon: '👤' },
    { id: 'table_bg', label: 'Mesas', icon: '🖼️' },
    { id: 'visual_effect', label: 'Efeitos', icon: '✨' },
    { id: 'badge', label: 'Insígnias', icon: '🏅' },
  ];

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col animate-fade-in overflow-hidden safe-area-inset">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/60">
        <div>
          <h2 className="text-2xl font-brand text-yellow-400 italic">VAULT</h2>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-yellow-400 font-brand">🪙 {profile.coins.toLocaleString()}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">✕</button>
      </div>

      <div className="flex overflow-x-auto p-4 gap-3 no-scrollbar bg-black/40 border-b border-white/5">
        {categories.map(cat => (
          <button 
            key={cat.id} onClick={() => setActiveTab(cat.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === cat.id ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/40'}`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="font-brand text-[10px] uppercase tracking-wider">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 no-scrollbar">
        {STORE_ITEMS.filter(item => item.type === activeTab).map(item => {
          const isOwned = (profile.inventory || []).includes(item.id);
          let isEquipped = false;
          if (item.type === 'card_skin') isEquipped = profile.equippedSkin === item.id;
          if (item.type === 'avatar_skin') isEquipped = profile.equippedAvatarSkin === item.id;
          
          return (
            <div key={item.id} className={`bg-white/5 rounded-3xl border p-4 flex flex-col transition-all ${isEquipped ? 'border-yellow-500 shadow-lg shadow-yellow-500/10 bg-yellow-500/5' : 'border-white/5'}`}>
              <div className="h-32 rounded-2xl bg-black/40 mb-3 flex items-center justify-center text-5xl">
                {item.id.includes('skin') ? '🃏' : item.id.includes('aura') ? '🔥' : item.id.includes('galaxy') ? '🌌' : '💎'}
              </div>
              <h3 className="text-lg font-brand text-white uppercase italic">{item.name}</h3>
              <p className="text-[9px] text-white/40 uppercase mb-4 flex-1 tracking-tight">{item.description}</p>
              
              {isOwned ? (
                <button 
                  onClick={() => !isEquipped && handleEquip(item)} 
                  className={`w-full py-3 rounded-xl font-brand text-xs tracking-widest ${isEquipped ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}
                >
                  {isEquipped ? 'EQUIPADO' : 'EQUIPAR'}
                </button>
              ) : (
                <button onClick={() => handleBuy(item)} className="w-full py-3 bg-yellow-500 text-black rounded-xl font-brand text-sm flex items-center justify-center gap-2">
                   {buyingId === item.id ? '...' : `🪙 ${item.price}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Store;
