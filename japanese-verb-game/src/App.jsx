import { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

import LandingPage from './components/LandingPage';
import GamePanel from './components/GamePanel';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';

export const UserContext = createContext();

function Nav() {
  const location = useLocation();
  const { user, setUser } = useContext(UserContext);
  
  if (location.pathname === '/') return null;
  
  const navLink = (path, label) => (
    <Link 
      to={path} 
      className={`font-bold px-4 py-2 rounded ${
        location.pathname === path 
          ? 'bg-black text-white' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex justify-between items-center p-4 border-b">
      <div className="flex gap-4">
        {navLink('/', '入口首頁')}
        {navLink('/game', '開始遊戲')}
        {navLink('/admin', '後台新增')}
        {navLink('/settings', '資料庫設定')}
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-2">
            <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />
            <span className="font-bold text-gray-700">{user.name}</span>
            <button 
              onClick={() => {
                googleLogout();
                setUser(null);
                localStorage.removeItem('user_profile');
              }}
              className="text-sm text-gray-500 hover:text-black ml-2 font-bold"
            >
              登出
            </button>
          </div>
        ) : (
          <div className="scale-75 origin-right">
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
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/settings" element={<Settings />} />
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
