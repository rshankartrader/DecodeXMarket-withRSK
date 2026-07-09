import { Timestamp } from 'firebase/firestore';

export interface Trade {
  id: string;
  userId: string;
  instrument: string;
  direction: 'LONG' | 'SHORT';
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  setup: string;
  emotions: string[];
  mistakes: string[];
  notes: string;
  tradeDate: string; // YYYY-MM-DD
  tradeTime: string; // HH:MM AM/PM
  rrr?: number; // Risk-to-Reward Ratio (e.g. 1.5, 2.0)
  rating?: number; // Optional trade rating 1-5
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PsychologyLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mentalState: string;
  marketMood: string;
  lessonsLearned: string;
  dailyRating: number; // 1 to 5
  createdAt: Timestamp;
}

export interface TradingRule {
  id: string;
  userId: string;
  ruleText: string;
  category: 'Pre-trade' | 'Daily' | 'Risk';
  isActive: boolean;
  createdAt: Timestamp;
}
