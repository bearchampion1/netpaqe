import { useState, useEffect } from 'react';

export default function Settings() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('gas_api_url');
    if (existing) setUrl(existing);
  }, []);

  const handleSave = () => {
    localStorage.setItem('gas_api_url', url);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h2 className="text-2xl font-bold text-center mb-6">設定資料庫</h2>
      <p className="mb-4 text-gray-600 text-sm">
        請貼上您部署好的 Google Apps Script 網頁應用程式網址。遊戲將透過此網址讀取與寫入您的 Google 試算表。
      </p>

      <div className="mb-4">
        <label className="block text-gray-700 font-bold mb-2">API 網址</label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-black text-white font-bold py-2 px-4 rounded hover:bg-gray-800"
      >
        儲存設定
      </button>

      {saved && <p className="mt-4 text-green-600 text-center font-bold">設定已儲存！</p>}
    </div>
  );
}
