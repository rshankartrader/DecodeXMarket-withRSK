import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { Trade, TradingRule } from './types';
import { JournalDashboard } from './JournalDashboard';
import { TradeLog } from './TradeLog';
import { Analytics } from './Analytics';
import { CalendarView } from './CalendarView';
import { Rules } from './Rules';
import { RiskManagement } from './RiskManagement';
import { 
  Monitor, 
  BookOpen, 
  BarChart3, 
  Calendar, 
  Brain, 
  ShieldCheck,
  RefreshCw,
  Shield,
  KeyRound
} from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export const TradingJournalMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'analytics' | 'calendar' | 'rules' | 'risk'>('overview');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  
  // Account Balance state
  const [accountBalance, setAccountBalance] = useState<number>(500000);
  const [initialBalance, setInitialBalance] = useState<number>(500000);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setTrades([]);
      setRules([]);
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    setLoading(true);

    // 0. User document listener for balance tracking
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.journalBalance !== undefined) {
          setAccountBalance(Number(data.journalBalance));
        }
        if (data.journalInitialBalance !== undefined) {
          setInitialBalance(Number(data.journalInitialBalance));
        }
      }
    });

    // 1. Real-time Trade listener
    const tradesPath = `users/${userId}/trades`;
    const tradesQuery = query(collection(db, 'users', userId, 'trades'), orderBy('tradeDate', 'desc'));
    
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const items: Trade[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp
        } as Trade);
      });
      setTrades(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, tradesPath);
      setError('Failed to fetch trading logs.');
      setLoading(false);
    });

    // 2. Real-time Rules listener
    const rulesPath = `users/${userId}/rules`;
    const rulesQuery = query(collection(db, 'users', userId, 'rules'), orderBy('createdAt', 'asc'));
    
    const unsubscribeRules = onSnapshot(rulesQuery, (snapshot) => {
      const items: TradingRule[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt as Timestamp
        } as TradingRule);
      });
      setRules(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, rulesPath);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTrades();
      unsubscribeRules();
    };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <Brain className="w-12 h-12 text-terminal-accent mb-4 animate-pulse" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Private Trading Journal</h3>
        <p className="text-xs font-mono text-gray-500 uppercase max-w-sm leading-relaxed mb-6">
          Access to elite trading insights, journaling, emotional logs, and checklists requires credential verification.
        </p>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('rsk-navigate', { detail: 'auth' }));
          }}
          className="flex items-center space-x-2 bg-terminal-accent hover:bg-terminal-accent/80 text-white px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>Login / Register Now</span>
        </button>
      </div>
    );
  }

  // FIRESTORE MUTATIONS
  const userId = currentUser.uid;

  const handleUpdateBalance = async (newBalance: number) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        journalBalance: newBalance
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleResetJournal = async (startingBalance: number) => {
    try {
      // 1. Delete all trades
      for (const trade of trades) {
        await deleteDoc(doc(db, 'users', userId, 'trades', trade.id));
      }
      // 2. Delete all rules
      for (const rule of rules) {
        await deleteDoc(doc(db, 'users', userId, 'rules', rule.id));
      }
      // 3. Reset profile settings in Firestore
      await setDoc(doc(db, 'users', userId), {
        journalBalance: startingBalance,
        journalInitialBalance: startingBalance
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/reset`);
    }
  };

  // Trades
  const handleAddTrade = async (trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const tradesPath = `users/${userId}/trades`;
    try {
      await addDoc(collection(db, 'users', userId, 'trades'), {
        ...trade,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, tradesPath);
    }
  };

  const handleUpdateTrade = async (id: string, trade: Partial<Trade>) => {
    const tradesPath = `users/${userId}/trades/${id}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'trades', id), {
        ...trade,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, tradesPath);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    const tradesPath = `users/${userId}/trades/${id}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'trades', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, tradesPath);
    }
  };

  // Rules
  const handleAddRule = async (rule: Omit<TradingRule, 'id' | 'userId' | 'createdAt'>) => {
    const path = `users/${userId}/rules`;
    try {
      await addDoc(collection(db, 'users', userId, 'rules'), {
        ...rule,
        userId,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    const path = `users/${userId}/rules/${id}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'rules', id), { isActive });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteRule = async (id: string) => {
    const path = `users/${userId}/rules/${id}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'rules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-terminal-bg">
      {/* Trading Journal Header (Tab Bar directly below header) */}
      <div className="bg-terminal-card border-b border-terminal-border px-4 flex items-center space-x-1 overflow-x-auto py-1.5 scrollbar-none sticky top-16 z-30">
        {[
          { id: 'overview', label: 'Journal Overview', icon: Monitor },
          { id: 'trades', label: 'Trade Log', icon: BookOpen },
          { id: 'analytics', label: 'Diagnostics & Stats', icon: BarChart3 },
          { id: 'calendar', label: 'P&L Calendar', icon: Calendar },
          { id: 'risk', label: 'Risk Calculator', icon: Shield },
          { id: 'rules', label: 'Rules & Checklists', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all rounded cursor-pointer border ${
                isActive 
                  ? 'bg-terminal-accent text-white border-terminal-accent/30 shadow-[0_0_10px_rgba(242,125,38,0.25)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mr-2 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 min-h-[300px]">
            <RefreshCw className="w-8 h-8 text-terminal-accent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-12 text-terminal-red font-mono text-xs text-center">
            {error}
          </div>
        ) : activeTab === 'overview' ? (
          <JournalDashboard 
            trades={trades} 
            accountBalance={accountBalance}
            initialBalance={initialBalance}
            onUpdateBalance={handleUpdateBalance}
            onResetJournal={handleResetJournal}
          />
        ) : activeTab === 'trades' ? (
          <TradeLog 
            trades={trades} 
            onAddTrade={handleAddTrade}
            onUpdateTrade={handleUpdateTrade}
            onDeleteTrade={handleDeleteTrade}
          />
        ) : activeTab === 'analytics' ? (
          <Analytics trades={trades} />
        ) : activeTab === 'calendar' ? (
          <CalendarView trades={trades} />
        ) : activeTab === 'risk' ? (
          <RiskManagement 
            initialCapital={accountBalance}
            onCapitalChange={handleUpdateBalance}
          />
        ) : activeTab === 'rules' ? (
          <Rules 
            rules={rules}
            onAddRule={handleAddRule}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
          />
        ) : null}
      </div>
    </div>
  );
};
