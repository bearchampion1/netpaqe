import { useState } from 'react';
import { addVerb } from '../api/googleSheets';

export default function AdminPanel() {
  const [inData, setInData] = useState({ kanji: '', hiragana: '', meaning: '' });
  const [trData, setTrData] = useState({ kanji: '', hiragana: '', meaning: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeInput, setActiveInput] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inData.kanji && !trData.kanji) {
      setMessage({ type: 'error', text: '請至少填寫一個自動詞或他動詞' });
      return;
    }
    if (inData.kanji && (!inData.meaning || !inData.hiragana)) {
      setMessage({ type: 'error', text: '填寫自動詞時，平假名與意思為必填' });
      return;
    }
    if (trData.kanji && (!trData.meaning || !trData.hiragana)) {
      setMessage({ type: 'error', text: '填寫他動詞時，平假名與意思為必填' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await addVerb({
        in_kanji: inData.kanji,
        in_hiragana: inData.hiragana,
        in_meaning: inData.meaning,
        tr_kanji: trData.kanji,
        tr_hiragana: trData.hiragana,
        tr_meaning: trData.meaning,
      });
      // 新增成功後清除本機快取，確保下次進入遊戲時會重新抓取最新資料
      localStorage.removeItem('verbs_cache');
      
      setMessage({ type: 'success', text: '新增成功！' });
      setInData({ kanji: '', hiragana: '', meaning: '' });
      setTrData({ kanji: '', hiragana: '', meaning: '' });
      setActiveInput(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '新增失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h2 className="text-2xl font-bold text-center mb-6">新增動詞</h2>
      
      {message.text && (
        <div className={`p-3 mb-4 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-4">
          <h3 className="font-bold text-blue-700">自動詞區塊</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">自動詞 (漢字)</label>
              <input
                type="text"
                className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 font-bold"
                placeholder="例：開く"
                value={inData.kanji}
                onChange={(e) => setInData({...inData, kanji: e.target.value})}
                onFocus={() => setActiveInput('in')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">平假名</label>
              <input
                type="text"
                className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：あく"
                value={inData.hiragana}
                onChange={(e) => setInData({...inData, hiragana: e.target.value})}
                onFocus={() => setActiveInput('in')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">意思</label>
              <input
                type="text"
                className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：(門)打開"
                value={inData.meaning}
                onChange={(e) => setInData({...inData, meaning: e.target.value})}
                onFocus={() => setActiveInput('in')}
              />
            </div>
          </div>
          {activeInput === 'in' && !trData.kanji && (
            <p className="text-sm text-blue-600 font-bold">💡 如果有對應的「他動詞」，請記得填寫下方區塊。如果沒有可留空。</p>
          )}
        </div>

        <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg space-y-4">
          <h3 className="font-bold text-green-700">他動詞區塊</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">他動詞 (漢字)</label>
              <input
                type="text"
                className="w-full p-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-green-600 font-bold"
                placeholder="例：開ける"
                value={trData.kanji}
                onChange={(e) => setTrData({...trData, kanji: e.target.value})}
                onFocus={() => setActiveInput('tr')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">平假名</label>
              <input
                type="text"
                className="w-full p-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例：あける"
                value={trData.hiragana}
                onChange={(e) => setTrData({...trData, hiragana: e.target.value})}
                onFocus={() => setActiveInput('tr')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">意思</label>
              <input
                type="text"
                className="w-full p-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例：打開(門)"
                value={trData.meaning}
                onChange={(e) => setTrData({...trData, meaning: e.target.value})}
                onFocus={() => setActiveInput('tr')}
              />
            </div>
          </div>
          {activeInput === 'tr' && !inData.kanji && (
            <p className="text-sm text-green-600 font-bold">💡 如果有對應的「自動詞」，請記得填寫上方區塊。如果沒有可留空。</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-800 disabled:opacity-50 text-lg shadow-md"
        >
          {loading ? '儲存中...' : '新增至資料庫'}
        </button>
      </form>
    </div>
  );
}
