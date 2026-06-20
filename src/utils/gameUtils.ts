/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suit } from '../types';

// Helper to generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Generate a standard deck of 52 cards
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
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

      deck.push({
        id: `${suit}-${rank}-${generateId()}`,
        suit,
        rank,
        display,
        isFaceUp: false,
        customImage,
      });
    }
  }

  return deck;
}

// Shuffle cards using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Special Blackjack criteria: "A" and Face cards ("J", "Q", "K").
// The user specified: "この時、Aと絵柄付き(JQK)が出た場合はブラックジャックとして扱います"
// That is: One card is 'A' (rank 1), and another card is 'J', 'Q', or 'K' (rank 11, 12, or 13).
export function isNaturalBlackjack(hand: Card[]): boolean {
  if (hand.length !== 2) return false;
  
  const hasAce = hand.some(card => card.rank === 1);
  const hasFaceCard = hand.some(card => card.rank === 11 || card.rank === 12 || card.rank === 13);
  
  return hasAce && hasFaceCard;
}

// Calculate the blackjack score of a hand.
// Number cards (2-10) are their face values.
// Face cards (J, Q, K) are worth 10.
// Aces are worth 11 or 1, maximizing total score under 21.
export function calculateScore(hand: Card[]): number {
  let score = 0;
  let aceCount = 0;
  let halvedAcesCount = 0;

  for (const card of hand) {
    if (card.isDisabled) {
      continue;
    }
    if (card.rank === 1) {
      if (card.isHalved) {
        halvedAcesCount += 1;
        score += 0; // Math.floor(1 / 2) = 0
      } else {
        aceCount += 1;
        score += 1; // Count as 1 initially
      }
    } else {
      let val = card.rank >= 11 ? 10 : card.rank;
      if (card.isHalved) {
        val = Math.floor(val / 2);
      }
      score += val;
    }
  }

  // Adjust Aces from 1 to 11 if possible without busting
  for (let i = 0; i < aceCount; i++) {
    if (score + 10 <= 21) {
      score += 10;
    }
  }

  // Adjust halved Aces from 0 to 5 (Math.floor(11 / 2) = 5) if possible
  for (let i = 0; i < halvedAcesCount; i++) {
    if (score + 5 <= 21) {
      score += 5;
    }
  }

  return score;
}
