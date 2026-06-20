/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  id: string; // Animation key
  suit: Suit;
  rank: number; // 1 to 13
  display: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  isFaceUp: boolean;
  isHalved?: boolean; // Youmu's ability flags card to have score halved (rounded down)
  isDisabled?: boolean; // Sakuya's ability flags card to have score excluded (disabled card)
  customImage?: string; // Add this line for custom images like Cirno's frozen card
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'lunatic';

export type GamePhase = 
  | 'title'         // Title Screen
  | 'char_select'   // New: Character selection screen
  | 'betting'       // Chip select pop-up
  | 'dealing'       // Initial 2 card deal Animation
  | 'player_turn'   // Player can draw or stand
  | 'dealer_turn'   // Dealer draws until score >= 17
  | 'round_end'     // Round result, reward paid, showing round state
  | 'game_over';    // Coins reach 0 for someone, showing Win or Lose

export interface GameStats {
  playerCoins: number;
  dealerCoins: number;
  currentBet: number;
  difficulty: Difficulty;
  playerHand: Card[];
  dealerHand: Card[];
  playerDialogue: string;
  dealerDialogue: string;
  playerScore: number;
  dealerScore: number;
}
