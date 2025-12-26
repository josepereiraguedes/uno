
import React from 'react';
import { Card, CardColor, CardType } from '../types';
import { COLOR_CLASSES, CARD_LABELS } from '../constants';

interface UnoCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  playable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hidden?: boolean;
  skin?: string; 
}

const UnoCard: React.FC<UnoCardProps> = ({ card, onClick, disabled, playable, size = 'md', hidden, skin = 'default' }) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-base',
    md: 'w-24 h-36 lg:w-28 lg:h-40 text-2xl',
    lg: 'w-32 h-48 lg:w-36 lg:h-54 text-4xl',
  };

  const getSkinClasses = () => {
    switch (skin) {
      case 'neon_skin':
        return 'border-opacity-100 shadow-[0_0_20px_rgba(255,255,255,0.4)] saturate-[1.8] brightness-125 border-white';
      case 'gold_skin':
        return 'border-yellow-200/60 shadow-[0_0_25px_rgba(234,179,8,0.5)] bg-gradient-to-tr from-yellow-700 via-yellow-400 to-yellow-800 animate-pulse';
      case 'retro_skin':
        return 'sepia-[0.4] contrast-[1.1] brightness-[0.8] grayscale-[0.3] pixelated-border';
      default:
        return 'border-white/40';
    }
  };

  // Se a carta for indefinida, renderiza um placeholder vazio ou a parte de trás
  if (!card || hidden) {
    const backGradient = skin === 'gold_skin' 
      ? 'from-yellow-600 via-yellow-400 to-yellow-800' 
      : 'from-red-700 via-red-800 to-zinc-950';

    return (
      <div className={`${sizeClasses[size]} bg-zinc-900 rounded-xl border-2 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden transition-transform hover:rotate-2`}>
         <div className={`w-full h-full bg-gradient-to-br ${backGradient} flex items-center justify-center p-2`}>
            <div className="w-full h-full border border-white/10 rounded-lg flex items-center justify-center relative overflow-hidden">
               <span className="font-brand text-white/20 text-[10px] lg:text-[14px] uppercase tracking-[0.4em] -rotate-45">UNO</span>
            </div>
         </div>
      </div>
    );
  }

  const isWild = card.color === CardColor.WILD;
  
  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]} 
        ${skin === 'gold_skin' && card.color !== CardColor.WILD ? '' : COLOR_CLASSES[card.color]} 
        ${getSkinClasses()}
        rounded-xl border-[3px] lg:border-[4px] shadow-2xl flex items-center justify-center relative transition-all duration-300 overflow-visible
        ${playable ? 'ring-4 lg:ring-[10px] ring-yellow-400/60 scale-105 z-[100] shadow-[0_0_40px_rgba(250,204,21,0.5)]' : 'grayscale-[0.05]'}
        ${disabled ? 'cursor-default' : 'cursor-pointer hover:-translate-y-2'}
      `}
    >
      <div className="absolute top-1 left-2 font-black leading-none text-white text-[12px] lg:text-xl z-10 drop-shadow-lg">
        {card.type === CardType.NUMBER ? card.value : CARD_LABELS[card.type]}
      </div>
      
      {isWild ? (
        <div className={`w-12 h-12 lg:w-24 lg:h-24 rounded-full overflow-hidden flex flex-wrap -rotate-45 border-4 border-white/30 ${card.type === CardType.WILD_DRAW_FOUR ? 'animate-bounce' : ''}`}>
          <div className="w-1/2 h-1/2 bg-red-600"></div>
          <div className="w-1/2 h-1/2 bg-blue-600"></div>
          <div className="w-1/2 h-1/2 bg-green-600"></div>
          <div className="w-1/2 h-1/2 bg-yellow-400"></div>
        </div>
      ) : (
        <div className={`w-12 h-14 lg:w-24 lg:h-28 bg-white/20 rounded-[50%] flex items-center justify-center -rotate-12`}>
           <span className={`font-brand text-white text-3xl lg:text-7xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]`}>
             {card.type === CardType.NUMBER ? card.value : CARD_LABELS[card.type]}
           </span>
        </div>
      )}

      <div className="absolute bottom-1 right-2 font-black leading-none rotate-180 text-white text-[12px] lg:text-xl z-10 drop-shadow-lg">
        {card.type === CardType.NUMBER ? card.value : CARD_LABELS[card.type]}
      </div>
    </div>
  );
};

export default UnoCard;
