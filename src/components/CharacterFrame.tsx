/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sparkles } from 'lucide-react';
import { TouhouCharId, TOUHOU_CHARACTERS } from '../touhouData';
import { Difficulty } from '../types';

interface CharacterFrameProps {
  isDealer: boolean;
  dialogue: string;
  selectedCharId?: TouhouCharId;
  difficulty?: Difficulty;
  roundCount?: number;
  sakuyaMaidRound?: number;
  flandreFourRound?: number;
  murderDollGlowing?: boolean;
  flandreBoomGlowing?: boolean;
  miserableFateGlowing?: boolean;
  perfectMaidGlowing?: boolean;
  isRemiliaFateUsed?: boolean;
}

const DEALER_DATA = {
  easy: {
    japaneseName: 'チルノ',
    imageUrl: 'dateA/tiruno.png',
    bgGradient: 'from-sky-950 via-blue-900 to-black',
  },
  normal: {
    japaneseName: '咲夜',
    imageUrl: 'dateA/sakuya.jpg',
    bgGradient: 'from-slate-900 via-indigo-950 to-black',
  },
  hard: {
    japaneseName: 'レミリア・スカーレット',
    imageUrl: 'dateA/remiria.png',
    bgGradient: 'from-rose-950 via-red-950 to-black',
  },
  lunatic: {
    japaneseName: 'フランドール・スカーレット',
    imageUrl: 'dateA/furan.jpg',
    bgGradient: 'from-red-950 via-purple-950 to-black',
  },
};

export const CharacterFrame: React.FC<CharacterFrameProps> = ({ 
  isDealer, 
  dialogue, 
  selectedCharId, 
  difficulty,
  roundCount,
  sakuyaMaidRound,
  flandreFourRound,
  murderDollGlowing,
  flandreBoomGlowing,
  miserableFateGlowing,
  perfectMaidGlowing,
  isRemiliaFateUsed
}) => {
  const chosenChar = (!isDealer && selectedCharId) ? TOUHOU_CHARACTERS[selectedCharId] : null;
  const currentDealer = DEALER_DATA[difficulty || 'normal'];

  // Define dealer abilities and their descriptions / glow conditions dynamically
  const dealerAbilities = React.useMemo(() => {
    if (!isDealer) return [];
    if (difficulty === 'easy') {
      return [
        {
          id: 'sansu',
          name: '算数教室',
          desc: '難しい計算はあまり得意ではありません',
          isPassive: true,
          isActive: true, // Constant passive, always glowing
        },
        {
          id: 'freeze',
          name: '凍符「パーフェクトフリーズ」',
          desc: '2枚目に引くカードを特別な9に変えます。',
          isPassive: false,
          isActive: roundCount === 2, // Glow during Round 2 freeze
        },
      ];
    } else if (difficulty === 'normal') {
      return [
        {
          id: 'maid',
          name: '完璧な給仕',
          desc: 'いざという時、良いカードが来るように山札を調整します。',
          isPassive: false,
          isActive: !!perfectMaidGlowing || roundCount === sakuyaMaidRound, // Glow during this round
        },
        {
          id: 'doll',
          name: '幻符「殺人ドール」',
          desc: 'あなたが強いカードを引いた時、そのカードを封印します。',
          isPassive: false,
          isActive: !!murderDollGlowing, // Glow when triggered
        },
      ];
    } else if (difficulty === 'hard') {
      return [
        {
          id: 'tokken',
          name: '領主の特権',
          desc: '彼女の手札は全て伏せられ、勝負の時まで結果が見えません。',
          isPassive: true,
          isActive: true, // Constant passive, always glowing
        },
        {
          id: 'fate',
          name: '運命「ミゼラブルフェイト」',
          desc: '運命を操作して勝ちを引き寄せます',
          isPassive: false,
          isActive: !!miserableFateGlowing || !!isRemiliaFateUsed, // Glow when triggered or used in this round
        },
      ];
    } else if (difficulty === 'lunatic') {
      return [
        {
          id: 'boom',
          name: 'きゅっとしてドカーン',
          desc: 'フランはバーストしません。',
          isPassive: false,
          isActive: !!flandreBoomGlowing, // Glow when triggered
        },
        {
          id: 'fourkind',
          name: '禁忌「フォーオブアカインド」',
          desc: '4枚引いてその中から一番良い組み合わせで勝負します。',
          isPassive: false,
          isActive: roundCount === flandreFourRound, // Glow during that round
        },
      ];
    }
    return [];
  }, [difficulty, isDealer, roundCount, sakuyaMaidRound, flandreFourRound, murderDollGlowing, flandreBoomGlowing, miserableFateGlowing, perfectMaidGlowing, isRemiliaFateUsed]);

  return (
    <div 
      className={`flex flex-col items-center w-full ${isDealer ? 'max-w-[320px] items-stretch' : 'max-w-[180px]'} ${isDealer ? 'justify-start' : 'justify-end'}`} 
      id={isDealer ? "dealer-character" : "player-character"}
    >
      
      {/* Dialogue Bubble: Above for Player, Below for Dealer */}
      {!isDealer && (
        <div className="w-full relative h-[56px] mb-3" id="player-dialogue-section">
          <AnimatePresence mode="wait">
            {dialogue && (
              <motion.div
                key={dialogue}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 right-0 w-max min-w-[170px] max-w-[280px] md:max-w-[460px] bg-white text-slate-900 text-xs font-semibold p-2.5 rounded-lg shadow-xl text-center flex items-center justify-center min-h-[46px] select-none z-30"
              >
                <div className="leading-snug break-words whitespace-pre-wrap">{dialogue}</div>
                {/* Speech peak pointing down to player's portrait */}
                <div className="absolute -bottom-2 right-[82px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Horizontal Flex Wrapper for Portrait and Abilities Indicators */}
      <div className="flex flex-row items-center gap-3 w-full" id={isDealer ? "dealer-avatar-abilities-container" : "player-avatar-container"}>
        
        {/* Character Image Placeholder / Card */}
        <div 
          className={`w-32 h-36 md:w-36 md:h-40 border-4 rounded-xl flex flex-col items-center justify-center p-2.5 relative overflow-hidden cursor-default transition-all duration-300 shrink-0 ${
            isDealer 
              ? `bg-gradient-to-b ${currentDealer.bgGradient} border-rose-500/50 text-white shadow-lg` 
              : chosenChar 
                ? `bg-gradient-to-b ${chosenChar.bgGradient} border-amber-500/50 text-white shadow-lg`
                : 'bg-black/40 border-cyan-500/30 text-cyan-300'
          }`}
          id={isDealer ? "dealer-avatar-frame" : "player-avatar-frame"}
        >
          {isDealer ? (
            <>
              {/* Dealer image based on difficulty */}
              <img 
                src={`/${currentDealer.imageUrl}`} 
                alt={currentDealer.japaneseName}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none z-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />

              {/* Glowing background decor shape */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-0" />

              {/* Content overlaid on top */}
              <div className="z-10 flex flex-col items-center justify-end h-full w-full">
                <div className="text-center w-full px-1.5 pb-0.5">
                  <p className="text-xs font-black tracking-wide bg-rose-950/90 border border-rose-500/30 px-1.5 py-1 rounded-md leading-none text-white truncate max-w-full shadow-lg backdrop-blur-xs">
                    {currentDealer.japaneseName}
                  </p>
                </div>
              </div>
            </>
          ) : chosenChar ? (
            <>
              {/* Touhou Character Portrait Layout */}
              
              {/* Character image from dateA folder */}
              <img 
                src={`/${chosenChar.imageUrl}`} 
                alt={chosenChar.japaneseName}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none z-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />

              {/* Glowing background decor shape */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0" />

              {/* Content overlaid on top */}
              <div className="z-10 flex flex-col items-center justify-end h-full w-full">
                <div className="text-center w-full px-1.5 pb-0.5">
                  <p className="text-xs font-black tracking-wide bg-slate-950/80 border border-white/10 px-1.5 py-1 rounded-md leading-none text-white truncate max-w-full shadow-lg backdrop-blur-xs">
                    {chosenChar.japaneseName}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Default Player Visual Design */}
              <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center mb-1.5 shadow-lg">
                <User className="w-6 h-6 text-cyan-500" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono">You</p>
              <p className="text-[9px] text-white/40 mt-0.5">立絵 (Player)</p>
            </>
          )}
        </div>

        {/* Dynamic Ability Tags (Only for Opponent/Dealer characters) */}
        {isDealer && dealerAbilities.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-[120px] md:max-w-[150px] z-20" id="opponent-abilities-pillar">
            {dealerAbilities.map((ability) => {
              const borderGlowColor =
                difficulty === 'easy' ? 'rgba(56,189,248,0.7)' :
                difficulty === 'normal' ? 'rgba(251,191,36,0.7)' :
                difficulty === 'hard' ? 'rgba(251,113,133,0.7)' :
                'rgba(192,132,252,0.7)';

              return (
                <div
                  key={ability.id}
                  className={`group relative pointer-events-auto rounded-lg px-2 py-1.5 text-center text-[10px] md:text-xs font-bold leading-tight select-none border transition-all duration-300 ${
                    ability.isActive
                      ? difficulty === 'easy' ? 'bg-sky-950/70 text-sky-200 border-sky-450 shadow-[0_0_10px_rgba(56,189,248,0.6)] animate-pulse' :
                        difficulty === 'normal' ? 'bg-amber-950/70 text-amber-200 border-amber-450 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse' :
                        difficulty === 'hard' ? 'bg-rose-950/70 text-rose-200 border-rose-450 shadow-[0_0_10px_rgba(251,113,133,0.6)] animate-pulse' :
                        'bg-purple-950/70 text-purple-200 border-purple-450 shadow-[0_0_10px_rgba(192,132,252,0.6)] animate-pulse'
                      : 'bg-zinc-950/70 text-zinc-500 border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-800'
                  }`}
                  style={{
                    cursor: 'help',
                    boxShadow: ability.isActive ? `0 0 10px ${borderGlowColor}` : undefined
                  }}
                  id={`opponent-ability-card-${ability.id}`}
                >
                  <div className="flex items-center justify-center gap-1 truncate">
                    {ability.isActive && <Sparkles className="w-2.5 h-2.5 text-current shrink-0" />}
                    <span className="truncate">{ability.name}</span>
                  </div>

                  {/* Absolute positioning hover micro-tooltip displaying the description */}
                  <div 
                    className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 w-48 md:w-56 p-2.5 bg-zinc-950/98 border border-zinc-800 text-zinc-150 text-[11px] md:text-xs leading-relaxed rounded-xl shadow-2xl opacity-0 scale-95 origin-left pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50 backdrop-blur-md text-left"
                    id={`opponent-ability-tooltip-${ability.id}`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-400 mb-1 border-b border-zinc-900 pb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{ability.name}</span>
                    </div>
                    <p className="text-zinc-300 font-medium mb-1.5">{ability.desc}</p>
                    <div className="text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                      <span>TYPE:</span>
                      <span className={ability.isPassive ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                        {ability.isPassive ? '常時発動効果 (Constant)' : '限定発動効果 (Active)'}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono flex items-center justify-between mt-0.5">
                      <span>STATUS:</span>
                      <span className={ability.isActive ? 'text-emerald-400 font-black tracking-widest' : 'text-zinc-500'}>
                        {ability.isActive ? '● ACTIVE (GLOWING)' : '○ STANDBY'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Dialogue Bubble: Below for Dealer, Above for Player */}
      {isDealer && (
        <div className="w-full relative h-[56px] mt-3" id="dealer-dialogue-section">
          <AnimatePresence mode="wait">
            {dialogue && (
              <motion.div
                key={dialogue}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 left-0 w-max min-w-[170px] max-w-[280px] md:max-w-[460px] bg-white text-slate-900 text-xs font-semibold p-2.5 rounded-lg shadow-xl text-center flex items-center justify-center min-h-[46px] select-none z-30"
              >
                <div className="leading-snug break-words whitespace-pre-wrap">{dialogue}</div>
                {/* Speech peak pointing up to dealer's portrait */}
                <div className="absolute -top-2 left-[82px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
