import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Globe, 
  Clock, 
  Shield, 
  ShieldCheck,
  Zap, 
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Menu,
  X,
  ArrowRight,
  Monitor,
  Cpu,
  Layers,
  Info,
  User,
  LogOut,
  Target,
  Calculator,
  LineChart,
  MessageSquare,
  Mail,
  Hash,
  CreditCard,
  QrCode,
  Lock,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  collection,
  getDocs,
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types ---

interface ParticipantSentiment {
  name: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

interface GlobalIndex {
  name: string;
  price: string;
  change: string;
}

interface MarketData {
  participants: ParticipantSentiment[];
  masterSignal: string;
  decodedDate: string;
  globalIndices: GlobalIndex[];
  globalSentiment: string;
  indiaVix: string;
  dailyRange: string;
  weeklyRange: string;
  reversals15m: string[];
  reversals5m: string[];
  support: string[];
  resistance: string[];
  lastUpdated: string;
}

// --- Constants ---

const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRH3QKdMNzuNqoc49Rsq0wVMJwoAzNpenV8SRDgkvz1hTPaLG_pAYb9UIl0ZoDzOSaSg2X7ksWhdny-/pub?gid=658749771&single=true&output=csv";
const LOGO_URL = "https://lh3.googleusercontent.com/d/1za5G-q7I_DyDvRwMKDYdohk7B7FnQqa1";

const MOCK_DATA: MarketData = {
  participants: [
    { name: 'CLIENT', sentiment: 'Bearish' },
    { name: 'DII', sentiment: 'Bullish' },
    { name: 'FII', sentiment: 'Bearish' },
    { name: 'PRO', sentiment: 'Bullish' },
  ],
  masterSignal: 'Wait for Confirmation',
  decodedDate: '26 MAR 2026',
  globalIndices: [
    { name: 'DOW JONES', price: '39,123', change: '+0.45%' },
    { name: 'NASDAQ', price: '16,234', change: '-0.12%' },
    { name: 'S&P 500', price: '5,234', change: '+0.23%' },
    { name: 'DAX', price: '18,234', change: '+0.89%' },
    { name: 'FTSE 100', price: '7,934', change: '+0.15%' },
    { name: 'NIKKEI 225', price: '40,234', change: '-0.45%' },
    { name: 'HANG SENG', price: '16,234', change: '-1.20%' },
  ],
  globalSentiment: 'Mixed to Positive',
  indiaVix: '14.25',
  dailyRange: '22,150 - 22,450',
  weeklyRange: '21,800 - 22,800',
  reversals15m: ['10:15 AM', '01:30 PM', '02:45 PM'],
  reversals5m: ['09:45 AM', '11:20 AM', '12:50 PM', '02:15 PM'],
  support: ['22,200', '22,150', '22,000'],
  resistance: ['22,400', '22,450', '22,600'],
  lastUpdated: new Date().toLocaleTimeString(),
};

// --- Components ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const AuthPage = ({ onAuthSuccess, initialMode = 'login' }: { onAuthSuccess: () => void, initialMode?: 'login' | 'register' | 'forgot-password' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'choice' | 'old-password' | 'email-otp'>('choice');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (resetStep === 'old-password') {
        // Verify old password by attempting to sign in
        try {
          await signInWithEmailAndPassword(auth, email, oldPassword);
          // If successful, we can now update the password
          if (auth.currentUser) {
            await updatePassword(auth.currentUser, newPassword);
            setSuccess("Password updated successfully! You can now login with your new password.");
            setMode('login');
          }
        } catch (err) {
          throw new Error("Invalid old password. Please try again or use email verification.");
        }
      } else if (resetStep === 'email-otp') {
        // Use Standard Firebase Password Reset Email
        // This works without the Identity Toolkit API (Admin SDK)
        await sendPasswordResetEmail(auth, email);
        setSuccess("A password reset link has been sent to your email. Please check your inbox (and spam folder) to set a new password.");
        setTimeout(() => {
          setMode('login');
          setResetStep('choice');
        }, 3000);
      } else {
        // Standard Firebase Password Reset Email (Fallback)
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent! Please check your inbox (and spam folder) for the link to reset your password.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (mode === 'forgot-password') {
      return handleForgotPassword(e);
    }
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if user is locked
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isLocked) {
          await signOut(auth);
          setError("Your access to the terminal has been locked by the administrator. Please contact support.");
          setLoading(false);
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate a random 8-character access code
        const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create user profile in Firestore
        const userDoc = {
          uid: user.uid,
          email: user.email,
          displayName: name,
          role: user.email === 'rshankartrader@gmail.com' ? 'admin' : 'user',
          accessLevel: 0, // Level 0: Registered (30-day trial)
          accessCode: generatedCode,
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), userDoc);
          
          // Notify Admin of new registration
          fetch('/api/admin/notify-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: user.email,
              userName: name,
              userUid: user.uid,
              accessCode: generatedCode
            })
          }).catch(err => console.error("Failed to notify admin:", err));

        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-terminal-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-terminal-accent)_0%,_transparent_70%)] opacity-5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="terminal-card p-8 bg-terminal-card/50 backdrop-blur-xl border-terminal-accent/30 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
              {mode === 'login' ? 'Terminal Login' : mode === 'register' ? 'Create Account' : 'Reset Password'}
            </h2>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              {mode === 'login' ? 'Access Institutional Data' : mode === 'register' ? 'Join the Elite Circle' : 'Recover Your Access'}
            </p>
          </div>

          {mode === 'forgot-password' && resetStep === 'choice' ? (
            <div className="space-y-4">
              <button 
                onClick={() => setResetStep('old-password')}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 font-bold text-[10px] uppercase tracking-widest transition-all"
              >
                Verify with Old Password
              </button>
              <button 
                onClick={() => setResetStep('email-otp')}
                className="w-full py-4 bg-terminal-accent/10 hover:bg-terminal-accent/20 text-terminal-accent rounded-lg border border-terminal-accent/30 font-bold text-[10px] uppercase tracking-widest transition-all"
              >
                Verify with Email Link (OTP)
              </button>
              <button 
                onClick={() => setMode('login')}
                className="w-full text-[10px] font-mono text-gray-500 uppercase hover:text-white transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-black/40 border border-terminal-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-white focus:border-terminal-accent outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="email" 
                      required
                      disabled={otpSent && mode === 'forgot-password'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rsk@decodex.com"
                      className="w-full bg-black/40 border border-terminal-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-white focus:border-terminal-accent outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  {otpSent && !otpVerified && mode === 'forgot-password' && (
                    <button 
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[9px] font-mono text-terminal-accent hover:underline uppercase ml-1"
                    >
                      Change Email / Resend OTP
                    </button>
                  )}
                </div>
              )}

              {mode === 'forgot-password' && resetStep === 'old-password' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest ml-1">Old Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="password" 
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Old Password"
                        className="w-full bg-black/40 border border-terminal-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-white focus:border-terminal-accent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="password" 
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full bg-black/40 border border-terminal-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-white focus:border-terminal-accent outline-none transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode === 'forgot-password' && resetStep === 'email-otp' && (
                <div className="p-4 bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg space-y-3">
                  <div className="flex items-center text-terminal-accent">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Email Verification</span>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 leading-relaxed uppercase">
                    We will send a secure password reset link to <span className="text-white">{email}</span>. 
                    Click the link in the email to choose a new password.
                  </p>
                </div>
              )}

              {(mode === 'login' || mode === 'register') && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => {
                          setMode('forgot-password');
                          setResetStep('choice');
                        }}
                        className="text-[9px] font-mono text-terminal-accent hover:underline uppercase"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-terminal-border rounded-lg pl-10 pr-12 py-3 text-sm font-mono text-white focus:border-terminal-accent outline-none transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-terminal-red/10 border border-terminal-red/20 rounded-lg flex items-start text-terminal-red text-[10px] font-mono uppercase">
                  <AlertTriangle className="w-3 h-3 mr-2 mt-0.5 shrink-0" />
                  <div className="flex-1 break-words">
                    {error.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                      part.match(/^https?:\/\//) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors break-all">
                          {part}
                        </a>
                      ) : part
                    )}
                  </div>
                </div>
              )}

              {success && (
                <div className="p-3 bg-terminal-green/10 border border-terminal-green/20 rounded-lg flex items-center text-terminal-green text-[10px] font-mono uppercase">
                  <CheckCircle className="w-3 h-3 mr-2 shrink-0" />
                  {success}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-terminal-accent hover:bg-terminal-accent/80 text-white rounded-lg font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  'Authenticate'
                ) : mode === 'register' ? (
                  'Initialize Account'
                ) : resetStep === 'email-otp' ? (
                  'Send Reset Link'
                ) : (
                  'Update Password'
                )}
              </button>

              {mode === 'forgot-password' && (
                <button 
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetStep('choice');
                  }}
                  className="w-full text-[10px] font-mono text-gray-500 uppercase hover:text-white transition-colors"
                >
                  Back to Login
                </button>
              )}
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-terminal-border/30">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="ml-2 text-terminal-accent hover:underline font-bold"
              >
                {mode === 'login' ? 'Register Now' : 'Login Here'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewWidget = () => {
  const containerId = "tradingview_bse_chart";
  const scriptId = "tradingview-tv-script";

  useEffect(() => {
    const initializeWidget = () => {
      if (window.TradingView && document.getElementById(containerId)) {
        try {
          new window.TradingView.widget({
            "autosize": true,
            "symbol": "BSE:SENSEX",
            "interval": "D",
            "timezone": "Asia/Kolkata",
            "theme": "dark",
            "style": "1",
            "locale": "in",
            "toolbar_bg": "#141416",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": containerId,
            "save_image": false,
            "watchlist": [
              "BSE:SENSEX",
              "BSE:BANKEX",
              "BSE:RELIANCE",
              "BSE:HDFCBANK",
              "BSE:ICICIBANK"
            ],
            "symbol_search_request": {
              "include_indices": true,
              "include_stocks": true,
              "filter": "india"
            }
          });
        } catch (err) {
          console.error("TradingView widget initialization failed:", err);
        }
      }
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = initializeWidget;
      script.onerror = (e) => console.error("TradingView script failed to load:", e);
      document.body.appendChild(script);
    } else {
      // Script already exists, just initialize if ready
      if (window.TradingView) {
        initializeWidget();
      } else {
        script.addEventListener('load', initializeWidget);
      }
    }

    return () => {
      // We don't necessarily want to remove the script as it might be used by other instances,
      // but we should remove the listener if it hasn't fired yet.
      if (script) {
        script.removeEventListener('load', initializeWidget);
      }
    };
  }, []);

  return (
    <div className="w-full h-[500px] terminal-card overflow-hidden relative bg-[#141416]">
      <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
        <div id={containerId} style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color = 'text-gray-300' }: { label: string, value: string, color?: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">{label}</span>
    <span className={`text-sm font-bold ${color}`}>{value}</span>
  </div>
);

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'backtest' | 'gann' | 'oi' | 'risk' | 'indicators' | 'auth' | 'pricing' | 'checkout' | 'user-management' | 'redeem-success'>('landing');
  const [redeemDuration, setRedeemDuration] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState<MarketData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('landing');
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const protectView = (targetView: typeof view) => {
    if (userProfile?.isLocked) {
      alert("Your access to the terminal has been locked by the administrator.");
      return;
    }

    // Views that require login
    const loginRequiredViews = ['dashboard', 'oi', 'backtest', 'risk', 'gann'];
    
    // Views that require paid/trial access
    const accessRequiredViews = ['dashboard', 'oi'];
    
    if (loginRequiredViews.includes(targetView)) {
      if (!user) {
        setView('auth');
        setIsMenuOpen(false);
        return;
      }

      if (accessRequiredViews.includes(targetView)) {
        // Check for 30-day trial or Level 1 access
        const registrationDate = userProfile?.createdAt?.toDate() || new Date();
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - registrationDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const hasLifetimeAccess = userProfile?.accessLevel === 1 || userProfile?.role === 'admin';
        
        // Check for temporary access codes (RSK3, THERSK6)
        // We'll store expiry in userProfile.accessExpiry
        const isExpired = userProfile?.accessExpiry && userProfile.accessExpiry.toDate() < now;
        const hasActiveTempAccess = userProfile?.accessExpiry && !isExpired;

        if (!hasLifetimeAccess && !hasActiveTempAccess && diffDays > 30) {
          setView('pricing');
          setIsMenuOpen(false);
          return;
        }
      }
    }
    
    setView(targetView);
    setIsMenuOpen(false);
  };

  const OIAnalysis = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="terminal-card p-12 text-center bg-terminal-bg/90 backdrop-blur-xl border-terminal-accent/50 max-w-2xl mx-auto shadow-2xl"
      >
        <div className="w-20 h-20 bg-terminal-accent/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-terminal-accent/20">
          <BarChart3 className="w-10 h-10 text-terminal-accent animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase">Institutional O.I Decoder</h2>
        <div className="inline-block px-6 py-2 bg-terminal-accent/20 rounded-full border border-terminal-accent/30 mb-8">
          <span className="text-sm font-bold text-terminal-accent uppercase tracking-[0.2em]">System Calibration in Progress</span>
        </div>
        <p className="text-gray-400 text-base leading-relaxed font-mono uppercase max-w-md mx-auto">
          Our advanced institutional Open Interest decoder is currently being calibrated for maximum precision. 
          We are integrating real-time participant data streams to provide the most accurate sentiment analysis.
          <br /><br />
          <span className="text-terminal-accent font-bold">Expected Deployment:</span> <span className="text-white font-bold">Q2 2026</span>
        </p>
      </motion.div>
    </div>
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DEFAULT_CSV_URL);
      if (!response.ok) throw new Error('Failed to fetch data');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        complete: (results) => {
          const rows = results.data as string[][];
          const getCell = (r: number, c: number) => rows[r]?.[c] || '';

          // Participant View (A7:B10) -> Rows 6 to 9, Cols 0 to 1
          const participants: ParticipantSentiment[] = [];
          for (let i = 6; i <= 9; i++) {
            const name = getCell(i, 0);
            const sentiment = getCell(i, 1) as any;
            if (name) participants.push({ name, sentiment: sentiment || 'Neutral' });
          }

          // Global Indices (G4:G13) -> Rows 3 to 12, Col 6
          // Price (H4:H13) -> Rows 3 to 12, Col 7
          // % Change (J4:J13) -> Rows 3 to 12, Col 9
          const globalIndices: GlobalIndex[] = [];
          for (let i = 3; i <= 12; i++) {
            const name = getCell(i, 6);
            const price = getCell(i, 7);
            const change = getCell(i, 9);
            if (name) globalIndices.push({ name, price, change });
          }

          const rev15: string[] = [];
          const rev5: string[] = [];
          for (let i = 7; i <= 20; i++) {
            const v15 = getCell(i, 3);
            const v5 = getCell(i, 4);
            if (v15) rev15.push(v15);
            if (v5) rev5.push(v5);
          }

          const support: string[] = [];
          const resistance: string[] = [];
          for (let i = 13; i <= 20; i++) {
            const s = getCell(i, 0);
            const r = getCell(i, 1);
            if (s) support.push(s);
            if (r) resistance.push(r);
          }

          setData({
            participants,
            masterSignal: getCell(0, 3), // D1
            decodedDate: getCell(2, 0), // A3
            globalIndices,
            globalSentiment: getCell(13, 8), // I14
            indiaVix: getCell(15, 7), // H16
            dailyRange: `${getCell(16, 8)} - ${getCell(16, 9)}`, // I17 - J17
            weeklyRange: `${getCell(17, 8)} - ${getCell(17, 9)}`, // I18 - J18
            reversals15m: rev15,
            reversals5m: rev5,
            support,
            resistance,
            lastUpdated: new Date().toLocaleTimeString(),
          });
        },
        error: (err) => setError(`Parsing error: ${err.message}`)
      });
    } catch (err) {
      setError(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const getSentimentColor = (sentiment: string) => {
    const s = sentiment.toLowerCase();
    if (s.includes('bullish') || s.includes('positive')) return 'text-terminal-green';
    if (s.includes('bearish') || s.includes('negative')) return 'text-terminal-red';
    return 'text-terminal-accent';
  };

  const LandingPage = () => (
    <div className="flex-1 flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-terminal-accent)_0%,_transparent_70%)] opacity-5 pointer-events-none" />
        <div className="max-w-4xl text-center z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-[10px] font-mono text-terminal-accent uppercase tracking-[0.5em] mb-4">Precision Decoding by RSK</h2>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white leading-none mb-8">
              DECODE<span className="text-terminal-accent">X</span>MARKET
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed px-4">
              The ultimate institutional-grade terminal for Indian Indices. 
              Real-time sentiment decoding, reversal timings, and precision technical levels.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
              {user ? (
                <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => protectView('dashboard')}
                    className="w-full sm:w-auto bg-terminal-accent hover:bg-terminal-accent/80 text-white px-8 py-4 rounded font-bold flex items-center justify-center transition-all group"
                  >
                    GO TO TERMINAL
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-terminal-accent" />
                    <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                      {userProfile?.accessLevel === 1 ? (
                        <span className="text-terminal-green font-bold">Lifetime Access</span>
                      ) : (
                        <>
                          Expiry: <span className="text-white font-bold">
                            {userProfile?.accessExpiry ? userProfile.accessExpiry.toDate().toLocaleDateString() : '30 Days Trial'}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => protectView('dashboard')}
                  className="w-full sm:w-auto bg-terminal-accent hover:bg-terminal-accent/80 text-white px-8 py-4 rounded font-bold flex items-center justify-center transition-all group"
                >
                  LOGIN TO ACCESS
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => setView('user-management')}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded font-bold flex items-center justify-center transition-all group"
                >
                  USER INFORMATION
                  <User className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button 
                onClick={() => protectView('backtest')}
                className="w-full sm:w-auto border-2 border-terminal-accent hover:bg-terminal-accent/10 text-terminal-accent px-8 py-4 rounded font-black flex items-center justify-center transition-all animate-pulse"
              >
                BACKTEST OUR DATA DECODING (FREE)
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-24 bg-terminal-card/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Calculator, title: "Backtest Lab", desc: "Our hero product. Backtest institutional data decoding for free and see the precision yourself." },
            { icon: Cpu, title: "Data Decoding", desc: "Proprietary algorithms that decode participant data to reveal true market sentiment." },
            { icon: Layers, title: "Precision Levels", desc: "Accurate support, resistance, and reversal timings updated in real-time." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className={`terminal-card p-8 hover:border-terminal-accent/50 transition-colors ${i === 0 ? 'border-terminal-accent/50 bg-terminal-accent/5' : ''}`}
            >
              <feature.icon className={`w-8 h-8 mb-6 ${i === 0 ? 'text-terminal-accent' : 'text-terminal-accent'}`} />
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section (Moved to Landing Page) */}
      <section className="px-4 py-24 border-t border-terminal-border">
        <PricingPage />
      </section>
    </div>
  );

  const CheckoutPage = () => {
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemStatus, setRedeemStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [redeemLoading, setRedeemLoading] = useState(false);

    const upiId = "thersk@axl";
    const upiImage = "https://lh3.googleusercontent.com/d/1uYfS0FQDtFJi_r4D0eootQ6sggu4HWT4";
    const basePrice = 25999;
    
    const getPriceInfo = () => {
      const earlyBirdPrice = 15599;
      if (!userProfile) return { price: earlyBirdPrice, originalPrice: basePrice, discount: 40, isNew: true };
      
      const registrationDate = userProfile.createdAt?.toDate() || new Date();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - registrationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isNewUser = diffDays <= 30;
      const discount = isNewUser ? 0.4 : 0.3;
      const finalPrice = Math.floor(basePrice * (1 - discount));
      
      return { price: finalPrice, originalPrice: basePrice, discount: Math.round(discount * 100), isNew: isNewUser };
    };

    const priceInfo = getPriceInfo();

    const handleConfirmPayment = () => {
      const message = encodeURIComponent(`Hello RSK, I have completed the payment of ₹${priceInfo.price} for DecodeXMarket Lifetime Access. My Email: ${user?.email || 'N/A'}. Please verify and grant access.`);
      window.open(`https://wa.me/918271890090?text=${message}`, '_blank');
    };

    const handleRedeem = async () => {
      if (!redeemCode.trim()) return;
      if (!user) {
        setView('auth');
        return;
      }

      setRedeemLoading(true);
      setRedeemStatus(null);

      try {
        const code = redeemCode.trim().toUpperCase();
        let updateData: any = {};
        let message = "";

        if (code === "RADHERADHE" || code === userProfile?.accessCode) {
          updateData = { accessLevel: 1 };
          message = "Lifetime Access Activated! Radhe Radhe!";
          setRedeemDuration("LIFETIME");
        } else if (code === "RSK3") {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 3);
          updateData = { accessExpiry: Timestamp.fromDate(expiry) };
          message = "3 Months Access Activated!";
          setRedeemDuration("3 MONTHS");
        } else if (code === "THERSK6") {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 6);
          updateData = { accessExpiry: Timestamp.fromDate(expiry) };
          message = "6 Months Access Activated!";
          setRedeemDuration("6 MONTHS");
        } else {
          throw new Error("Invalid Access Code. Please check and try again.");
        }

        await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
        
        // Update local profile state
        const updatedDoc = await getDoc(doc(db, 'users', user.uid));
        if (updatedDoc.exists()) setUserProfile(updatedDoc.data());

        setRedeemCode('');
        setView('redeem-success');
      } catch (err: any) {
        setRedeemStatus({ type: 'error', message: err.message });
      } finally {
        setRedeemLoading(false);
      }
    };

    return (
      <div className="flex-1 flex flex-col p-4 py-12 space-y-8 max-w-4xl mx-auto w-full">
        <div className="flex justify-start">
          <button onClick={() => setView('pricing')} className="text-xs font-mono text-gray-400 hover:text-white uppercase tracking-widest flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Plans
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center space-y-8">
          {/* Redemption Pop-up / Modal */}
          <AnimatePresence>
            {redeemStatus && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setRedeemStatus(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className={`relative max-w-sm w-full terminal-card p-8 border-2 ${redeemStatus.type === 'success' ? 'border-terminal-green shadow-[0_0_50px_rgba(34,197,94,0.2)]' : 'border-terminal-red shadow-[0_0_50px_rgba(239,68,68,0.2)]'}`}
                >
                  <div className="text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${redeemStatus.type === 'success' ? 'bg-terminal-green/20 text-terminal-green' : 'bg-terminal-red/20 text-terminal-red'}`}>
                      {redeemStatus.type === 'success' ? <ShieldCheck className="w-8 h-8" /> : <X className="w-8 h-8" />}
                    </div>
                    <h3 className={`text-xl font-black uppercase tracking-tighter ${redeemStatus.type === 'success' ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {redeemStatus.type === 'success' ? 'Redemption Successful' : 'Redemption Failed'}
                    </h3>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      {redeemStatus.message}
                    </p>
                    <button 
                      onClick={() => setRedeemStatus(null)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded font-bold text-xs uppercase tracking-widest border border-white/10 mt-4"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full terminal-card p-8 space-y-8 border-terminal-accent/30 shadow-[0_0_50px_rgba(242,125,38,0.1)]"
          >
            <div className="text-center space-y-2">
              <ShieldCheck className="w-12 h-12 text-terminal-accent mx-auto mb-4" />
              <h2 className="text-2xl font-black text-white uppercase">Secure Checkout</h2>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Lifetime Pro Access</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 space-y-4 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Plan</span>
                <span className="text-xs font-bold text-white uppercase">Become a Pro Trader</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Base Price</span>
                <span className="text-xs font-bold text-gray-500 line-through">₹{priceInfo.originalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Discount ({priceInfo.discount}%)</span>
                <span className="text-xs font-bold text-terminal-green">-₹{(priceInfo.originalPrice - priceInfo.price).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase">Total Payable</span>
                <span className="text-2xl font-black text-terminal-accent">₹{priceInfo.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-48 h-48 bg-white p-2 rounded-lg shadow-inner flex items-center justify-center overflow-hidden">
                  <img src={upiImage} alt="UPI QR Code" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="text-center p-4 bg-terminal-accent/5 rounded border border-dashed border-terminal-accent/30 w-full">
                  <p className="text-[10px] font-mono text-gray-400 uppercase mb-2">Pay via UPI ID</p>
                  <div className="text-lg font-black text-white tracking-wider select-all cursor-pointer hover:text-terminal-accent transition-colors">
                    {upiId}
                  </div>
                  <p className="text-[8px] font-mono text-terminal-accent mt-2 uppercase">Copy UPI ID or Scan QR</p>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleConfirmPayment}
                  className="w-full py-4 rounded font-black text-sm uppercase tracking-[0.2em] transition-all bg-terminal-accent text-white hover:bg-terminal-accent/80 shadow-[0_0_20px_rgba(242,125,38,0.3)] flex items-center justify-center"
                >
                  Confirm & Send WhatsApp
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-[9px] font-mono text-gray-400 text-center leading-relaxed uppercase">
                    After successful payment, WhatsApp to <span className="text-white font-bold">8271890090</span> with your email and transaction screenshot. RSK will verify and grant your access code manually.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Redeem Code Section on Checkout Page */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md w-full terminal-card p-8 border-terminal-border bg-terminal-bg/50"
          >
            <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6 text-center">Redeem Access Code</h4>
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="ENTER ACCESS CODE"
                  className="w-full bg-terminal-bg border border-terminal-border rounded-lg py-3 pl-10 pr-4 text-xs font-mono text-white focus:border-terminal-accent outline-none transition-all uppercase"
                />
              </div>
              <button 
                onClick={handleRedeem}
                disabled={redeemLoading || !redeemCode.trim()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 border border-white/10"
              >
                {redeemLoading ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : 'AUTHORIZE CODE'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  const UserManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'users'));
          const usersList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(usersList);
        } catch (err) {
          console.error("Error fetching users:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchUsers();
    }, []);

    const toggleLock = async (userId: string, currentStatus: boolean) => {
      try {
        await updateDoc(doc(db, 'users', userId), {
          isLocked: !currentStatus
        });
        setUsers(users.map(u => u.id === userId ? { ...u, isLocked: !currentStatus } : u));
      } catch (err) {
        console.error("Error toggling lock:", err);
        alert("Failed to update user status.");
      }
    };

    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-terminal-accent animate-spin" />
        </div>
      );
    }

    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">User Management</h2>
          <button onClick={() => setView('landing')} className="text-xs font-mono text-gray-400 hover:text-white uppercase tracking-widest flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
          </button>
        </div>

        <div className="terminal-card overflow-hidden border-terminal-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-terminal-border">
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Access Level</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{u.displayName || 'Anonymous'}</span>
                        <span className="text-xs font-mono text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-gray-300 uppercase">
                          {u.accessLevel === 1 ? 'Lifetime Pro' : 'Basic / Trial'}
                        </span>
                        {u.accessExpiry && (
                          <span className="text-[10px] font-mono text-terminal-accent">
                            Expires: {u.accessExpiry.toDate().toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isLocked ? (
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-mono uppercase border border-red-500/20">Locked</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-terminal-green/10 text-terminal-green text-[10px] font-mono uppercase border border-terminal-green/20">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleLock(u.id, !!u.isLocked)}
                        className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-all ${
                          u.isLocked 
                            ? 'bg-terminal-green text-black hover:bg-terminal-green/80' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {u.isLocked ? 'Unlock Access' : 'Lock Access'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const RedeemSuccessPage = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full terminal-card p-12 text-center space-y-8 border-terminal-green shadow-[0_0_50px_rgba(34,197,94,0.1)]"
      >
        <div className="w-20 h-20 bg-terminal-green/20 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-10 h-10 text-terminal-green" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Access Granted</h2>
          <p className="text-gray-400 font-mono text-sm leading-relaxed uppercase">
            Your access to trading terminal is granted for <span className="text-terminal-green font-bold">{redeemDuration}</span>. Enjoy your trading journey.
          </p>
        </div>
        <button 
          onClick={() => setView('dashboard')}
          className="w-full py-4 bg-terminal-green text-black rounded font-black text-sm uppercase tracking-widest hover:bg-terminal-green/90 transition-all"
        >
          Go to Terminal
        </button>
      </motion.div>
    </div>
  );
  const Dashboard = () => (
    <div className="flex-1 p-4 grid grid-cols-12 gap-4">
      {/* Left Sidebar */}
      <div className="col-span-12 lg:col-span-3 space-y-4">
        {/* Master Signal Box (Moved to top) */}
        <div className="terminal-card p-6 border-l-4 border-l-terminal-accent bg-terminal-accent/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Zap className="w-4 h-4 text-terminal-accent mr-2" />
              <span className="text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Master Signal</span>
            </div>
            <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              {data.decodedDate}
            </span>
          </div>
          <div className="text-2xl font-black text-white uppercase tracking-tight">
            {data.masterSignal}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Access Status</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${userProfile?.accessLevel === 1 ? 'text-terminal-green' : 'text-terminal-accent'}`}>
              {userProfile?.accessLevel === 1 ? 'Lifetime Pro' : (
                <>Expiry: {userProfile?.accessExpiry ? userProfile.accessExpiry.toDate().toLocaleDateString() : '30 Days Trial'}</>
              )}
            </span>
          </div>
        </div>

        <div className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <Shield className="w-3 h-3 mr-2 text-terminal-accent" />
              Participant Sentiment
            </div>
          </div>
          <div className="p-4 space-y-3">
            {data.participants.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded">
                <span className="text-xs font-bold text-gray-400">{p.name}</span>
                <div className={`flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  p.sentiment.toLowerCase().includes('bullish') ? 'bg-terminal-green/10 text-terminal-green' : 
                  p.sentiment.toLowerCase().includes('bearish') ? 'bg-terminal-red/10 text-terminal-red' : 
                  'bg-gray-500/10 text-gray-500'
                }`}>
                  {p.sentiment.toLowerCase().includes('bullish') ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {p.sentiment}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <Globe className="w-3 h-3 mr-2 text-terminal-accent" />
              Global Indices
            </div>
          </div>
          <div className="p-0 max-h-[300px] overflow-y-auto">
            {data.globalIndices.map((idx, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-terminal-border last:border-0 hover:bg-white/5 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-gray-400 uppercase">{idx.name}</span>
                  <span className="text-xs font-bold text-white">{idx.price}</span>
                </div>
                <span className={`text-[10px] font-bold ${idx.change.startsWith('+') ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {idx.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center - Chart & Ranges */}
      <div className="col-span-12 lg:col-span-6 space-y-4">
        <TradingViewWidget />
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="terminal-card p-4">
            <StatItem label="India VIX" value={data.indiaVix} color="text-terminal-accent" />
          </div>
          <div className="terminal-card p-4">
            <StatItem label="Daily Range" value={data.dailyRange} />
          </div>
          <div className="terminal-card p-4">
            <StatItem label="Weekly Range" value={data.weeklyRange} />
          </div>
        </div>

        {error && (
          <div className="bg-terminal-red/10 border border-terminal-red/20 p-4 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-terminal-red mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-terminal-red">Data Sync Error</h3>
              <p className="text-xs text-terminal-red/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="terminal-card p-4 flex items-center justify-between bg-terminal-accent/5 border-terminal-accent/20">
          <div className="flex items-center">
            <Clock className="w-3 h-3 text-gray-500 mr-2" />
            <span className="text-[10px] font-mono text-gray-500 uppercase">SYNC: {data.lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Technicals */}
      <div className="col-span-12 lg:col-span-3 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="terminal-card">
            <div className="terminal-header">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-2 text-terminal-accent" />
                15m Rev
              </div>
            </div>
            <div className="p-3 space-y-2">
              {data.reversals15m.map((t, i) => (
                <div key={i} className="text-[10px] font-mono bg-white/5 p-1.5 rounded text-center border border-white/5">
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="terminal-card">
            <div className="terminal-header">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-2 text-terminal-accent" />
                5m Rev
              </div>
            </div>
            <div className="p-3 space-y-2">
              {data.reversals5m.map((t, i) => (
                <div key={i} className="text-[10px] font-mono bg-white/5 p-1.5 rounded text-center border border-white/5">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-2 text-terminal-accent" />
              Support Levels
            </div>
          </div>
          <div className="p-4 space-y-2">
            {data.support.map((lvl, i) => (
              <div key={i} className="flex items-center text-xs font-bold text-terminal-green">
                <ChevronRight className="w-3 h-3 mr-2 opacity-50" />
                S{i+1}: {lvl}
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-2 text-terminal-red" />
              Resistance Levels
            </div>
          </div>
          <div className="p-4 space-y-2">
            {data.resistance.map((lvl, i) => (
              <div key={i} className="flex items-center text-xs font-bold text-terminal-red">
                <ChevronRight className="w-3 h-3 mr-2 opacity-50" />
                R{i+1}: {lvl}
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-card p-4 bg-terminal-card border-dashed border-terminal-border">
          <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-2">Market Insights</h4>
          <p className="text-xs text-gray-400 italic leading-relaxed">
            "Market sentiment is currently {data.globalSentiment.toLowerCase()}. 
            India VIX is at {data.indiaVix}, suggesting {parseFloat(data.indiaVix) > 18 ? 'high' : 'moderate'} volatility. 
            Monitor reversal timings for entry/exit precision."
          </p>
        </div>
      </div>
    </div>
  );

  const BacktestLab = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [backtestResults, setBacktestResults] = useState<{
      summary: {
        accuracy: string;
        profitPts: string;
        lossPts: string;
        totalPts: string;
        pnlInInr: string;
      };
      details: Array<{
        date: string;
        verdict: string;
        points: string;
        move: string;
      }>;
    } | null>(null);

    // Fetch initial results from Sheet1
    useEffect(() => {
      const fetchInitialResults = async () => {
        try {
          const response = await fetch('/api/backtest/current');
          if (response.ok) {
            const data = await response.json();
            
            // Handle both formats: {summary, details} or [accuracy, profit, ...]
            if (data && data.summary && Array.isArray(data.summary) && data.summary.length >= 5) {
              setBacktestResults({
                summary: {
                  accuracy: data.summary[0] || '0%',
                  profitPts: data.summary[1] || '0',
                  lossPts: data.summary[2] || '0',
                  totalPts: data.summary[3] || '0',
                  pnlInInr: data.summary[4] || '₹ 0'
                },
                details: data.details || []
              });
            } else if (Array.isArray(data) && data.length >= 5) {
              setBacktestResults({
                summary: {
                  accuracy: data[0] || '0%',
                  profitPts: data[1] || '0',
                  lossPts: data[2] || '0',
                  totalPts: data[3] || '0',
                  pnlInInr: data[4] || '₹ 0'
                },
                details: []
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch initial results:", err);
        }
      };
      fetchInitialResults();
    }, []);

    const handleRunBacktest = async () => {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 90) {
        alert("For accuracy, please select a maximum range of 3 months.");
        return;
      }

      setIsCalculating(true);
      setBacktestResults(null);

      try {
        // Use local proxy endpoint to bypass CORS
        const queryUrl = `/api/backtest?start=${startDate}&end=${endDate}`;
        
        console.log("Running backtest for:", startDate, "to", endDate);
        
        const response = await fetch(queryUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log("Backtest results received:", data);
        
        // Handle both formats: {summary, details} or [accuracy, profit, ...]
        if (data && data.summary && Array.isArray(data.summary) && data.summary.length >= 5) {
          setBacktestResults({
            summary: {
              accuracy: data.summary[0] || '0%',
              profitPts: data.summary[1] || '0',
              lossPts: data.summary[2] || '0',
              totalPts: data.summary[3] || '0',
              pnlInInr: data.summary[4] || '₹ 0'
            },
            details: data.details || []
          });
        } else if (Array.isArray(data) && data.length >= 5) {
          setBacktestResults({
            summary: {
              accuracy: data[0] || '0%',
              profitPts: data[1] || '0',
              lossPts: data[2] || '0',
              totalPts: data[3] || '0',
              pnlInInr: data[4] || '₹ 0'
            },
            details: []
          });
        } else if (data && data.error) {
          throw new Error(data.error);
        } else {
          console.error("Unexpected Data Format:", data);
          throw new Error(`Invalid data format received. Expected summary and details, got: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        console.error("Backtest Error:", err);
        alert(`Backtest failed: ${err instanceof Error ? err.message : 'Unknown error'}. 
        
1. Ensure your Google Apps Script is deployed as a Web App.
2. Ensure 'Who has access' is set to 'Anyone'.
3. Ensure your sheet has a tab named exactly 'Sheet1'.
4. Check that H7:H11 have values.`);
      } finally {
        setIsCalculating(false);
      }
    };

    const isProfit = backtestResults ? !backtestResults.summary.pnlInInr.includes('-') : false;

    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full space-y-6"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Backtest Research Lab</h2>
            <p className="text-gray-400 text-sm mt-2 font-mono">Institutional Strategy Validation Engine</p>
          </div>

          <div className="terminal-card p-8 bg-terminal-card/50 backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded p-3 text-white focus:border-terminal-accent outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded p-3 text-white focus:border-terminal-accent outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleRunBacktest}
              disabled={isCalculating}
              className={`w-full py-4 rounded font-bold text-sm flex items-center justify-center transition-all ${
                isCalculating 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-terminal-accent hover:bg-terminal-accent/80 text-white shadow-lg shadow-terminal-accent/20'
              }`}
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  CALCULATING PERFORMANCE...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  START BACKTEST
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {backtestResults && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="terminal-card overflow-hidden"
              >
                <div className="terminal-header">
                  <div className="flex items-center">
                    <BarChart3 className="w-3 h-3 mr-2 text-terminal-accent" />
                    Performance Card
                  </div>
                  <span className="text-[9px] font-mono text-gray-500">PERIOD: {startDate} TO {endDate}</span>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">Accuracy</span>
                    <span className="text-2xl font-black text-white">{backtestResults.summary.accuracy}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">Profit Pts</span>
                    <span className="text-2xl font-black text-terminal-green">{backtestResults.summary.profitPts}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">Loss Pts</span>
                    <span className="text-2xl font-black text-terminal-red">{backtestResults.summary.lossPts}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">Total Pts</span>
                    <span className="text-2xl font-black text-white">{backtestResults.summary.totalPts}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">P/L (₹)</span>
                    <span className={`text-2xl font-black ${isProfit ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {backtestResults.summary.pnlInInr}
                    </span>
                  </div>
                </div>

                {/* Detailed Logs Table */}
                {backtestResults.details && backtestResults.details.length > 0 && (
                  <div className="border-t border-terminal-border">
                    <div className="terminal-header bg-black/20">
                      <div className="flex items-center">
                        <LineChart className="w-3 h-3 mr-2 text-terminal-accent" />
                        Detailed Backtest Logs
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-terminal-border bg-black/40">
                            <th className="p-3 text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="p-3 text-gray-500 uppercase tracking-wider">Verdict</th>
                            <th className="p-3 text-gray-500 uppercase tracking-wider">Points</th>
                            <th className="p-3 text-gray-500 uppercase tracking-wider">Move</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResults.details.map((row, idx) => (
                            <tr key={idx} className="border-b border-terminal-border/50 hover:bg-white/5 transition-colors">
                              <td className="p-3 text-white">{row.date}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  row.verdict.toUpperCase().includes('BULL') || row.verdict.toUpperCase().includes('BUY')
                                  ? 'bg-terminal-green/20 text-terminal-green'
                                  : row.verdict.toUpperCase().includes('BEAR') || row.verdict.toUpperCase().includes('SELL')
                                  ? 'bg-terminal-red/20 text-terminal-red'
                                  : 'bg-gray-800 text-gray-400'
                                }`}>
                                  {row.verdict}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-white">{row.points}</td>
                              <td className="p-3">
                                <span className={row.move.toUpperCase().includes('UP') || row.move.includes('+') || row.move.toUpperCase().includes('YES') ? 'text-terminal-green' : 'text-terminal-red'}>
                                  {row.move}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center space-x-2 text-[10px] font-mono text-gray-600 uppercase">
            <Shield className="w-3 h-3" />
            <span>Institutional Grade Validation • 90-Day Max Range</span>
          </div>
        </motion.div>
      </div>
    );
  };

  const GannScalping = () => {
    const [price, setPrice] = useState<string>('');
    const [results, setResults] = useState<{
      buy: { sl: string; entry: string; targets: string[] };
      sell: { sl: string; entry: string; targets: string[] };
    } | null>(null);

    const targetDegrees = [30, 45, 60, 90, 120, 150, 180, 225, 270, 315, 360];

    const calculateGann = () => {
      const refPrice = parseFloat(price);
      if (isNaN(refPrice) || refPrice <= 0) {
        alert("Please enter a valid positive price.");
        return;
      }

      const sqCal = Math.sqrt(refPrice);

      // Entry at 15 degrees
      const buyEntryVal = Math.pow(sqCal + (15 / 180), 2);
      const sellEntryVal = Math.pow(sqCal - (15 / 180), 2);

      // Buy Levels
      const buyEntry = buyEntryVal.toFixed(2);
      const buySL = sellEntryVal.toFixed(2);
      const buyTargets = targetDegrees.map(deg => 
        Math.pow(sqCal + (deg / 180), 2).toFixed(2)
      );

      // Sell Levels
      const sellEntry = sellEntryVal.toFixed(2);
      const sellSL = buyEntryVal.toFixed(2);
      const sellTargets = targetDegrees.map(deg => 
        Math.pow(sqCal - (deg / 180), 2).toFixed(2)
      );

      setResults({
        buy: { sl: buySL, entry: buyEntry, targets: buyTargets },
        sell: { sl: sellSL, entry: sellEntry, targets: sellTargets }
      });
    };

    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >
          <div className="text-center">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Gann Scalping Calculator</h2>
            <p className="text-gray-400 text-sm mt-2 font-mono">Mathematical Precision for Intraday Levels</p>
          </div>

          <div className="terminal-card p-8 bg-terminal-card/50 backdrop-blur-md max-w-md mx-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Reference Price (LTP / 5m Close)</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter Price..."
                  className="w-full bg-terminal-bg border border-terminal-border rounded p-3 text-white focus:border-terminal-accent outline-none transition-colors font-mono"
                />
              </div>
              <button 
                onClick={calculateGann}
                className="w-full py-4 bg-terminal-accent hover:bg-terminal-accent/80 text-white rounded font-bold text-sm flex items-center justify-center transition-all shadow-lg shadow-terminal-accent/20"
              >
                <Calculator className="w-4 h-4 mr-2" />
                CALCULATE LEVELS
              </button>
            </div>
          </div>

          <AnimatePresence>
            {results && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Buy Table */}
                <div className="terminal-card overflow-hidden border-terminal-green/30">
                  <div className="terminal-header bg-terminal-green/10 border-terminal-green/20">
                    <div className="flex items-center text-terminal-green">
                      <TrendingUp className="w-3 h-3 mr-2" />
                      BUYING LEVELS (BULLISH)
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-terminal-border bg-black/40">
                          <th className="p-3 text-gray-500 uppercase tracking-wider">STOP LOSS</th>
                          <th className="p-3 text-terminal-green uppercase tracking-wider">BUY ENTRY</th>
                          {results.buy.targets.map((_, i) => (
                            <th key={i} className="p-3 text-gray-500 uppercase tracking-wider">TARGET {i+1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-terminal-red font-bold">{results.buy.sl}</td>
                          <td className="p-4 text-terminal-green font-black text-sm">{results.buy.entry}</td>
                          {results.buy.targets.map((t, i) => (
                            <td key={i} className="p-4 text-white">{t}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sell Table */}
                <div className="terminal-card overflow-hidden border-terminal-red/30">
                  <div className="terminal-header bg-terminal-red/10 border-terminal-red/20">
                    <div className="flex items-center text-terminal-red">
                      <TrendingDown className="w-3 h-3 mr-2" />
                      SELLING LEVELS (BEARISH)
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-terminal-border bg-black/40">
                          <th className="p-3 text-gray-500 uppercase tracking-wider">STOP LOSS</th>
                          <th className="p-3 text-terminal-red uppercase tracking-wider">SELL ENTRY</th>
                          {results.sell.targets.map((_, i) => (
                            <th key={i} className="p-3 text-gray-500 uppercase tracking-wider">TARGET {i+1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-terminal-green font-bold">{results.sell.sl}</td>
                          <td className="p-4 text-terminal-red font-black text-sm">{results.sell.entry}</td>
                          {results.sell.targets.map((t, i) => (
                            <td key={i} className="p-4 text-white">{t}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="terminal-card p-6 border-terminal-red/20 bg-terminal-red/5">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-terminal-red shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-terminal-red uppercase tracking-widest">Risk Disclosure & Disclaimer</span>
                      <p className="text-[11px] font-mono text-gray-400 leading-relaxed">
                        Trading involves significant risk. Dr. Ravi Shankar Kumar, the team, or information provided on any platform is not responsible for any loss or profit incurred by you. I am not SEBI registered. All calculations are for educational purposes based on W.D. Gann Square of 9 Principles.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  };

  const RiskManagement = () => {
    const [capital, setCapital] = useState(100000);
    const [riskPercent, setRiskPercent] = useState(1);
    const [stopLoss, setStopLoss] = useState(20);
    const [lotSize, setLotSize] = useState(65); // Nifty default
    const [numTrades, setNumTrades] = useState(20); // Default 20 trades

    const riskPerTrade = capital * (riskPercent / 100);
    const rawQuantity = stopLoss > 0 ? riskPerTrade / stopLoss : 0;
    const lots = Math.floor(rawQuantity / lotSize);
    const actualQuantity = lots * lotSize;
    const actualRisk = actualQuantity * stopLoss;
    
    // Funds allocated for one trade
    const fundsPerTrade = capital / numTrades;

    // For Max Premium, if they can't even afford 1 lot risk-wise, 
    // show them the max premium they could pay for 1 lot with their capital.
    const maxPremium = lots > 0 
      ? Math.floor(fundsPerTrade / actualQuantity) 
      : Math.floor(fundsPerTrade / lotSize);

    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Risk Management Lab</h2>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Precision Calculator for Indian Option Buyers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="terminal-card p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Trading Capital (₹)</label>
                <input 
                  type="number" 
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32 text-right"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase">
                  <span>Risk Per Trade (%)</span>
                  <span className="text-terminal-accent">{riskPercent}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="10" 
                  step="0.5"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full accent-terminal-accent"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Stop Loss (Points)</label>
                <input 
                  type="number" 
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-24 text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Number of Trades</label>
                <select 
                  value={numTrades}
                  onChange={(e) => setNumTrades(Number(e.target.value))}
                  className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32"
                >
                  <option value={10}>10 Trades</option>
                  <option value={15}>15 Trades</option>
                  <option value={20}>20 Trades</option>
                  <option value={25}>25 Trades</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Lot Size</label>
                <select 
                  value={lotSize}
                  onChange={(e) => setLotSize(Number(e.target.value))}
                  className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32"
                >
                  <option value={65}>NIFTY (65)</option>
                  <option value={30}>BANKNIFTY (30)</option>
                  <option value={60}>FINNIFTY (60)</option>
                  <option value={20}>SENSEX (20)</option>
                  <option value={120}>MIDCPNIFTY (120)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="terminal-card p-6 bg-terminal-accent/5 border-terminal-accent/30">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Risk Amount</span>
                  <div className="text-xl font-black text-terminal-accent">₹{riskPerTrade.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Max Lots</span>
                  <div className="text-xl font-black text-white">{lots > 0 ? lots : 0} <span className="text-[10px] text-gray-500">LOTS</span></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Quantity</span>
                  <div className="text-xl font-black text-white">{Math.floor(rawQuantity)} <span className="text-[10px] text-gray-500">UNITS</span></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Max Premium Price</span>
                  <div className="text-xl font-black text-terminal-green">₹{maxPremium.toLocaleString()}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-terminal-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Funds Per Trade (at {numTrades} Trades)</span>
                    <div className="text-lg font-black text-white">₹{fundsPerTrade.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="terminal-card p-4 border-terminal-accent/20">
              <div className="flex items-start space-x-3">
                <Shield className="w-4 h-4 text-terminal-accent mt-0.5" />
                <p className="text-[10px] font-mono text-gray-400 leading-relaxed uppercase">
                  Strategy: Never risk more than <span className="text-white">2%</span> of your capital on a single trade. 
                  Always trade with a defined <span className="text-white">Stop Loss</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PricingPage = () => {
    const getPriceInfo = () => {
      const basePrice = 25999;
      const earlyBirdPrice = 15599;
      if (!userProfile) return { price: earlyBirdPrice, originalPrice: basePrice, discount: 40, isNew: true };
      
      const registrationDate = userProfile.createdAt?.toDate() || new Date();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - registrationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isNewUser = diffDays <= 30;
      const discount = isNewUser ? 0.4 : 0.3;
      const finalPrice = Math.floor(basePrice * (1 - discount));
      
      return { price: finalPrice, originalPrice: basePrice, discount: Math.round(discount * 100), isNew: isNewUser };
    };

    const priceInfo = getPriceInfo();

    return (
      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Upgrade Your Edge</h2>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">Institutional Grade Tools for Serious Traders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Basic Terminal Box */}
          <div className="terminal-card p-8 flex flex-col border-terminal-border bg-terminal-card/30">
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-mono text-gray-400 uppercase tracking-widest">Basic Terminal</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-white">FREE</span>
              </div>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Limited Access for Registered Users</p>
            </div>
            <ul className="space-y-3 mb-12 flex-1">
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-gray-600" />
                30-Day Trial: Trading Terminal
              </li>
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-gray-600" />
                30-Day Trial: O.I Analysis
              </li>
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-terminal-green" />
                Lifetime: Indicator Access
              </li>
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-terminal-green" />
                Lifetime: Gann Scalping
              </li>
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-terminal-green" />
                Lifetime: Risk Management
              </li>
              <li className="flex items-start text-[11px] font-mono text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-terminal-green" />
                Lifetime: Backtest Lab
              </li>
            </ul>
            <button 
              onClick={() => protectView('dashboard')}
              className="w-full py-4 text-center text-[10px] font-mono text-gray-500 uppercase border border-white/5 bg-white/5 rounded hover:bg-white/10 hover:text-white transition-all"
            >
              {user ? 'Access Terminal' : 'Registration Required'}
            </button>
          </div>

          {/* Pro Trader Box */}
          <div className="terminal-card p-8 flex flex-col relative border-terminal-accent shadow-[0_0_30px_rgba(242,125,38,0.2)] bg-terminal-accent/5 overflow-hidden">
            <div className="absolute top-4 -right-12 bg-red-600 text-white text-[10px] font-black px-12 py-1 rotate-45 uppercase tracking-widest shadow-lg">
              LIMIT TIME
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-mono text-terminal-accent uppercase tracking-widest">Premium</h3>
                <Zap className="w-3 h-3 text-terminal-accent" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Become a Pro Trader</h3>
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl font-black text-white">₹{priceInfo.price.toLocaleString()}*</span>
                  <span className="text-lg text-gray-500 line-through">₹{priceInfo.originalPrice.toLocaleString()}</span>
                </div>
                <p className="text-[10px] font-mono text-terminal-accent uppercase italic">
                  *Early Bird: {priceInfo.discount}% Off Valid for 30 Days.
                </p>
              </div>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-12 flex-1">
              {[
                'Full Trading Terminal',
                'Institutional O.I Decoder',
                'Premium Indicators',
                'Advanced S&R Levels',
                'Reversal Timings',
                'Private Community',
                'Lifetime Updates',
                'Priority Support'
              ].map((feature) => (
                <li key={feature} className="flex items-start text-[11px] font-mono text-gray-300">
                  <ChevronRight className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-terminal-accent" />
                  {feature}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setView('checkout')}
              className="w-full py-5 rounded font-black text-sm uppercase tracking-[0.3em] transition-all bg-terminal-accent text-black hover:bg-terminal-accent/90 shadow-[0_0_20px_rgba(242,125,38,0.4)]"
            >
              Claim Discount
            </button>
          </div>
        </div>
      </div>
    );
  };

  const IndicatorsPage = () => {
    const [filter, setFilter] = useState('All');
    const [selectedIndicator, setSelectedIndicator] = useState<any>(null);

    const categories = ["All", "Premium", "S&R", "Gann", "Options"];
    
    const indicators = [
      // Group 1: Hero Indicators (Premium)
      {
        id: 'buy-decodex',
        name: "DecodeX Premium",
        category: "Premium",
        icon: Zap,
        price: "₹2,999",
        offerPrice: "₹2,249",
        image: "https://lh3.googleusercontent.com/d/13eaXlyk90S3Ps9z3NyD8QIcZnmZCp6T7",
        features: ["Bullish/Bearish signals", "Entry, SL, Target", "Trailing SL & Fibonacci Levels"],
        about: "The flagship indicator that decodes institutional footprints in real-time. Built for precision scalping and trend following."
      },
      {
        id: 'buy-biaspro',
        name: "BiasPro",
        category: "Premium",
        icon: Target,
        price: "₹1,999",
        offerPrice: "₹1,499",
        image: "https://lh3.googleusercontent.com/d/1QXE1ip1_R2lYmtFYZWGEZSypMmevyNwZ",
        features: ["Daily Bullish/Bearish Bias", "Buy/Sell signals", "SL/Target"],
        about: "Identifies the daily market bias to help you stay on the right side of the trend."
      },
      {
        id: 'buy-ebgspro',
        name: "EBGS PRO",
        category: "Premium",
        icon: Activity,
        price: "₹1,999",
        offerPrice: "₹1,499",
        image: "https://lh3.googleusercontent.com/d/17Mhi_zLdZjbR5NiO05iYnmSHk2mXvoAe",
        features: ["Predicts Market Strength", "Sideways/Volatile/Trendy", "Buy/Sell/Reversal signals"],
        about: "Predicts market strength and provides signals based on volatility and trend analysis."
      },
      {
        id: 'buy-fibpro',
        name: "FIBONACCI PRO",
        category: "Premium",
        icon: Layers,
        price: "₹1,999",
        offerPrice: "₹1,499",
        image: "https://lh3.googleusercontent.com/d/1v6yzKEdtfTSYMrEuDwoRxkOeTFP2PxiO",
        features: ["Trend analysis", "Buy/Sell signals", "Entry, SL, Target"],
        about: "Advanced Fibonacci-based trend analysis and signal generation."
      },
      // Group 2: Support & Resistance
      {
        id: 'buy-intraday-sr',
        name: "Intraday S&R Levels",
        category: "S&R",
        icon: Hash,
        price: "₹699",
        offerPrice: "₹524",
        image: "https://lh3.googleusercontent.com/d/1ZBCgBVFGzMZAoGBfwQO8eCVRfWPK0aVu",
        features: ["Precise daily levels", "Dynamic updates", "High accuracy"],
        about: "Precise daily support and resistance levels for intraday trading."
      },
      {
        id: 'buy-swing-dynamic',
        name: "Swing Dynamic Levels",
        category: "S&R",
        icon: Hash,
        price: "₹699",
        offerPrice: "₹524",
        image: "https://lh3.googleusercontent.com/d/16j8qwQAGm3L6JptcWJjG-qaVReZu7AOz",
        features: ["For Swing/Long-term indices", "Dynamic levels", "Trend following"],
        about: "Dynamic levels designed for swing and long-term index trading."
      },
      {
        id: 'buy-swing-lock',
        name: "Swing Lock Levels",
        category: "S&R",
        icon: Hash,
        price: "₹699",
        offerPrice: "₹524",
        image: "https://lh3.googleusercontent.com/d/1RPNahD9RA9fj9J_6ZypM2BFIOS-v11vU",
        features: ["Indices and Equity both", "Swing/Long-term", "Lock levels"],
        about: "Locked-in levels for both indices and equities, perfect for swing trading."
      },
      {
        id: 'buy-gann-equity',
        name: "Gann Equity Levels",
        category: "S&R",
        icon: Hash,
        price: "₹699",
        offerPrice: "₹524",
        image: "https://lh3.googleusercontent.com/d/14tgl_2KOCKMTdshxKzGNUCphE1Rg1FJU",
        features: ["Specialized S&R for equities", "Gann-based", "High precision"],
        about: "Specialized support and resistance levels for equities based on Gann principles."
      },
      // Group 3: Reversal & Timing (Gann Concepts)
      {
        id: 'buy-intraday-reversal',
        name: "Intraday Reversal Indicator",
        category: "Gann",
        icon: Clock,
        price: "₹1,499",
        offerPrice: "₹1,124",
        image: "https://lh3.googleusercontent.com/d/1hJ1TGekzJ_WGhEpvktFcUAK2Q51ek2Tf",
        features: ["Spotting trend shifts", "Reversal alerts", "Intraday focus"],
        about: "Identifies potential trend shifts and reversals in intraday charts."
      },
      {
        id: 'buy-price-time',
        name: "Price Time Reversal Engines",
        category: "Gann",
        icon: Clock,
        price: "₹1,499",
        offerPrice: "₹1,124",
        image: "https://lh3.googleusercontent.com/d/1iXnjr9OTk1uWga9KfYNICbNy5m0kAhPJ",
        features: ["Advanced Price-Time Squaring", "Market timing", "Gann cycles"],
        about: "Advanced engine for price-time squaring and identifying market reversal points."
      },
      {
        id: 'buy-time-prediction',
        name: "Time Prediction Indicator",
        category: "Gann",
        icon: Clock,
        price: "₹1,499",
        offerPrice: "₹1,124",
        image: "https://lh3.googleusercontent.com/d/1uoQ-78DlLLx16u5IIkorAKQHCpEmlfGj",
        features: ["Pure Gann time cycles", "Future time prediction", "Cycle analysis"],
        about: "Predicts future market movements based on pure Gann time cycles."
      },
      // Group 4: Options & Utilities
      {
        id: 'buy-ce-pe',
        name: "CE/PE Indicator",
        category: "Options",
        icon: Cpu,
        price: "₹999",
        offerPrice: "₹749",
        image: "https://lh3.googleusercontent.com/d/1o8T8Ep1vP63GkmRPlljtknJ8qTgq5PfE",
        features: ["Draws levels for options", "Targets & Trailing price", "CE/PE specific"],
        about: "Specifically designed for options trading, providing levels and targets for CE and PE."
      },
      {
        id: 'buy-universal-sl',
        name: "Universal Stoploss",
        category: "Options",
        icon: Shield,
        price: "₹799",
        offerPrice: "₹599",
        image: "https://lh3.googleusercontent.com/d/1j32Y3H4kSiXgi4r76uWuqgEDp9Vhl0DI",
        features: ["Precision risk management", "Universal application", "Dynamic SL"],
        about: "A precision risk management tool that provides dynamic stop-loss levels for any instrument."
      }
    ];

    const filteredIndicators = filter === 'All' 
      ? indicators 
      : indicators.filter(ind => ind.category === filter);

    return (
      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Premium Indicators</h2>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">Institutional Grade Tools for Retail Traders</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest transition-all border ${
                  filter === cat 
                  ? 'bg-terminal-accent border-terminal-accent text-black font-bold' 
                  : 'bg-white/5 border-terminal-border text-gray-400 hover:border-terminal-accent/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredIndicators.map((ind) => (
            <motion.div
              layout
              key={ind.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="terminal-card group flex flex-col"
            >
              <div className="p-6 border-b border-terminal-border flex items-center justify-between bg-white/5">
                <div className="flex items-center">
                  <ind.icon className="w-5 h-5 text-terminal-accent mr-3" />
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">{ind.name}</h3>
                </div>
                <span className="text-[10px] font-mono text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded border border-terminal-accent/20">
                  {ind.category}
                </span>
              </div>
              
              <div className="aspect-video relative overflow-hidden bg-black/40">
                <img 
                  src={ind.image} 
                  alt={ind.name} 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-terminal-bg to-transparent opacity-60" />
                <div className="absolute bottom-4 left-6 flex flex-col">
                  <span className="text-xs text-gray-400 line-through font-mono">{ind.price}</span>
                  <span className="text-2xl font-black text-terminal-green">{ind.offerPrice}</span>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  {ind.about}
                </p>
                
                <ul className="space-y-3 flex-1">
                  {ind.features.map((feat, i) => (
                    <li key={i} className="flex items-start text-[10px] font-mono text-gray-300">
                      <ChevronRight className="w-3 h-3 mr-2 mt-0.5 text-terminal-accent" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => setSelectedIndicator(ind)}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white hover:bg-terminal-accent hover:text-black hover:border-terminal-accent transition-all rounded font-black text-xs uppercase tracking-widest"
                >
                  Get Access
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {selectedIndicator && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedIndicator(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-terminal-card border border-terminal-border rounded-xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-terminal-border flex items-center justify-between bg-white/5">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-terminal-accent mr-3" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Secure Checkout</h3>
                  </div>
                  <button onClick={() => setSelectedIndicator(null)} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Item</span>
                      <span className="text-sm font-bold text-white uppercase">{selectedIndicator.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Amount</span>
                      <span className="text-xl font-black text-terminal-accent">{selectedIndicator.offerPrice}</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Scan to Pay via UPI</span>
                    <div className="w-48 h-48 bg-white p-2 mx-auto rounded-lg shadow-inner overflow-hidden">
                      <img 
                        src="https://lh3.googleusercontent.com/d/1uYfS0FQDtFJi_r4D0eootQ6sggu4HWT4" 
                        alt="UPI QR Code" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">UPI ID:</span>
                      <div className="text-sm font-bold text-white font-mono bg-white/5 py-2 px-4 rounded border border-white/10 inline-block">
                        8271890090@upi
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        const message = encodeURIComponent(`Hello RSK, I have paid for the ${selectedIndicator.name} indicator. Please activate it.`);
                        window.open(`https://wa.me/918271890090?text=${message}`, '_blank');
                      }}
                      className="w-full py-4 bg-terminal-green text-black hover:bg-terminal-green/90 transition-all rounded font-black text-xs uppercase tracking-widest flex items-center justify-center"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Confirm Payment on WhatsApp
                    </button>
                    <p className="text-[9px] font-mono text-gray-500 text-center uppercase">
                      After payment, send a screenshot on WhatsApp for instant activation.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const menuItems = [
    { label: 'HOME', icon: Monitor, view: 'landing' },
    { label: 'TRADING TERMINAL', icon: Activity, view: 'dashboard' },
    { label: 'BACKTEST LAB', icon: Calculator, view: 'backtest' },
    { label: 'O.I ANALYSIS', icon: BarChart3, view: 'oi' },
    { label: 'INDICATORS', icon: LineChart, view: 'indicators' },
    { label: 'RISK MANAGEMENT', icon: Shield, view: 'risk' },
    { label: 'GANN SCALPING', icon: Target, view: 'gann' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-terminal-bg text-gray-300">
      {/* Navigation Bar */}
      <nav className="h-16 border-b border-terminal-border bg-terminal-card px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div 
          className="flex items-center cursor-pointer group"
          onClick={() => setView('landing')}
        >
          <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 border border-terminal-border group-hover:border-terminal-accent transition-colors">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter text-white leading-none">
              DECODE<span className="text-terminal-accent">X</span>MARKET
            </span>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
              with RSK
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8">
          {menuItems.filter(item => ['HOME', 'TRADING TERMINAL', 'BACKTEST LAB', 'INDICATORS'].includes(item.label)).map((item) => (
            <button 
              key={item.label}
              onClick={() => {
                if (item.view === 'landing') {
                  setView('landing');
                } else {
                  protectView(item.view as any);
                }
              }}
              className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
                (view === item.view && (item.label === 'TRADING TERMINAL' || item.label === 'BACKTEST LAB' || item.label === 'GANN SCALPING' || item.label === 'O.I ANALYSIS')) || (view === 'landing' && item.label === 'HOME')
                ? 'text-terminal-accent' : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          
          {user ? (
            <div className="flex items-center space-x-4 pl-4 border-l border-terminal-border">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white uppercase leading-tight">{userProfile?.displayName || user.email?.split('@')[0]}</span>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-mono text-terminal-accent uppercase tracking-widest leading-tight">{userProfile?.role || 'User'}</span>
                  <span className="text-[7px] font-mono text-gray-500 uppercase tracking-tighter leading-tight">
                    {userProfile?.accessLevel === 1 ? 'Lifetime Access' : (
                      <>Expiry: {userProfile?.accessExpiry ? userProfile.accessExpiry.toDate().toLocaleDateString() : '30 Days Trial'}</>
                    )}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-terminal-red transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setView('auth')}
              className="bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-terminal-accent/20 transition-all"
            >
              Login
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile Expiry */}
          {user && (
            <div className="md:hidden flex flex-col items-end mr-2">
              <span className="text-[7px] font-mono text-terminal-accent uppercase tracking-tighter leading-tight">
                {userProfile?.accessLevel === 1 ? 'Lifetime' : (
                  <>{userProfile?.accessExpiry ? userProfile.accessExpiry.toDate().toLocaleDateString() : 'Trial'}</>
                )}
              </span>
            </div>
          )}
          {/* Hamburger Menu Button */}
          <button 
            className="text-gray-400 hover:text-white p-2"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-64 bg-terminal-card border-l border-terminal-border z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 flex items-center justify-end border-b border-terminal-border bg-terminal-bg/50">
                <button onClick={toggleMenu} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-terminal-card">
                {menuItems.map((item) => (
                  <button 
                    key={item.label}
                    onClick={() => {
                      if (item.view === 'landing') {
                        setView('landing');
                        setIsMenuOpen(false);
                      } else {
                        protectView(item.view as any);
                      }
                    }}
                    className={`flex items-center w-full p-3 rounded border transition-all duration-200 group ${
                      view === item.view 
                      ? 'bg-terminal-accent/10 border-terminal-accent/50 text-terminal-accent' 
                      : 'bg-terminal-bg/30 border-terminal-border/50 text-gray-400 hover:border-terminal-accent/30 hover:bg-terminal-accent/5'
                    }`}
                  >
                    <div className={`p-1.5 rounded mr-3 transition-colors ${
                      view === item.view ? 'bg-terminal-accent/20' : 'bg-terminal-bg group-hover:bg-terminal-accent/10'
                    }`}>
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-terminal-border bg-terminal-bg/30">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-terminal-accent/20 flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-terminal-accent" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase">{userProfile?.displayName || user.email?.split('@')[0]}</span>
                        <span className="text-[8px] font-mono text-gray-500 uppercase">{userProfile?.role || 'User'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-terminal-red transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setView('auth');
                      setIsMenuOpen(false);
                    }}
                    className="w-full py-3 bg-terminal-accent text-white rounded font-bold text-[10px] uppercase tracking-widest"
                  >
                    Login / Register
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notice Bar (Below Pulse) */}
      {view === 'dashboard' && (
        <div className="bg-terminal-accent/10 border-b border-terminal-accent/20 py-2 px-4 flex items-center justify-center overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3"
          >
            <div className="flex items-center bg-terminal-accent/20 px-2 py-0.5 rounded border border-terminal-accent/30">
              <Info className="w-3 h-3 text-terminal-accent mr-1.5" />
              <span className="text-[10px] font-bold text-terminal-accent uppercase tracking-wider">NOTICE</span>
            </div>
            <span className="text-[10px] md:text-xs font-mono text-gray-300 uppercase tracking-wide text-center">
              Visit after <span className="text-white font-bold">10:00 PM - 11:00 PM</span> for updated post-market analysis.
            </span>
          </motion.div>
        </div>
      )}

      {/* Pulse Header (Only on Dashboard) */}
      {view === 'dashboard' && (
        <header className="bg-terminal-card border-b border-terminal-border h-12 flex items-center overflow-hidden">
          <div className="px-4 border-r border-terminal-border h-full flex items-center bg-terminal-bg z-10">
            <Activity className="w-4 h-4 text-terminal-accent mr-2" />
            <span className="text-xs font-bold tracking-widest uppercase">PULSE</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="ticker-scroll flex items-center space-x-12 px-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-500 uppercase font-mono">INDIA VIX:</span>
                <span className="text-xs font-bold text-terminal-accent">{data.indiaVix}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-500 uppercase font-mono">GLOBAL SENTIMENT:</span>
                <span className={`text-xs font-bold ${getSentimentColor(data.globalSentiment)}`}>{data.globalSentiment}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-500 uppercase font-mono">MASTER SIGNAL:</span>
                <span className="text-xs font-bold text-white bg-terminal-accent/20 px-2 py-0.5 rounded">{data.masterSignal}</span>
              </div>
              {data.globalIndices.map((idx, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">{idx.name}:</span>
                  <span className={`text-xs font-bold ${idx.change.startsWith('+') ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {idx.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 border-l border-terminal-border h-full flex items-center bg-terminal-bg z-10">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
        </header>
      )}

      {/* View Content */}
      <main className="flex-1 flex flex-col">
        {!authReady ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-terminal-accent animate-spin" />
          </div>
        ) : view === 'auth' ? (
          <AuthPage onAuthSuccess={() => setView('dashboard')} />
        ) : view === 'landing' ? (
          <LandingPage />
        ) : view === 'dashboard' ? (
          <Dashboard />
        ) : view === 'backtest' ? (
          <BacktestLab />
        ) : view === 'oi' ? (
          <OIAnalysis />
        ) : view === 'gann' ? (
          <GannScalping />
        ) : view === 'risk' ? (
          <RiskManagement />
        ) : view === 'pricing' ? (
          <PricingPage />
        ) : view === 'indicators' ? (
          <IndicatorsPage />
        ) : view === 'checkout' ? (
          <CheckoutPage />
        ) : view === 'redeem-success' ? (
          <RedeemSuccessPage />
        ) : view === 'user-management' ? (
          <UserManagement />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-terminal-card border-t border-terminal-border px-6 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: About */}
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tighter text-white">
              DECODE<span className="text-terminal-accent">X</span>MARKET
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Where Data meets Time Cycles. An educational platform for market analysis enthusiasts.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">SENSEX</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-accent" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">BANKNIFTY</span>
              </div>
            </div>
          </div>

          {/* Column 2: Features */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono text-terminal-accent uppercase tracking-[0.3em]">Core Analysis</h4>
            <ul className="space-y-2 text-xs text-gray-400 font-mono">
              <li className="flex items-center hover:text-white transition-colors cursor-default">
                <ChevronRight className="w-3 h-3 mr-2 text-terminal-accent/50" />
                Daily FII/DII Decoding
              </li>
              <li className="flex items-center hover:text-white transition-colors cursor-default">
                <ChevronRight className="w-3 h-3 mr-2 text-terminal-accent/50" />
                AstroIndicator Reversals
              </li>
              <li className="flex items-center hover:text-white transition-colors cursor-default">
                <ChevronRight className="w-3 h-3 mr-2 text-terminal-accent/50" />
                S&R Levels that Hold
              </li>
              <li className="flex items-center hover:text-white transition-colors cursor-default">
                <ChevronRight className="w-3 h-3 mr-2 text-terminal-accent/50" />
                Nifty & BankNifty Predictions
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Links & Contact */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono text-terminal-accent uppercase tracking-[0.3em]">Quick Links</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
                {menuItems.map((item) => (
                  <button 
                    key={item.label} 
                    onClick={() => setView(item.view as any)} 
                    className="text-left hover:text-white transition-colors uppercase"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-mono text-terminal-accent uppercase tracking-[0.3em]">Contact Us</h4>
              <div className="space-y-2 text-xs text-gray-400 font-mono">
                <a href="https://wa.me/918271890090" target="_blank" rel="noreferrer" className="flex items-center hover:text-white transition-colors">
                  <MessageSquare className="w-3 h-3 mr-2 text-terminal-green" />
                  WhatsApp: 8271890090
                </a>
                <a href="mailto:rk867000@gmail.com" className="flex items-center hover:text-white transition-colors">
                  <Mail className="w-3 h-3 mr-2 text-terminal-accent" />
                  rk867000@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Box */}
        <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-lg">
          <p className="text-[11px] text-red-200/70 leading-relaxed font-mono text-center">
            <span className="text-red-400 font-bold mr-2">IMPORTANT:</span> 
            I am NOT SEBI registered. Trading is NOT my full-time career. All information is for educational purposes only. 
            My market study should NOT be taken as buy/sell recommendations.
          </p>
        </div>

        <div className="mt-12 pt-6 border-t border-terminal-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[10px] font-mono text-gray-600">© 2026 DECODEXMARKET • ALL RIGHTS RESERVED</span>
          <span className="text-[10px] font-mono text-gray-600">SYSTEM STATUS: <span className="text-terminal-green">OPTIMAL</span></span>
        </div>
      </footer>
    </div>
  );
}
