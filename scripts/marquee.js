/*
  scripts/marquee.js
  功能：讀取 data-src（.xlsx 或 .csv）並產生跑馬燈 HTML
  說明：此檔案使用 SheetJS (XLSX) 解析 Excel，或以純文字解析 CSV，
       會支援含標頭的格式 (title,image,url) 以及無標頭的陣列格式。
*/
(function(){
    'use strict';

    // 以 fetch 取得檔案並回傳 ArrayBuffer（用於讀取二進位檔案，如 .xlsx）
    async function fetchAsArrayBuffer(url){
        const res = await fetch(url); // 叫瀏覽器去取回資源
        if(!res.ok) throw new Error('Fetch failed: '+res.status); // 若非 200 系列，拋錯
        return await res.arrayBuffer(); // 回傳 ArrayBuffer 供 XLSX 解析
    }

    // (僅支援 XLSX) 以 fetch 取得文字檔已移除，僅保留二進位 ArrayBuffer 讀取

    // 將解析後的列（rows）轉成統一的項目格式：{title, image, url, rank}
    // 支援輸入為陣列 (array row) 或物件 (object row with headers)
    function buildItemsFromRows(rows){
        // rows: array of objects or arrays
        const items = [];
        for(const r of rows){
            let title = '';
            let image = '';
            let url = '';
            let rank = '';
            if(Array.isArray(r)){
                // 若為陣列，預設為 [title, image, url, rank]
                title = r[0] || '';
                image = r[1] || '';
                url = r[2] || '';
                rank = r[3] || '';
            } else if(typeof r === 'object'){
                // 若為物件，嘗試使用常見欄位名稱（大小寫都支援）
                title = r.Title || r.title || r.name || Object.values(r)[0] || '';
                image = r.Image || r.image || Object.values(r)[1] || '';
                url = r.Url || r.url || r.link || Object.values(r)[2] || '';
                rank = r.Rank || r.rank || r.Ranking || r.ranking || r.order || r順位 || '';
            }
            if(title) items.push({title: String(title), image: String(image), url: String(url), rank: String(rank)}); // 包含 url 與 rank
        }
        return items; // 回傳統一格式的清單
    }

    // 將項目清單轉為跑馬燈的 HTML 字串（每個項目含圖片與標題）
    function makeMarkup(items){
        const single = items.map((it, index) => {
            // 排名數字顯示在圖片上方，優先使用 CSV 提供的 rank 欄位，否則採用序列
            const rankText = it.rank && it.rank.trim() !== '' ? it.rank : String(index + 1).padStart(2,'0');
            const rank = `<span class="marquee__rank">${escapeHtml(rankText)}</span>`;
            // 若有 image，產生 <img> 標籤（使用 escapeAttr 來避免引號問題）
            // 不立即設定 `src`，改用 `data-src` 儲存路徑，暫停瀏覽器自動載入圖片以利偵錯/加速頁面
            // 若未來需要再啟用圖片載入，可撈取 data-src 並動態設定 img.src
            const imgPart = it.image ? `<div class="marquee__img" data-src="${escapeAttr(it.image)}" aria-hidden="true"></div>` : '';
            // 內容（推薦數字 + 圖片 + 標題）
            const content = `<span class="marquee__item">${rank}${imgPart}<span class="marquee__title">${escapeHtml(it.title)}</span></span>`;
            // 若有 url，則把整個項目包成可點擊連結
            if(it.url && (''+it.url).trim() !== ''){
                const safeUrl = escapeAttr(it.url);
                return `<a class="marquee__link" href="${safeUrl}" target="_blank" rel="noopener">${content}</a>`;
            }
            return content;
        }).join('<span class="marquee__sep">·</span>');
        // 為了無縫循環，將清單重複一次並以分隔符串接
        return single + '<span class="marquee__sep">·</span>' + single;
    }

    // 將使用者輸入的字串做 HTML 字元轉義，避免 XSS 與標籤注入
    function escapeHtml(s){
        return s.replace(/[&<>\"]/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c; });
    }
    // 針對屬性值的雙引號做替換（用在 img src / alt 等屬性）
    function escapeAttr(s){
        return s.replace(/"/g,'&quot;');
    }

    // 嘗試把來源路徑改成同名 WebP；若原本就是 WebP 或無法辨識副檔名，則回傳原值
    function toWebpCandidate(src){
        if(!src) return '';
        const value = String(src).trim();
        if(!value) return '';

        const fileName = value.split('/').pop() || '';
        const webpName = fileName.replace(/\.(png|jpe?g|svg|ico)$/i, '.webp');
        if(webpName === fileName) return value;

        if(/^https?:\/\//i.test(value)){
            return 'image/' + webpName;
        }

        if(value.startsWith('image/')){
            return 'image/' + webpName;
        }

        if(value.startsWith('./')){
            return 'image/' + webpName;
        }

        return 'image/' + webpName;
    }

    // 由 .xlsx 讀取資料，優先嘗試以標頭列解析成物件陣列
    async function loadFromXLSX(url){
        // 如果 SheetJS (XLSX) 尚未載入，主動失敗以便上層可退回 CSV
        if(typeof window === 'undefined' || typeof window.XLSX === 'undefined'){
            throw new Error('SheetJS (XLSX) 未載入：無法解析 .xlsx，請確認網頁能存取 https://cdn.sheetjs.com 或使用 .csv');
        }
        const ab = await fetchAsArrayBuffer(url); // 下載二進位檔
        const data = new Uint8Array(ab); // 轉成 Uint8Array 給 XLSX 使用
        const workbook = XLSX.read(data, {type:'array'}); // 使用 SheetJS 解析 workbook
        const firstSheetName = workbook.SheetNames[0]; // 取得第一個工作表名稱
        const sheet = workbook.Sheets[firstSheetName]; // 取得工作表資料
        // 先嘗試用 header 解析成物件陣列（例如欄位為 title,image,url）
        const objs = XLSX.utils.sheet_to_json(sheet, {defval: '', raw: false});
        if(Array.isArray(objs) && objs.length>0){
            return buildItemsFromRows(objs); // 交由 buildItemsFromRows 轉換
        }
        // 若無法以物件陣列取得，退回到以陣列列解析（header:1）
        const rows = XLSX.utils.sheet_to_json(sheet, {header:1});
        const processed = rows.map(r => r.map(cell => cell==null? '': cell));
        // 若第一列看起來像 header（皆為字串），就移除它
        if(processed.length>1 && processed[0].every(c=>typeof c==='string')) processed.shift();
        return buildItemsFromRows(processed);
    }

    // CSV 支援已移除，僅保留 Excel (.xlsx) 解析

    // 主要的填充函式：給定 marquee 元素，從 data-src 取得來源並載入資料
    async function populateMarquee(marquee){
        const src = marquee.getAttribute('data-src'); // 讀取 data-src 屬性
        if(!src) return; // 若沒有設定來源則直接跳過
        try{
            let items = [];
            // 只支援 .xlsx：加入 cache-buster 避免快取問題
            const fetchUrl = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
            items = await loadFromXLSX(fetchUrl);

            // 正規化 image 欄位：若不是絕對 URL，預設加上 image/ 前綴
            // 並保留 url 欄位
            items = items.map(it=>{
                let img = it.image || '';
                if(img && !/^https?:\/\//i.test(img) && !img.startsWith('/')){
                    // 若尚未以 image/ 或 ./ 開頭，則自動加上 image/ 前綴
                    if(!img.startsWith('image/') && !img.startsWith('./') ) img = 'image/' + img;
                }
                return {title: it.title, image: img, url: it.url || ''};
            });

            if(items.length===0) return; // 若沒有項目就不更新 DOM
            const inner = marquee.querySelector('.marquee__inner'); // 找到跑馬燈內層容器
            const markup = makeMarkup(items); // 先產生一組重複內容
            inner.innerHTML = markup;
            // 若單次跑馬燈內容寬度小於可視區間，補齊額外重複內容，避免桌面版出現空白或跳轉
            const viewportWidth = marquee.clientWidth || marquee.offsetWidth;
            while(inner.scrollWidth < viewportWidth * 2){
                inner.innerHTML += markup;
            }
            // 根據實際內容寬度調整動畫時間，讓跑馬燈播放節奏更流暢
            const contentWidth = inner.scrollWidth / 2 || 1;
            const duration = Math.max(18, Math.min(40, Math.round(contentWidth / 30)));
            inner.style.setProperty('--marquee-duration', duration + 's');
            // 改為使用 IntersectionObserver 懶載圖片（限制同時請求數量）
            observeAndLoadImages(marquee);
        }catch(err){
            // 發生錯誤時在 console 顯示並於畫面上顯示錯誤訊息
            console.error('marquee load error', err);
            const inner = marquee.querySelector('.marquee__inner');
            inner.innerHTML = `<span class="marquee__item">載入失敗：${escapeHtml(String(err.message))}</span>`;
        }
    }

    // 暴露一個全域函式以便手動重新載入跑馬燈（例如在開發或更新 Excel 後使用）
    // 使用方式：在 console 或其他按鈕呼叫 `window.reloadMarquee()`
    window.reloadMarquee = function(){
        document.querySelectorAll('.marquee[data-src]').forEach(m=>{
            const inner = m.querySelector('.marquee__inner');
            if(inner) inner.innerHTML = '<span class="marquee__item">載入中...</span>';
            populateMarquee(m);
        });
    };

    // 觀察並懶載圖片，限制同時下載數量以避免一次性大量請求
    function observeAndLoadImages(marquee){
        if(!marquee) return;
        const placeholders = Array.from(marquee.querySelectorAll('.marquee__img[data-src]'));
        if(placeholders.length === 0) return;

        const MAX_CONCURRENT = 3;
        let active = 0;
        const queue = [];

        function loadPlaceholder(ph){
            const src = ph.getAttribute('data-src');
            if(!src) return Promise.resolve();
            return new Promise((resolve) => {
                const img = new Image();
                const candidates = [];
                const webpCandidate = toWebpCandidate(src);
                if(webpCandidate && webpCandidate !== src) candidates.push(webpCandidate);
                candidates.push(src);
                let candidateIndex = 0;

                img.onload = function(){
                    ph.style.backgroundImage = `url('${img.currentSrc || img.src}')`;
                    ph.classList.add('loaded');
                    ph.removeAttribute('data-src');
                    ph.setAttribute('aria-hidden','false');
                    resolve();
                };
                img.onerror = function(){
                    candidateIndex += 1;
                    if(candidateIndex < candidates.length){
                        img.src = candidates[candidateIndex];
                        return;
                    }
                    ph.classList.add('error');
                    ph.removeAttribute('data-src');
                    resolve();
                };
                img.src = candidates[candidateIndex];
            });
        }

        function schedule(ph){
            if(active < MAX_CONCURRENT){
                active++;
                loadPlaceholder(ph).then(()=>{ active--; if(queue.length) schedule(queue.shift()); });
            } else {
                queue.push(ph);
            }
        }

        const io = new IntersectionObserver((entries)=>{
            entries.forEach(entry => {
                if(entry.isIntersecting){
                    const ph = entry.target;
                    io.unobserve(ph);
                    schedule(ph);
                }
            });
        }, {root: null, rootMargin: '200px', threshold: 0.01});

        placeholders.forEach(p=> io.observe(p));
    }

    // DOMContentLoaded 時初始化：尋找所有帶有 data-src 的 .marquee 元素並填充
    document.addEventListener('DOMContentLoaded', function(){
        document.querySelectorAll('.marquee[data-src]').forEach(m=>{ populateMarquee(m); });
    });

})();
