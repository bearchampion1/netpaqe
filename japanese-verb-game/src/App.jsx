import { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

import LandingPage from './components/LandingPage';
import GamePanel from './components/GamePanel';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import FeedbackPanel from './components/FeedbackPanel';

export const UserContext = createContext();

// 取得環境變數中的管理員 Email 清單，並轉換為陣列
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

const isUserAdmin = (user) => {
  if (!user || !user.email) return false;
  // 如果沒有設定任何管理員，預設任何人登入都可以是管理員 (方便開發)，或是嚴格限制？
  // 為了安全，如果有設定環境變數，就只允許清單內的人。如果完全沒設定，就允許所有登入者。
  if (ADMIN_EMAILS.length === 0) return true; 
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
};

function Nav() {
  const location = useLocation();
  const { user, setUser } = useContext(UserContext);
  
  if (location.pathname === '/') return null;
  
  const navLink = (path, label) => (
    <Link 
      to={path} 
      className={`font-bold px-3 py-2 rounded text-sm md:text-base whitespace-nowrap shrink-0 break-keep ${
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
    <nav className="flex flex-col md:flex-row justify-between items-center p-4 border-b gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {navLink('/', '入口首頁')}
        {navLink('/game', '開始遊戲')}
        {navLink('/feedback', '意見回饋')}
        {/* 只有具備管理員權限才顯示後台與設定連結 */}
        {isAdmin && navLink('/admin', '後台新增')}
        {isAdmin && navLink('/settings', '資料庫設定')}
      </div>
      
      <div className="flex items-center gap-4 mt-2 md:mt-0">
        {user ? (
          <div className="flex items-center gap-2">
            <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />
            <div className="flex flex-col text-right">
              <span className="font-bold text-gray-700 leading-tight text-sm md:text-base">{user.name}</span>
              {isAdmin && <span className="text-[10px] text-red-500 font-bold leading-none">管理員</span>}
            </div>
            <button 
              onClick={() => {
                googleLogout();
                setUser(null);
                localStorage.removeItem('user_profile');
              }}
              className="text-xs md:text-sm text-gray-500 hover:text-black ml-2 font-bold whitespace-nowrap"
            >
              登出
            </button>
          </div>
        ) : (
          <div className="scale-90 md:scale-75 origin-center md:origin-right">
            <GoogleLogin
              onSuccess={credentialResponse => {
                const decoded = jwtDecode(credentialResponse.credential);
                setUser(decoded);
                localStorage.setItem('user_profile', JSON.stringify(decoded));
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              useOneTap
            />
          </div>
        )}
      </div>
    </nav>
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
  }, []);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <UserContext.Provider value={{ user, setUser }}>
        <Router>
          <div className="min-h-screen bg-white flex flex-col">
            <Nav />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/game" element={<GamePanel />} />
                <Route path="/feedback" element={<FeedbackPanel />} />
                <Route path="/admin" element={
                  <ProtectedRoute><AdminPanel /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><Settings /></ProtectedRoute>
                } />
              </Routes>
            </main>
            <footer className="bg-black text-white text-center py-4 text-sm font-bold">
              {currentYear} &copy; 熊哥 & Antigravity
            </footer>
          </div>
        </Router>
      </UserContext.Provider>
    </GoogleOAuthProvider>
  );
}
