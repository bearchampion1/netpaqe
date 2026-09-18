import { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

import LandingPage from './components/LandingPage';
import GamePanel from './components/GamePanel';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import FeedbackPanel from './components/FeedbackPanel';
import Profile from './components/Profile';
import { ensureUserExists } from './api/database';
import { supabase } from './api/supabaseClient';

export const UserContext = createContext();

const isUserAdmin = (user) => {
  return user?.role === 'admin';
};

function AuthBlock({ className }) {
  const { user, setUser } = useContext(UserContext);
  const isAdmin = isUserAdmin(user);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {user ? (
        <div className="flex items-center gap-2">
          <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />
          <div className="flex flex-col text-right">
            <span className="font-bold text-gray-700 leading-tight text-sm md:text-base">{user.name}</span>
            {isAdmin && <span className="text-[10px] text-red-500 font-bold leading-none">管理員</span>}
          </div>
          <button 
            onClick={async () => {
              googleLogout();
              await supabase.auth.signOut();
              setUser(null);
              localStorage.removeItem('user_profile');
            }}
            className="text-xs md:text-sm text-gray-500 hover:text-black ml-2 font-bold whitespace-nowrap"
          >
            登出
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-2 scale-90 md:scale-100 origin-center md:origin-right">
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'custom:line',
              });
              if (error) {
                console.error('LINE login error:', error);
                alert('LINE 登入設定可能尚未完成或名稱錯誤！');
              }
            }}
            className="bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-[6px] px-4 rounded text-sm whitespace-nowrap flex items-center justify-center h-[40px] w-[200px]"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" 
              alt="LINE Logo" 
              className="w-6 h-6 mr-2 bg-white rounded flex-shrink-0 p-0.5"
            />
            用 LINE 登入
          </button>
          
          <div className="h-[40px]">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const decoded = jwtDecode(credentialResponse.credential);
                // Save to Supabase and get role
                const dbUser = await ensureUserExists(decoded);
                const finalUser = { ...decoded, role: dbUser?.role || 'player' };
                setUser(finalUser);
                localStorage.setItem('user_profile', JSON.stringify(finalUser));
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              useOneTap
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Nav() {
  const location = useLocation();
  const { user } = useContext(UserContext);
  
  if (location.pathname === '/') return null;
  
  const navLink = (path, label) => (
    <Link 
      to={path} 
      style={{ whiteSpace: 'nowrap' }}
      className={`font-bold px-2 py-1 sm:px-3 sm:py-2 rounded text-xs sm:text-sm md:text-base shrink-0 ${
        location.pathname === path 
          ? 'bg-black text-white' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

  const isAdmin = isUserAdmin(user);

  return (
    <nav className="flex flex-col md:flex-row justify-between items-center p-2 sm:p-4 border-b gap-2 sm:gap-4 bg-white z-10">
      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
        {navLink('/', '入口首頁')}
        {navLink('/game', '開始遊戲')}
        {navLink('/profile', '遊戲紀錄及過去錯題')}
        {navLink('/feedback', '意見回饋')}
        {/* 只有具備管理員權限才顯示後台與設定連結 */}
        {isAdmin && navLink('/admin', '後台新增')}
        {isAdmin && navLink('/settings', '資料庫設定')}
      </div>
      
      {/* 桌面版的登入區塊 (大於 md 顯示) */}
      <AuthBlock className="hidden md:flex" />
    </nav>
  );
}

function MobileAuth() {
  const location = useLocation();
  if (location.pathname === '/') return null;
  
  return (
    <div className="md:hidden flex justify-center items-center py-3 bg-gray-50 border-t">
      <AuthBlock className="flex" />
    </div>
  );
}

// 保護路由組件：檢查是否登入且具有管理員權限
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(UserContext);
  
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">未登入</h2>
        <p className="text-gray-600 mb-4">請先使用 Google 帳號登入才能存取此頁面。</p>
        <Link to="/game" className="px-4 py-2 bg-black text-white rounded font-bold">返回遊戲</Link>
      </div>
    );
  }

  if (!isUserAdmin(user)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">權限不足</h2>
        <p className="text-gray-600 mb-4">抱歉，您的帳號 ({user.email}) 沒有後台管理權限。</p>
        <Link to="/game" className="px-4 py-2 bg-black text-white rounded font-bold">返回遊戲</Link>
      </div>
    );
  }
  
  return children;
};

export default function App() {
  const currentYear = new Date().getFullYear();
  const [user, setUser] = useState(null);
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '尚未設定 Client ID';

  useEffect(() => {
    const savedUser = localStorage.getItem('user_profile');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // 監聽 Supabase 的登入狀態 (給 LINE 登入用)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const sUser = session.user;
          // 將 Supabase 的 user 轉成我們舊有的格式
          const decoded = {
            email: sUser.email,
            name: sUser.user_metadata?.name || sUser.user_metadata?.full_name || 'LINE 用戶',
            picture: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture || '',
          };
          const dbUser = await ensureUserExists(decoded);
          const finalUser = { ...decoded, role: dbUser?.role || 'player' };
          setUser(finalUser);
          localStorage.setItem('user_profile', JSON.stringify(finalUser));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <UserContext.Provider value={{ user, setUser }}>
        <Router>
          <div className="min-h-screen bg-white flex flex-col">
            <Nav />
            <main className="flex-1 flex flex-col relative overflow-x-hidden">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/game" element={<GamePanel />} />
                <Route path="/feedback" element={<FeedbackPanel />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={
                  <ProtectedRoute><AdminPanel /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><Settings /></ProtectedRoute>
                } />
              </Routes>
            </main>
            <MobileAuth />
            <footer className="bg-black text-white text-center py-4 text-sm font-bold shrink-0">
              {currentYear} &copy; 熊哥 & Antigravity
            </footer>
          </div>
        </Router>
      </UserContext.Provider>
    </GoogleOAuthProvider>
  );
}
