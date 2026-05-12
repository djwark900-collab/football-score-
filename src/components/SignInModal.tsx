import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X as XIcon, 
  Mail as MailIcon, 
  Lock as LockIcon, 
  User as UserIcon,
  ArrowRight as ArrowRightIcon,
  Github as GithubIcon
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface SignInModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SignInModal({ onClose, onSuccess }: SignInModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl border border-white/10 overflow-hidden"
      >
        {/* Decorative background Elements */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-8 pb-10">
          <div className="flex justify-between items-center mb-8 relative">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <MailIcon className="text-white" size={24} />
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all"
            >
              <XIcon size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-2 mb-8 text-center sm:text-left">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {mode === 'login' 
                ? 'Join thousands of fans managing their dream teams.' 
                : 'Start your fantasy journey today and compete globally.'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative group"
                >
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text"
                    required
                    placeholder="Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-sm font-bold dark:text-white outline-none transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-sm font-bold dark:text-white outline-none transition-all"
              />
            </div>

            <div className="relative group">
              <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-sm font-bold dark:text-white outline-none transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Or continue with</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google
          </button>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-xs font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
