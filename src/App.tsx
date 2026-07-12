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
  BookOpen,
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
  GoogleAuthProvider,
  signInWithPopup,
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

import AstrologySection from './components/AstrologySection';
import GannConceptsSection from './components/GannConceptsSection';
import StockMarketNewsSection from './components/StockMarketNewsSection';
import AstroAiChat from './components/AstroAiChat';
import { TradingJournalMain } from './components/TradingJournal/TradingJournalMain';
import { Sparkles, Compass, Newspaper } from 'lucide-react';

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

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if user's document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const userDoc = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Google User',
          role: user.email === 'rshankartrader@gmail.com' ? 'admin' : 'user',
          accessLevel: 0, // Level 0: Registered (30-day trial)
          accessCode: generatedCode,
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        };
        await setDoc(userDocRef, userDoc);
        
        // Notify Admin
        fetch('/api/admin/notify-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            userName: user.displayName || 'Google User',
            userUid: user.uid,
            accessCode: generatedCode
          })
        }).catch(err => console.error("Failed to notify admin:", err));
      } else {
        // Doc exists, check if user is locked
        if (userDocSnap.data().isLocked) {
          await signOut(auth);
          setError("Your access to the terminal has been locked by the administrator. Please contact support.");
          setLoading(false);
          return;
        }
        await updateDoc(userDocRef, {
          lastLogin: Timestamp.now()
        }).catch(e => console.error("Could not update lastLogin:", e));
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized Domain: Google Sign-In is blocked because '${window.location.hostname}' is not authorized. Please open the Firebase Console, navigate to 'Authentication' > 'Settings' > 'Authorized Domains', and add '${window.location.hostname}' to the list.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Operation Not Allowed: Google Sign-In is not enabled. Please open the Firebase Console, go to 'Authentication' > 'Sign-in method', and enable the Google provider.");
      } else if (err.code === 'auth/network-request-failed') {
        setError(`Network error: This usually happens if the domain '${window.location.hostname}' is not added to 'Authorized Domains' in the Firebase Console. Please check settings.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup closed before completion. Please try again.");
      } else {
        setError(err.message);
      }
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
        if (userDoc.exists()) {
          if (userDoc.data().isLocked) {
            await signOut(auth);
            setError("Your access to the terminal has been locked by the administrator. Please contact support.");
            setLoading(false);
            return;
          }
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: Timestamp.now()
          }).catch(e => console.error("Could not update lastLogin:", e));
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
      console.error("Auth error:", err);
      if (err.code === 'auth/network-request-failed') {
        setError(`Network error: This usually happens if the domain '${window.location.hostname}' is not added to 'Authorized Domains' in the Firebase Console (Authentication -> Settings). Please also check if an ad-blocker is blocking Google Auth services.`);
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid credentials: The email or password you entered is incorrect. If you haven't created an account yet, please switch to 'Register' mode. If you've forgotten your password, use the 'Forgot Password' link.");
      } else {
        setError(err.message);
      }
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

              {(mode === 'login' || mode === 'register') && (
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-terminal-border/20"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-mono text-gray-500 uppercase tracking-widest">OR</span>
                    <div className="flex-grow border-t border-terminal-border/20"></div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-4 bg-black/40 hover:bg-black/60 text-white rounded-lg border border-terminal-border hover:border-terminal-accent/50 font-bold text-xs uppercase tracking-[0.1em] transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Login with Google</span>
                  </button>
                </>
              )}

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

interface IndiaVixSpeedometerProps {
  vixValue: string;
}

const IndiaVixSpeedometer = ({ vixValue }: IndiaVixSpeedometerProps) => {
  const vix = parseFloat(vixValue) || 15;
  
  // VIX Range:
  // VIX <= 10 -> Extreme Greed (100)
  // VIX >= 30 -> Extreme Fear (0)
  // Linear scale mapping:
  let score = 100 - ((vix - 10) / (30 - 10)) * 100;
  score = Math.max(0, Math.min(100, score));
  
  // Determine labels and color
  let text = "Neutral";
  let textColor = "text-yellow-400";
  
  if (score >= 75) {
    text = "Extreme Greed";
    textColor = "text-terminal-green font-extrabold";
  } else if (score >= 55) {
    text = "Greed";
    textColor = "text-terminal-green/80 font-bold";
  } else if (score >= 45) {
    text = "Neutral";
    textColor = "text-yellow-400 font-bold";
  } else if (score >= 25) {
    text = "Fear";
    textColor = "text-orange-500 font-bold";
  } else {
    text = "Extreme Fear";
    textColor = "text-terminal-red font-extrabold";
  }

  // Semi-circle angle goes from 180 (Extreme Fear, left) to 360 (Extreme Greed, right)
  const angle = 180 + (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  
  // Gauge center: (100, 90)
  const cx = 100;
  const cy = 90;
  const r = 70;
  
  // Needle tip
  const nx = cx + (r - 10) * Math.cos(rad);
  const ny = cy + (r - 10) * Math.sin(rad);

  return (
    <div className="terminal-card p-4 bg-terminal-card border border-terminal-border flex flex-col items-center justify-center">
      <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-2 w-full text-left">India VIX Fear & Greed</h4>
      <div className="relative flex flex-col items-center w-full max-w-[180px]">
        {/* SVG Gauge */}
        <svg width="100%" height="110" viewBox="0 0 200 110" className="overflow-visible">
          {/* Gradients */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" /> {/* Red - Fear */}
              <stop offset="25%" stopColor="#F97316" /> {/* Orange */}
              <stop offset="50%" stopColor="#EAB308" /> {/* Yellow - Neutral */}
              <stop offset="75%" stopColor="#86EFAC" /> {/* Light green */}
              <stop offset="100%" stopColor="#22C55E" /> {/* Green - Greed */}
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 25,90 A 75,75 0 0,1 175,90"
            fill="none"
            stroke="#1E293B"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Colored Arc Overlay */}
          <path
            d="M 25,90 A 75,75 0 0,1 175,90"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Scale ticks / markings */}
          {/* Left Tick - Extreme Fear */}
          <text x="15" y="105" fill="#EF4444" className="text-[10px] font-mono font-bold" textAnchor="middle">FEAR</text>
          {/* Center Tick - Neutral */}
          <text x="100" y="25" fill="#EAB308" className="text-[10px] font-mono font-bold" textAnchor="middle">NEUTRAL</text>
          {/* Right Tick - Extreme Greed */}
          <text x="185" y="105" fill="#22C55E" className="text-[10px] font-mono font-bold" textAnchor="middle">GREED</text>

          {/* Needle Pin Pinpoint Center */}
          <circle cx={cx} cy={cy} r="6" fill="#FFFFFF" />
          <circle cx={cx} cy={cy} r="3" fill="#000000" />

          {/* Needle Pointer */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Legend / Status values */}
        <div className="text-center mt-1">
          <span className={`text-[11px] font-black uppercase tracking-wider ${textColor}`}>{text}</span>
          <div className="flex items-center justify-center space-x-2 mt-0.5 text-[10px] font-mono">
            <span className="text-gray-500">VIX:</span>
            <span className="font-bold text-white">{vix}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">SCORE:</span>
            <span className="font-bold text-white">{Math.round(score)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'backtest' | 'gann' | 'oi' | 'risk' | 'indicators' | 'auth' | 'pricing' | 'checkout' | 'user-management' | 'redeem-success' | 'journal'>('landing');
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'astrology' | 'gann' | 'news'>('dashboard');
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<{ id: string; name: string; price: number; originalPrice: number; discount: number } | null>(null);
  const [redeemDuration, setRedeemDuration] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [data, setData] = useState<MarketData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (view === 'dashboard') {
      setDashboardTab('dashboard');
    }
  }, [view]);

  // Support custom event navigation for login redirection
  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setView(customEvent.detail as any);
      }
    };
    window.addEventListener('rsk-navigate', handleCustomNav as any);
    return () => window.removeEventListener('rsk-navigate', handleCustomNav as any);
  }, []);

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
          const nowTimestamp = Timestamp.now();
          if (docSnap.exists()) {
            await updateDoc(docRef, {
              lastActive: nowTimestamp
            }).catch(e => console.error("Could not update lastActive:", e));
            setUserProfile({ ...docSnap.data(), lastActive: nowTimestamp });
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
    const loginRequiredViews = ['dashboard', 'oi', 'backtest', 'risk', 'gann', 'journal'];
    
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
          <span className="text-terminal-accent font-bold">Expected Deployment:</span> <span className="text-white font-bold">Q3 2027</span>
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
          const getCell = (r: number, c: number) => (rows[r]?.[c] || '').trim();

          // Find specific headers to make it more robust
          let reversalsRow = -1;
          let statsRow = -1;
          let globalIndicesRow = -1;

          for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const firstCell = getCell(i, 0).toLowerCase();
            const rowStr = rows[i]?.join(' ').toLowerCase() || '';
            
            if (rowStr.includes('participants')) statsRow = i;
            if (rowStr.includes('reversals') && reversalsRow === -1) reversalsRow = i;
            if (rowStr.includes('global indices')) globalIndicesRow = i;
          }

          // Participant View (A7:B10 typical)
          const participants: ParticipantSentiment[] = [];
          const pStart = statsRow > -1 ? statsRow + 1 : 6;
          for (let i = pStart; i < pStart + 4; i++) {
            const name = getCell(i, 0);
            const sentiment = getCell(i, 1) as any;
            if (name) participants.push({ name, sentiment: sentiment || 'Neutral' });
          }

          // Global Indices
          const globalIndices: GlobalIndex[] = [];
          const gStart = globalIndicesRow > -1 ? globalIndicesRow + 1 : 3;
          for (let i = gStart; i < gStart + 10; i++) {
            const name = getCell(i, 6);
            const price = getCell(i, 7);
            const change = getCell(i, 9);
            if (name && !name.toLowerCase().includes('india vix') && !name.toLowerCase().includes('view')) {
              globalIndices.push({ name, price, change });
            }
          }

          // Reversals - Fetch strictly D8:D15 (index 7 to 14) and E8:E20 (index 7 to 19)
          const rawRev15: string[] = [];
          const rawRev5: string[] = [];
          
          // Try to find specific column indices for 15M and 5M dynamically, defaulting to D and E (3 and 4)
          // We look for cells containing "15" and "5" along with terms like "revers", "min", or "rev" to prevent matching bare prices (e.g. Sensex values like 75527.95)
          let col15 = 3; // Default D
          let col5 = 4;  // Default E
          
          for (let i = 0; i < Math.min(rows.length, 12); i++) {
            const row = rows[i];
            if (!row) continue;
            for (let j = 0; j < row.length; j++) {
              const cell = (row[j] || '').toLowerCase().trim();
              if (cell.includes('15') && (cell.includes('revers') || cell.includes('min') || cell.includes('rev'))) {
                col15 = j;
              }
              if (cell.includes('5') && !cell.includes('15') && (cell.includes('revers') || cell.includes('min') || cell.includes('rev'))) {
                col5 = j;
              }
            }
          }

          const timeRegex = /\d{1,2}:\d{2}/;

          // 15M Rev: D8:D15 (index 7 to 14)
          for (let i = 7; i <= 14; i++) {
            const val = getCell(i, col15);
            if (val && val !== "-" && val !== "" && timeRegex.test(val)) {
              rawRev15.push(val);
            }
          }

          // 5M Rev: E8:E20 (index 7 to 19)
          for (let i = 7; i <= 19; i++) {
            const val = getCell(i, col5);
            if (val && val !== "-" && val !== "" && timeRegex.test(val)) {
              rawRev5.push(val);
            }
          }

          const formatAndSortTimes = (times: string[]): string[] => {
            const parsed = times.map(t => {
              const clean = t.trim().toUpperCase();
              const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);
              if (!match) {
                return { original: t, minutes: 9999, formatted: t };
              }
              
              const hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const ampm = match[4] || '';
              
              let sortHours = hours;
              if (ampm === 'PM' && hours < 12) {
                sortHours += 12;
              } else if (ampm === 'AM' && hours === 12) {
                sortHours = 0;
              }
              const totalMinutes = sortHours * 60 + minutes;
              
              const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${ampm ? ' ' + ampm : ''}`;
              return { original: t, minutes: totalMinutes, formatted };
            });
            
            parsed.sort((a, b) => a.minutes - b.minutes);
            return parsed.map(p => p.formatted);
          };

          const sortedRev15 = formatAndSortTimes(rawRev15);
          const sortedRev5 = formatAndSortTimes(rawRev5);

          // Support & Resistance
          const support: string[] = [];
          const resistance: string[] = [];
          // Search for "Support" row specifically
          let levelStart = -1;
          for (let i = 0; i < rows.length; i++) {
            if (getCell(i, 0).toLowerCase() === 'support' || getCell(i, 0).toLowerCase().includes('support')) {
              levelStart = i + 1;
              break;
            }
          }
          
          const sStart = levelStart > -1 ? levelStart : 13;
          for (let i = sStart; i < sStart + 15; i++) {
            const s = getCell(i, 0);
            const r = getCell(i, 1);
            if (s && !isNaN(parseFloat(s.replace(/,/g, '')))) support.push(s);
            if (r && !isNaN(parseFloat(r.replace(/,/g, '')))) resistance.push(r);
          }

          // Find India Vix and Ranges dynamically if possible
          let vix = '';
          let dRange = '';
          let wRange = '';
          
          for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const rowStr = rows[i]?.join(' ').toLowerCase() || '';
            if (rowStr.includes('india vix')) vix = getCell(i, 7);
            if (rowStr.includes('daily range')) dRange = `${getCell(i, 8)} - ${getCell(i, 9)}`;
            if (rowStr.includes('weekly range')) wRange = `${getCell(i, 8)} - ${getCell(i, 9)}`;
          }

          setData({
            participants,
            masterSignal: getCell(0, 3) || getCell(0, 2), // Try D1 then C1
            decodedDate: getCell(2, 0) || getCell(0, 0), // A3 or A1
            globalIndices,
            globalSentiment: getCell(13, 8) || 'Neutral', // Try I14
            indiaVix: vix || getCell(15, 7),
            dailyRange: dRange.includes('-') && dRange.length > 5 ? dRange : `${getCell(16, 8)} - ${getCell(16, 9)}`,
            weeklyRange: wRange.includes('-') && wRange.length > 5 ? wRange : `${getCell(17, 8)} - ${getCell(17, 9)}`,
            reversals15m: Array.from(new Set(rawRev15)), // Remove duplicates, keeping original spreadsheet order and values
            reversals5m: Array.from(new Set(rawRev5)),
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

  const getChangeColor = (change: string) => {
    if (!change) return 'text-gray-400';
    const cleanStr = change.trim();
    if (cleanStr === '-' || cleanStr === '0' || cleanStr === '0.00' || cleanStr === '0.00%') return 'text-gray-400';
    if (cleanStr.startsWith('-')) return 'text-terminal-red';
    return 'text-terminal-green';
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
            
            {/* Pulse Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 rounded-full bg-terminal-green shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                />
                <span className="text-[10px] font-mono text-terminal-green uppercase tracking-widest">System Active</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="w-2 h-2 rounded-full bg-terminal-accent shadow-[0_0_10px_rgba(242,125,38,0.5)]" 
                />
                <span className="text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Live Data Feed</span>
              </div>
            </div>

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

    const activePlanName = selectedPlanDetail ? selectedPlanDetail.name : "Become a Pro Trader";
    const activePlanPrice = selectedPlanDetail ? selectedPlanDetail.price : priceInfo.price;
    const activePlanOriginalPrice = selectedPlanDetail ? selectedPlanDetail.originalPrice : priceInfo.originalPrice;
    const activePlanDiscount = selectedPlanDetail ? selectedPlanDetail.discount : priceInfo.discount;

    const handleConfirmPayment = () => {
      const message = encodeURIComponent(`Hello RSK, I have completed the payment of ₹${activePlanPrice} for DecodeXMarket ${activePlanName}. My Email: ${user?.email || 'N/A'}. Please verify and grant access.`);
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
          updateData = { accessLevel: 1, redeemedCode: code };
          message = "Lifetime Access Activated! Radhe Radhe!";
          setRedeemDuration("LIFETIME");
        } else if (code === "RSK3") {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 3);
          updateData = { accessExpiry: Timestamp.fromDate(expiry), accessLevel: 0, redeemedCode: "RSK3" };
          message = "3 Months Access Activated!";
          setRedeemDuration("3 MONTHS");
        } else if (code === "THERSK6") {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 6);
          updateData = { accessExpiry: Timestamp.fromDate(expiry), accessLevel: 0, redeemedCode: "THERSK6" };
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
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{selectedPlanDetail ? selectedPlanDetail.name : "Lifetime Pro Access"}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 space-y-4 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Plan</span>
                <span className="text-xs font-bold text-white uppercase">{activePlanName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Base Price</span>
                <span className="text-xs font-bold text-gray-500 line-through">₹{activePlanOriginalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400 uppercase">Discount ({activePlanDiscount}%)</span>
                <span className="text-xs font-bold text-terminal-green">-₹{(activePlanOriginalPrice - activePlanPrice).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase">Total Payable</span>
                <span className="text-2xl font-black text-terminal-accent">₹{activePlanPrice.toLocaleString()}</span>
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

    const updateExpiry = async (userId: string, newDate: string) => {
      try {
        const expiryTimestamp = Timestamp.fromDate(new Date(newDate));
        await updateDoc(doc(db, 'users', userId), {
          accessExpiry: expiryTimestamp,
          accessLevel: 0 // Ensure it's treated as temporary access
        });
        setUsers(users.map(u => u.id === userId ? { ...u, accessExpiry: expiryTimestamp, accessLevel: 0 } : u));
        alert("Expiry date updated successfully.");
      } catch (err) {
        console.error("Error updating expiry:", err);
        alert("Failed to update expiry date.");
      }
    };

    const updateAccessCode = async (userId: string, newCode: string) => {
      try {
        const cleanCode = newCode.trim().toUpperCase();
        await updateDoc(doc(db, 'users', userId), {
          accessCode: cleanCode || null
        });
        setUsers(users.map(u => u.id === userId ? { ...u, accessCode: cleanCode || null } : u));
      } catch (err) {
        console.error("Error updating access code:", err);
        alert("Failed to update coupon code.");
      }
    };

    const updateRedeemedCodeUpdated = async (userId: string, code: string) => {
      try {
        const cleanCode = code.trim().toUpperCase();
        let updateData: any = {};
        
        if (!cleanCode) {
          updateData = {
            redeemedCode: null,
            accessLevel: 0,
            accessExpiry: null
          };
        } else if (cleanCode === 'RADHERADHE') {
          updateData = {
            redeemedCode: 'RADHERADHE',
            accessLevel: 1,
            accessExpiry: null
          };
        } else if (cleanCode === 'RSK3') {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 3);
          updateData = {
            redeemedCode: 'RSK3',
            accessLevel: 0,
            accessExpiry: Timestamp.fromDate(expiry)
          };
        } else if (cleanCode === 'THERSK6') {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 6);
          updateData = {
            redeemedCode: 'THERSK6',
            accessLevel: 0,
            accessExpiry: Timestamp.fromDate(expiry)
          };
        } else {
          updateData = {
            redeemedCode: cleanCode
          };
        }

        await updateDoc(doc(db, 'users', userId), updateData);
        setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
      } catch (err) {
        console.error("Error updating redeemed code:", err);
        alert("Failed to update redeemed code and access.");
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

        {/* Informational Panel of Global System Codes */}
        <div className="p-6 bg-terminal-accent/5 border border-terminal-accent/20 rounded-xl space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-terminal-accent">Shared System Coupon Codes</h3>
          <p className="text-xs text-gray-400 font-sans">
            These global codes are built into the payment gateway checker and can be used immediately by any registered user:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-white">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
              <span>RADHERADHE</span>
              <span className="text-terminal-green font-bold">Lifetime Free</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
              <span>RSK3</span>
              <span className="text-terminal-accent font-bold">3 Months Access</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
              <span>THERSK6</span>
              <span className="text-terminal-accent font-bold">6 Months Access</span>
            </div>
          </div>
        </div>

        <div className="terminal-card overflow-hidden border-terminal-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-terminal-border">
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Access Level</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-terminal-accent uppercase tracking-widest">Coupon Code</th>
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
                      <div className="flex flex-col space-y-2">
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
                        <input 
                          type="date" 
                          className="bg-white/5 border border-terminal-border rounded px-2 py-1 text-[10px] font-mono text-white focus:border-terminal-accent outline-none"
                          onChange={(e) => {
                            if (e.target.value) {
                              updateExpiry(u.id, e.target.value);
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-3">
                        {/* Redeemed Code Selector & Editor */}
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-mono text-terminal-accent uppercase tracking-wide">Redeemed Code</span>
                          <select
                            value={['RADHERADHE', 'RSK3', 'THERSK6', ''].includes(u.redeemedCode || '') ? (u.redeemedCode || '') : 'CUSTOM'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== 'CUSTOM') {
                                updateRedeemedCodeUpdated(u.id, val);
                              }
                            }}
                            className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-white focus:border-terminal-accent outline-none w-44 tracking-wide transition-all"
                          >
                            <option value="">None / Basic</option>
                            <option value="RADHERADHE">RADHERADHE (Lifetime)</option>
                            <option value="RSK3">RSK3 (3 Months)</option>
                            <option value="THERSK6">THERSK6 (6 Months)</option>
                            <option value="CUSTOM">Custom Input...</option>
                          </select>
                          
                          {(!['RADHERADHE', 'RSK3', 'THERSK6', ''].includes(u.redeemedCode || '')) && (
                            <input 
                              type="text" 
                              placeholder="ENTER CUSTOM CODE" 
                              defaultValue={u.redeemedCode || ''}
                              onBlur={(e) => updateRedeemedCodeUpdated(u.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateRedeemedCodeUpdated(u.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="mt-1 bg-white/5 border border-terminal-border rounded px-2 py-1 text-xs font-mono text-white focus:border-terminal-accent outline-none w-44 uppercase tracking-wide transition-all"
                            />
                          )}
                        </div>

                        {/* Referral Promo Code (For users sharing access codes) */}
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">User Referral Code</span>
                          <input 
                            type="text" 
                            placeholder="NO REFERRAL CODE" 
                            defaultValue={u.accessCode || ''}
                            onBlur={(e) => updateAccessCode(u.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateAccessCode(u.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="bg-white/5 border border-terminal-border rounded px-2 py-1 text-xs font-mono text-white focus:border-terminal-accent outline-none w-44 uppercase tracking-wide transition-all"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <div>
                          {u.isLocked ? (
                            <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-mono uppercase border border-red-500/20">Locked</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-terminal-green/10 text-terminal-green text-[10px] font-mono uppercase border border-terminal-green/20">Active</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Last Active/Visit</span>
                          <span className="text-xs font-mono text-gray-300">
                            {(() => {
                              const activeTime = u.lastActive || u.lastLogin || u.createdAt;
                              if (!activeTime) return 'Never';
                              try {
                                const dateObj = typeof activeTime.toDate === 'function' ? activeTime.toDate() : new Date(activeTime);
                                return dateObj.toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                  hour12: true
                                });
                              } catch (e) {
                                return 'Never';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
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
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col space-y-1">
            <motion.span 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[9px] font-bold text-terminal-accent uppercase tracking-widest"
            >
              Data Valid For Next Trading Session
            </motion.span>
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
                <span className={`text-[10px] font-bold ${getChangeColor(idx.change)}`}>
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

        <div className="terminal-card p-4 bg-terminal-card border-dashed border-terminal-border">
          <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-2">Market Insights</h4>
          <p className="text-xs text-gray-400 italic leading-relaxed">
            "Market sentiment is currently {data.globalSentiment.toLowerCase()}. 
            India VIX is at {data.indiaVix}, suggesting {parseFloat(data.indiaVix) > 18 ? 'high' : 'moderate'} volatility. 
            Monitor reversal timings for entry/exit precision."
          </p>
        </div>

        {/* Small India VIX Speedometer */}
        <IndiaVixSpeedometer vixValue={data.indiaVix} />
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
    // Calculator States
    const [accountCurrency, setAccountCurrency] = useState<'INR' | 'USD'>('INR');
    const [capital, setCapital] = useState(500000); // 500,000 INR default
    const [riskPercent, setRiskPercent] = useState(1); // Default 1%
    const [selectedInstrument, setSelectedInstrument] = useState<'nifty' | 'banknifty' | 'sensex' | 'btc' | 'eth' | 'gold'>('nifty');
    const [tradeDirection, setTradeDirection] = useState<'LONG' | 'SHORT'>('LONG');

    // Live Rates States
    const [usdToInr, setUsdToInr] = useState(83.45);
    const [livePrices, setLivePrices] = useState({
      btc: 95000,
      eth: 3400,
      gold: 2350
    });
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    // Fetch live rates
    const fetchRates = async () => {
      setIsLoadingRates(true);
      try {
        // 1. Fetch USD to INR Live Exchange Rate
        const erResponse = await fetch('https://open.er-api.com/v6/latest/USD');
        let rate = 83.45;
        if (erResponse.ok) {
          const erData = await erResponse.json();
          if (erData?.rates?.INR) {
            rate = Number(erData.rates.INR.toFixed(2));
            setUsdToInr(rate);
          }
        }
        
        // 2. Fetch BTC, ETH, and PAXG (Gold) prices from Binance public APIs
        const btcResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const ethResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const paxgResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        
        let btcVal = 95000;
        let ethVal = 3400;
        let goldVal = 2350;

        if (btcResponse.ok) {
          const btcData = await btcResponse.json();
          if (btcData.price) btcVal = Math.round(Number(btcData.price));
        }
        if (ethResponse.ok) {
          const ethData = await ethResponse.json();
          if (ethData.price) ethVal = Math.round(Number(ethData.price));
        }
        if (paxgResponse.ok) {
          const paxgData = await paxgResponse.json();
          if (paxgData.price) goldVal = Math.round(Number(paxgData.price));
        }

        setLivePrices({ btc: btcVal, eth: ethVal, gold: goldVal });
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Failed to fetch live rates:", e);
      } finally {
        setIsLoadingRates(false);
      }
    };

    // Auto fetch on load
    useEffect(() => {
      fetchRates();
    }, []);
    
    // Instrument Presets using live pricing where available
    const presets = {
      nifty: {
        name: 'Nifty 50',
        symbol: 'NIFTY',
        currency: 'INR',
        defaultPrice: 24300,
        defaultSLPoints: 30,
        lotSize: 65, // Updated lot size (1 lot = 65 units)
        type: 'index_option',
        icon: '🇮🇳'
      },
      banknifty: {
        name: 'Bank Nifty',
        symbol: 'BANKNIFTY',
        currency: 'INR',
        defaultPrice: 52500,
        defaultSLPoints: 80,
        lotSize: 30, // Updated lot size (1 lot = 30 units)
        type: 'index_option',
        icon: '🇮🇳'
      },
      sensex: {
        name: 'Sensex',
        symbol: 'SENSEX',
        currency: 'INR',
        defaultPrice: 79500,
        defaultSLPoints: 120,
        lotSize: 20, // Updated lot size (1 lot = 20 units)
        type: 'index_option',
        icon: '🇮🇳'
      },
      btc: {
        name: 'Bitcoin',
        symbol: 'BTCUSDT',
        currency: 'USD',
        defaultPrice: livePrices.btc,
        defaultSLPoints: 500,
        lotSize: 1,
        type: 'crypto',
        icon: '🪙'
      },
      eth: {
        name: 'Ethereum',
        symbol: 'ETHUSDT',
        currency: 'USD',
        defaultPrice: livePrices.eth,
        defaultSLPoints: 40,
        lotSize: 1,
        type: 'crypto',
        icon: '⟠'
      },
      gold: {
        name: 'XAU/USD (Gold)',
        symbol: 'XAUUSD',
        currency: 'USD',
        defaultPrice: livePrices.gold,
        defaultSLPoints: 8,
        lotSize: 100, // 1 Standard Lot = 100 oz
        type: 'commodity',
        icon: '🟡'
      }
    };

    const currentPreset = presets[selectedInstrument];

    // Inputs adapting to selected instrument
    const [riskType, setRiskType] = useState<'percentage' | 'absolute_amount'>('percentage');
    const [riskValue, setRiskValue] = useState(1); // 1% default or flat amount (e.g., 5000)

    const [slType, setSlType] = useState<'points' | 'price_levels'>('points');
    const [slValuePoints, setSlValuePoints] = useState(30);

    const [entryPrice, setEntryPrice] = useState(24300);
    const [stopLossPrice, setStopLossPrice] = useState(24270);
    const [targetPrice, setTargetPrice] = useState(24360);
    const [customLotSize, setCustomLotSize] = useState(65);
    const [tickValue, setTickValue] = useState(1.0);

    // Keep inputs in sync when instrument changes or live prices refresh
    useEffect(() => {
      const preset = presets[selectedInstrument];
      setEntryPrice(preset.defaultPrice);
      setCustomLotSize(preset.lotSize);
      setSlValuePoints(preset.defaultSLPoints);
      
      if (tradeDirection === 'LONG') {
        setStopLossPrice(preset.defaultPrice - preset.defaultSLPoints);
        setTargetPrice(preset.defaultPrice + preset.defaultSLPoints * 2);
      } else {
        setStopLossPrice(preset.defaultPrice + preset.defaultSLPoints);
        setTargetPrice(preset.defaultPrice - preset.defaultSLPoints * 2);
      }
    }, [selectedInstrument, livePrices]);

    // Keep prices synchronized when tradeDirection, slType or slValuePoints update
    useEffect(() => {
      if (slType === 'points') {
        if (tradeDirection === 'LONG') {
          setStopLossPrice(entryPrice - slValuePoints);
          setTargetPrice(entryPrice + slValuePoints * 2);
        } else {
          setStopLossPrice(entryPrice + slValuePoints);
          setTargetPrice(entryPrice - slValuePoints * 2);
        }
      }
    }, [tradeDirection, slType, slValuePoints, entryPrice]);

    // Convert Capital to instrument currency
    const getCapitalInInstrumentCurrency = () => {
      if (accountCurrency === currentPreset.currency) {
        return capital;
      }
      if (accountCurrency === 'INR' && currentPreset.currency === 'USD') {
        return capital / usdToInr;
      }
      if (accountCurrency === 'USD' && currentPreset.currency === 'INR') {
        return capital * usdToInr;
      }
      return capital;
    };

    const capitalInInst = getCapitalInInstrumentCurrency();

    // 1. Calculate Total Risk Amount
    const totalRiskAmount = riskType === 'percentage'
      ? capital * (riskValue / 100)
      : riskValue;

    // Convert Risk Amount to Instrument Currency
    const totalRiskInInst = accountCurrency === currentPreset.currency
      ? totalRiskAmount
      : accountCurrency === 'INR' && currentPreset.currency === 'USD'
      ? totalRiskAmount / usdToInr
      : totalRiskAmount * usdToInr;

    // 2. Calculate Stop Loss in Points/Pips
    const finalSLPoints = slType === 'price_levels'
      ? Math.abs(entryPrice - stopLossPrice)
      : slValuePoints;

    // 3. Calculate Total Risk Per Unit
    const riskPerUnit = finalSLPoints * tickValue;

    // 4. Calculate Total Units
    const exactUnits = riskPerUnit > 0 ? totalRiskInInst / riskPerUnit : 0;

    // 5. Calculate Number of Lots
    const rawLots = customLotSize > 0 ? exactUnits / customLotSize : 0;

    // 6. Apply Rounding Constraints
    let recommendedLots = 0;
    if (currentPreset.type === 'index_option') {
      recommendedLots = Math.floor(rawLots); // No fractional lots for options
    } else if (currentPreset.type === 'commodity') {
      recommendedLots = Number(rawLots.toFixed(2)); // Standard commodity increments
    } else {
      recommendedLots = Number(rawLots.toFixed(4)); // High precision crypto
    }

    const actualUnits = recommendedLots * customLotSize;
    const actualRiskInInst = actualUnits * riskPerUnit;

    const getAmountInAccountCurrency = (amtInInst: number) => {
      if (accountCurrency === currentPreset.currency) return amtInInst;
      if (accountCurrency === 'INR' && currentPreset.currency === 'USD') {
        return amtInInst * usdToInr;
      }
      if (accountCurrency === 'USD' && currentPreset.currency === 'INR') {
        return amtInInst / usdToInr;
      }
      return amtInInst;
    };

    const actualRiskInAccount = getAmountInAccountCurrency(actualRiskInInst);
    const notionalValue = actualUnits * entryPrice;
    const notionalValueInAccount = getAmountInAccountCurrency(notionalValue);
    const leverageRatio = capital > 0 ? notionalValueInAccount / capital : 0;
    
    // Handlers for inputs
    const handleEntryPriceChange = (val: number) => {
      setEntryPrice(val);
      if (slType === 'points') {
        if (tradeDirection === 'LONG') {
          setStopLossPrice(val - slValuePoints);
          setTargetPrice(val + slValuePoints * 2);
        } else {
          setStopLossPrice(val + slValuePoints);
          setTargetPrice(val - slValuePoints * 2);
        }
      } else {
        const diff = Math.abs(val - stopLossPrice);
        if (tradeDirection === 'LONG') {
          setTargetPrice(val + diff * 2);
        } else {
          setTargetPrice(val - diff * 2);
        }
      }
    };

    const handleSLPointsChange = (val: number) => {
      setSlValuePoints(val);
      if (tradeDirection === 'LONG') {
        setStopLossPrice(entryPrice - val);
        setTargetPrice(entryPrice + val * 2);
      } else {
        setStopLossPrice(entryPrice + val);
        setTargetPrice(entryPrice - val * 2);
      }
    };

    const handleSLPriceChange = (val: number) => {
      setStopLossPrice(val);
      const diff = Math.abs(entryPrice - val);
      setSlValuePoints(diff);
      if (tradeDirection === 'LONG') {
        setTargetPrice(entryPrice + diff * 2);
      } else {
        setTargetPrice(entryPrice - diff * 2);
      }
    };

    // Risk Reward ratio
    const rewardPoints = Math.abs(targetPrice - entryPrice);
    const rrRatio = finalSLPoints > 0 ? Number((rewardPoints / finalSLPoints).toFixed(2)) : 0;
    const potentialRewardInInst = actualUnits * rewardPoints;
    const potentialRewardInAccount = getAmountInAccountCurrency(potentialRewardInInst);

    // Swap Account Currency Helper
    const toggleAccountCurrency = (curr: 'INR' | 'USD') => {
      if (curr === accountCurrency) return;
      setAccountCurrency(curr);
      if (curr === 'INR') {
        setCapital(Math.round(capital * usdToInr));
      } else {
        setCapital(Math.round(capital / usdToInr));
      }
    };

    const accountSymbol = accountCurrency === 'INR' ? '₹' : '$';
    const instSymbol = currentPreset.currency === 'INR' ? '₹' : '$';

    // Setup structured response schema for API output
    const apiResponse = {
      account_size: capital,
      account_currency: accountCurrency,
      risk_type: riskType,
      risk_value: riskValue,
      risk_amount_account_currency: totalRiskAmount,
      instrument: selectedInstrument,
      instrument_currency: currentPreset.currency,
      exchange_rate: usdToInr,
      trade_direction: tradeDirection,
      entry_price: entryPrice,
      stop_loss_type: slType,
      stop_loss_value: slType === 'points' ? slValuePoints : stopLossPrice,
      stop_loss_points: finalSLPoints,
      stop_loss_price: stopLossPrice,
      target_price: targetPrice,
      contract_multiplier_lot_size: customLotSize,
      tick_value_multiplier: tickValue,
      calculated_units: exactUnits,
      calculated_lots: rawLots,
      suggested_lots: recommendedLots,
      suggested_units: actualUnits,
      actual_risk_exposure_instrument_currency: actualRiskInInst,
      actual_risk_exposure_account_currency: actualRiskInAccount,
      actual_risk_percentage: capital > 0 ? (actualRiskInAccount / capital) * 100 : 0,
      notional_value_instrument_currency: notionalValue,
      notional_value_account_currency: notionalValueInAccount,
      leverage_ratio: leverageRatio,
      risk_reward_ratio: `1:${rrRatio}`
    };

    return (
      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Risk Management Lab</h2>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Multi-Instrument Position Sizing & Live Leverage Intelligence</p>
          </div>
          
          <button 
            onClick={fetchRates} 
            disabled={isLoadingRates}
            className="flex items-center space-x-2 bg-terminal-accent/10 hover:bg-terminal-accent/20 border border-terminal-accent/30 text-terminal-accent px-3 py-1.5 rounded text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin' : ''}`} />
            <span>{isLoadingRates ? 'SYNCING RATES...' : 'REFRESH LIVE RATES'}</span>
          </button>
        </div>

        {/* Top bar: Capital and Risk profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="terminal-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Account Base Currency</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => toggleAccountCurrency('INR')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    accountCurrency === 'INR'
                      ? 'bg-terminal-accent text-black font-bold'
                      : 'bg-black/40 text-gray-400 border border-terminal-border/40 hover:text-white'
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  onClick={() => toggleAccountCurrency('USD')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    accountCurrency === 'USD'
                      ? 'bg-terminal-accent text-black font-bold'
                      : 'bg-black/40 text-gray-400 border border-terminal-border/40 hover:text-white'
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-gray-400">Total Account Equity</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">{accountSymbol}</span>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Math.max(0, Number(e.target.value)))}
                  className="bg-black/40 border border-terminal-border rounded pl-6 pr-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-36 text-right font-bold"
                />
              </div>
            </div>
          </div>

          <div className="terminal-card p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase mb-2">
              <span>Trade Risk Budget</span>
              <div className="flex space-x-1 bg-black/60 p-0.5 rounded border border-terminal-border/40">
                <button
                  onClick={() => setRiskType('percentage')}
                  className={`px-2 py-0.5 text-[8px] font-mono rounded ${
                    riskType === 'percentage'
                      ? 'bg-terminal-accent text-black font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  % PERC
                </button>
                <button
                  onClick={() => setRiskType('absolute_amount')}
                  className={`px-2 py-0.5 text-[8px] font-mono rounded ${
                    riskType === 'absolute_amount'
                      ? 'bg-terminal-accent text-black font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {accountSymbol} FLAT
                </button>
              </div>
            </div>
            {riskType === 'percentage' ? (
              <div className="space-y-1">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={riskValue}
                  onChange={(e) => setRiskValue(Number(e.target.value))}
                  className="w-full accent-terminal-accent cursor-pointer my-1.5"
                />
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">Risk Margin %:</span>
                  <span className="text-terminal-accent font-bold">{riskValue}%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between my-1">
                <span className="text-xs font-mono text-gray-400">Risk Value ({accountSymbol})</span>
                <input
                  type="number"
                  value={riskValue}
                  onChange={(e) => setRiskValue(Math.max(1, Number(e.target.value)))}
                  className="bg-black/40 border border-terminal-border rounded px-2 py-1 text-xs font-mono text-white focus:border-terminal-accent outline-none w-28 text-right font-bold"
                />
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-mono border-t border-terminal-border/20 pt-1.5 mt-1.5">
              <span className="text-gray-500">Max Risk Capital:</span>
              <span className="text-terminal-red font-bold">
                {accountSymbol}
                {totalRiskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="terminal-card p-4 bg-terminal-accent/5 border-terminal-accent/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              <span>USD ⇄ INR Exchange</span>
              {lastUpdated && <span className="text-[8px] text-terminal-accent">LIVE FEED: {lastUpdated}</span>}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-gray-400">Forex Valuation</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={usdToInr}
                  onChange={(e) => setUsdToInr(Math.max(0.01, Number(e.target.value)))}
                  className="bg-black/40 border border-terminal-border rounded pl-6 pr-3 py-1 text-xs font-mono text-white focus:border-terminal-accent outline-none w-28 text-right font-bold"
                />
              </div>
            </div>
            <p className="text-[9px] font-mono text-gray-500 leading-tight uppercase mt-1">
              Provides dynamic conversions. Manually editable above.
            </p>
          </div>
        </div>

        {/* Instrument Grid Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Select Tradable Instrument</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(Object.keys(presets) as Array<keyof typeof presets>).map((key) => {
              const item = presets[key];
              const isSelected = selectedInstrument === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedInstrument(key)}
                  className={`flex flex-col items-center justify-center p-3 rounded border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-terminal-accent/10 border-terminal-accent shadow-[0_0_12px_rgba(var(--terminal-accent-rgb),0.15)] text-white'
                      : 'bg-black/30 border-terminal-border/60 hover:border-gray-500 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-xs font-bold font-sans tracking-tight">{item.name}</span>
                  <span className="text-[8px] font-mono uppercase text-gray-500 mt-0.5">
                    {item.currency === 'INR' ? `₹${item.defaultPrice.toLocaleString()}` : `$${item.defaultPrice.toLocaleString()}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sizing Parameters Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="terminal-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-terminal-border/30 pb-2">
                <h3 className="text-xs font-mono text-terminal-accent uppercase tracking-widest">
                  Trade Setup Params
                </h3>
                
                {/* Trade Direction Toggle */}
                <div className="flex space-x-1 bg-black/40 p-0.5 rounded border border-terminal-border/40">
                  <button
                    onClick={() => setTradeDirection('LONG')}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase ${
                      tradeDirection === 'LONG'
                        ? 'bg-terminal-green text-black'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    onClick={() => setTradeDirection('SHORT')}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase ${
                      tradeDirection === 'SHORT'
                        ? 'bg-terminal-red text-white'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Entry Price */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">Entry Price</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Current Quote Price ({currentPreset.currency})</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">{instSymbol}</span>
                    <input
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => handleEntryPriceChange(Number(e.target.value))}
                      className="bg-black/40 border border-terminal-border rounded pl-6 pr-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32 text-right"
                    />
                  </div>
                </div>

                {/* Stop Loss Input Selector */}
                <div className="flex items-center justify-between border-t border-terminal-border/20 pt-3">
                  <span className="text-xs font-bold text-gray-300">Stop Loss Mode</span>
                  <div className="flex space-x-1 bg-black/40 p-0.5 rounded border border-terminal-border/40">
                    <button
                      onClick={() => setSlType('points')}
                      className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase ${
                        slType === 'points'
                          ? 'bg-terminal-accent text-black'
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      POINTS/PIPS
                    </button>
                    <button
                      onClick={() => setSlType('price_levels')}
                      className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase ${
                        slType === 'price_levels'
                          ? 'bg-terminal-accent text-black'
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      PRICE LEVEL
                    </button>
                  </div>
                </div>

                {slType === 'points' ? (
                  /* Stop Loss Points / Pips Input */
                  <div className="flex items-center justify-between bg-terminal-accent/5 p-3 rounded border border-terminal-accent/20">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-terminal-accent">Stop Loss Points</span>
                      <span className="text-[9px] font-mono text-gray-400 uppercase">Risk offset in Points/Pips</span>
                    </div>
                    <div className="relative">
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-terminal-accent font-bold uppercase">PTS</span>
                      <input
                        type="number"
                        step="any"
                        value={slValuePoints}
                        onChange={(e) => handleSLPointsChange(Math.max(0.0001, Number(e.target.value)))}
                        className="bg-black/60 border border-terminal-accent/60 rounded pl-3 pr-12 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32 text-right font-black"
                      />
                    </div>
                  </div>
                ) : (
                  /* Stop Loss Price level Input */
                  <div className="flex items-center justify-between bg-terminal-red/5 p-3 rounded border border-terminal-red/20">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-terminal-red">Stop Loss Price</span>
                      <span className="text-[9px] font-mono text-gray-400 uppercase">Exact trigger level</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">{instSymbol}</span>
                      <input
                        type="number"
                        step="any"
                        value={stopLossPrice}
                        onChange={(e) => handleSLPriceChange(Number(e.target.value))}
                        className="bg-black/60 border border-terminal-red/40 rounded pl-6 pr-3 py-1.5 text-xs font-mono text-white focus:border-terminal-red outline-none w-32 text-right font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Target Price Exit */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">Take Profit Price</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Exit level for profit take</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">{instSymbol}</span>
                    <input
                      type="number"
                      step="any"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Number(e.target.value))}
                      className="bg-black/40 border border-terminal-border rounded pl-6 pr-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-32 text-right"
                    />
                  </div>
                </div>

                {/* Broker Custom Contract Size Multiplier Override */}
                <div className="flex items-center justify-between pt-3 border-t border-terminal-border/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">Contract Lot Size</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Override contract specifications</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={customLotSize}
                    onChange={(e) => setCustomLotSize(Math.max(0.0001, Number(e.target.value)))}
                    className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-24 text-right"
                  />
                </div>

                {/* Tick/Pip value modifier */}
                <div className="flex items-center justify-between pt-2 border-t border-terminal-border/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">Tick/Pip Valuation</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Value scaling factor per point</span>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={tickValue}
                    onChange={(e) => setTickValue(Math.max(0.0001, Number(e.target.value)))}
                    className="bg-black/40 border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-white focus:border-terminal-accent outline-none w-24 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Micro Specs Card */}
            <div className="terminal-card p-4 border-terminal-border/40 space-y-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Instrument Specifications</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-black/20 p-2 rounded">
                  <div className="text-gray-500 text-[9px] uppercase">Market Type</div>
                  <div className="text-white font-bold capitalize">{currentPreset.type.replace('_', ' ')}</div>
                </div>
                <div className="bg-black/20 p-2 rounded">
                  <div className="text-gray-500 text-[9px] uppercase">Tick Currency</div>
                  <div className="text-white font-bold">{currentPreset.currency}</div>
                </div>
                <div className="bg-black/20 p-2 rounded col-span-2">
                  <div className="text-gray-500 text-[9px] uppercase">Auto Sizing Formula</div>
                  <div className="text-gray-300 text-[10px] mt-0.5">
                    {currentPreset.type === 'index_option' 
                      ? `Suggested Lots = Math.floor(Risk / (${finalSLPoints} Points * ${customLotSize} Lot Size))`
                      : currentPreset.type === 'crypto'
                      ? `Suggested Quantity = Risk / (${finalSLPoints} Points * ${tickValue} Tick)`
                      : `Suggested Lots = Risk / (${finalSLPoints} Points * ${customLotSize} Lot Size * ${tickValue} Tick)`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sizing Results Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="terminal-card p-6 bg-terminal-accent/5 border-terminal-accent/30 space-y-6">
              <div className="flex items-center justify-between border-b border-terminal-border/30 pb-3">
                <span className="text-xs font-mono text-terminal-accent uppercase tracking-widest font-bold">Calculation Results</span>
                <span className="text-[10px] font-mono text-gray-500 uppercase">
                  Account Base: <strong className="text-white">{accountCurrency}</strong>
                </span>
              </div>

              {/* Major size metric */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">SUGGESTED QUANTITY</span>
                  <div className="text-3xl font-black text-white font-mono flex items-baseline">
                    <span>
                      {currentPreset.type === 'commodity' 
                        ? `${actualUnits.toLocaleString()} oz` 
                        : actualUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-xs text-gray-500 ml-1.5 uppercase tracking-wide">
                      {currentPreset.type === 'index_option' ? 'Units' : currentPreset.symbol.replace('USDT', '')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">SUGGESTED LOT SIZE</span>
                  <div className="text-3xl font-black text-terminal-accent font-mono">
                    {currentPreset.type === 'index_option' ? (
                      <>
                        {recommendedLots} <span className="text-xs text-gray-500 uppercase font-bold">Lots</span>
                      </>
                    ) : currentPreset.type === 'commodity' ? (
                      <>
                        {recommendedLots} <span className="text-xs text-gray-500 uppercase font-bold">Std Lots</span>
                      </>
                    ) : (
                      <>
                        {recommendedLots} <span className="text-xs text-gray-500 uppercase font-bold">Lots</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-terminal-border/20">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Notional Trade Value</span>
                  <div className="text-sm font-bold text-white font-mono">
                    {accountSymbol}{Math.round(notionalValueInAccount).toLocaleString()}
                  </div>
                  <span className="text-[8px] font-mono text-gray-600 block">
                    {instSymbol}{Math.round(notionalValue).toLocaleString()} in Preset
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Actual Risk Exposure</span>
                  <div className="text-sm font-bold text-terminal-red font-mono">
                    {accountSymbol}{actualRiskInAccount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[8px] font-mono text-gray-600 block">
                    {((actualRiskInAccount / capital) * 100 || 0).toFixed(2)}% of Account
                  </span>
                </div>

                <div className="space-y-1 col-span-2 md:col-span-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">R:R Ratio / Potential Reward</span>
                  <div className="text-sm font-bold text-terminal-green font-mono">
                    1:{rrRatio} ({accountSymbol}{Math.round(potentialRewardInAccount).toLocaleString()})
                  </div>
                  <span className="text-[8px] font-mono text-gray-600 block">
                    At take profit price level
                  </span>
                </div>
              </div>

              {/* Leverage context / Warning */}
              {leverageRatio > 1 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-mono font-bold text-orange-500 uppercase">Leveraged Position Warning</div>
                    <p className="text-[9px] font-mono text-gray-400 leading-normal uppercase">
                      Position value ({accountSymbol}{Math.round(notionalValueInAccount).toLocaleString()}) exceeds total capital. 
                      Requires <strong className="text-white">{leverageRatio.toFixed(1)}x</strong> margin/leverage. Ensure proper broker margin settings.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Copyable JSON Explorer */}
            <div className="terminal-card p-4 border-terminal-border/40 space-y-3">
              <div className="flex items-center justify-between border-b border-terminal-border/20 pb-2">
                <span className="text-[10px] font-mono text-terminal-accent uppercase tracking-widest font-bold">API Calculation JSON Output</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2));
                  }}
                  className="px-2 py-0.5 text-[9px] font-mono rounded bg-terminal-accent/10 hover:bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30 transition-all uppercase"
                >
                  Copy JSON Response
                </button>
              </div>
              <pre className="text-[9px] font-mono text-gray-300 bg-black/60 p-3 rounded max-h-56 overflow-y-auto leading-relaxed border border-terminal-border/20 whitespace-pre-wrap">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>

            {/* Smart Risk Tips */}
            <div className="terminal-card p-4 border-terminal-accent/20">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-terminal-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-300 uppercase font-bold block">Professional Trading Safeguard Rules</span>
                  <p className="text-[9px] font-mono text-gray-400 leading-relaxed uppercase">
                    1. Keep maximum systematic risk per trade below <span className="text-white font-bold">2.0%</span>.<br />
                    2. For highly volatile assets like <span className="text-white">Bitcoin</span> or <span className="text-white">Gold</span>, reduce risk budget to <span className="text-white font-bold">0.5%</span>.<br />
                    3. Do not adjust your stop loss once the position has been initiated. Let the cycle complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PricingPage = () => {
    const [selectedCustomDuration, setSelectedCustomDuration] = useState('3m');

    const customPlans = [
      { id: '1m', name: '1 Month Access Plan', price: 999, originalPrice: 1399, discount: 29 },
      { id: '3m', name: '3 Month Access Plan', price: 2999, originalPrice: 4199, discount: 29 },
      { id: '6m', name: '6 Month Access Plan', price: 5999, originalPrice: 8399, discount: 29 },
      { id: '1y', name: 'Yearly Access Plan', price: 11999, originalPrice: 16799, discount: 29 },
    ];

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
              LIFETIME
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
                'Fibonacci Pro Indicator Free',
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
              onClick={() => {
                setSelectedPlanDetail(null);
                setView('checkout');
              }}
              className="w-full py-5 rounded font-black text-sm uppercase tracking-[0.3em] transition-all bg-terminal-accent text-black hover:bg-terminal-accent/90 shadow-[0_0_20px_rgba(242,125,38,0.4)]"
            >
              Claim Discount
            </button>
          </div>
        </div>

        {/* Custom Plans Box */}
        <div className="max-w-5xl mx-auto pt-4">
          <div className="terminal-card p-6 md:p-8 border border-terminal-border bg-gradient-to-r from-terminal-accent/5 to-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-terminal-accent/5 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 text-left max-w-xl">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent uppercase tracking-wider font-bold">Limited Time Option</span>
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-accent animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Custom Plans</h3>
              <p className="text-[11px] font-mono text-gray-400 uppercase leading-relaxed">
                Same elite premium features (Full Trading Terminal, O.I Decoder, Fibonacci Pro Indicator Free, Advanced Levels, private community) but only for a limited duration. Perfect for testing and custom tailored access.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full md:w-auto">
              <div className="flex flex-col space-y-1.5 min-w-[200px]">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold">Select Active Plan</span>
                <select
                  value={selectedCustomDuration}
                  onChange={(e) => setSelectedCustomDuration(e.target.value)}
                  className="bg-terminal-bg border border-terminal-border rounded-lg px-3 py-3 text-xs font-mono text-white focus:border-terminal-accent outline-none"
                >
                  <option value="1m">1 Month Access — ₹999</option>
                  <option value="3m">3 Month Access — ₹2999</option>
                  <option value="6m">6 Month Access — ₹5999</option>
                  <option value="1y">Yearly — ₹11999</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  const selectedPlan = customPlans.find(p => p.id === selectedCustomDuration);
                  if (selectedPlan) {
                    setSelectedPlanDetail(selectedPlan);
                    setView('checkout');
                  }
                }}
                className="py-3 px-6 rounded font-black text-xs uppercase tracking-widest bg-white hover:bg-white/90 text-black transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] self-end"
              >
                Checkout Access
              </button>
            </div>
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

  const TickerContent = () => (
    <>
      <div className="flex items-center space-x-12 px-4">
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
            <span className={`text-xs font-bold ${getChangeColor(idx.change)}`}>
              {idx.change}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const menuItems = [
    { label: 'HOME', icon: Monitor, view: 'landing' },
    { label: 'TRADING TERMINAL', icon: Activity, view: 'dashboard' },
    { label: 'TRADING JOURNAL', icon: BookOpen, view: 'journal' },
    { label: 'BACKTEST LAB', icon: Calculator, view: 'backtest' },
    { label: 'O.I ANALYSIS', icon: BarChart3, view: 'oi' },
    { label: 'INDICATORS', icon: LineChart, view: 'indicators' },
    { label: 'IMPORTANT LINKS', icon: Info, view: 'links', onClick: () => { setShowLinksModal(true); setIsMenuOpen(false); } },
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
                      if (item.onClick) {
                        item.onClick();
                      } else if (item.view === 'landing') {
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
          <div className="px-4 border-r border-terminal-border h-full flex items-center bg-terminal-bg z-20">
            <Activity className="w-4 h-4 text-terminal-accent mr-2" />
            <span className="text-xs font-bold tracking-widest uppercase">PULSE</span>
          </div>
          <div className="flex-1 overflow-hidden relative flex items-center">
            <div className="ticker-scroll flex items-center">
              <TickerContent />
              <TickerContent />
            </div>
          </div>
          <div className="px-4 border-l border-terminal-border h-full flex items-center bg-terminal-bg z-20">
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

      {/* Dashboard Sub-navigation (Below Pulse) */}
      {view === 'dashboard' && (
        <div className="bg-terminal-card border-b border-terminal-border px-4 flex items-center space-x-1 overflow-x-auto py-1.5 scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Monitor },
            { id: 'astrology', label: 'Astrological Section', icon: Sparkles },
            { id: 'gann', label: 'Gann Concepts', icon: Compass },
            { id: 'news', label: 'Stock Market News', icon: Newspaper }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = dashboardTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDashboardTab(tab.id as any)}
                className={`flex items-center px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all rounded cursor-pointer border ${
                  isActive 
                    ? 'bg-terminal-accent text-white border-terminal-accent/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mr-2 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
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
          dashboardTab === 'dashboard' ? (
            <Dashboard />
          ) : dashboardTab === 'astrology' ? (
            <AstrologySection isAdmin={user?.email === 'rshankartrader@gmail.com' || userProfile?.role === 'admin'} />
          ) : dashboardTab === 'gann' ? (
            <GannConceptsSection />
          ) : dashboardTab === 'news' ? (
            <StockMarketNewsSection />
          ) : null
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
        ) : view === 'journal' ? (
          <TradingJournalMain />
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
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">NIFTY</span>
              </div>
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

      {/* Astro AI Floating Copilot */}
      {view === 'dashboard' && dashboardTab === 'astrology' && <AstroAiChat />}

      {/* Important Links Modal */}
      <AnimatePresence>
        {showLinksModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLinksModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-terminal-card border border-terminal-border rounded-lg shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="terminal-header bg-terminal-bg/50 border-b border-terminal-border p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-terminal-accent" />
                    <span className="text-xs font-mono uppercase tracking-widest text-white font-bold">IMPORTANT REQUISITE LINKS</span>
                  </div>
                  <button 
                    onClick={() => setShowLinksModal(false)}
                    className="text-gray-400 hover:text-white font-mono text-[10px] uppercase border border-terminal-border/40 px-2 py-0.5 rounded hover:bg-white/5 transition-all cursor-pointer"
                  >
                    CLOSE [X]
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div className="text-xs text-gray-400 font-mono leading-relaxed mb-2 uppercase tracking-wide">
                    Access critical exchange resources, regulatory redress portals, and community-curated technical setups.
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Link item 1 */}
                    <a 
                      href="https://scores.sebi.gov.in" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group flex items-center justify-between p-3 rounded bg-black/20 border border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-terminal-red/10 group-hover:bg-terminal-red/20 text-terminal-red transition-colors">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono uppercase group-hover:text-terminal-accent transition-colors">SEBI SCORES Portal</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Lodge & Track Official Investor Complaints</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>

                    {/* Link item 2 */}
                    <a 
                      href="https://www.nseindia.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group flex items-center justify-between p-3 rounded bg-black/20 border border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-terminal-accent/10 group-hover:bg-terminal-accent/20 text-terminal-accent transition-colors">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono uppercase group-hover:text-terminal-accent transition-colors">NSE India (National Stock Exchange)</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Official Derivatives, Option Chain & Live LTP Data</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>

                    {/* Link item 3 */}
                    <a 
                      href="https://www.tradingview.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group flex items-center justify-between p-3 rounded bg-black/20 border border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 transition-colors">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono uppercase group-hover:text-terminal-accent transition-colors">TradingView Live Charts</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Advanced Technical Analysis & Multi-Asset Plotting</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>

                    {/* Link item 4 */}
                    <a 
                      href="https://www.moneycontrol.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group flex items-center justify-between p-3 rounded bg-black/20 border border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-yellow-500/10 group-hover:bg-yellow-500/20 text-yellow-500 transition-colors">
                          <Newspaper className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono uppercase group-hover:text-terminal-accent transition-colors">Moneycontrol Market Feed</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Breaking News, Corporate Filings & Institutional Reports</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>

                    {/* Link item 5 */}
                    <a 
                      href="https://wa.me/918271890090" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="group flex items-center justify-between p-3 rounded bg-black/20 border border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-terminal-green/10 group-hover:bg-terminal-green/20 text-terminal-green transition-colors">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono uppercase group-hover:text-terminal-accent transition-colors">WhatsApp Trader Support</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Connect Directly with Dr. Ravi Shankar Kumar</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="bg-terminal-bg/80 border-t border-terminal-border p-3.5 text-center text-[9px] font-mono text-gray-500 uppercase">
                  Please consult professional regulatory disclosures prior to execution.
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
