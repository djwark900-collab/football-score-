import { User } from 'firebase/auth';
import { Search as SearchIcon, Plus as PlusIcon, User as UserIcon, Trophy as TrophyIcon, Lock as LockIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  setView: (view: any) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
}

export function Header({ user, onLogin, setView, isAdmin, onAdminClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center px-6">
      <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('matches')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <TrophyIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-blue-900">LiveScore<span className="text-blue-500">Pro</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
            <SearchIcon size={22} />
          </button>
          
          <button 
            onClick={onAdminClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm",
              isAdmin 
                ? "bg-green-50 text-green-600" 
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            )}
          >
            {isAdmin ? <PlusIcon size={18} /> : <LockIcon size={18} />}
            <span className="hidden sm:inline">{isAdmin ? 'Admin Panel' : 'Admin'}</span>
          </button>

          <button 
            onClick={user ? undefined : onLogin}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 hover:border-gray-300 transition-all"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <UserIcon className="text-gray-400" size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
