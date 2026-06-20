/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Play, RefreshCw, Layers, Award, Shield, AlertTriangle, Sparkles, ChevronRight, Sliders, Volume2, VolumeX, X } from 'lucide-react';
import { Card, GamePhase, Difficulty, Suit } from './types';
import { createDeck, shuffleDeck, calculateScore, isNaturalBlackjack } from './utils/gameUtils';
import { CardItem } from './components/CardItem';
import { CharacterFrame } from './components/CharacterFrame';
import { TouhouCharId, TOUHOU_CHARACTERS, getRandomReimuDialogue, getRandomMarisaDialogue, getRandomYoumuDialogue, getRandomSanaeDialogue } from './touhouData';
import { getRandomCirnoQuote } from './utils/cirnoQuotes';
import { getRandomSakuyaQuote } from './utils/sakuyaQuotes';
import { getRandomRemiliaQuote } from './utils/remiliaQuotes';
import { getRandomFlandreQuote } from './utils/flandreQuotes';

const getRemiliaResultDialogue = (pHand: Card[], dHand: Card[], outcomeType: 'win' | 'lose' | 'draw' | 'bust') => {
  const pScore = calculateScore(pHand);
  const dScore = calculateScore(dHand);
  const isPlayerBJ = pHand.length === 2 && pScore === 21;
  const isPlayerBust = pScore > 21;
  const isDealerBust = dScore > 21;

  if (isDealerBust) {
    return getRandomRemiliaQuote('remiliaBust');
  }
  if (isPlayerBust) {
    return getRandomRemiliaQuote('playerBust');
  }
  if (isPlayerBJ) {
    return getRandomRemiliaQuote('playerBJ');
  }
  if (pScore === 21) {
    return getRandomRemiliaQuote('playerScore_21');
  }
  if (pScore >= 17 && pScore <= 20) {
    return getRandomRemiliaQuote('playerScore_17_20');
  }
  return getRandomRemiliaQuote('playerScore_2_16');
};

const DEALER_INFO = {
  easy: {
    name: 'チルノ',
    imageUrl: 'dateA/tiruno.png',
    colorClass: 'text-sky-450',
    bgGradient: 'from-sky-950 via-blue-900 to-black',
  },
  normal: {
    name: '十六夜 咲夜',
    imageUrl: 'dateA/sakuya.jpg',
    colorClass: 'text-indigo-400',
    bgGradient: 'from-slate-900 via-indigo-950 to-black',
  },
  hard: {
    name: 'レミリア・スカーレット',
    imageUrl: 'dateA/remiria.png',
    colorClass: 'text-rose-400',
    bgGradient: 'from-rose-950 via-red-950 to-black',
  },
  lunatic: {
    name: 'フランドール・スカーレット',
    imageUrl: 'dateA/furan.jpg',
    colorClass: 'text-purple-400',
    bgGradient: 'from-red-950 via-purple-950 to-black',
  },
};

const makeCardOfRank = (rank: number): Card => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  let display = rank.toString();
  if (rank === 1) display = 'A';
  else if (rank === 11) display = 'J';
  else if (rank === 12) display = 'Q';
  else if (rank === 13) display = 'K';

  let customImage: string | undefined = undefined;
  if (suit === 'clubs') {
    if (rank === 11) customImage = '/card/afwg.png';
    else if (rank === 12) customImage = '/card/dafwa.png';
    else if (rank === 13) customImage = '/card/dawfwafw.png';
  } else if (suit === 'spades') {
    if (rank === 11) customImage = '/card/dawaa.png';
    else if (rank === 12) customImage = '/card/dadaa.png';
    else if (rank === 13) customImage = '/card/dadaw.png';
  } else if (suit === 'diamonds') {
    if (rank === 11) customImage = '/card/daffwa.png';
    else if (rank === 12) customImage = '/card/dasad.png';
    else if (rank === 13) customImage = '/card/daa.png';
  } else if (suit === 'hearts') {
    if (rank === 11) customImage = '/card/saas.png';
    else if (rank === 12) customImage = '/card/saass.png';
    else if (rank === 13) customImage = '/card/sadads.png';
  }

  return {
    id: `${suit}-${rank}-forced-${Math.random().toString(36).substring(2, 5)}`,
    suit,
    rank,
    display,
    isFaceUp: false,
    customImage,
  };
};

export default function App() {
  // Audio configuration: Play card flip sound
  const playFlipSound = () => {
    const audio = new Audio('/SE/カードをめくる.mp3');
    audio.volume = seVolume;
    audio.play().catch(err => {
      console.log('Audio playback prevented or failed:', err);
    });
  };

  // Audio configuration: Play standard sound helper
  const playSe = (path: string) => {
    const audio = new Audio(path.startsWith('/') ? path : `/${path}`);
    audio.volume = seVolume;
    audio.play().catch(err => {
      console.log('Audio playback prevented or failed:', err);
    });
  };

  // Added for Remilia sequential card opening animation
  const remiliaHasBeenRevealedRef = useRef<boolean>(false);
  const [remiliaHasBeenRevealed, setRemiliaHasBeenRevealed] = useState<boolean>(false);
  const revealRemiliaHandSequential = async (targetHand: Card[]) => {
    if (remiliaHasBeenRevealedRef.current) return;
    remiliaHasBeenRevealedRef.current = true;
    setIsDealingInProgress(true);
    setIsRevealingRemilia(true);
    setRemiliaRevealedCount(0);
    for (let i = 1; i <= targetHand.length; i++) {
      setRemiliaRevealedCount(i);
      playFlipSound();
      await new Promise(r => setTimeout(r, 800));
    }
    const revealed = targetHand.map(c => ({ ...c, isFaceUp: true }));
    setDealerHand(revealed);
    setRemiliaHasBeenRevealed(true);
  };

  // --- Game Core States ---
  const [phase, setPhase] = useState<GamePhase>('title');
  const [isExited, setIsExited] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [playerCoins, setPlayerCoins] = useState<number>(15);
  const [dealerCoins, setDealerCoins] = useState<number>(15);
  const [currentBet, setCurrentBet] = useState<number>(2);
  const [tempBet, setTempBet] = useState<number>(2); // Bet adjusting in pop-up
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);

  const [isStage1Cleared, setIsStage1Cleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('touhou_blackjack_stage1_cleared') === 'true';
    } catch {
      return false;
    }
  });

  const [isStage2Cleared, setIsStage2Cleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('touhou_blackjack_stage2_cleared') === 'true';
    } catch {
      return false;
    }
  });

  const [isStage3Cleared, setIsStage3Cleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('touhou_blackjack_stage3_cleared') === 'true';
    } catch {
      return false;
    }
  });

  const [isStage4Cleared, setIsStage4Cleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('touhou_blackjack_stage4_cleared') === 'true';
    } catch {
      return false;
    }
  });

  const [roundCount, setRoundCount] = useState<number>(1);
  const [sakuyaMaidRound, setSakuyaMaidRound] = useState<number>(() => Math.floor(Math.random() * 4) + 1);
  const [flandreFourRound, setFlandreFourRound] = useState<number>(() => Math.floor(Math.random() * 3) + 2);

  const [bgmVolume, setBgmVolume] = useState<number>(0.10);
  const [seVolume, setSeVolume] = useState<number>(0.65);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const playingBgmSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase === 'title' || phase === 'char_select') {
      const src = '/BGM/nc412420_【東方】東方のタイトル曲風【いつものフレーズ】.mp3';
      if (playingBgmSrcRef.current !== src) {
        if (bgmRef.current) {
          bgmRef.current.pause();
        }
        const audio = new Audio(src);
        audio.loop = true;
        audio.volume = bgmVolume;

        audio.onerror = () => {
          console.error('Title BGM failed to load:', src);
          if (playingBgmSrcRef.current === src) {
            console.log('Running robust fallback to Aozora Cider is triggered.');
            const fallbackSrc = '/BGM/Aozora Cider.wav';
            const fbAudio = new Audio(fallbackSrc);
            fbAudio.loop = true;
            fbAudio.volume = bgmVolume;
            if (bgmRef.current === audio) {
              bgmRef.current = fbAudio;
              playingBgmSrcRef.current = fallbackSrc;
              fbAudio.play().catch(fbErr => console.log('Fallback play failed:', fbErr));
            }
          }
        };

        bgmRef.current = audio;
        playingBgmSrcRef.current = src;
        audio.play().catch(err => {
          console.log('Title BGM playback was prevented or failed:', err);
        });
      } else {
        if (bgmRef.current) {
          bgmRef.current.volume = bgmVolume;
          bgmRef.current.play().catch(() => {});
        }
      }
    } else {
      let src = '';
      if (difficulty === 'easy') {
        src = '/BGM/Aozora Cider.wav';
      } else if (difficulty === 'normal') {
        src = '/BGM/nc279528_【東方自作アレンジ】evening_primrose【フラワリングナイト】.mp3';
      } else if (difficulty === 'hard') {
        src = '/BGM/nc328349_【TOUHOU_chill_out_music】東方紅魔郷_レミリア_テーマ_亡き王女の為のセプテット_オーケストラ_アレンジ.mp3';
      } else if (difficulty === 'lunatic') {
        src = '/BGM/broken_diamond.mp3';
      }

      if (src) {
        if (playingBgmSrcRef.current !== src) {
          if (bgmRef.current) {
            bgmRef.current.pause();
          }
          const audio = new Audio(src);
          audio.loop = true;
          audio.volume = bgmVolume;
          bgmRef.current = audio;
          playingBgmSrcRef.current = src;
          audio.play().catch(err => {
            console.log('BGM playback was prevented or failed:', err);
          });
        } else {
          if (bgmRef.current) {
            bgmRef.current.volume = bgmVolume;
            bgmRef.current.play().catch(() => {});
          }
        }
      }
    }
    return () => {};
  }, [phase, difficulty, bgmVolume]);

  // Unlock BGM playback on any page click/tap interaction (bypasses browser autoplay limits)
  useEffect(() => {
    const resumeAudio = () => {
      if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);
    window.addEventListener('keydown', resumeAudio);
    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, []);
  
  // Dialogues in speech bubbles
  const [playerDialogue, setPlayerDialogue] = useState<string>('');
  const [dealerDialogue, setDealerDialogue] = useState<string>('');

  // Show difficulty popup inside Character Selection phase
  const [showDifficultyPopup, setShowDifficultyPopup] = useState<boolean>(false);

  // Status logs shown in the center helper area
  const [gameMessage, setGameMessage] = useState<string>('');
  const [isDealingInProgress, setIsDealingInProgress] = useState<boolean>(false);

  // --- Touhou Character Selection and Battle States ---
  const [selectedCharId, setSelectedCharId] = useState<TouhouCharId | null>(null);
  const [lastOutcome, setLastOutcome] = useState<'player_win' | 'player_blackjack' | 'dealer_win' | 'dealer_blackjack' | 'draw' | null>(null);
  const [coinChangePlayer, setCoinChangePlayer] = useState<string | null>(null);
  const [coinChangeDealer, setCoinChangeDealer] = useState<string | null>(null);
  const [showCredits, setShowCredits] = useState<boolean>(false);
  
  // Custom states matching requested abilities
  const [osaisenActive, setOsaisenActive] = useState<boolean>(false);
  const [activePhantomEye, setActivePhantomEye] = useState<boolean>(false);
  const [slashUseCount, setSlashUseCount] = useState<number>(2);
  const [isTargetingSlash, setIsTargetingSlash] = useState<boolean>(false);
  const [showAbilitiesPanel, setShowAbilitiesPanel] = useState<boolean>(false);
  const [murderDollUsedCount, setMurderDollUsedCount] = useState<number>(0);

  // Dealer skills glowing triggers
  const [isMurderDollGlowing, setIsMurderDollGlowing] = useState<boolean>(false);
  const [isMiserableFateGlowing, setIsMiserableFateGlowing] = useState<boolean>(false);
  const [isFlandreBoomGlowing, setIsFlandreBoomGlowing] = useState<boolean>(false);
  const [isPerfectMaidGlowing, setIsPerfectMaidGlowing] = useState<boolean>(false);

  // Opponent unique ability utilized tags (preserved if Reimu's musou is triggered)
  const [isCirnoFreezeUsed, setIsCirnoFreezeUsed] = useState<boolean>(false);
  const [isSakuyaMaidUsed, setIsSakuyaMaidUsed] = useState<boolean>(false);
  const [isRemiliaFateUsed, setIsRemiliaFateUsed] = useState<boolean>(false);
  const [isFlandreFourUsed, setIsFlandreFourUsed] = useState<boolean>(false);
  const [isMurderDollUsedGlobally, setIsMurderDollUsedGlobally] = useState<boolean>(false);
  const [isMasterSparkUsedGlobally, setIsMasterSparkUsedGlobally] = useState<boolean>(false);
  const [isMusouUsedGlobally, setIsMusouUsedGlobally] = useState<boolean>(false);
  const [isMasterSparkPreparing, setIsMasterSparkPreparing] = useState<boolean>(false);
  const [showMasterSparkTitle, setShowMasterSparkTitle] = useState<boolean>(false);

  // Added for Remilia sequential reveal
  const [isRevealingRemilia, setIsRevealingRemilia] = useState<boolean>(false);
  const [remiliaRevealedCount, setRemiliaRevealedCount] = useState<number>(0);

  // Ability Reaction pop-up triggers
  const [showReimuMusouPopup, setShowReimuMusouPopup] = useState<boolean>(false);
  const [showSanaeMiraclePopup, setShowSanaeMiraclePopup] = useState<boolean>(false);
  const [sanaeMiracleOrigBustCard, setSanaeMiracleOrigBustCard] = useState<Card | null>(null);
  const [showSecondDrawConfirm, setShowSecondDrawConfirm] = useState<boolean>(false);

  // Graphical FX toggles
  const [showMasterSparkBeam, setShowMasterSparkBeam] = useState<boolean>(false);
  const [protectionActive, setProtectionActive] = useState<boolean>(false);

  // Track skills usage constraints per individual round/hand
  const [skillsUsedThisRound, setSkillsUsedThisRound] = useState<Record<string, boolean>>({
    osaisen: false,
    borrow: false,
    master_spark: false,
    slash: false,
    phantom_eye: false,
    miracle: false,
    protection: false
  });

  // Real-time calculated scores
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  // Max bet limit depends on smaller of both players' coins (Capped at maximum of 10 chips per user request)
  const maxBet = Math.min(playerCoins, dealerCoins, 10);
  const minBet = playerCoins >= 2 ? 2 : 1;

  // --- Reset skills trackers on each round deal to allow active strategies ---
  const resetRoundSkills = (isMusouReset: boolean = false) => {
    setOsaisenActive(false);
    setActivePhantomEye(false);
    setLastOutcome(null);
    if (!isMusouReset) {
      setMurderDollUsedCount(0);
      setIsCirnoFreezeUsed(false);
      setIsSakuyaMaidUsed(false);
      setIsFlandreFourUsed(false);
    }
    setIsMurderDollGlowing(false);
    setIsMiserableFateGlowing(false);
    setIsFlandreBoomGlowing(false);
    setIsPerfectMaidGlowing(false);
    setIsRevealingRemilia(false);
    setRemiliaRevealedCount(0);
    setRemiliaHasBeenRevealed(false);
  };

  // --- Reset skills to brand new values once at the setup of a brand new game/encounter ---
  const resetAllPlayerSkillsForNewGame = () => {
    setSlashUseCount(2);
    setIsMasterSparkUsedGlobally(false);
    setIsMusouUsedGlobally(false);
    setIsRemiliaFateUsed(false);
    setSkillsUsedThisRound({
      osaisen: false,
      borrow: false,
      master_spark: false,
      slash: false,
      phantom_eye: false,
      miracle: false,
      protection: false,
      musou: false
    });
  };

  // --- Initializing State and Dialogue based on Phase ---
  useEffect(() => {
    if (phase === 'title') {
      setPlayerDialogue('');
      setDealerDialogue('');
      setGameMessage('');
    } else if (phase === 'char_select') {
      setPlayerDialogue('誰に勝負を託そうかしら。');
      setDealerDialogue('東方の強敵たちが、あなたの味方となって卓に並び立つようだ。');
      setGameMessage('キャラクターを選択してください');
    } else if (phase === 'betting') {
      const initialBetValue = playerCoins >= 2 ? 2 : 1;
      setTempBet(initialBetValue);
      setCurrentBet(initialBetValue);
      
      let initialDealerMsg = 'さあ勝負だ。掛けチップの枚数を選択してくれ。';
      if (difficulty === 'easy') {
        initialDealerMsg = getRandomCirnoQuote('matchStart');
      } else if (difficulty === 'normal') {
        initialDealerMsg = getRandomSakuyaQuote('matchStart');
      } else if (difficulty === 'hard') {
        initialDealerMsg = getRandomRemiliaQuote('matchStart');
      } else if (difficulty === 'lunatic') {
         initialDealerMsg = getRandomFlandreQuote('matchStart');
       }
      setDealerDialogue(initialDealerMsg);

      if (selectedCharId) {
        if (selectedCharId === 'reimu') {
          setPlayerDialogue(getRandomReimuDialogue('gameStart'));
        } else if (selectedCharId === 'marisa') {
          setPlayerDialogue(getRandomMarisaDialogue('gameStart'));
        } else if (selectedCharId === 'youmu') {
          setPlayerDialogue(getRandomYoumuDialogue('gameStart'));
        } else if (selectedCharId === 'sanae') {
          setPlayerDialogue(getRandomSanaeDialogue('gameStart'));
        } else {
          setPlayerDialogue(TOUHOU_CHARACTERS[selectedCharId].dialogues.gameStart);
        }
      } else {
        setPlayerDialogue('いくら賭けようかな？');
      }
      setGameMessage('ベットするチップ数を選んでください。');
    }
  }, [phase, difficulty, selectedCharId, playerCoins, dealerCoins]);

  // --- Adjust Bet Chips ---
  const handleIncreaseBet = () => {
    if (tempBet < maxBet) {
      setTempBet(prev => prev + 1);
    }
  };

  const handleDecreaseBet = () => {
    if (tempBet > minBet) {
      setTempBet(prev => prev - 1);
    }
  };

  // --- Confirm Bet & Deal Initial 2 Cards ---
  const handleConfirmBet = async () => {
    resetRoundSkills(skillsUsedThisRound.musou);
    setCurrentBet(tempBet);
    setPhase('dealing');
    setIsDealingInProgress(true);
    setGameMessage('カードを配っています...');

    let dealDealerMsg = 'お手並み拝見。まずは2枚ずつ配ろう。';
    if (difficulty === 'easy') {
      dealDealerMsg = getRandomCirnoQuote('matchStart');
    } else if (difficulty === 'normal') {
      dealDealerMsg = getRandomSakuyaQuote('matchStart');
    } else if (difficulty === 'hard') {
      dealDealerMsg = getRandomRemiliaQuote('matchStart');
    } else if (difficulty === 'lunatic') {
      dealDealerMsg = getRandomFlandreQuote('matchStart');
    }
    setDealerDialogue(dealDealerMsg);

    if (selectedCharId) {
      if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('playerTurn'));
      } else {
        setPlayerDialogue(TOUHOU_CHARACTERS[selectedCharId].dialogues.playerTurn);
      }
    } else {
      setPlayerDialogue('よし、良いカードが来ることを願うよ。');
    }

    const currentDeck = shuffleDeck(createDeck());
    const pHand: Card[] = [];
    const dHand: Card[] = [];

    const draw = (isPlayer: boolean, isFaceUp: boolean): Card => {
      const card = currentDeck.shift()!;
      card.isFaceUp = isFaceUp;
      if (isPlayer) {
        pHand.push(card);
      } else {
        dHand.push(card);
      }
      return card;
    };

    // Draw first card for player (Face Up)
    let innerMurderDollCount = 0;
    const pCard1 = draw(true, true);
    playFlipSound();
    setPlayerHand([...pHand]);
    setDeck([...currentDeck]);

    if (pCard1.rank === 1 && difficulty === 'normal' && !isMurderDollUsedGlobally) {
      setIsMurderDollUsedGlobally(true);
      innerMurderDollCount = 1;
      setIsMurderDollGlowing(true);
      setDealerDialogue(getRandomSakuyaQuote('murderDollSkill'));
      setGameMessage('幻符「殺人ドール」が発動中…');
      
      // Wait 3 seconds inoperable BEFORE sealing the card!
      await new Promise(r => setTimeout(r, 3000));
      
      pCard1.isDisabled = true;
      playSe('/SE/ナイフを投げる.mp3');
      setIsMurderDollGlowing(false);
      setPlayerHand([...pHand]); // update UI with the disabled state
      setGameMessage('最初のカード「A」が封印されました。');
    }

    // Draw first card for dealer (Face Up)
    await new Promise(r => setTimeout(r, 500));
    let dCard1: Card;
    if (difficulty === 'normal' && roundCount === sakuyaMaidRound && !isSakuyaMaidUsed) {
      setIsSakuyaMaidUsed(true);
      setIsPerfectMaidGlowing(true);
      playSe('/SE/カードをきる2.mp3');
      setDealerDialogue(getRandomSakuyaQuote('perfectMaidSkill'));
      setGameMessage('十六夜咲夜の能力「完璧な給仕」が発動中…');
      
      // 3 seconds inoperable delay, during which processing also does not progress
      await new Promise(r => setTimeout(r, 3000));
      setIsPerfectMaidGlowing(false);

      const forcedRank = [10, 11, 12, 13][Math.floor(Math.random() * 4)];
      dCard1 = makeCardOfRank(forcedRank);
      dCard1.isFaceUp = true;
      dHand.push(dCard1);
      playFlipSound();
      setDealerHand([...dHand]);
      setDeck([...currentDeck]);
    } else {
      dCard1 = draw(false, true);
      playFlipSound();
      setDealerHand([...dHand]);
      setDeck([...currentDeck]);
    }

    // Aを引いてから1秒間操作不能時間を設け
    if (difficulty === 'normal' && dCard1.rank === 1) {
      setGameMessage('十六夜咲夜が「A」を引きました。能力発動に備えて待機しています…');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Draw second card for player
    await new Promise(r => setTimeout(r, 500));
    const pCard2 = draw(true, true);
    playFlipSound();
    setPlayerHand([...pHand]);
    setDeck([...currentDeck]);

    if (pCard2.rank === 1 && difficulty === 'normal' && !isMurderDollUsedGlobally) {
      if (innerMurderDollCount < 1) {
        setIsMurderDollUsedGlobally(true);
        innerMurderDollCount = 1;
        setIsMurderDollGlowing(true);
        setDealerDialogue(getRandomSakuyaQuote('murderDollSkill'));
        setGameMessage('幻符「殺人ドール」が発動中…');

        // Wait 3 seconds inoperable BEFORE sealing the card!
        await new Promise(r => setTimeout(r, 3000));

        pCard2.isDisabled = true;
        playSe('/SE/ナイフを投げる.mp3');
        setIsMurderDollGlowing(false);
        setPlayerHand([...pHand]); // update UI with the disabled state
        setGameMessage('２枚目のカード「A」が封印されました。');
      }
    }
    setMurderDollUsedCount(innerMurderDollCount);

    // Draw second card for dealer (Face Down)
    await new Promise(r => setTimeout(r, 500));
    
    let activeFlandreFourRound = flandreFourRound;
    const isPlayerBJAtInitialDeal = pHand.length === 2 && calculateScore(pHand) === 21;
    if (difficulty === 'lunatic' && roundCount === activeFlandreFourRound && isPlayerBJAtInitialDeal) {
      setFlandreFourRound(activeFlandreFourRound + 1);
      activeFlandreFourRound = activeFlandreFourRound + 1;
    }

    if (difficulty === 'lunatic' && roundCount === activeFlandreFourRound && !isFlandreFourUsed) {
      setIsFlandreFourUsed(true);
      setDealerDialogue(getRandomFlandreQuote('fourOfAKindSkill'));
      playSe('/SE/つるはしで壁を破壊2.mp3');
      
      // We already dealt 1 card (dCard1) to dealer. Now let's deal 3 more cards face-up, one-by-one!
      for (let k = 0; k < 3; k++) {
        await new Promise(r => setTimeout(r, 600));
        const extraCard = draw(false, true);
        playFlipSound();
        setDealerHand([...dHand]);
        setDeck([...currentDeck]);
      }

      // 4 cards are lined up on the field. Wait 1.5 seconds.
      await new Promise(r => setTimeout(r, 1500));

      // Calculate the power set and choose the strongest subset from 2 to 4 cards
      let bestCombination: Card[] = [];
      let bestScore = 0;
      for (let i = 1; i < 16; i++) {
        const subset: Card[] = [];
        for (let j = 0; j < 4; j++) {
          if ((i & (1 << j)) !== 0) {
            subset.push(dHand[j]);
          }
        }
        if (subset.length < 2) continue;
        const score = calculateScore(subset);
        if (score <= 21 && score > bestScore) {
          bestScore = score;
          bestCombination = subset;
        }
      }
      if (bestCombination.length === 0) {
        bestCombination = [dHand[0], dHand[1]];
        bestScore = calculateScore(bestCombination);
      }

      // Show dialog and keep selected subset, deleting/removing the others!
      setDealerDialogue(getRandomFlandreQuote('fourOfAKindSelect'));
      playSe('/SE/ガラスが割れる.mp3'); // nice sound effect for removing/breaking the other cards
      
      // Update dealerHand to only contain the chosen cards!
      setDealerHand([...bestCombination]);
      // Remove those chosen cards from the actual dHand array as well, and update remaining deck
      dHand.length = 0;
      dHand.push(...bestCombination);
      
      await new Promise(r => setTimeout(r, 1500));
    } else if (difficulty === 'easy' && roundCount === 2 && !isCirnoFreezeUsed) {
      setIsCirnoFreezeUsed(true);
      // Cirno Perfect Freeze: guaranteed to be 9 and face-up! No back card is placed!
      const forcedCard2 = makeCardOfRank(9);
      forcedCard2.isFaceUp = true;
      forcedCard2.customImage = 'dateA/1780971232005.png';
      dHand.push(forcedCard2);
      playFlipSound();
      playSe('/SE/氷魔法で凍結.mp3');
      setDealerDialogue(getRandomCirnoQuote('perfectFreeze'));
      setDealerHand([...dHand]);
      setDeck([...currentDeck]);

    } else if (difficulty === 'hard' && dHand[0].rank === 1 && !isRemiliaFateUsed) {
      setIsRemiliaFateUsed(true);
      // Remilia Miserable Fate: forced BJ if 1st card is Ace
      setIsMiserableFateGlowing(true);
      playSe('/SE/ロボットの目が光る.mp3');
      setDealerDialogue(getRandomRemiliaQuote('miserableFateSkill'));
      
      // Wait for 3 seconds in non-operable status
      await new Promise(r => setTimeout(r, 3000));
      
      // Then play the audio
      playSe('/SE/ステータス上昇魔法2.mp3');
      
      const forcedRank = [10, 11, 12, 13][Math.floor(Math.random() * 4)];
      const forcedCard2 = makeCardOfRank(forcedRank);
      forcedCard2.isFaceUp = false;
      dHand.push(forcedCard2);
      
      setTimeout(() => setIsMiserableFateGlowing(false), 2000);
      setDealerHand([...dHand]);
      setDeck([...currentDeck]);
    } else {
      const dCard2 = draw(false, false);
      setDealerHand([...dHand]);
      setDeck([...currentDeck]);
    }

    await new Promise(r => setTimeout(r, 500));

    const initialScore = calculateScore(pHand);
    const isPlayerBJ = pHand.length === 2 && initialScore === 21;

    if (isPlayerBJ) {
      setIsDealingInProgress(true);
      setPhase('dealer_turn');

      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('drawScore21'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('drawScore21'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('drawScore21'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('getBlackjack'));
      } else {
        setPlayerDialogue('ちょうど21点だ！これでスタンドね！');
      }

      // 相手がブラック・ジャックだった時の語録を使用して発言を行う
      if (difficulty === 'easy') {
        setDealerDialogue(getRandomCirnoQuote('player_blackjack'));
      } else if (difficulty === 'normal') {
        setDealerDialogue(getRandomSakuyaQuote('player_blackjack'));
      } else if (difficulty === 'hard') {
        setDealerDialogue(getRandomRemiliaQuote('playerBJ'));
      } else if (difficulty === 'lunatic') {
        setDealerDialogue(getRandomFlandreQuote('player_blackjack'));
      }

      setGameMessage('ブラックジャック！');

      // 最初に引いた1枚の表面と1枚の裏面の状態で3秒操作不能時間を設け
      await new Promise(r => setTimeout(r, 3000));

      const isDealerBJ = dHand.length === 2 && calculateScore(dHand.map(c => ({ ...c, isFaceUp: true }))) === 21;
      const revealedDealerHand = dHand.map(c => ({ ...c, isFaceUp: true }));
      setDealerHand(revealedDealerHand);
      playFlipSound();

      if (isDealerBJ) {
        let dealDealerBJMsg = '';
        if (difficulty === 'easy') {
          dealDealerBJMsg = getRandomCirnoQuote('blackjack');
        } else if (difficulty === 'normal') {
          dealDealerBJMsg = getRandomSakuyaQuote('blackjack');
        } else if (difficulty === 'hard') {
          dealDealerBJMsg = getRandomRemiliaQuote('blackjack');
        } else if (difficulty === 'lunatic') {
          dealDealerBJMsg = getRandomFlandreQuote('blackjack');
        }
        setDealerDialogue(dealDealerBJMsg);
        setGameMessage('引き分け（両者ブラックジャック）です。');
        await new Promise(r => setTimeout(r, 2000));
        applyPayout('draw', revealedDealerHand, tempBet);
        setPhase('round_end');
      } else {
        if (selectedCharId === 'reimu') {
          setPlayerDialogue(getRandomReimuDialogue('oneTurnVictory'));
        } else if (selectedCharId === 'marisa') {
          setPlayerDialogue(getRandomMarisaDialogue('oneTurnVictory'));
        } else if (selectedCharId === 'youmu') {
          setPlayerDialogue(getRandomYoumuDialogue('oneTurnVictory'));
        } else if (selectedCharId === 'sanae') {
          setPlayerDialogue(getRandomSanaeDialogue('oneTurnVictory'));
        } else if (selectedCharId) {
          setPlayerDialogue(TOUHOU_CHARACTERS[selectedCharId].dialogues.victory || '勝ったよ！');
        } else {
          setPlayerDialogue('勝ったよ！');
        }

        const winLine = difficulty === 'easy' ? getRandomCirnoQuote('roundDefeat')
          : difficulty === 'normal' ? getRandomSakuyaQuote('roundDefeat')
          : difficulty === 'hard' ? getRemiliaResultDialogue(pHand, dHand, 'lose')
          : difficulty === 'lunatic' ? getRandomFlandreQuote('roundDefeat')
          : `上手な勝負だった。負けを認めよう。`;
        setDealerDialogue(winLine);
        setGameMessage('あなたのブラックジャック勝利！');
        applyPayout('player_blackjack', dHand, tempBet);
        setPhase('round_end');
      }
      setIsDealingInProgress(false);
    } else if (initialScore === 21) {
      setIsDealingInProgress(false);
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('drawScore21'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('drawScore21'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('drawScore21'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('drawScore21'));
      } else {
        setPlayerDialogue('ちょうど21点だ！これでスタンドね！');
      }

      if (difficulty === 'easy') {
        setDealerDialogue(getRandomCirnoQuote('player_21'));
      } else if (difficulty === 'normal') {
        setDealerDialogue(getRandomSakuyaQuote('player_21'));
      } else if (difficulty === 'hard') {
        setDealerDialogue(getRandomRemiliaQuote('playerScore_21'));
      } else if (difficulty === 'lunatic') {
        setDealerDialogue(getRandomFlandreQuote('player_21'));
      }
      handlePlayerStandWithHand(pHand, currentDeck);
    } else {
      setIsDealingInProgress(false);
      setPhase('player_turn');
      setGameMessage('あなたのターン。引く（ドロー）か待つ（スタンド）か選んでください');
      
      // 対戦開始時のセリフやお互いのスキル演出でのセリフを維持するため、ここでは上書きしない（ドロー、スタンド、特殊能力使用時に上書きされます）

      if (selectedCharId === 'reimu') {
        if (initialScore <= 16) {
          setPlayerDialogue(getRandomReimuDialogue('turnDecision2_16', initialScore));
        } else {
          setPlayerDialogue(TOUHOU_CHARACTERS.reimu.dialogues.playerTurn);
        }
      } else if (selectedCharId === 'marisa') {
        if (initialScore <= 16) {
          setPlayerDialogue(getRandomMarisaDialogue('turnDecision2_16', initialScore));
        } else {
          setPlayerDialogue(TOUHOU_CHARACTERS.marisa.dialogues.playerTurn);
        }
      } else if (selectedCharId === 'youmu') {
        if (initialScore <= 16) {
          setPlayerDialogue(getRandomYoumuDialogue('turnDecision2_16', initialScore));
        } else {
          setPlayerDialogue(TOUHOU_CHARACTERS.youmu.dialogues.playerTurn);
        }
      } else if (selectedCharId === 'sanae') {
        if (initialScore <= 16) {
          setPlayerDialogue(getRandomSanaeDialogue('turnDecision2_16', initialScore));
        } else {
          setPlayerDialogue(getRandomSanaeDialogue('playerTurn'));
        }
      } else if (selectedCharId) {
        setPlayerDialogue(TOUHOU_CHARACTERS[selectedCharId].dialogues.playerTurn);
      }
    }
  };

  // --- Player Actions: Draw (Hit/ドロー) ---
  const handlePlayerDraw = async () => {
    if (phase !== 'player_turn' || isDealingInProgress) return;

    setActivePhantomEye(false); // ドローした時点で効果を失う

    const currentDeck = [...deck];
    const newCard = currentDeck.shift()!;
    newCard.isFaceUp = true;
    
    let isMurderDollTriggered = false;
    
    if (newCard.rank === 1 && difficulty === 'normal' && !isMurderDollUsedGlobally && murderDollUsedCount < 1) {
      isMurderDollTriggered = true;
      setIsDealingInProgress(true);
      setMurderDollUsedCount(1);
      setIsMurderDollUsedGlobally(true);
      setIsMurderDollGlowing(true);

      // Deal card first (reveal face up)
      const intermediateHand = [...playerHand, newCard];
      playFlipSound();
      setPlayerHand(intermediateHand);
      setDeck(currentDeck);

      setDealerDialogue(getRandomSakuyaQuote('murderDollSkill'));
      setGameMessage('幻符「殺人ドール」が発動中…（3秒間操作不能）');

      // 3 seconds inoperable standby BEFORE sealing the card!
      await new Promise(r => setTimeout(r, 3000));

      newCard.isDisabled = true;
      playSe('/SE/ナイフを投げる.mp3');
      setIsMurderDollGlowing(false);
      setIsDealingInProgress(false);

      const finalHand = [...playerHand, newCard];
      setPlayerHand(finalHand);
      setDealerDialogue(getRandomSakuyaQuote('murderDollSkill'));
      setGameMessage('引いたカード「A」が封印されました。');
    }
    
    const updatedHand = isMurderDollTriggered ? [...playerHand, newCard] : [...playerHand, newCard];
    if (!isMurderDollTriggered) {
      playFlipSound();
      setPlayerHand(updatedHand);
      setDeck(currentDeck);
    }

    const score = calculateScore(updatedHand);
    
    // Check for bust
    if (score > 21) {
      // Sanae's Miracle Fruit checkpoint
      if (selectedCharId === 'sanae' && !skillsUsedThisRound.miracle) {
        setIsDealingInProgress(true);
        setGameMessage('バースト（21超過）しちゃいました…バースト状態を確認しています…');
        
        // Wait 3 seconds inoperable
        await new Promise(r => setTimeout(r, 3000));
        
        setIsDealingInProgress(false);
        setSanaeMiracleOrigBustCard(newCard);
        setShowSanaeMiraclePopup(true);
        playSe('/SE/教会の鐘1.mp3');
      } 
      else if (selectedCharId === 'reimu' && !isMusouUsedGlobally) {
        setIsDealingInProgress(true);
        setPlayerDialogue(getRandomReimuDialogue('bust'));
        const dealerBustReaction = difficulty === 'easy' ? getRandomCirnoQuote('playerBust')
          : difficulty === 'normal' ? getRandomSakuyaQuote('playerBust')
          : difficulty === 'hard' ? getRandomRemiliaQuote('playerBust')
          : difficulty === 'lunatic' ? getRandomFlandreQuote('roundVictory')
          : 'おっと！完全に21をオーバーしたな！勝負ありだ！';
        setDealerDialogue(dealerBustReaction);
        setGameMessage('バースト（21超過）しました！霊夢の秘奥義「夢想転生」が発動可能です…');
        
        setTimeout(() => {
          setIsDealingInProgress(false);
          setShowReimuMusouPopup(true);
        }, 5000);
      } 
      else {
        executeLossPayoutAndTransition('bust', updatedHand, dealerHand);
      }
    } else if (score === 21) {
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('drawScore21'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('drawScore21'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('drawScore21'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(updatedHand.length === 2 ? getRandomSanaeDialogue('getBlackjack') : getRandomSanaeDialogue('drawScore21'));
      } else {
        setPlayerDialogue('ちょうど21点だ！これでスタンドね！');
      }

      const isBJ = updatedHand.length === 2;
      if (difficulty === 'easy') {
        setDealerDialogue(getRandomCirnoQuote(isBJ ? 'player_blackjack' : 'player_21'));
      } else if (difficulty === 'normal') {
        setDealerDialogue(getRandomSakuyaQuote(isBJ ? 'player_blackjack' : 'player_21'));
      } else if (difficulty === 'hard') {
        setDealerDialogue(getRandomRemiliaQuote(isBJ ? 'playerBJ' : 'playerScore_21'));
      } else if (difficulty === 'lunatic') {
        setDealerDialogue(getRandomFlandreQuote(isBJ ? 'player_blackjack' : 'player_21'));
      }
      handlePlayerStandWithHand(updatedHand, currentDeck);
    } else {
      if (selectedCharId === 'reimu') {
        const dialog = score <= 16
          ? getRandomReimuDialogue('drawScore2_16', score)
          : getRandomReimuDialogue('drawScore17Plus', score);
        setPlayerDialogue(dialog);
      } else if (selectedCharId === 'marisa') {
        const dialog = score <= 16
          ? getRandomMarisaDialogue('drawScore2_16', score)
          : getRandomMarisaDialogue('drawScore17Plus', score);
        setPlayerDialogue(dialog);
      } else if (selectedCharId === 'youmu') {
        const dialog = score <= 16
          ? getRandomYoumuDialogue('drawScore2_16', score)
          : getRandomYoumuDialogue('drawScore17Plus', score);
        setPlayerDialogue(dialog);
      } else if (selectedCharId === 'sanae') {
        const dialog = score <= 16
          ? getRandomSanaeDialogue('drawScore2_16', score)
          : getRandomSanaeDialogue('drawScore17Plus', score);
        setPlayerDialogue(dialog);
      } else {
        const charDrawMsg = selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.drawCard : 'カードを引き寄せたわ。';
        setPlayerDialogue(charDrawMsg);
      }
    }
  };

  const handlePlayerStandWithHand = async (currPlayerHand: Card[], currDeck: Card[]) => {
    setIsDealingInProgress(true);
    setPhase('dealer_turn');

    // 1秒間の操作不能期間
    await new Promise(r => setTimeout(r, 1000));

    const isDealerBJ = dealerHand.length === 2 && calculateScore(dealerHand.map(c => ({ ...c, isFaceUp: true }))) === 21;

    if (isDealerBJ) {
      setGameMessage('相手のターン。カードをめくっています...');

      // Wait for about 2.5 seconds before flipping the 2nd card
      await new Promise(r => setTimeout(r, 2500));

      // Flip the 2nd card
      if (difficulty === 'hard') {
        await revealRemiliaHandSequential(dealerHand);
      } else {
        const revealedDealerHand = dealerHand.map(c => ({ ...c, isFaceUp: true }));
        playFlipSound();
        setDealerHand(revealedDealerHand);
      }

      // Now that the blackjack is visible, set the dialogues and center message
      if (selectedCharId) {
        if (selectedCharId === 'reimu') {
          setPlayerDialogue(getRandomReimuDialogue('oneTurnDefeat'));
        } else if (selectedCharId === 'marisa') {
          setPlayerDialogue(getRandomMarisaDialogue('oneTurnDefeat'));
        } else if (selectedCharId === 'youmu') {
          setPlayerDialogue(getRandomYoumuDialogue('oneTurnDefeat'));
        } else if (selectedCharId === 'sanae') {
          setPlayerDialogue(getRandomSanaeDialogue('oneTurnDefeat'));
        } else {
          setPlayerDialogue(TOUHOU_CHARACTERS[selectedCharId].dialogues.oneTurnDefeat || '負けちゃったか...');
        }
      } else {
        setPlayerDialogue('相手がブラックジャック…今回はお手上げね。');
      }

      let dealDealerBJMsg = 'フハハ！私の手札はブラックジャックだ！お前の負けだ！';
      if (difficulty === 'easy') {
        dealDealerBJMsg = getRandomCirnoQuote('blackjack');
      } else if (difficulty === 'normal') {
        dealDealerBJMsg = getRandomSakuyaQuote('blackjack');
      } else if (difficulty === 'hard') {
        dealDealerBJMsg = getRandomRemiliaQuote('blackjack');
      } else if (difficulty === 'lunatic') {
        dealDealerBJMsg = getRandomFlandreQuote('blackjack');
      }
      setDealerDialogue(dealDealerBJMsg);
      setGameMessage('相手のブラックジャック！あなたの負けです（ディーラーの勝利）。');

      // Wait for another 3 seconds before displaying the defeat end popup
      await new Promise(r => setTimeout(r, 3000));

      applyPayout('dealer_blackjack', dealerHand.map(c => ({ ...c, isFaceUp: true })));
      setPhase('round_end');
    } else {
      setGameMessage('相手のターン。カードをめくっています...');
      // Open dealer's hidden card
      const alreadyOpened = !dealerHand.some(c => !c.isFaceUp);
      const revealedDealerHand = dealerHand.map(c => ({ ...c, isFaceUp: true }));
      if (!alreadyOpened) {
        playFlipSound();
      }
      setDealerHand(revealedDealerHand);

      runDealerAI(currPlayerHand, revealedDealerHand, currDeck);
    }
  };

  const handlePlayerStand = () => {
    if (phase !== 'player_turn' || isDealingInProgress) return;
    if (selectedCharId === 'reimu') {
      const dialog = playerScore <= 16
        ? getRandomReimuDialogue('turnDecision2_16', playerScore)
        : getRandomReimuDialogue('drawScore17Plus', playerScore);
      setPlayerDialogue(dialog);
    } else if (selectedCharId === 'marisa') {
      const dialog = playerScore <= 16
        ? getRandomMarisaDialogue('standScore2_16', playerScore)
        : getRandomMarisaDialogue('standScore17_20', playerScore);
      setPlayerDialogue(dialog);
    } else if (selectedCharId === 'youmu') {
      const dialog = playerScore <= 16
        ? getRandomYoumuDialogue('standScore2_16', playerScore)
        : getRandomYoumuDialogue('standScore17_20', playerScore);
      setPlayerDialogue(dialog);
    } else if (selectedCharId === 'sanae') {
      const dialog = playerScore <= 16
        ? getRandomSanaeDialogue('standScore2_16', playerScore)
        : getRandomSanaeDialogue('standScore17_20', playerScore);
      setPlayerDialogue(dialog);
    } else {
      setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.stand : `${playerScore}点でスタンド。相手の様子を見ましょう。`);
    }
    handlePlayerStandWithHand(playerHand, deck);
  };

  // --- Dealer's AI Actions ---
  const runDealerAI = async (pHand: Card[], dHand: Card[], currentDeck: Card[]) => {
    let activeDealerHand = [...dHand];
    let activeDeck = [...currentDeck];

    // Flandre's Four of a Kind is already processed in initial deal, so we don't draw any more cards or do power set calculation here.
    if (difficulty === 'lunatic' && roundCount === flandreFourRound) {
      setDealerDialogue(getRandomFlandreQuote('fourOfAKindSkill'));
      await new Promise(r => setTimeout(r, 1500));
      evaluateRoundWinner(pHand, activeDealerHand);
      return;
    }

    let loopDealerScore = calculateScore(activeDealerHand);
    let flandreBoomUsed = false;
    let sakuyaMaidRedrawUsed = false;

    await new Promise(r => setTimeout(r, 1000));

    // Cirno stands only at soft 19+ under easy, others stand at soft 17+
    const standThreshold = difficulty === 'easy' ? 19 : 17;

    // Keep drawing until score >= standThreshold
    while (loopDealerScore < standThreshold) {
      if (difficulty === 'easy') {
        if (loopDealerScore === 17 || loopDealerScore === 18) {
          setDealerDialogue(getRandomCirnoQuote('mathClass'));
        } else {
          setDealerDialogue(getRandomCirnoQuote('turnSelect'));
        }
      } else if (difficulty === 'normal') {
        setDealerDialogue(getRandomSakuyaQuote('turnSelect'));
      } else if (difficulty === 'hard') {
        setDealerDialogue(getRandomRemiliaQuote('turnSelect'));
      } else {
        setDealerDialogue(getRandomFlandreQuote('turnSelect'));
      }
      // Delay so player can read the dialogue
      await new Promise(r => setTimeout(r, 3000));

      const nextCard = activeDeck.shift()!;
      nextCard.isFaceUp = true;
      activeDealerHand = [...activeDealerHand, nextCard];
      
      playFlipSound();
      setDealerHand(activeDealerHand);
      setDeck(activeDeck);
      
      loopDealerScore = calculateScore(activeDealerHand);

      if (difficulty === 'easy') {
        if (loopDealerScore === 21) {
          setDealerDialogue(getRandomCirnoQuote('score21'));
        } else if (loopDealerScore > 21) {
          setDealerDialogue(getRandomCirnoQuote('roundDefeat'));
        } else {
          setDealerDialogue(getRandomCirnoQuote('turnHit'));
        }
        await new Promise(r => setTimeout(r, 2000));
      } else if (difficulty === 'normal') {
        if (loopDealerScore === 21) {
          setDealerDialogue(getRandomSakuyaQuote('score21'));
        } else if (loopDealerScore > 21) {
          setDealerDialogue(getRandomSakuyaQuote('bust'));
        } else if (loopDealerScore >= 17 && loopDealerScore <= 20) {
          setDealerDialogue(getRandomSakuyaQuote('turnHit_17_20'));
        } else {
          setDealerDialogue(getRandomSakuyaQuote('turnHit_2_17'));
        }
        await new Promise(r => setTimeout(r, 2000));
      } else if (difficulty === 'hard') {
        if (loopDealerScore === 21) {
          setDealerDialogue(getRandomRemiliaQuote('score21'));
        } else if (loopDealerScore > 21) {
          // Keep the previous dialogue (do nothing till card reveal is complete)
        } else if (loopDealerScore >= 17 && loopDealerScore <= 20) {
          setDealerDialogue(getRandomRemiliaQuote('turnHit_17_20'));
        } else {
          setDealerDialogue(getRandomRemiliaQuote('turnHit_2_16'));
        }
        await new Promise(r => setTimeout(r, 2000));
      } else if (difficulty === 'lunatic') {
        if (loopDealerScore === 21) {
          setDealerDialogue(getRandomFlandreQuote('score21'));
        } else if (loopDealerScore > 21) {
          setDealerDialogue(getRandomFlandreQuote('roundDefeat'));
        } else if (loopDealerScore >= 17 && loopDealerScore <= 20) {
          setDealerDialogue(getRandomFlandreQuote('turnHit_17_20'));
        } else {
          setDealerDialogue(getRandomFlandreQuote('turnHit_2_16'));
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      // Flandre "Squeeze and Boom"
      if (loopDealerScore > 21 && difficulty === 'lunatic' && !flandreBoomUsed) {
        flandreBoomUsed = true;
        setIsFlandreBoomGlowing(true);
        playSe('/SE/石が砕ける.mp3');
        setDealerDialogue(getRandomFlandreQuote('flandreBoomSkill'));
        
        // Remove only the last card (the causing burst card) immediately!
        const remainingHand = activeDealerHand.slice(0, activeDealerHand.length - 1);
        setDealerHand(remainingHand);
        
        await new Promise(r => setTimeout(r, 3000));
        setIsFlandreBoomGlowing(false);

        const scoreBeforeLast = calculateScore(remainingHand);

        // Find a card in the remaining deck that satisfies our range: 17 <= testScore <= 21
        let foundIndex = activeDeck.findIndex(c => {
          const testScore = calculateScore([...remainingHand, c]);
          return testScore >= 17 && testScore <= 21;
        });

        let replacementCard: Card;
        if (foundIndex !== -1) {
          replacementCard = activeDeck.splice(foundIndex, 1)[0];
        } else {
          // Calculate the range of card values needed to make the total score between 17 and 21
          const minNeeded = Math.max(1, 17 - scoreBeforeLast);
          const maxNeeded = 21 - scoreBeforeLast;
          let pickedVal = maxNeeded;
          if (minNeeded <= maxNeeded) {
            pickedVal = Math.floor(Math.random() * (maxNeeded - minNeeded + 1)) + minNeeded;
          }
          const rank = Math.max(1, Math.min(10, pickedVal));
          replacementCard = makeCardOfRank(rank);
        }
        replacementCard.isFaceUp = true;
        activeDealerHand = [...remainingHand, replacementCard];

        playFlipSound();
        setDealerHand(activeDealerHand);
        setDeck(activeDeck);
        
        loopDealerScore = calculateScore(activeDealerHand);
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    if (difficulty === 'easy') {
      if (loopDealerScore === 21) {
        setDealerDialogue(getRandomCirnoQuote('score21'));
      } else if (loopDealerScore > 21) {
        setDealerDialogue(getRandomCirnoQuote('bust'));
      } else {
        setDealerDialogue(getRandomCirnoQuote('turnStand'));
      }
    } else if (difficulty === 'normal') {
      if (loopDealerScore === 21) {
        setDealerDialogue(getRandomSakuyaQuote('score21'));
      } else if (loopDealerScore > 21) {
        setDealerDialogue(getRandomSakuyaQuote('bust'));
      } else {
        setDealerDialogue(getRandomSakuyaQuote('turnHit_17_20'));
      }
    } else if (difficulty === 'hard') {
      if (loopDealerScore === 21) {
        setDealerDialogue(getRandomRemiliaQuote('score21'));
      } else if (loopDealerScore > 21) {
        // Keep the previous dialogue (do nothing till card reveal is complete)
      } else {
        setDealerDialogue(getRandomRemiliaQuote('turnHit_17_20'));
      }
    } else {
      if (loopDealerScore === 21) {
        setDealerDialogue(getRandomFlandreQuote('score21'));
      } else if (loopDealerScore > 21) {
        setDealerDialogue(getRandomFlandreQuote('bust'));
      } else {
        setDealerDialogue(getRandomFlandreQuote('turnHit_17_20'));
      }
    }
    // Delay to read the stand dialogue before evaluations
    await new Promise(r => setTimeout(r, 3000));
    evaluateRoundWinner(pHand, activeDealerHand);
  };


  // --- Evaluate Winners and Distribute Payouts with Reimu/Sanae hooks ---
  const evaluateRoundWinner = async (pHand: Card[], dHand: Card[]) => {
    setIsDealingInProgress(true);
    if (difficulty === 'hard') {
      await revealRemiliaHandSequential(dHand);
      await new Promise(r => setTimeout(r, 2000));
    }
    const pScore = calculateScore(pHand);
    const dScore = calculateScore(dHand);

    if (dScore > 21) {
      const bustLine = difficulty === 'easy' ? getRandomCirnoQuote('roundDefeat') 
        : difficulty === 'normal' ? getRandomSakuyaQuote('roundDefeat')
        : difficulty === 'hard' ? getRemiliaResultDialogue(pHand, dHand, 'bust')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('roundDefeat')
        : `やってしまった！${dScore}点でバースト（12超）だ。`;
      setDealerDialogue(bustLine);
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('oneTurnVictory'));
      } else {
        setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.victory : 'よし！相手の自滅で勝ちね！');
      }
      setGameMessage('相手がバースト！あなたの勝利！');
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('player_win', dHand);
      setPhase('round_end');
    } else if (pScore > dScore) {
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('oneTurnVictory'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('oneTurnVictory'));
      } else {
        setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.victory : `やった！${pScore}対${dScore}で私の勝ちね。`);
      }
      const winLine = difficulty === 'easy' ? getRandomCirnoQuote('roundDefeat')
        : difficulty === 'normal' ? getRandomSakuyaQuote('roundDefeat')
        : difficulty === 'hard' ? getRemiliaResultDialogue(pHand, dHand, 'lose')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('roundDefeat')
        : `上手な勝負だった。負けを認めよう。`;
      setDealerDialogue(winLine);
      setGameMessage('あなたの勝利！');
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('player_win', dHand);
      setPhase('round_end');
    } else if (pScore < dScore) {
      // Reimu's Fantasy Heaven checkpoint:
      if (selectedCharId === 'reimu' && !isMusouUsedGlobally) {
        setShowReimuMusouPopup(true);
      } else {
        await executeLossPayoutAndTransition('standard', pHand, dHand);
      }
    } else {
      const drawLine = difficulty === 'easy' ? getRandomCirnoQuote('draw')
        : difficulty === 'normal' ? getRandomSakuyaQuote('draw')
        : difficulty === 'hard' ? getRemiliaResultDialogue(pHand, dHand, 'draw')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('draw')
        : `同じ ${pScore}点。引き分け（プッシュ）だな。`;
      setDealerDialogue(drawLine);
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('draw'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('draw'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('draw'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('draw'));
      } else {
        setPlayerDialogue('同点ね。チップは戻ってくるわ。');
      }
      setGameMessage('引き分け（プッシュ）です。');
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('draw', dHand);
      setPhase('round_end');
    }
  };

  // Centralized defeat execution to accommodate Sanae's Two Gods Protection
  const executeLossPayoutAndTransition = async (lossType: 'bust' | 'standard' | 'blackjack', currentPHand: Card[], currentDHand: Card[]) => {
    setIsDealingInProgress(true);
    if (difficulty === 'hard') {
      if (!remiliaHasBeenRevealed) {
        await revealRemiliaHandSequential(currentDHand);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Check Sanae's protection condition (coin balance would become equal/less than 0)
    const wouldGoToZero = playerCoins - currentBet <= 0;
    if (selectedCharId === 'sanae' && wouldGoToZero && !skillsUsedThisRound.protection) {
      setSkillsUsedThisRound(prev => ({ ...prev, protection: true }));
      setProtectionActive(true);
      setTimeout(() => {
        playSe('/SE/魔法反射.mp3');
      }, 1500);
      setPlayerDialogue(getRandomSanaeDialogue('protection'));
      setDealerDialogue(
        difficulty === 'easy' ? getRandomCirnoQuote('protectionSkill')
          : difficulty === 'normal' ? getRandomSakuyaQuote('sanaeProtection')
          : difficulty === 'hard' ? getRandomRemiliaQuote('sanaeProtection')
          : difficulty === 'lunatic' ? getRandomFlandreQuote('sanaeProtection')
          : 'な、何だってぇ！？奇跡の庇護が起きて掛け金が相殺されただと！？'
      );
      setGameMessage('奇跡「二大神様プロテクション」が作動！敗北がドローに改変されました。');
      await new Promise(r => setTimeout(r, 3050));
      setPhase('round_end');
      return;
    }

    if (lossType === 'bust') {
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('bust'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('bust'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('bust'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('bust'));
      } else {
        setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.bust : 'バーストした！あちゃあ...');
      }
      const bustLine = difficulty === 'easy' ? getRandomCirnoQuote('playerBust')
        : difficulty === 'normal' ? getRandomSakuyaQuote('playerBust')
        : difficulty === 'hard' ? getRemiliaResultDialogue(currentPHand, currentDHand, 'win')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('roundVictory')
        : 'バースト（21超過）だね。私の勝ちのようだ。';
      setDealerDialogue(bustLine);
      setGameMessage('バースト！あなたの負けです。');
      setDealerHand(prev => prev.map(c => ({ ...c, isFaceUp: true })));
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('dealer_win', currentDHand);
    } else if (lossType === 'blackjack') {
      const bjLine = difficulty === 'easy' ? getRandomCirnoQuote('blackjack')
        : difficulty === 'normal' ? getRandomSakuyaQuote('blackjack')
        : difficulty === 'hard' ? getRemiliaResultDialogue(currentPHand, currentDHand, 'win')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('blackjack')
        : '信じられない！初期手札でブラックジャックだ！私の勝ちだ。';
      setDealerDialogue(bjLine);
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('oneTurnDefeat'));
      } else {
        setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.defeat : '嘘っ！？ディーラーがブラックジャックだなんて...！');
      }
      setGameMessage('相手 of the blackjack！あなたの負けです。');
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('dealer_blackjack', currentDHand);
    } else {
      const pScore = calculateScore(currentPHand);
      const dScore = calculateScore(currentDHand);
      const standardLine = difficulty === 'easy' ? getRandomCirnoQuote('roundVictory')
        : difficulty === 'normal' ? getRandomSakuyaQuote('roundVictory')
        : difficulty === 'hard' ? getRemiliaResultDialogue(currentPHand, currentDHand, 'win')
        : difficulty === 'lunatic' ? getRandomFlandreQuote('roundVictory')
        : `私の目は ${dScore}点。${pScore}点に勝っているよ。私の勝ちだ。`;
      setDealerDialogue(standardLine);
      if (selectedCharId === 'reimu') {
        setPlayerDialogue(getRandomReimuDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'marisa') {
        setPlayerDialogue(getRandomMarisaDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('oneTurnDefeat'));
      } else if (selectedCharId === 'sanae') {
        setPlayerDialogue(getRandomSanaeDialogue('oneTurnDefeat'));
      } else {
        setPlayerDialogue(selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.defeat : '惜しい... 相手 of the numbers was higher.');
      }
      setGameMessage('あなたの負けです。');
      await new Promise(r => setTimeout(r, 3050));
      applyPayout('dealer_win', currentDHand);
    }
    setPhase('round_end');
  };

  // Apply coin changes with Reimu's osaisen active doubling option (opponents bet forced)
  const applyPayout = (
    outcome: 'player_win' | 'player_blackjack' | 'dealer_win' | 'dealer_blackjack' | 'draw',
    dHandUsed: Card[],
    betOverride?: number
  ) => {
    setLastOutcome(outcome);
    
    const actualBet = betOverride !== undefined ? betOverride : currentBet;
    const effectiveBet = Math.min(actualBet, dealerCoins);
    
    // Calculate changes based on current coins
    let pCalc = 0;
    let dCalc = 0;

    if (outcome === 'player_blackjack') {
      const baseReward = osaisenActive ? (effectiveBet * 2) : effectiveBet;
      const actualReward = Math.min(baseReward, dealerCoins);
      pCalc = actualReward;
      dCalc = -actualReward;
    } else if (outcome === 'player_win') {
      const baseReward = osaisenActive ? (effectiveBet * 2) : effectiveBet;
      const actualReward = Math.min(baseReward, dealerCoins);
      pCalc = actualReward;
      dCalc = -actualReward;
    } else if (outcome === 'dealer_win' || outcome === 'dealer_blackjack') {
      const loss = effectiveBet;
      const actualLoss = Math.min(loss, playerCoins);
      pCalc = -actualLoss;
      dCalc = actualLoss;
    } else if (outcome === 'draw') {
      pCalc = 0;
      dCalc = 0;
    }

    setCoinChangePlayer(pCalc >= 0 ? `+${pCalc}` : `${pCalc}`);
    setCoinChangeDealer(dCalc >= 0 ? `+${dCalc}` : `${dCalc}`);

    setPlayerCoins(prev => prev + pCalc);
    setDealerCoins(prev => prev + dCalc);
  };

  // --- Reset only temporary round effects at the start of each new round ---
  const resetRoundState = () => {
    setOsaisenActive(false);
    setActivePhantomEye(false);
    setIsTargetingSlash(false);
    setLastOutcome(null);
    setCoinChangePlayer(null);
    setCoinChangeDealer(null);
    setMurderDollUsedCount(0);
    setIsMurderDollGlowing(false);
    setIsMiserableFateGlowing(false);
    setIsFlandreBoomGlowing(false);
    setIsPerfectMaidGlowing(false);
    setIsRevealingRemilia(false);
    setRemiliaRevealedCount(0);
    setRemiliaHasBeenRevealed(false);
    remiliaHasBeenRevealedRef.current = false;
    setIsCirnoFreezeUsed(false);
    setIsSakuyaMaidUsed(false);
    setIsFlandreFourUsed(false);
  };

  const handleOsaisenAtVictory = () => {
    setSkillsUsedThisRound(prev => ({ ...prev, osaisen: true }));
    setOsaisenActive(true);
    playSe('/SE/お金を落とす2.mp3');
    
    // Calculate original payout that was already applied for blackjack
    // Blackjack payout is now the same as standard payout (currentBet)
    const originalGain = Math.min(currentBet, dealerCoins + currentBet);
    
    // New total payout with osaisen: opponent's bet is doubled (currentBet * 2)
    // Dealer's original coins before any payout was: dealerCoins + originalGain
    const originalDealerCoins = dealerCoins + originalGain;
    const totalOsaisenGain = Math.min(currentBet * 2, originalDealerCoins);
    
    // Difference that needs to be transferred now
    const diff = totalOsaisenGain - originalGain;
    
    if (selectedCharId === 'reimu') {
      setPlayerDialogue(getRandomReimuDialogue('osaisen'));
    } else {
      setPlayerDialogue('当然の勝利ね。お賽銭箱に、今回の賭け金の倍額を入れておきなさい！');
    }
    setDealerDialogue(
      difficulty === 'easy'
        ? getRandomCirnoQuote('osaisenSkill')
        : difficulty === 'normal'
        ? getRandomSakuyaQuote('reimuOsaisen')
        : difficulty === 'hard'
        ? getRandomRemiliaQuote('reimuOsaisen')
        : difficulty === 'lunatic'
        ? getRandomFlandreQuote('reimuOsaisen')
        : `ひぇっ！？お賽銭要求で今回の私のベット額だけ2倍（${totalOsaisenGain}枚）になって持って行かれただと！？強欲すぎる…！`
    );
    setGameMessage(`お賽銭を要求！相手の賭け金を2倍（${totalOsaisenGain}枚）に変更して獲得しました！`);
    
    setPlayerCoins(prevPlayer => prevPlayer + diff);
    setDealerCoins(prevDealer => Math.max(0, prevDealer - diff));
    
    setCoinChangePlayer(`+${totalOsaisenGain}`);
    setCoinChangeDealer(`-${totalOsaisenGain}`);
  };

  // --- Proceed Next Round ---
  const handleNextRound = () => {
    if (playerCoins <= 0 || dealerCoins <= 0) {
      if (dealerCoins <= 0) {
        playSe('/SE/決定ボタンを押す24.mp3');
        if (difficulty === 'easy') {
          try {
            localStorage.setItem('touhou_blackjack_stage1_cleared', 'true');
          } catch (e) {
            console.error(e);
          }
          setIsStage1Cleared(true);
        } else if (difficulty === 'normal') {
          try {
            localStorage.setItem('touhou_blackjack_stage2_cleared', 'true');
          } catch (e) {
            console.error(e);
          }
          setIsStage2Cleared(true);
        } else if (difficulty === 'hard') {
          try {
            localStorage.setItem('touhou_blackjack_stage3_cleared', 'true');
            localStorage.setItem('touhou_blackjack_hard_cleared', 'true');
          } catch (e) {
            console.error(e);
          }
          setIsStage3Cleared(true);
        } else if (difficulty === 'lunatic') {
          try {
            localStorage.setItem('touhou_blackjack_stage4_cleared', 'true');
          } catch (e) {
            console.error(e);
          }
          setIsStage4Cleared(true);
        }
      } else if (playerCoins <= 0) {
        playSe('/SE/キャンセル5.mp3');
      }
      setPhase('game_over');
      return;
    }

    setPlayerHand([]);
    setDealerHand([]);
    resetRoundState();
    setRoundCount(prev => prev + 1);
    setPhase('betting');
  };

  // --- Reset Entire game state to Title ---
  const handleResetToTitle = () => {
    setSelectedCharId(null);
    resetRoundSkills();
    resetAllPlayerSkillsForNewGame();
    setPlayerCoins(15);
    setDealerCoins(15);
    setRoundCount(1);
    setSakuyaMaidRound(Math.floor(Math.random() * 4) + 1);
    setFlandreFourRound(Math.floor(Math.random() * 3) + 2);
    setCurrentBet(2);
    setTempBet(2);
    setPlayerHand([]);
    setDealerHand([]);
    setDeck([]);
    setIsRevealingRemilia(false);
    setRemiliaRevealedCount(0);
    setRemiliaHasBeenRevealed(false);
    setIsMurderDollUsedGlobally(false);
    setIsMasterSparkUsedGlobally(false);
    setIsMasterSparkPreparing(false);
    setShowMasterSparkTitle(false);
    setPhase('title');
  };

  // --- Start Game and Selection Handlers ---
  const handleStartGameClick = () => {
    setPhase('char_select');
  };

  const handleSelectCharacter = (charId: TouhouCharId) => {
    setSelectedCharId(charId);
    setShowDifficultyPopup(true);
  };

  const handleSelectDifficulty = (selectedDiff: Difficulty) => {
    setDifficulty(selectedDiff);
    setShowDifficultyPopup(false);
    resetAllPlayerSkillsForNewGame();
    setPhase('betting');
  };

  // --- Slashed Card Click handler for Youmu's skill ---
  const handleCardClickForSlash = (card: Card, isPlayerCard: boolean) => {
    if (!isTargetingSlash) return;
    if (card.isHalved) return;

    playSe('/SE/剣で斬る2.mp3');
    card.isHalved = true;
    setSlashUseCount(prev => prev - 1);
    setIsTargetingSlash(false);

    if (isPlayerCard) {
      setPlayerHand([...playerHand]);
      if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('slash'));
      } else {
        setPlayerDialogue(`一刀両断！おのれのカードの数値を半分に斬り落としました！`);
      }
    } else {
      setDealerHand([...dealerHand]);
      if (selectedCharId === 'youmu') {
        setPlayerDialogue(getRandomYoumuDialogue('slash'));
      } else {
        setPlayerDialogue(`お覚悟！相手のカードを一文字に切り裂きました！`);
      }
    }
    setDealerDialogue(
      difficulty === 'easy'
        ? getRandomCirnoQuote('slashSkill')
        : difficulty === 'normal'
        ? getRandomSakuyaQuote('youmuSlash')
        : difficulty === 'hard'
        ? getRandomRemiliaQuote('youmuSlash')
        : difficulty === 'lunatic'
        ? getRandomFlandreQuote('youmuSlash')
        : `な、何だとぉ！？一閃にされてカードの価値が減少しただと！？`
    );
    setGameMessage(`未来永劫斬が成功！対象カード of 数値が半分（端数切り捨て）になりました。`);
  };

  return (
    <div 
      className="min-h-screen bg-[#073b1c] text-white flex flex-col justify-between p-4 md:p-6 overflow-x-hidden font-sans select-none relative border-8 md:border-12 border-[#3d2b1f] rounded-3xl shadow-2xl m-2 md:m-4" 
      id="blackjack-app"
      style={{
        backgroundImage: phase === 'title' ? "url('/dateA/ada.jpg')" : "url('/dateA/table.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Golden Highlight Border frame */}
      <div className="absolute inset-x-0 top-0 h-1 bg-amber-500/10 pointer-events-none" />

      {/* Header Banner */}
      {phase !== 'title' && (
        <header className="flex justify-between items-center bg-black/40 border border-amber-600/30 px-4 py-3 rounded-xl shadow-xl max-w-7xl mx-auto w-full mb-3" id="game-header">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-lg">♠</span>
            <h1 className="text-sm font-bold tracking-widest text-amber-500 font-serif uppercase">ブラック・ジャック</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            {selectedCharId && (
              <span className="bg-amber-950/40 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded font-black font-serif">
                使用キャラ: {TOUHOU_CHARACTERS[selectedCharId].japaneseName}
              </span>
            )}
            {phase !== 'char_select' && (
              <span className="bg-white/5 px-2 py-0.5 rounded border border-amber-600/25 font-semibold">
                STAGE: {difficulty === 'easy' ? 'STAGE 1 かんたん' : difficulty === 'normal' ? 'STAGE 2 ふつう' : difficulty === 'hard' ? 'STAGE 3 むずかしい' : 'STAGE 4 ルナティック'}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end" id="header-action-group">
            <button 
              onClick={handleResetToTitle}
              className="text-[10px] md:text-xs flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-rose-400 border border-white/10 transition-all text-zinc-300 font-medium active:scale-95 cursor-pointer w-[124px]"
              id="header-abort-button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>タイトルに戻る</span>
            </button>
            <button 
              onClick={() => setShowOptions(true)}
              className="text-[10px] md:text-xs flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-amber-400 border border-white/10 transition-all text-zinc-300 font-medium active:scale-95 cursor-pointer w-[90px]"
              id="header-options-button"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>オプション</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Screen Container */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ==================== 1. TITLE SCREEN ==================== */}
          {phase === 'title' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full flex flex-col justify-between select-none overflow-hidden rounded-2xl z-20 pointer-events-auto"
              id="title-screen"
            >
              {/* Credits Button on the top right of Title Screen */}
              <button
                onClick={() => setShowCredits(true)}
                className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-lg bg-black/60 border border-white/10 hover:border-amber-500/60 hover:bg-black/90 text-xs text-zinc-350 hover:text-amber-400 font-bold tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5 backdrop-blur-xs pointer-events-auto"
                id="title-credits-button"
              >
                <span>ℹ️</span> クレジット
              </button>

              {/* Title Card Overlay - Transparent and light-weight to see background clearly */}
              {/* Invisible clickable areas overlaying the menu options pre-baked on the background image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute bottom-[40px] md:bottom-[65px] right-[24px] md:right-[55px] flex flex-row flex-wrap justify-end gap-4 md:gap-6 items-center z-25 max-w-[95%] pointer-events-auto"
              >
                {/* 1. Game Start Button */}
                <button
                  onClick={handleStartGameClick}
                  className="w-72 md:w-[360px] h-[80px] md:h-[110px] rounded-2xl cursor-pointer bg-black/90 hover:bg-amber-500/15 active:bg-amber-500/25 border-2 border-amber-500/60 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] text-amber-300 font-black tracking-widest text-2xl md:text-3xl transition-all duration-200 flex items-center justify-center outline-none active:scale-95 shadow-xl shadow-black/80"
                  title="ゲームスタート"
                  id="invisible-start-button"
                >
                  <span className="mr-2 text-3xl md:text-4xl">⛩️</span> ゲームスタート
                </button>

                {/* 2. Options Button */}
                <button
                  onClick={() => setShowOptions(true)}
                  className="w-72 md:w-[360px] h-[80px] md:h-[110px] rounded-2xl cursor-pointer bg-black/90 hover:bg-amber-500/15 active:bg-amber-500/25 border-2 border-amber-500/60 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] text-amber-300 font-black tracking-widest text-2xl md:text-3xl transition-all duration-200 flex items-center justify-center outline-none active:scale-95 shadow-xl shadow-black/80"
                  title="オプション"
                  id="invisible-options-button"
                >
                  <span className="mr-2 text-3xl md:text-4xl">⚙️</span> オプション
                </button>

                {/* 3. Exit Button */}
                <button
                  onClick={() => setIsExited(true)}
                  className="w-72 md:w-[360px] h-[80px] md:h-[110px] rounded-2xl cursor-pointer bg-black/90 hover:bg-red-500/15 active:bg-red-500/25 border-2 border-red-500/60 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] text-rose-350 font-black tracking-widest text-2xl md:text-3xl transition-all duration-200 flex items-center justify-center outline-none active:scale-95 shadow-xl shadow-black/80"
                  title="終了"
                  id="invisible-exit-button"
                >
                  <span className="mr-2 text-3xl md:text-4xl">🚪</span> 終了
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ==================== 2. CHARACTER SELECTION VIEW ==================== */}
          {phase === 'char_select' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center space-y-6 w-full py-6 select-none"
              id="char-select-screen"
            >
              <div className="text-center space-y-1.5">
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Characters Selection</span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 font-serif filter drop-shadow">
                  キャラクター選択
                </h2>
                <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  特殊能力を選び、卓に向かいましょう。それぞれが異なる奇跡な能力、術式を持っています。
                </p>
              </div>

              {/* Character Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4 mt-2">
                {Object.values(TOUHOU_CHARACTERS).map((char) => (
                  <motion.div
                    key={char.id}
                    whileHover={{ y: -6, scale: 1.02 }}
                    onClick={() => handleSelectCharacter(char.id)}
                    className={`group border-2 rounded-2xl p-5 h-[700px] flex flex-col relative bg-gradient-to-b ${char.bgGradient} shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer overflow-hidden border-zinc-800 hover:border-amber-500/60`}
                  >
                    {/* Character background portrait overlay */}
                    <img
                      src={`/${char.imageUrl}`}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-x-0 top-[72px] w-full h-[58%] object-cover object-top opacity-100 group-hover:scale-105 transition-all duration-500 select-none pointer-events-none z-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Gradient protector to fade the picture into the background list */}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none z-0" />

                    {/* Badge Icon Accent in background */}
                    <div className="absolute top-4 right-4 text-white/15 text-6xl select-none font-serif z-0">
                      {char.id === 'reimu' ? '⛩️' : char.id === 'marisa' ? '🧹' : char.id === 'youmu' ? '⚔️' : '🍃'}
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      {/* Name header */}
                      <div className="text-center pt-0 -mt-3.5 flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest text-amber-500/60 uppercase font-mono">{char.name}</span>
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-widest mt-1.5 font-serif filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 bg-black/60 border border-white/20 px-4 py-1.5 rounded-full shadow-lg backdrop-blur-xs">
                          <span className="text-lg md:text-xl select-none filter drop-shadow bg-amber-500/25 text-amber-300 w-8 h-8 rounded-full flex items-center justify-center border border-amber-500/40">
                            {char.id === 'reimu' ? '⛩️' : char.id === 'marisa' ? '🧹' : char.id === 'youmu' ? '⚔️' : '🍃'}
                          </span>
                          <span>{char.japaneseName}</span>
                        </h3>
                        <div className="w-8 h-0.5 bg-amber-500 mx-auto mt-2" />
                      </div>

                      {/* Tightly grouped interactive and info components pushed to bottom */}
                      <div className="mt-auto flex flex-col space-y-2">
                        {/* Special Capabilities list */}
                        <div className="space-y-2 bg-black/80 border border-white/10 backdrop-blur-md p-3.5 rounded-xl shadow-lg">
                          {char.abilities.map((ability, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <h4 className="text-[11.5px] font-extrabold text-amber-400 flex items-center gap-0.5">
                                <span>🔸</span>
                                <span>【{ability.name}】</span>
                              </h4>
                              <p className="text-[10px] text-zinc-300 leading-normal font-sans">
                                {ability.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Speech sample */}
                        <p className="text-[10.5px] text-zinc-300 italic text-center px-1.5 leading-relaxed bg-black/60 border border-white/5 p-2 rounded-lg backdrop-blur-sm shadow-md">
                          "{char.dialogues.gameStart}"
                        </p>

                        {/* Action trigger button */}
                        <button className="w-full py-2 rounded-lg bg-zinc-900/90 hover:bg-amber-500 text-zinc-200 hover:text-zinc-950 font-bold text-xs tracking-widest transition-all uppercase flex items-center justify-center gap-1 border border-zinc-700/60 group-hover:border-amber-400 cursor-pointer">
                          キャラクターを選択
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Return to Title converted into an elegant button */}
              <button
                onClick={() => setPhase('title')}
                className="mt-6 px-6 py-2.5 rounded-full border border-zinc-700/60 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:border-amber-500/50 tracking-widest shadow-xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1.5"
                id="return-to-title-button"
              >
                <span>◀</span>
                <span>タイトルに戻る</span>
              </button>
            </motion.div>
          )}

          {/* ==================== 3. GAME SCREEN ==================== */}
          {(phase !== 'title' && phase !== 'char_select' && phase !== 'game_over') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-4"
              id="game-board-layout"
            >
              {/* TOP ROW: DEALER SECTION */}
              <section className="grid grid-cols-[auto_1fr_120px] md:grid-cols-[auto_1fr_170px] gap-4 items-center w-full min-h-[180px] p-2 rounded-xl" id="dealer-row-section">
                
                {/* 1. Upper Left: Dealer frame */}
                <div className="flex justify-start">
                  <CharacterFrame 
                    isDealer={true} 
                    dialogue={dealerDialogue} 
                    difficulty={difficulty} 
                    roundCount={roundCount}
                    sakuyaMaidRound={sakuyaMaidRound}
                    flandreFourRound={flandreFourRound}
                    murderDollGlowing={isMurderDollGlowing}
                    flandreBoomGlowing={isFlandreBoomGlowing}
                    miserableFateGlowing={isMiserableFateGlowing}
                    perfectMaidGlowing={isPerfectMaidGlowing}
                    isRemiliaFateUsed={isRemiliaFateUsed}
                  />
                </div>

                {/* 2. Upper Center: Dealer card slots & slashing capability overlay */}
                <div className="flex flex-col items-center justify-center px-4 w-full h-full relative border border-transparent rounded-2xl" id="dealer-cards-vault">
                  <span className="text-[10px] md:text-xs font-mono font-bold tracking-widest text-rose-500/50 uppercase mb-2">Dealer Card Slot</span>
                  
                  {dealerHand.length === 0 ? (
                    <div className="w-full h-28 md:h-34 border-2 border-dashed border-zinc-700/40 rounded-xl flex items-center justify-center text-zinc-600 text-xs font-mono select-none">
                      (No Cards)
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2.5 max-w-full">
                      {dealerHand.map((card, i) => (
                        <div
                          key={card.id}
                          onClick={() => {
                            if (isTargetingSlash && card.isFaceUp) {
                              handleCardClickForSlash(card, false);
                            }
                          }}
                          className={`rotate-180 transform ${
                            (isTargetingSlash && card.isFaceUp && !card.isHalved) 
                              ? 'cursor-pointer hover:ring-4 hover:ring-rose-500 rounded-xl transition-all hover:scale-105 active:scale-95' 
                              : ''
                          }`}
                          title={isTargetingSlash ? '未来永劫斬でこのカードを切断する' : ''}
                        >
                          {(() => {
                            const isFacedown = (() => {
                              if (!card.isFaceUp) return true;
                              if (difficulty === 'hard') {
                                if (phase === 'round_end' || phase === 'game_over') return false;
                                if (remiliaHasBeenRevealed) return false;
                                if (isRevealingRemilia) {
                                  return i >= remiliaRevealedCount;
                                }
                                return true;
                              }
                              return false;
                            })();

                            if (activePhantomEye && isFacedown) {
                              return (
                                <div className="relative group select-none animate-pulse">
                                  <div className="opacity-75">
                                    <CardItem card={{ ...card, isFaceUp: true }} index={i} />
                                  </div>
                                </div>
                              );
                            }
                            const cardToShow = isFacedown
                              ? { ...card, isFaceUp: false }
                              : card;
                            return <CardItem card={cardToShow} index={i} />;
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Upper Right: Dealer visual deck layout */}
                <div className="flex items-center justify-end pr-2" id="dealer-deck-bracket">
                   <div className="relative group select-none">
                     <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-zinc-500 font-bold uppercase py-0.5 tracking-wider whitespace-nowrap">PEALER DECK</span>
                     <div className="w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-slate-900 relative overflow-hidden select-none" id="dealer-pile-mount">
                       <img 
                         src="/dateA/card.png"
                         alt="Dealer Card Pile" 
                         referrerPolicy="no-referrer"
                         className="absolute inset-0 w-full h-full object-cover"
                         onError={(e) => {
                           (e.target as HTMLElement).style.display = 'none';
                         }}
                       />
                     </div>
                   </div>
                </div>

              </section>

              {/* MIDDLE ROW: STATUSES & SCORES */}
              <section className="grid grid-cols-1 md:grid-cols-[1fr_280px] items-center gap-4 bg-black/40 border border-amber-600/30 p-4 rounded-xl shadow-lg relative min-h-[90px]" id="stats-middle-strip">
                
                {/* Left/Center side of middle row: Scores and Game status logs */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                  
                  {/* Score indicators */}
                  <div className="flex items-center gap-6 justify-center w-full md:w-auto">
                    {/* Player Score Dashboard */}
                    <div className="text-4xl md:text-5xl font-black text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)] flex items-baseline select-none" id="player-score-indicator">
                      <span>{playerHand.length > 0 ? playerScore : '-'}</span>
                      <span className="text-[10px] ml-1.5 font-normal uppercase tracking-widest opacity-60 font-sans">You</span>
                    </div>

                    <div className="text-amber-500/40 font-bold text-sm font-mono uppercase tracking-widest">vs</div>

                    {/* Dealer Score Dashboard */}
                    <div className="text-4xl md:text-5xl font-black text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)] flex items-baseline select-none" id="dealer-score-indicator">
                      <span>
                        {dealerHand.length > 0 ? (
                          (difficulty === 'hard' && phase !== 'round_end' && phase !== 'game_over') ? (
                            isRevealingRemilia ? calculateScore(dealerHand.slice(0, remiliaRevealedCount)) : '?'
                          ) : (
                            dealerHand.some(c => !c.isFaceUp) 
                              ? calculateScore([dealerHand[0]])
                              : dealerScore
                          )
                        ) : '-'}
                      </span>
                      <span className="text-[10px] ml-1.5 font-normal uppercase tracking-widest opacity-60 font-sans">Dealer</span>
                    </div>
                  </div>

                  {/* Guide status text panel */}
                  <div className="flex-1 text-center md:text-left md:pl-4">
                    <p className="text-lg md:text-2xl font-black text-amber-300 font-sans tracking-wide leading-relaxed drop-shadow-md">
                      {gameMessage}
                    </p>
                    {phase === 'player_turn' && (
                      <p className="text-[11px] font-semibold text-amber-500/90 mt-1.5 select-none">
                        ※お札や念動力によるカード操作などの特殊能力が使用可能です。
                      </p>
                    )}
                  </div>

                </div>

                {/* Coin rack tracker */}
                <div 
                  className="flex flex-row md:flex-col justify-around md:justify-center items-start gap-2.5 border-t md:border-t-0 md:border-l border-amber-600/20 pt-3 md:pt-0 pl-0 md:pl-6 font-mono text-amber-400 w-full" 
                  id="coins-badge-rack"
                >
                  <div className="text-xs md:text-sm tracking-wide flex items-center justify-between md:justify-start gap-2 w-full md:w-auto" id="dealer-coins-tracker">
                    <span className="text-zinc-400">相手のコイン:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm md:text-base">{dealerCoins}枚</span>
                      {coinChangeDealer !== null && (
                        <span className={`text-[11px] md:text-xs font-black px-1.5 py-0.5 rounded shadow-sm border ${
                          coinChangeDealer.startsWith('+') ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/25' : 
                          coinChangeDealer.startsWith('-') ? 'bg-rose-950/80 text-rose-400 border-rose-500/25' : 
                          'bg-zinc-800 text-zinc-300 border-zinc-700/50'
                        }`}>
                          {coinChangeDealer === '+0' || coinChangeDealer === '-0' ? '±0枚' : `${coinChangeDealer}枚`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs md:text-sm tracking-wide flex items-center justify-between md:justify-start gap-2 w-full md:w-auto font-bold" id="player-coins-tracker">
                    <span className="text-zinc-400">自分のコイン:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-300 text-sm md:text-base">{playerCoins}枚</span>
                      {coinChangePlayer !== null && (
                        <span className={`text-[11px] md:text-xs font-black px-1.5 py-0.5 rounded shadow-sm border ${
                          coinChangePlayer.startsWith('+') ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/25' : 
                          coinChangePlayer.startsWith('-') ? 'bg-rose-950/80 text-rose-400 border-rose-500/25' : 
                          'bg-zinc-800 text-zinc-300 border-zinc-700/50'
                        }`}>
                          {coinChangePlayer === '+0' || coinChangePlayer === '-0' ? '±0枚' : `${coinChangePlayer}枚`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </section>

              {/* BOTTOM ROW: PLAYER SECTION */}
              <section className="grid grid-cols-[120px_1fr_170px] md:grid-cols-[170px_1fr_170px] gap-2 items-center bg-transparent w-full min-h-[180px] p-2 rounded-xl" id="player-row-section">
                
                {/* 1. Bottom Left: Interactive deck stack / Phantom Eye preview */}
                <div className="flex justify-start pl-2" id="player-deck-bracket">
                  <div className="relative group">
                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-zinc-500 font-bold uppercase py-0.5 tracking-wider whitespace-nowrap">PLAYER DECK</span>
                    
                    {activePhantomEye && deck.length > 0 ? (
                      /* Phantom eye peek! Show exact next card of deck with 75% opacity as requested */
                      <button
                        onClick={handlePlayerDraw}
                        disabled={phase !== 'player_turn' || isDealingInProgress || isTargetingSlash || lastOutcome !== null || calculateScore(playerHand) > 21}
                        className={`w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20 overflow-hidden relative select-none transition-all duration-300 animate-pulse ${
                          (phase === 'player_turn' && !isDealingInProgress && !isTargetingSlash && lastOutcome === null && calculateScore(playerHand) <= 21)
                            ? 'hover:scale-105 active:scale-95 cursor-pointer'
                            : 'cursor-default'
                        }`}
                        title={phase === 'player_turn' ? 'カードをドロー' : '自分のターンにドロー可能です'}
                        id="card-deck-interaction"
                      >
                        <div className="w-full h-full opacity-75">
                          <CardItem card={{ ...deck[0], isFaceUp: true }} index={999} />
                        </div>
                      </button>
                    ) : (
                      /* Standard face-down card back */
                      <button
                        onClick={handlePlayerDraw}
                        disabled={phase !== 'player_turn' || isDealingInProgress || isTargetingSlash || lastOutcome !== null || calculateScore(playerHand) > 21}
                        className={`w-[110px] h-[150px] md:w-[130px] md:h-[180px] rounded-xl border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-slate-900 z-10 flex items-center justify-center relative overflow-hidden select-none transition-all duration-300 ${
                          (phase === 'player_turn' && !isDealingInProgress && !isTargetingSlash && lastOutcome === null && calculateScore(playerHand) <= 21)
                            ? 'hover:-translate-y-2 hover:scale-105 active:scale-95 shadow-[0_15px_30px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/30 cursor-pointer'
                            : 'cursor-default'
                        }`}
                        title={phase === 'player_turn' ? 'カードをドロー' : '自分のターンにドロー可能です'}
                        id="card-deck-interaction-standard"
                      >
                        <img 
                          src="/dateA/card.png" 
                          alt="Player Card Pile" 
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Bottom Center: Player cards slot with slash click triggers */}
                <div className="flex flex-col items-center justify-center px-4 w-full h-full relative" id="player-cards-vault">
                  <span className="text-[10px] md:text-xs font-mono font-bold tracking-widest text-amber-500/50 uppercase mb-2">My Card Slot</span>
                  
                  {playerHand.length === 0 ? (
                    <div className="w-full h-28 md:h-34 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-zinc-600 text-xs font-mono select-none bg-black/10">
                      (No Cards)
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2.5 max-w-full">
                      {playerHand.map((card, i) => (
                        <div
                          key={card.id}
                          onClick={() => {
                            if (isTargetingSlash) {
                              handleCardClickForSlash(card, true);
                            }
                          }}
                          className={(isTargetingSlash && !card.isHalved) ? 'cursor-pointer hover:ring-4 hover:ring-emerald-400 rounded-xl transition-all hover:scale-105 active:scale-95' : ''}
                          title={isTargetingSlash ? '未来永劫斬でこのカードを切断する' : ''}
                        >
                          <CardItem card={card} index={i} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Bottom Right: Player Character portrait and speech */}
                <div className="flex justify-end">
                  <CharacterFrame isDealer={false} dialogue={playerDialogue} selectedCharId={selectedCharId || undefined} difficulty={difficulty} />
                </div>

              </section>

              {/* ACTION HUD SEGMENT OR ABILITIES SELECTION PANELS */}
              <section className="flex justify-center items-center gap-4 py-4 bg-black/30 border-t border-amber-600/20 mt-2 rounded-xl" id="action-control-panel">

                {/* 1. Normal Turn decisions HUD */}
                {phase === 'player_turn' && !showAbilitiesPanel && !isTargetingSlash && (
                  <div className="flex flex-wrap justify-center gap-4 w-full max-w-md px-4">
                    {/* Hit Button */}
                    <button
                      onClick={handlePlayerDraw}
                      disabled={isDealingInProgress || lastOutcome !== null || calculateScore(playerHand) > 21 || isMasterSparkPreparing}
                      className="flex-1 min-w-[110px] px-6 py-3 bg-slate-700 hover:bg-slate-650 rounded-full text-sm font-bold border border-white/10 active:scale-95 transition-all cursor-pointer text-white"
                      id="draw-action-button"
                    >
                      ドロー
                    </button>

                    {/* Special Ability Button */}
                    {selectedCharId && (
                      <button
                        onClick={() => setShowAbilitiesPanel(true)}
                        disabled={isDealingInProgress || lastOutcome !== null || calculateScore(playerHand) > 21 || isMasterSparkPreparing}
                        className="flex-1 min-w-[110px] px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-black rounded-full shadow-lg border border-amber-600 shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
                        id="open-abilities-btn"
                      >
                        特殊能力
                      </button>
                    )}

                    {/* Stand Button */}
                    <button
                      onClick={handlePlayerStand}
                      disabled={isDealingInProgress || lastOutcome !== null || calculateScore(playerHand) > 21 || isMasterSparkPreparing}
                      className="flex-1 min-w-[110px] px-6 py-3 bg-slate-700 hover:bg-slate-650 rounded-full text-sm font-bold border border-white/10 active:scale-95 transition-all cursor-pointer text-white"
                      id="stand-action-button"
                    >
                      スタンド
                    </button>
                  </div>
                )}

                {/* 2. Slashed targeting mode instructions */}
                {phase === 'player_turn' && isTargetingSlash && (
                  <div className="flex flex-col items-center gap-2 bg-emerald-950/20 border-2 border-emerald-500/40 p-4 rounded-xl max-w-md w-full mx-4 shadow-xl text-center">
                    <p className="text-sm font-bold text-emerald-300 animate-pulse flex items-center gap-1.5">
                      <span>⚔️</span>
                      <span>人鬼「未来永劫斬」発動中！</span>
                    </p>
                    <p className="text-[10.5px] text-zinc-300">
                      場にある自分か相手のいずれかのカードをクリックすると、数値を半分（端数切捨て）にします。
                    </p>
                    <button
                      onClick={() => {
                        setIsTargetingSlash(false);
                        setShowAbilitiesPanel(true);
                      }}
                      className="mt-1 px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 cursor-pointer"
                    >
                      キャンセル
                    </button>
                  </div>
                )}

                {/* 3. Special Abilities Drawer menu list */}
                {phase === 'player_turn' && showAbilitiesPanel && selectedCharId && (
                  <div className="flex flex-col items-center gap-3 bg-black/60 border border-amber-500/50 p-4 rounded-xl max-w-md w-full mx-4 shadow-2xl relative" id="abilities-panel">
                    <div className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-1 flex items-center gap-1.5">
                      <span>✨</span>
                      <span>発動可能スペルカード一覧</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 w-full">
                      {TOUHOU_CHARACTERS[selectedCharId].abilities.map((ability) => {
                        let isUsable = true;
                        let disabledReason = '';

                        if (ability.codename === 'osaisen') {
                          if (skillsUsedThisRound.osaisen) {
                            isUsable = false;
                            disabledReason = '（この対戦中既に使用済み）';
                          }
                        } else if (ability.codename === 'borrow') {
                          if (skillsUsedThisRound.borrow) {
                            isUsable = false;
                            disabledReason = '（この対戦中既に使用済み）';
                          } else if (!dealerHand.some(c => c.isFaceUp)) {
                            isUsable = false;
                            disabledReason = '（相手の場に開示（公開）されたカードがありません）';
                          }
                        } else if (ability.codename === 'master_spark') {
                          if (isMasterSparkUsedGlobally) {
                            isUsable = false;
                            disabledReason = '（この対戦中既に使用済み）';
                          }
                        } else if (ability.codename === 'slash') {
                          if (slashUseCount <= 0) {
                            isUsable = false;
                            disabledReason = '（この対戦中の残り回数 0回）';
                          }
                        } else if (ability.codename === 'phantom_eye') {
                          if (skillsUsedThisRound.phantom_eye) {
                            isUsable = false;
                            disabledReason = '（この対戦中既に使用済み）';
                          } else if (activePhantomEye) {
                            isUsable = false;
                            disabledReason = '（既に霊視透過が有効です）';
                          }
                        } else if (ability.codename === 'musou' || ability.codename === 'miracle' || ability.codename === 'protection') {
                          isUsable = false;
                          disabledReason = '（ピンチ/状況発生時に自動発動）';
                        }


                        return (
                          <button
                            key={ability.codename}
                            disabled={!isUsable || isDealingInProgress || lastOutcome !== null || calculateScore(playerHand) > 21}
                            onClick={() => {
                              if (ability.codename === 'osaisen') {
                                setOsaisenActive(true);
                                setSkillsUsedThisRound(prev => ({ ...prev, osaisen: true }));
                                playSe('/SE/お金を落とす2.mp3');
                                if (selectedCharId === 'reimu') {
                                  setPlayerDialogue(getRandomReimuDialogue('osaisen'));
                                } else {
                                  setPlayerDialogue('博麗神社の霊験あらたかなお賽銭箱よ！相手の賭け金だけを2倍にするわ！');
                                }
                                setDealerDialogue(
                                  difficulty === 'easy'
                                    ? getRandomCirnoQuote('osaisenSkill')
                                    : difficulty === 'normal'
                                    ? getRandomSakuyaQuote('reimuOsaisen')
                                    : difficulty === 'hard'
                                    ? getRandomRemiliaQuote('reimuOsaisen')
                                    : difficulty === 'lunatic'
                                    ? getRandomFlandreQuote('reimuOsaisen')
                                    : 'な、何だってぇ！？お賽銭を要求されて、今回の私の支払額（賭け金）だけが2倍に増えてしまったのか！？'
                                );
                                setGameMessage('お賽銭の要求が発動！今回の対戦において、相手の賭け金（損失額）だけが2倍になります！');
                                setShowAbilitiesPanel(false);
                              } else if (ability.codename === 'borrow') {
                                const dHand = [...dealerHand];
                                let targetIdx = -1;
                                for (let i = dHand.length - 1; i >= 0; i--) {
                                  if (dHand[i].isFaceUp) {
                                    targetIdx = i;
                                    break;
                                  }
                                }
                                if (targetIdx !== -1) {
                                  setIsDealingInProgress(true);
                                  // 1. First sound when removing opponent's card
                                  playSe('/SE/カードをめくる.mp3');
                                  const borrowedCard = dHand.splice(targetIdx, 1)[0];
                                  borrowedCard.isFaceUp = true;
                                  setDealerHand(dHand);

                                  setTimeout(async () => {
                                    // 2. Second sound when adding to player's hand
                                    playSe('/SE/カードをめくる.mp3');
                                    const pHand = [...playerHand, borrowedCard];
                                    setPlayerHand(pHand);
                                    setSkillsUsedThisRound(prev => ({ ...prev, borrow: true }));
                                    if (selectedCharId === 'marisa') {
                                      setPlayerDialogue(getRandomMarisaDialogue('borrowSkill'));
                                    } else {
                                      setPlayerDialogue('その最後にオープンしたカード、ちょっとの間（一生）借りていくぜ！');
                                    }
                                    setDealerDialogue(
                                      difficulty === 'easy'
                                        ? getRandomCirnoQuote('borrowSkill')
                                        : difficulty === 'normal'
                                        ? getRandomSakuyaQuote('marisaBorrow')
                                        : difficulty === 'hard'
                                        ? getRandomRemiliaQuote('marisaBorrow')
                                        : difficulty === 'lunatic'
                                        ? getRandomFlandreQuote('marisaBorrow')
                                        : 'おい！一番新しく開示された私のカードを奪い取ったな！'
                                    );
                                    const nextScore = calculateScore(pHand);
                                    setGameMessage('一生借りるだけ発動！相手の最新公開カードをお借りしました（2秒間操作不能）…');

                                    // Wait 2 seconds before proceeding so that the user can read the situation
                                    await new Promise(r => setTimeout(r, 2000));
                                    setIsDealingInProgress(false);

                                    if (nextScore > 21) {
                                      executeLossPayoutAndTransition('bust', pHand, dHand);
                                    } else {
                                      setGameMessage('一生借りるだけにより、自分のターンを終了します。');
                                      handlePlayerStandWithHand(pHand, deck);
                                    }
                                  }, 250);
                                } else {
                                  setGameMessage('開示されている相手のカードがありません。');
                                }
                                setShowAbilitiesPanel(false);
                              } else if (ability.codename === 'master_spark') {
                                setSkillsUsedThisRound(prev => ({ ...prev, master_spark: true }));
                                if (selectedCharId === 'marisa') {
                                  setPlayerDialogue(getRandomMarisaDialogue('masterSparkSkill'));
                               } else {
                                  setPlayerDialogue('これでも喰らいなさい！恋符「マスタースパーク」！！！');
                               }
                                setDealerDialogue(
                                  difficulty === 'easy'
                                    ? getRandomCirnoQuote('masterSparkSkill')
                                    : difficulty === 'normal'
                                    ? getRandomSakuyaQuote('marisaMasterSpark')
                                    : difficulty === 'hard'
                                    ? getRandomRemiliaQuote('marisaMasterSpark')
                                    : difficulty === 'lunatic'
                                    ? getRandomFlandreQuote('marisaMasterSpark')
                                    : 'あわぁ！？視界全体が熱い光に溶けていく...！'
                                );
                                playSe('/SE/ビーム砲2.mp3');
                                setShowMasterSparkBeam(true);
                                setShowAbilitiesPanel(false);
                                setTimeout(async () => {
                                  setShowMasterSparkBeam(false);
                                  setPlayerHand([]);
                                  setDealerHand([]);
                                  await handleConfirmBet();
                                }, 1300);
                              } else if (ability.codename === 'slash') {
                                setIsTargetingSlash(true);
                                setShowAbilitiesPanel(false);
                                setGameMessage('未来永劫斬が起動！画面内のハーフに切削したいカードをクリックしてください。');
                                if (selectedCharId === 'youmu') {
                                  setPlayerDialogue(getRandomYoumuDialogue('slash'));
                                } else {
                                  setPlayerDialogue('一刀両断！対象を選び、数値を半分に切り裂いてみせます！');
                                }
                              } else if (ability.codename === 'phantom_eye') {
                                setActivePhantomEye(true);
                                setSkillsUsedThisRound(prev => ({ ...prev, phantom_eye: true }));
                                playSe('/SE/決定ボタンを押す33.mp3');
                                if (selectedCharId === 'youmu') {
                                  setPlayerDialogue(getRandomYoumuDialogue('phantom_eye'));
                                } else {
                                  setPlayerDialogue('霊力を極限まで高めて、山札の気配を感じ取ります！');
                                }
                                setDealerDialogue(
                                  difficulty === 'easy'
                                    ? getRandomCirnoQuote('phantomEyeSkill')
                                    : difficulty === 'normal'
                                    ? getRandomSakuyaQuote('youmuPhantomEye')
                                    : difficulty === 'hard'
                                    ? getRandomRemiliaQuote('youmuPhantomEye')
                                    : difficulty === 'lunatic'
                                    ? getRandomFlandreQuote('youmuPhantomEye')
                                    : '何か不気味な気配がするな...山札を覗き見しているのか？'
                                );
                                setGameMessage('半人半霊の目発動！山札の一番上が透過表示されました。');
                                setShowAbilitiesPanel(false);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border flex flex-col text-xs transition-all select-none ${
                              isUsable
                                ? 'bg-amber-950/10 hover:bg-amber-950/30 border-amber-500/30 hover:border-amber-500 text-amber-200 cursor-pointer hover:scale-[1.01]'
                                : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <span className="font-bold flex justify-between w-full">
                              <span>【{ability.name}】</span>
                              {!isUsable && <span className="text-[9.5px] text-zinc-500 font-medium">{disabledReason}</span>}
                              {isUsable && ability.codename === 'slash' && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold font-mono leading-none">
                                  残り {slashUseCount}回
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-1 leading-normal font-sans">
                              {ability.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setShowAbilitiesPanel(false)}
                      className="w-full mt-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-zinc-350 font-bold text-xs cursor-pointer transition-colors"
                    >
                      戻る
                    </button>
                  </div>
                )}


              </section>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer 
        className={`${
          phase === 'title' 
            ? 'absolute bottom-3 left-0 right-0 text-center z-35 pb-1 text-zinc-400 font-bold border-t-0 pointer-events-none' 
            : 'text-center text-zinc-650 mt-3 py-1 border-t border-zinc-900/60'
        } text-[10px] font-mono tracking-wide max-w-7xl mx-auto w-full`} 
        id="game-footer"
      >
        Blackjack Casino Classic &copy; {new Date().getFullYear()} &middot; Touhou Edition for AI Studio
      </footer>

      {/* ========================================================= */}
      {/* ==================== POPUP OVERLAYS ==================== */}
      {/* ========================================================= */}

      {/* Z. CREDITS POPUP */}
      <AnimatePresence>
        {showCredits && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm shadow-2xl" id="credits-popup-overlay">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl flex flex-col relative max-h-[85vh]"
              id="credits-popup-box"
            >
              {/* Decorative suits */}
              <div className="absolute top-3 left-3 text-amber-500/10 text-xl font-serif">♣</div>
              <div className="absolute top-3 right-3 text-amber-500/10 text-xl font-serif">♠</div>

              <h3 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 font-serif text-center mb-6 drop-shadow-md">
                クレジット
              </h3>

              {/* Scrollable container inside the card */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-zinc-350 text-xs md:text-sm scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                
                {/* AI / MidJourney and Google AI Studio */}
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850 flex flex-col gap-1 shadow-inner">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-black">AI & Graphics</span>
                  <p className="font-bold text-zinc-100">AI使用:MidJourney Google AI Studio</p>
                </div>

                {/* BGM Info Section - beautifully preserved columns under 'font-mono' using whitespaces and pre-wrap */}
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 shadow-inner">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-black mb-2 block">BGM Works</span>
                  <div className="font-mono text-[11px] md:text-xs leading-relaxed whitespace-pre overflow-x-auto text-zinc-250 select-text pb-1">
                    BGM:タイトル 紅の予感 / 赤より紅い夢 とんち様<br />
                    {"    "}かんたん Aozora Cider / おてんば恋娘 nori様<br />
                    {"    "}ふつう evening primrose / フラワリングナイト えるでぃ様<br />
                    {"    "}むずかしい 亡き王女の為のセプテット アレンジ masa@chilly様<br />
                    {"    "}ルナティック Broken Diamond / U.N.オーエンは彼女なのか？ alphaRomeo323様
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowCredits(false)}
                className="mt-6 w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black tracking-widest text-sm shadow-md transition-all active:scale-97 cursor-pointer text-center"
                id="credits-close-button"
              >
                閉じる
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* A. DIFFICULTY SELECTION POPUP */}
      <AnimatePresence>
        {showDifficultyPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm" id="difficulty-popup-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-6 md:p-8 max-w-6xl w-full text-center shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col items-center"
              id="difficulty-popup-box"
            >
              {/* Gold borders corners decor */}
              <div className="absolute top-3 left-3 text-amber-500/30 text-xl font-serif select-none">♠</div>
              <div className="absolute top-3 right-3 text-amber-500/30 text-xl font-serif select-none">♥</div>
              <div className="absolute bottom-3 left-3 text-amber-500/30 text-xl font-serif select-none">♦</div>
              <div className="absolute bottom-3 right-3 text-amber-500/30 text-xl font-serif select-none">♣</div>

              {/* Title Header */}
              <div className="space-y-2 mb-6">
                <h3 className="text-2xl md:text-3xl font-black tracking-widest font-serif text-amber-400">
                  難易度と対戦相手を選択してください
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                  対戦相手（ディーラー）は難易度ごとに異なる強力な特殊能力を持っています。<br/>
                  <span className="text-amber-500 font-bold">※チップの所持金は全員 15枚の均等勝負（固定）です。</span>
                </p>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                {[
                  {
                    id: 'easy' as Difficulty,
                    name: 'チルノ',
                    role: 'STAGE 1 かんたん',
                    img: 'dateA/tiruno.png',
                    chips: '15枚 vs 15枚',
                    border: 'border-sky-500/30 focus:ring-sky-500',
                    colorClass: 'text-sky-300',
                    badge: 'bg-gradient-to-r from-sky-600 to-blue-500 text-white',
                    abilities: [
                      { name: '算数教室', desc: '難しい計算はあまり得意ではありません' },
                      { name: '凍符「パーフェクトフリーズ」', desc: '2枚目に引くカードを特別な9に変えます。' }
                    ]
                  },
                  {
                    id: 'normal' as Difficulty,
                    name: '十六夜 咲夜',
                    role: 'STAGE 2 ふつう',
                    img: 'dateA/sakuya.jpg',
                    chips: '15枚 vs 15枚',
                    border: 'border-amber-500/30 focus:ring-amber-500',
                    colorClass: 'text-amber-300',
                    badge: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-amber-950',
                    abilities: [
                      { name: '完璧な給仕', desc: 'いざという時、良いカードが来るように山札を調整します。' },
                      { name: '幻符「殺人ドール」', desc: 'あなたが強いカードを引いた時、そのカードを封印します。' }
                    ]
                  },
                  {
                    id: 'hard' as Difficulty,
                    name: 'レミリア・スカーレット',
                    role: 'STAGE 3 むずかしい',
                    img: 'dateA/remiria.png',
                    chips: '15枚 vs 15枚',
                    border: 'border-rose-500/30 focus:ring-rose-500',
                    colorClass: 'text-rose-350',
                    badge: 'bg-gradient-to-r from-rose-700 to-red-600 text-white',
                    abilities: [
                      { name: '領主の特権', desc: '彼女の手札は全て伏せられ、勝負の時まで結果が見えません。' },
                      { name: '運命「ミゼラブルフェイト」', desc: '運命を操作して勝ちを引き寄せます' }
                    ]
                  },
                  {
                    id: 'lunatic' as Difficulty,
                    name: 'フランドール・スカーレット',
                    role: 'STAGE 4 ルナティック',
                    img: 'dateA/furan.jpg',
                    chips: '15枚 vs 15枚',
                    border: 'border-purple-500/30 focus:ring-purple-500',
                    colorClass: 'text-purple-300',
                    badge: 'bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white',
                    abilities: [
                      { name: 'きゅっとしてドカーン', desc: 'フランはバーストしません。' },
                      { name: '禁忌「フォーオブアカインド」', desc: '4枚引いてその中から一番良い組み合わせで勝負します。' }
                    ]
                  }
                ].map((diff) => {
                  const isLocked = (() => {
                    if (diff.id === 'easy') return false;
                    if (diff.id === 'normal') return !isStage1Cleared;
                    if (diff.id === 'hard') return !isStage2Cleared;
                    if (diff.id === 'lunatic') return !isStage3Cleared;
                    return false;
                  })();

                  const previousStageName = (() => {
                    if (diff.id === 'normal') return 'STAGE 1';
                    if (diff.id === 'hard') return 'STAGE 2';
                    if (diff.id === 'lunatic') return 'STAGE 3';
                    return '';
                  })();

                  return (
                    <div 
                      key={diff.id}
                      className={`relative flex flex-col justify-between items-center p-4 rounded-2xl bg-zinc-950/60 border ${isLocked ? 'border-zinc-850' : diff.border} transition-all duration-300 ${!isLocked ? 'hover:scale-102 hover:bg-zinc-950/90' : ''}`}
                    >
                      {/* Locked Overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 rounded-2xl">
                          <span className="text-4xl animate-bounce">🔒</span>
                          <span className="text-[10px] font-black text-rose-500 tracking-widest mt-2 uppercase">STAGE LOCKED</span>
                          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed px-2">
                            {previousStageName}をクリアすると解放されます。
                          </p>
                        </div>
                      )}

                      <div className="w-full flex flex-col">
                        {/* Header Badges */}
                        <div className="flex justify-between items-center w-full mb-2.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-wide ${diff.badge}`}>
                            {diff.role}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-zinc-500">
                            初期チップ: {diff.chips}
                          </span>
                        </div>

                        {/* Portrait */}
                        <div className="relative w-full h-40 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-850 flex items-center justify-center mb-3">
                          <img 
                            src={diff.img.startsWith('/') ? diff.img : `/${diff.img}`} 
                            alt={isLocked ? '？？？' : diff.name} 
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-top transition-all duration-500 ${isLocked ? 'blur-xl scale-120 grayscale brightness-40 contrast-125 select-none pointer-events-none' : ''}`}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/50 to-transparent p-1.5 pt-4 text-center">
                            <span className="text-xs font-black text-white">{isLocked ? '？？？' : diff.name}</span>
                          </div>
                        </div>

                        {/* Ability Cards */}
                        <div className="w-full text-left space-y-2 mb-4 bg-black/45 p-2 rounded-lg border border-zinc-900/60">
                          {diff.abilities.map((ab, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className={`text-[10px] font-black ${isLocked ? 'text-zinc-650' : diff.colorClass} block`}>
                                {isLocked ? '？？？' : ab.name}
                              </span>
                              <p className="text-[9.5px] text-zinc-400 leading-normal font-medium">
                                {isLocked ? '（前のSTAGEクリア後に解放されます）' : ab.desc}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Select Action Button */}
                      <button
                        onClick={() => handleSelectDifficulty(diff.id)}
                        disabled={isLocked}
                        className={`w-full py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-200 cursor-pointer ${
                          isLocked ? 'bg-zinc-950/20 text-zinc-600 border border-zinc-900 cursor-not-allowed' :
                          diff.id === 'easy' ? 'bg-sky-950/50 hover:bg-sky-500 hover:text-black border border-sky-450/40 text-sky-300' :
                          diff.id === 'normal' ? 'bg-amber-950/50 hover:bg-amber-500 hover:text-black border border-amber-450/40 text-amber-300' :
                          diff.id === 'hard' ? 'bg-rose-950/50 hover:bg-rose-500 hover:text-black border border-rose-450/30 text-rose-350' :
                          'bg-purple-950/50 hover:bg-purple-500 hover:text-black border border-purple-450/30 text-purple-300'
                        }`}
                      >
                        {isLocked ? 'ロック中' : 'このSTAGEで勝負！'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowDifficultyPopup(false)}
                className="mt-6 text-xs py-2 px-6 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 transition-all cursor-pointer font-bold leading-none"
                id="difficulty-close-btn"
              >
                キャンセル
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. CHIP BETTING OVERLAY POPUP */}
      <AnimatePresence>
        {phase === 'betting' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="betting-popup-overlay">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-zinc-900 border border-amber-500 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl space-y-6"
              id="betting-popup-box"
            >
              <div className="flex flex-col items-center gap-1">
                <Coins className="w-10 h-10 text-amber-400 animate-pulse" />
                <h3 className="text-xl font-extrabold tracking-widest text-amber-400 font-serif mt-2">
                  チップベット選択
                </h3>
                <p className="text-xs text-zinc-400 leading-normal max-w-xs">
                  "賭けるチップ数を決めてください。"
                </p>
                <div className="text-[10px] text-teal-400 bg-teal-950/40 border border-teal-500/20 rounded-full px-3 py-1 mt-1 font-semibold">
                  所持金: {playerCoins}枚 &middot; 相手: {dealerCoins}枚
                </div>
              </div>

              {/* Betting controller UI */}
              <div className="flex items-center justify-center gap-6 py-2" id="betting-calculator-row">
                <button
                  onClick={handleDecreaseBet}
                  disabled={tempBet <= minBet}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl font-black font-mono transition-all select-none ${
                    tempBet <= minBet
                      ? 'border-zinc-800 text-zinc-700 bg-zinc-950 opacity-40 cursor-default'
                      : 'border-zinc-650 text-zinc-200 bg-zinc-805 hover:bg-zinc-700 active:scale-90 cursor-pointer'
                  }`}
                  title="減少 (-)"
                  id="bet-decrement"
                >
                  -
                </button>

                <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-dashed border-amber-500/30 bg-radial from-amber-600/10 to-transparent shadow-inner">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-semibold tracking-wider text-amber-500/60 uppercase">Chips</span>
                    <span className="text-4xl font-black text-amber-400 font-mono tracking-tighter" id="betting-current-value">
                      {tempBet}
                    </span>
                  </div>
                  <Shield className="w-4 h-4 text-amber-500/20 absolute -top-1" />
                </div>

                <button
                  onClick={handleIncreaseBet}
                  disabled={tempBet >= maxBet}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl font-black font-mono transition-all select-none ${
                    tempBet >= maxBet
                      ? 'border-zinc-800 text-zinc-700 bg-zinc-950 opacity-40 cursor-default'
                      : 'border-zinc-650 text-zinc-200 bg-zinc-805 hover:bg-zinc-700 active:scale-90 cursor-pointer'
                  }`}
                  title="増加 (+)"
                  id="bet-increment"
                >
                  +
                </button>
              </div>

              {/* Rule Constraint notice */}
              <div className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 leading-relaxed text-center" id="betting-rules-card">
                {playerCoins >= 2 ? (
                  <span className="text-amber-500/80 font-bold block mb-0.5">※最低ベット枚数は 2枚 です。</span>
                ) : (
                  <span className="text-teal-400 font-bold block mb-0.5">※残りチップが1枚のため 1枚 を強制ベットします。</span>
                )}
                <span>双方の所持チップ内で、最大 <span className="text-white font-bold">{maxBet}枚 (最大10枚制限)</span> まで賭けられます。</span>
              </div>

              <button
                onClick={handleConfirmBet}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-extrabold tracking-widest text-sm shadow-lg hover:shadow-amber-500/10 transition-all active:scale-98 cursor-pointer border border-amber-600"
                id="bet-confirm-button"
              >
                ベットして配る
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. GAME OVER SCREEN */}
      <AnimatePresence>
        {phase === 'game_over' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-lg" id="game-over-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-6 md:p-8 max-w-4xl w-full text-center shadow-2xl space-y-6"
              id="game-over-panel"
            >
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">対戦最終結果</p>
                <h2 className={`text-4xl font-black font-serif tracking-widest mt-1 uppercase ${playerCoins <= 0 ? 'text-rose-500 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'text-teal-405'}`}>
                  {playerCoins <= 0 ? 'Game Over... You Lose' : 'VICTORY! YOU WIN!'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  {playerCoins <= 0 
                    ? '残念ながらあなたのチップが尽きてしまいました。相手の勝利です。' 
                    : 'おめでとうございます！相手のチップをすべて奪い、完全制覇を果たしました！'}
                </p>
              </div>

              {/* Main Duel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* PLAYER */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="absolute top-2 left-2">
                    {playerCoins > 0 ? (
                      <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">🏆 WINNER</span>
                    ) : (
                      <span className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">💀 DEFEATED</span>
                    )}
                  </div>

                  <div className="mt-6 mb-2">
                    <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">PLAYER</p>
                    <h4 className="text-lg font-bold text-cyan-400">
                      {selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].japaneseName : 'あなた'}
                    </h4>
                  </div>

                  {/* Character Frame / Standing picture */}
                  <div className="w-28 h-32 md:w-34 md:h-38 rounded-xl overflow-hidden border border-zinc-800 relative bg-slate-950 flex items-center justify-center">
                    {selectedCharId ? (
                      <>
                        <img 
                          src={`/${TOUHOU_CHARACTERS[selectedCharId].imageUrl}`}
                          alt={TOUHOU_CHARACTERS[selectedCharId].japaneseName}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10" />
                      </>
                    ) : (
                      <span className="text-xs text-zinc-650 font-mono">No Image</span>
                    )}
                  </div>

                  {/* Speech Bubble (吹き出し) */}
                  <div className="w-full mt-3 relative min-h-[56px] flex items-center justify-center">
                    <div className="w-full bg-white text-slate-900 text-xs font-semibold p-3.5 rounded-xl shadow-md border border-zinc-300 text-center relative leading-relaxed">
                      {playerCoins <= 0 
                        ? (selectedCharId === 'reimu' ? getRandomReimuDialogue('gameDefeat') : selectedCharId === 'marisa' ? getRandomMarisaDialogue('gameDefeat') : selectedCharId === 'youmu' ? getRandomYoumuDialogue('gameDefeat') : selectedCharId === 'sanae' ? getRandomSanaeDialogue('gameDefeat') : selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].dialogues.defeat : '負けちゃった…修行が足りなかったかしら。')
                        : (selectedCharId === 'reimu' ? getRandomReimuDialogue('gameVictory') : selectedCharId === 'marisa' ? getRandomMarisaDialogue('gameVictory') : selectedCharId === 'youmu' ? getRandomYoumuDialogue('gameVictory') : selectedCharId === 'sanae' ? getRandomSanaeDialogue('gameVictory') : '当然の結果ね。博麗神社か、私たちの力を見直すのね！')
                      }
                      {/* Speech bubble peak tail */}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white font-sans"></div>
                    </div>
                  </div>
                </div>

                {/* DEALER */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    {dealerCoins > 0 ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">🏆 WINNER</span>
                    ) : (
                      <span className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">💀 DEFEATED</span>
                    )}
                  </div>

                  <div className="mt-6 mb-2">
                    <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">DEALER</p>
                    <h4 className={`text-lg font-bold ${DEALER_INFO[difficulty].colorClass}`}>
                      {DEALER_INFO[difficulty].name}
                    </h4>
                  </div>

                  {/* Character Frame / Standing picture */}
                  <div className="w-28 h-32 md:w-34 md:h-38 rounded-xl overflow-hidden border border-zinc-800 relative bg-slate-950 flex items-center justify-center">
                    <img 
                      src={`/${DEALER_INFO[difficulty].imageUrl}`}
                      alt={DEALER_INFO[difficulty].name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10" />
                  </div>

                  {/* Speech Bubble (吹き出し) */}
                  <div className="w-full mt-3 relative min-h-[56px] flex items-center justify-center">
                    <div className="w-full bg-white text-slate-900 text-xs font-semibold p-3.5 rounded-xl shadow-md border border-zinc-300 text-center relative leading-relaxed">
                      {playerCoins <= 0 
                        ? (
                          difficulty === 'easy' ? getRandomCirnoQuote('gameVictory') :
                          difficulty === 'normal' ? getRandomSakuyaQuote('gameVictory') :
                          difficulty === 'hard' ? getRandomRemiliaQuote('gameVictory') :
                          difficulty === 'lunatic' ? getRandomFlandreQuote('gameVictory') :
                          "遊んでくれてありがとう！またきゅっとして壊してあげるね！あはは！"
                        )
                        : (
                          difficulty === 'easy' ? getRandomCirnoQuote('gameDefeat') :
                          difficulty === 'normal' ? getRandomSakuyaQuote('roundDefeat') :
                          difficulty === 'hard' ? getRandomRemiliaQuote('gameDefeat') :
                          difficulty === 'lunatic' ? getRandomFlandreQuote('gameDefeat') :
                          "負けちゃった！でもすっごく楽しかった！また遊んでね！"
                        )
                      }
                      {/* Speech bubble peak tail */}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white font-sans"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* End status coin results card */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-around items-center font-mono max-w-lg mx-auto w-full text-xs">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">最終チップ数</p>
                  <p className="text-base font-bold text-cyan-400 mt-1">{selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].japaneseName : 'あなた'}: {playerCoins}枚</p>
                </div>
                <div className="h-8 w-[1px] bg-zinc-800" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">相手チップ数</p>
                  <p className={`text-base font-bold mt-1 ${DEALER_INFO[difficulty].colorClass}`}>{DEALER_INFO[difficulty].name}: {dealerCoins}枚</p>
                </div>
              </div>

              <div className="max-w-md mx-auto w-full pt-2">
                <button
                  onClick={handleResetToTitle}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-zinc-950 font-black tracking-widest text-sm shadow-xl active:scale-[0.98] transition-all duration-200 border border-amber-600 cursor-pointer uppercase font-sans flex items-center justify-center gap-2"
                  id="game-over-return-button"
                >
                  <RefreshCw className="w-4 h-4" />
                  タイトルに戻る
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Round Results Full Overlay Modal */}
      <AnimatePresence>
        {phase === 'round_end' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-zinc-950/85 backdrop-blur-md" id="round-end-overlay-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-4 md:p-7 max-w-4xl w-full shadow-2xl flex flex-col space-y-4 md:space-y-6 max-h-[96vh] overflow-y-auto"
              id="round-end-results-card"
            >
              {/* Header */}
              <div className="text-center">
                <p className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-mono">第 {roundCount} ラウンド 完了</p>
                <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-serif tracking-widest mt-1">ROUND RESULTS REPORT</h3>
              </div>

              {/* Main Duel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                
                {/* 1. Player Column */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="absolute top-2 left-2">
                    {(lastOutcome === 'player_win' || lastOutcome === 'player_blackjack') ? (
                      <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">👑 VICTORY</span>
                    ) : lastOutcome === 'draw' ? (
                      <span className="bg-zinc-500/25 text-zinc-300 border border-zinc-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">⚖️ DRAW</span>
                    ) : (
                      <span className="bg-rose-500/25 text-rose-300 border border-rose-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">💀 DEFEAT</span>
                    )}
                  </div>

                  <div className="mt-6 mb-2">
                    <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">PLAYER</p>
                    <h4 className="text-lg font-bold text-cyan-400">
                      {selectedCharId ? TOUHOU_CHARACTERS[selectedCharId].japaneseName : 'あなた'}
                    </h4>
                  </div>

                  {/* Picture */}
                  <div className="w-24 h-28 md:w-32 md:h-36 rounded-xl overflow-hidden border border-zinc-800 relative bg-slate-950 flex items-center justify-center">
                    {selectedCharId ? (
                      <>
                        <img 
                          src={`/${TOUHOU_CHARACTERS[selectedCharId].imageUrl}`}
                          alt={TOUHOU_CHARACTERS[selectedCharId].japaneseName}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10" />
                      </>
                    ) : (
                      <span className="text-xs text-zinc-650 font-mono">No Image</span>
                    )}
                  </div>

                  {/* Speech bubble */}
                  <div className="w-full mt-3 relative min-h-[56px] flex items-center justify-center">
                    <div className="w-full bg-white text-slate-900 text-xs font-semibold p-3.5 rounded-xl shadow-md border border-zinc-300 text-center relative leading-relaxed">
                      {playerDialogue || '私の勝ちのようね。'}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
                    </div>
                  </div>
                </div>

                {/* 2. Opponent Column */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    {(lastOutcome === 'dealer_win' || lastOutcome === 'dealer_blackjack') ? (
                      <span className="bg-rose-500/25 text-rose-300 border border-rose-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">👑 VICTORY</span>
                    ) : lastOutcome === 'draw' ? (
                      <span className="bg-zinc-500/25 text-zinc-300 border border-zinc-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">⚖️ DRAW</span>
                    ) : (
                      <span className="bg-teal-500/25 text-teal-300 border border-teal-500/40 py-1 px-2.5 rounded-full text-[10px] font-black tracking-widest">💀 DEFEAT</span>
                    )}
                  </div>

                  <div className="mt-6 mb-2">
                    <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest font-bold">DEALER ({difficulty === 'easy' ? 'STAGE 1 かんたん' : difficulty === 'normal' ? 'STAGE 2 ふつう' : difficulty === 'hard' ? 'STAGE 3 むずかしい' : 'STAGE 4 ルナティック'})</p>
                    <h4 className={`text-lg font-bold ${DEALER_INFO[difficulty].colorClass}`}>
                      {DEALER_INFO[difficulty].name}
                    </h4>
                  </div>

                  {/* Picture */}
                  <div className="w-24 h-28 md:w-32 md:h-36 rounded-xl overflow-hidden border border-zinc-800 relative bg-slate-950 flex items-center justify-center">
                    <img 
                      src={`/${DEALER_INFO[difficulty].imageUrl}`}
                      alt={DEALER_INFO[difficulty].name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-100 select-none pointer-events-none"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10" />
                  </div>

                  {/* Speech bubble */}
                  <div className="w-full mt-3 relative min-h-[56px] flex items-center justify-center">
                    <div className="w-full bg-white text-slate-900 text-xs font-semibold p-3.5 rounded-xl shadow-md border border-zinc-300 text-center relative leading-relaxed">
                      {dealerDialogue || 'やるわね、でも次こそ全力よ！'}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Stats / coins list */}
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl grid grid-cols-2 gap-4 text-center font-mono text-xs max-w-lg mx-auto w-full">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">プレイヤー チップ数</p>
                  <p className="text-base font-bold text-cyan-400 mt-1 flex justify-center items-baseline gap-1">
                    <span>{playerCoins}枚</span>
                    {coinChangePlayer && (
                      <span className={`text-xs ml-1 ${coinChangePlayer.startsWith('+') ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}`}>
                        ({coinChangePlayer})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">相手 チップ数</p>
                  <p className="text-base font-bold text-red-400 mt-1 flex justify-center items-baseline gap-1">
                    <span>{dealerCoins}枚</span>
                    {coinChangeDealer && (
                      <span className={`text-xs ml-1 ${coinChangeDealer.startsWith('+') ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}`}>
                        ({coinChangeDealer})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2 max-w-md mx-auto w-full">
                {selectedCharId === 'reimu' && !skillsUsedThisRound.osaisen && lastOutcome === 'player_blackjack' && (
                  <button
                    onClick={handleOsaisenAtVictory}
                    className="w-full py-3.5 px-6 rounded-xl border border-red-500 bg-gradient-to-r from-red-950 to-red-900/60 hover:from-red-900/80 hover:to-red-800 text-red-200 font-black tracking-widest text-xs cursor-pointer shadow-lg transition-all animate-pulse duration-1000 flex items-center justify-center gap-2"
                  >
                    ⛩️ 博麗神社の特権！お賽銭要求（相手の賭け金を2倍に）
                  </button>
                )}

                <button
                  onClick={handleNextRound}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-zinc-950 font-black tracking-widest text-sm shadow-xl active:scale-[0.98] transition-all cursor-pointer uppercase flex items-center justify-center gap-2"
                  id="round-end-next-button"
                >
                  {playerCoins <= 0 || dealerCoins <= 0 ? 'ゲーム最終結果を表示する' : '次のラウンドへ'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPTIONS POPUP */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="options-popup-overlay">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col relative"
              id="options-popup-box"
            >
              <h3 className="text-xl font-black text-amber-400 font-serif tracking-widest text-center mb-6">サウンド設定</h3>

              <div className="space-y-6 flex-1">
                {/* BGM Volume Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1 text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      {bgmVolume === 0 ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
                      BGM 音量
                    </span>
                    <span className="font-mono text-xs">{Math.round(bgmVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={bgmVolume} 
                    onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    ※難易度毎のBGM音量を調節します
                  </p>
                </div>

                {/* SE Volume Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1 text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      {seVolume === 0 ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
                      SE (効果音) 音量
                    </span>
                    <span className="font-mono text-xs">{Math.round(seVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={seVolume} 
                    onChange={(e) => setSeVolume(parseFloat(e.target.value))}
                    onMouseUp={() => {
                      playFlipSound();
                    }}
                    onTouchEnd={() => {
                      playFlipSound();
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    ※カードめくり、チップ音の大きさを調節します（スライドを離すとプレビュー音が鳴ります）
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowOptions(false)}
                className="w-full mt-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md tracking-wider transition-all"
              >
                設定を保存して閉じる
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* ============ TOUHOU ACTIVE REACTION POPUPS ============= */}
      {/* ========================================================= */}

      {/* SPELL A: REIMU'S FANTASY HEAVEN RECOVERY */}
      <AnimatePresence>
        {showReimuMusouPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-red-500 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl space-y-6 relative"
            >
              <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Sparkles className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg md:text-xl font-black text-red-400 tracking-wider font-serif">
                  夢想転生を使用しますか？
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  霊夢の秘奥義を発動し、この勝負をなかったことにして、ベット枚数は維持したまま最初から引き直します。
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSkillsUsedThisRound(prev => ({ ...prev, musou: true }));
                    setIsMusouUsedGlobally(true);
                    setShowReimuMusouPopup(false);
                    setIsDealingInProgress(true);
                    playSe('/SE/ステータス上昇魔法2.mp3');
                    setPlayerDialogue(getRandomReimuDialogue('musouTensei'));
                    setDealerDialogue(
                      difficulty === 'easy'
                        ? getRandomCirnoQuote('reimuMusou')
                        : difficulty === 'normal'
                        ? getRandomSakuyaQuote('reimuMusou')
                        : difficulty === 'hard'
                        ? getRandomRemiliaQuote('reimuMusou')
                        : difficulty === 'lunatic'
                        ? getRandomFlandreQuote('reimuMusou')
                        : '勝負を無効化するなんて、博麗神社の巫女は勝手すぎるぞ！'
                    );
                    setGameMessage('秘奥義・夢想転生発動！勝負 of 最初から仕切り直します。');
                    
                    setTimeout(() => {
                      setPlayerHand([]);
                      setDealerHand([]);
                      setIsDealingInProgress(false);
                      setPhase('betting');
                    }, 5000);
                  }}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-500 font-bold rounded-xl text-white transition-all scale-100 active:scale-95 cursor-pointer shadow-lg text-xs"
                >
                  はい
                </button>
                <button
                  onClick={() => {
                    setShowReimuMusouPopup(false);
                    setSkillsUsedThisRound(prev => ({ ...prev, musou: true }));
                    setIsMusouUsedGlobally(true);
                    executeLossPayoutAndTransition(playerScore > 21 ? 'bust' : 'standard', playerHand, dealerHand);
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 font-semibold rounded-xl text-zinc-300 transition-all cursor-pointer text-xs"
                >
                  いいえ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SPELL B: SANAE'S MIRACLE REDRAW */}
      <AnimatePresence>
        {showSanaeMiraclePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-teal-500 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl space-y-6 relative"
            >
              <div className="w-16 h-16 bg-teal-950/40 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto text-teal-400">
                <Sparkles className="w-8 h-8 text-teal-400 rotate-12" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg md:text-xl font-black text-teal-400 tracking-wider font-serif">
                  【奇跡「ミラクルフルーツ」】を発動しますか？
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  早苗の奇跡によりバーストしたカードを山札へ戻してシャッフルし、21以下を維持するセーフカードを確定ドローします。
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowSanaeMiraclePopup(false);
                    playSe('/SE/教会の鐘1.mp3');
                    
                    const remainingHand = playerHand.filter(c => c.id !== sanaeMiracleOrigBustCard?.id);
                    setPlayerHand(remainingHand);

                    const currentDeckWithBust = [...deck];
                    if (sanaeMiracleOrigBustCard) {
                      sanaeMiracleOrigBustCard.isFaceUp = false;
                      currentDeckWithBust.push(sanaeMiracleOrigBustCard);
                    }
                    const reshuffledDeck = shuffleDeck(currentDeckWithBust);

                    const safeCards = reshuffledDeck.filter(card => {
                      return calculateScore([...remainingHand, { ...card, isFaceUp: true }]) <= 21;
                    });

                    let nextCardToDraw: Card;
                    let finalDeck = [...reshuffledDeck];

                    if (safeCards.length > 0) {
                      const luckyCard = safeCards[Math.floor(Math.random() * safeCards.length)];
                      finalDeck = [luckyCard, ...finalDeck.filter(c => c.id !== luckyCard.id)];
                      nextCardToDraw = luckyCard;
                    } else {
                      nextCardToDraw = finalDeck[0];
                    }

                    setGameMessage('風と雷が卓を包む！山札を戻して奇跡の一引きを引き寄せます！');
                    setPlayerDialogue(getRandomSanaeDialogue('miracleFruit'));
                    setDealerDialogue(
                      difficulty === 'easy'
                        ? 'あたい、そんな奇跡なんて信じないからね！バーストしたカードを戻すなんてズルイ！'
                        : difficulty === 'normal'
                        ? getRandomSakuyaQuote('sanaeProtection')
                        : difficulty === 'hard'
                        ? getRandomRemiliaQuote('sanaeProtection')
                        : difficulty === 'lunatic'
                        ? getRandomFlandreQuote('sanaeProtection')
                        : '何だこの気候は！？バーストしたはずのカードがすり替わったぞ！'
                    );

                    setDeck(finalDeck);
                    
                    setTimeout(() => {
                      const deckAfterDraw = [...finalDeck];
                      const luckyDraw = deckAfterDraw.shift()!;
                      luckyDraw.isFaceUp = true;
                      const finalHand = [...remainingHand, luckyDraw];
                      playFlipSound();
                      setPlayerHand(finalHand);
                      setDeck(deckAfterDraw);
                      setSkillsUsedThisRound(prev => ({ ...prev, miracle: true }));

                      const finalScore = calculateScore(finalHand);
                      setPlayerDialogue(getRandomSanaeDialogue('protectionDraw'));
                      setGameMessage('奇跡「ミラクルフルーツ」成功！安全な引き直しを行いました。');
                    }, 1200);
                  }}
                  className="flex-1 py-3 bg-teal-650 hover:bg-teal-500 font-bold rounded-xl text-white transition-all scale-100 active:scale-95 cursor-pointer shadow-lg text-xs"
                >
                  はい
                </button>
                <button
                  onClick={() => {
                    setShowSanaeMiraclePopup(false);
                    setSkillsUsedThisRound(prev => ({ ...prev, miracle: true }));
                    executeLossPayoutAndTransition('bust', playerHand, dealerHand);
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 font-semibold rounded-xl text-zinc-300 transition-all cursor-pointer text-xs"
                >
                  いいえ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GRAPHICAL SPELL FX OVERLAY: MARISA'S MASTER SPARK FULL-SCREEN FLASH */}
      <AnimatePresence>
        {showMasterSparkBeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ times: [0, 0.15, 0.85, 1], duration: 1.3 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-radial from-amber-300 via-yellow-500 to-white animate-ping opacity-25" />
            <motion.h2 
              initial={{ scale: 0.8, y: 10 }}
              animate={{ scale: [0.8, 1.2, 1.2, 0.8], y: 0 }}
              transition={{ duration: 1.3 }}
              className="text-4xl md:text-7xl font-black italic tracking-widest text-amber-500 uppercase filter drop-shadow-[0_0_20px_#f59e0b] z-10 text-center px-4"
            >
              恋符「マスタースパーク」！！！
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPELL C: SANAE'S ANIMATED TWO GODS PROTECTION (Lose... -> Draw transition) */}
      <AnimatePresence>
        {protectionActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md"
          >
            {/* 1. First show Lose... text sliding and dissolving */}
            <motion.div
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: [1, 1, 0], scale: [1, 1.05, 0.85], y: [0, 0, -20] }}
              transition={{ times: [0, 0.5, 1], duration: 3 }}
              className="absolute flex flex-col items-center"
            >
              <AlertTriangle className="w-16 h-16 text-rose-500 animate-bounce" />
              <h2 className="text-5xl md:text-6xl font-black text-rose-500 tracking-wider uppercase font-serif mt-4 filter drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                Lose...
              </h2>
              <p className="text-zinc-500 text-xs mt-3 select-none tracking-widest">
                全てのチップを失い、敗北したはずでした...
              </p>
            </motion.div>

            {/* 2. Then fade in the Miracle Draw representation in the same exact spot */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: [0, 0, 1], scale: [0.8, 0.85, 1], y: [30, 20, 0] }}
              transition={{ times: [0, 0.5, 1], duration: 3 }}
              className="absolute flex flex-col items-center text-center space-y-5 px-6"
            >
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-black text-xs md:text-sm px-5 py-2 rounded-full tracking-widest shadow-xl shadow-teal-500/20 uppercase animate-bounce border border-teal-200">
                二大神様プロテクション発動！
              </span>
              
              <div className="w-20 h-20 bg-teal-950/60 border-2 border-teal-400 rounded-full flex items-center justify-center text-teal-300 shadow-[0_0_20px_rgba(45,212,191,0.5)]">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>

              <h2 className="text-5xl md:text-7xl font-serif font-black text-teal-300 tracking-widest uppercase filter drop-shadow-[0_0_20px_rgba(45,212,191,0.4)]">
                Draw
              </h2>

              <p className="text-zinc-300 text-xs md:text-sm max-w-sm leading-relaxed">
                奇跡が起きました！守矢の風と加護が掛け金消失の運命をかき消し、元のチップを全額払い戻して保護しました！
              </p>

              <button
                onClick={() => setProtectionActive(false)}
                className="px-8 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 text-zinc-950 font-black text-xs tracking-widest rounded-lg shadow-xl cursor-pointer"
              >
                奇跡に感謝する
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
