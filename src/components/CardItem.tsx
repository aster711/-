/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Card, Suit } from '../types';

interface CardItemProps {
  card: Card;
  index: number;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-950',
  spades: 'text-slate-950',
};

// Symmetrical positioning for center suits of non-face cards (2-10)
const centerSuitsPositions: Record<number, { top: string; left: string; rotate?: boolean }[]> = {
  2: [
    { top: '22%', left: '50%' },
    { top: '78%', left: '50%', rotate: true }
  ],
  3: [
    { top: '22%', left: '50%' },
    { top: '50%', left: '50%' },
    { top: '78%', left: '50%', rotate: true }
  ],
  4: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  5: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '50%', left: '50%' },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  6: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '50%', left: '30%' },
    { top: '50%', left: '70%' },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  7: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '36%', left: '50%' },
    { top: '50%', left: '30%' },
    { top: '50%', left: '70%' },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  8: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '36%', left: '50%' },
    { top: '50%', left: '30%' },
    { top: '50%', left: '70%' },
    { top: '64%', left: '50%', rotate: true },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  9: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '41%', left: '30%' },
    { top: '41%', left: '70%' },
    { top: '50%', left: '50%' },
    { top: '59%', left: '30%', rotate: true },
    { top: '59%', left: '70%', rotate: true },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ],
  10: [
    { top: '22%', left: '30%' },
    { top: '22%', left: '70%' },
    { top: '31%', left: '50%' },
    { top: '41%', left: '30%' },
    { top: '41%', left: '70%' },
    { top: '59%', left: '30%', rotate: true },
    { top: '59%', left: '70%', rotate: true },
    { top: '69%', left: '50%', rotate: true },
    { top: '78%', left: '30%', rotate: true },
    { top: '78%', left: '70%', rotate: true }
  ]
};

export const CardItem: React.FC<CardItemProps> = ({ card, index }) => {
  const { suit, display, rank, isFaceUp } = card;

  // 1. CARD BACK VIEW
  if (!isFaceUp) {
    return (
      <motion.div
        layoutId={card.id}
        initial={{ scale: 0.8, opacity: 0, y: -20, rotate: -5 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl border border-zinc-800 bg-slate-950 shadow-2xl flex items-center justify-center overflow-hidden cursor-default select-none"
        id={`card-back-${index}`}
      >
        <img 
          src="/dateA/card.png" 
          alt="Card Back" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {/* Symmetrical diagonal gold accent thin border */}
        <div className="absolute inset-1.5 border border-zinc-800/20 rounded-lg pointer-events-none z-10" />
        {/* Soft elegant glossy card shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-20" />
      </motion.div>
    );
  }

  // 1.5 CUSTOM CARD IMAGE FRONT VIEW (e.g. frozen 9 card or custom face card)
  if (isFaceUp && card.customImage) {
    const isFrozen = card.customImage.includes('1780971232005');
    const isJQK = ['J', 'Q', 'K'].includes(display);
    const colorClass = suitColors[suit];
    const symbol = suitSymbols[suit];
    const isHeartOrDiamond = suit === 'hearts' || suit === 'diamonds';

    // Premium styling parameters
    const borderClass = isFrozen 
      ? 'border-sky-400' 
      : (isJQK 
          ? 'border-transparent shadow-none' 
          : 'border-zinc-800/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
        );
    const innerBorderColor = isFrozen ? 'border-sky-400/30' : 'border-transparent';
    const overlayTextColor = isFrozen 
      ? 'text-sky-400' 
      : (isJQK 
          ? (isHeartOrDiamond ? 'text-rose-400 font-extrabold filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : 'text-zinc-100 font-extrabold filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]') 
          : (isHeartOrDiamond ? 'text-rose-600' : 'text-slate-950')
        );
    const overlayBgColor = isFrozen 
      ? 'bg-slate-950/75' 
      : (isJQK 
          ? 'bg-transparent shadow-none border-none' 
          : 'bg-white/95 border border-slate-200/50 shadow-sm'
        );
    const bgClass = isJQK ? 'bg-transparent' : 'bg-slate-900 border-2';

    return (
      <motion.div
        layoutId={card.id}
        initial={{ scale: 0.8, opacity: 0, scaleY: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, scaleY: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className={`relative w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl ${borderClass} ${bgClass} flex flex-col justify-between overflow-hidden cursor-default select-none`}
        id={`card-front-${index}`}
      >
        <img 
          src={card.customImage} 
          alt="Custom Card" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          onError={() => {
            console.error('Custom card image error: failed to load path', card.customImage);
          }}
        />
        
        {/* Symmetrical diagonal accent thin border */}
        {!isJQK && (
          <div className={`absolute inset-1.5 border ${innerBorderColor} rounded-lg pointer-events-none z-10`} />
        )}

        {/* Display value overlay at top-left and bottom-right */}
        {!isJQK && (
          <>
            <div className={`absolute top-1.5 left-2 flex flex-col items-center justify-start leading-none ${overlayTextColor} ${overlayBgColor} px-1.5 py-1 rounded z-20 font-black`}>
              <span className="text-xs md:text-sm font-serif">{display}</span>
              {!isFrozen && <span className="text-[10px] md:text-xs mt-0.5">{symbol}</span>}
            </div>
            <div className={`absolute bottom-1.5 right-2 flex flex-col items-center justify-start leading-none ${overlayTextColor} ${overlayBgColor} px-1.5 py-1 rounded z-20 font-black rotate-180`}>
              <span className="text-xs md:text-sm font-serif">{display}</span>
              {!isFrozen && <span className="text-[10px] md:text-xs mt-0.5">{symbol}</span>}
            </div>
          </>
        )}

        {/* Slashed overlay decoration */}
        {card.isHalved && (
          <div className="absolute inset-0 bg-rose-500/5 pointer-events-none z-30 flex items-center justify-center">
            {/* Neon Slash line */}
            <div className="absolute w-[150%] h-1 bg-gradient-to-r from-red-650 via-rose-500 to-red-650 shadow-[0_0_10px_#f43f5e] rotate-[35deg]" />
            <span className="absolute bg-rose-600 text-white text-[7px] md:text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded rotate-[-12deg] uppercase scale-90 border border-white/20 shadow-lg">
              半分斬
            </span>
          </div>
        )}

        {/* Knife Disabled (Sakuya's Murder Doll) overlay decoration */}
        {card.isDisabled && (
          <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none z-30 flex items-center justify-center">
            <div className="text-3xl md:text-4xl filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] animate-bounce select-none pointer-events-none">🗡️</div>
            <span className="absolute bottom-2 bg-zinc-950 text-rose-400 text-[7px] md:text-[8px] font-black tracking-wider px-1 py-0.5 rounded border border-rose-500/40 shadow-lg select-none">
              使用禁止
            </span>
          </div>
        )}

        {/* Subtle ice / card highlight gloss */}
        {!isJQK && (
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-white/20 pointer-events-none z-15" />
        )}
      </motion.div>
    );
  }

  // 2. CARD FRONT VIEW (Standard Casino representation)
  const colorClass = suitColors[suit];
  const symbol = suitSymbols[suit];
  const isHeartOrDiamond = suit === 'hearts' || suit === 'diamonds';

  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0, scaleY: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, scaleY: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      className="relative w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl border border-zinc-200 bg-white shadow-2xl flex flex-col justify-between overflow-hidden cursor-default select-none"
      id={`card-front-${index}`}
    >
      {/* Corner Index Top-Left */}
      <div className={`absolute top-2 left-2.5 flex flex-col items-center justify-start leading-none ${colorClass}`}>
        <span className="text-lg md:text-xl font-black font-serif">{display}</span>
        <span className="text-xs md:text-sm leading-none mt-1">{symbol}</span>
      </div>

      {/* Center Body Space */}
      <div className="absolute inset-x-3 inset-y-8 md:inset-x-4 md:inset-y-10 flex items-center justify-center">
        
        {/* Case A: Ace Graphic Design (Premium stylized center layout) */}
        {display === 'A' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {suit === 'spades' ? (
              <div className="relative flex flex-col items-center justify-center">
                {/* Traditional detailed Ace of Spades Casino Medal frame */}
                <div className="absolute w-14 h-14 md:w-16 md:h-16 border border-dashed border-zinc-250 rounded-full animate-pulse opacity-85" />
                <span className="text-4xl md:text-5xl filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)] text-slate-950 font-serif z-10">
                  ♠
                </span>
                <span className="text-[7px] md:text-[8px] font-sans font-black tracking-widest text-amber-600 uppercase mt-2 select-none">
                  GOLD STANDARD
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <span className={`text-4xl md:text-5xl filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.1)] ${colorClass}`}>
                  {symbol}
                </span>
                <span className="text-[7px] md:text-[8px] font-sans font-bold tracking-wider text-amber-600/60 uppercase mt-1.5">
                  ACE
                </span>
              </div>
            )}
          </div>
        )}

        {/* Case B: Royal Portrait Symmetrical Grid (J, Q, K - Symmetrical medieval styling) */}
        {['J', 'Q', 'K'].includes(display) && (() => {
          const bgTone = isHeartOrDiamond ? 'from-rose-50 to-zinc-50' : 'from-slate-100 to-zinc-50';
          const title = display === 'K' ? 'KING' : display === 'Q' ? 'QUEEN' : 'JACK';
          const avatar = display === 'K' ? '🧔' : display === 'Q' ? '👩' : '🧑';
          const item = display === 'K' ? '👑🗡️' : display === 'Q' ? '👑🌹' : '🛡️⚔️';
          
          return (
            <div className={`absolute inset-0.5 rounded border border-zinc-250 bg-gradient-to-b ${bgTone} flex flex-col justify-between overflow-hidden`}>
              {/* Top Face profile */}
              <div className="flex-1 flex flex-col items-center justify-start pt-2 relative select-none">
                <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 tracking-widest leading-none">{title}</span>
                <span className="text-lg md:text-2xl mt-1.5">{avatar}</span>
                <span className="text-xs md:text-sm mt-1 leading-none opacity-90">{item}</span>
              </div>
              
              {/* Diagonal divider */}
              <div className="border-t border-dashed border-zinc-200/50 w-[140%] -left-[20%] rotate-12 absolute top-1/2" />
              
              {/* Bottom Face profile (rotated 180) */}
              <div className="flex-1 flex flex-col items-center justify-start pt-2 relative select-none rotate-180">
                <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 tracking-widest leading-none">{title}</span>
                <span className="text-lg md:text-2xl mt-1.5">{avatar}</span>
                <span className="text-xs md:text-sm mt-1 leading-none opacity-90">{item}</span>
              </div>
            </div>
          );
        })()}

        {/* Case C: Cards 2-10 arrangement (Precise casino layout matrices) */}
        {!['A', 'J', 'Q', 'K'].includes(display) && (
          <div className="absolute inset-0 w-full h-full relative">
            {centerSuitsPositions[rank]?.map((coord, idx) => (
              <span
                key={idx}
                className={`absolute text-[13px] md:text-[16px] ${colorClass} transition-all`}
                style={{
                  top: coord.top,
                  left: coord.left,
                  transform: `translate(-50%, -50%) ${coord.rotate ? 'rotate(180deg)' : ''}`,
                }}
              >
                {symbol}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Corner Index Bottom-Right (Rotated 180) */}
      <div className={`absolute bottom-2 right-2.5 flex flex-col items-center justify-end leading-none rotate-180 ${colorClass}`}>
        <span className="text-lg md:text-xl font-black font-serif">{display}</span>
        <span className="text-xs md:text-sm leading-none mt-1">{symbol}</span>
      </div>

      {/* Slashed overlay decoration */}
      {card.isHalved && (
        <div className="absolute inset-0 bg-rose-500/5 pointer-events-none z-30 flex items-center justify-center">
          {/* Neon Slash line */}
          <div className="absolute w-[150%] h-1 bg-gradient-to-r from-red-650 via-rose-500 to-red-650 shadow-[0_0_10px_#f43f5e] rotate-[35deg]" />
          <span className="absolute bg-rose-600 text-white text-[7px] md:text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded rotate-[-12deg] uppercase scale-90 border border-white/20 shadow-lg">
            半分斬
          </span>
        </div>
      )}

      {/* Knife Disabled (Sakuya's Murder Doll) overlay decoration */}
      {card.isDisabled && (
        <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none z-30 flex items-center justify-center">
          <div className="text-3xl md:text-4xl filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] animate-bounce select-none pointer-events-none">🗡️</div>
          <span className="absolute bottom-2 bg-zinc-950 text-rose-400 text-[7px] md:text-[8px] font-black tracking-wider px-1 py-0.5 rounded border border-rose-500/40 shadow-lg select-none">
            使用禁止
          </span>
        </div>
      )}

      {/* Subtle paper grain & glossy highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.02] via-transparent to-white/[0.04] pointer-events-none" />
    </motion.div>
  );
};
