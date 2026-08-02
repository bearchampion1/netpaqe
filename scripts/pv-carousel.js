(function(){
    'use strict';

    function escapeHtml(s){
        return String(s).replace(/[&<>\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c; });
    }
    function escapeAttr(s){
        return String(s).replace(/"/g, '&quot;');
    }

    window.movie = function(videoId){
        if(!videoId) return;
        const safeId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, '');
        window.open('https://www.youtube.com/watch?v=' + safeId, '_blank', 'noopener');
    };

    function buildCard(item, index, total){
        const title = escapeHtml(item.title || '未命名影片');
        const videoId = escapeAttr(item.videoId || '');
        const image = item.image ? escapeAttr(item.image) : `//img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const ariaLabel = `${index + 1}/${total}`;

        return `
            <li class="movieList swiper-slide" data-swiper-slide-index="${index}" role="group" aria-label="${ariaLabel}">
                <div class="movieList__header">
                    <p class="movieList__title">${title}</p>
                </div>
                <button class="movieList__thumb js-moviePlay js-hover" type="button" onclick="movie('${videoId}')" onmousedown="return false" oncopy="return false" onselectstart="return false" oncontextmenu="return false">
                    <img src="${image}" alt="${title} 封面" loading="lazy">
                </button>
            </li>
        `;
    }

    function setMessage(track, text){
        track.innerHTML = `<div class="pv-carousel__message">${escapeHtml(text)}</div>`;
    }

    function loadCarousel(carousel){
        const src = carousel.getAttribute('data-src');
        if(!src){
            setMessage(carousel.querySelector('.pv-carousel__track'), '未設定資料來源');
            return;
        }

        fetch(src).then(res => {
            if(!res.ok) throw new Error('Fetch failed: ' + res.status);
            return res.json();
        }).then(items => {
            if(!Array.isArray(items) || items.length === 0){
                throw new Error('資料格式錯誤或沒有項目');
            }
            const track = carousel.querySelector('.pv-carousel__track');
            const cards = items.map((item, index) => buildCard(item, index, items.length));
            track.innerHTML = cards.join('') + cards[0];
            setupInteraction(carousel, track, items.length);
        }).catch(err => {
            console.error('pv carousel load error', err);
            const track = carousel.querySelector('.pv-carousel__track');
            setMessage(track, '載入失敗：' + err.message);
        });
    }

    function setupInteraction(carousel, track, itemCount){
        let currentIndex = 0;
        let isPointerDown = false;
        let startX = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let animationFrame = null;
        let autoPlayTimer = null;
        const gap = 16;
        const interval = parseInt(carousel.getAttribute('data-autoplay-interval'), 10) || 6000;
        const navContainer = carousel.querySelector('.pv-carousel__nav');
        const navButtons = []; // will hold {button, progressEl}

        function getDimensions(){
            const cardWidth = track.children[0]?.offsetWidth || 280;
            const viewportWidth = carousel.clientWidth || carousel.offsetWidth || window.innerWidth;
            const centerOffset = Math.max(0, (viewportWidth - cardWidth) / 2);
            const totalWidth = track.scrollWidth;
            const maxTranslate = Math.max(0, totalWidth - viewportWidth);
            return {cardWidth, viewportWidth, centerOffset, totalWidth, maxTranslate};
        }

        function layoutTrack(){
            track.style.padding = '16px 32px';
        }

        function clamp(value){
            return Math.max(0, Math.min(value, getDimensions().maxTranslate));
        }

        function updateTrack(){
            track.style.transform = `translateX(-${clamp(currentTranslate)}px)`;
        }

        function getCenteredTranslate(index){
            const card = track.children[index];
            if(!card) return 0;
            const {cardWidth, viewportWidth, maxTranslate} = getDimensions();
            const cardLeft = card.offsetLeft;
            const desired = cardLeft + cardWidth / 2 - viewportWidth / 2;
            return Math.max(0, Math.min(desired, maxTranslate));
        }

        function createNavButtons(){
            if(!navContainer) return;
            navContainer.innerHTML = '';
            navButtons.length = 0;
            track.querySelectorAll('.movieList.swiper-slide').forEach((slide, index) => {
                if(index >= itemCount) return;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'pv-nav__button';
                // use a small center dot plus an SVG ring for circular progress
                button.innerHTML = `
                    <span class="pv-nav__label"></span>
                    <svg class="pv-nav__svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                                    <linearGradient id="pv-gradient" x1="0%" x2="100%">
                                        <stop offset="0%" stop-color="#7ad7ff"/>
                                        <stop offset="100%" stop-color="#00bfff"/>
                                    </linearGradient>
                        </defs>
                            <circle class="pv-nav__circle-bg" cx="18" cy="18" r="16"></circle>
                            <circle class="pv-nav__circle-fg" cx="18" cy="18" r="16"></circle>
                    </svg>
                `;
                const progressEl = button.querySelector('.pv-nav__circle-fg');
                // ensure initial dash values so animation works reliably
                if(progressEl){
                    const C = 2 * Math.PI * 16;
                    progressEl.style.transition = 'none';
                    progressEl.style.strokeDasharray = String(C);
                    progressEl.style.strokeDashoffset = String(C);
                    progressEl.style.transform = 'rotate(-90deg)';
                    // ensure stroke references the local gradient defined in this SVG
                    progressEl.setAttribute('stroke', 'url(#pv-gradient)');
                }
                button.addEventListener('click', () => {
                    moveTo(index);
                    stopAutoPlay();
                    startAutoPlay();
                });
                navContainer.appendChild(button);
                navButtons.push({button, progressEl});
            });
        }

        function updateActiveStates(){
            Array.from(track.children).forEach((child, idx) => {
                child.classList.toggle('active', idx === currentIndex);
            });
            navButtons.forEach(({button}, idx) => {
                button.classList.toggle('active', idx === currentIndex);
            });
        }

        function moveTo(index){
            currentIndex = ((index % itemCount) + itemCount) % itemCount;
            currentTranslate = getCenteredTranslate(currentIndex);
            prevTranslate = currentTranslate;
            updateTrack();
            updateActiveStates();
        }

        function autoAdvance(){
            moveTo(currentIndex + 1);
            // restart visual progress for the newly active index
            startProgressFor(currentIndex);
            autoPlayTimer = window.setTimeout(autoAdvance, interval);
        }

        function startAutoPlay(){
            if(autoPlayTimer) window.clearTimeout(autoPlayTimer);
            // start visual progress for current index then set timer
            startProgressFor(currentIndex);
            autoPlayTimer = window.setTimeout(autoAdvance, interval);
        }

        function stopAutoPlay(){
            if(autoPlayTimer){
                window.clearTimeout(autoPlayTimer);
                autoPlayTimer = null;
            }
            resetProgressAll();
        }

        const CIRCUMFERENCE = 2 * Math.PI * 16; // r = 16 (matches SVG)

        function resetProgressAll(){
            navButtons.forEach(({progressEl}) => {
                if(!progressEl) return;
                progressEl.style.transition = 'none';
                progressEl.style.strokeDasharray = String(CIRCUMFERENCE);
                progressEl.style.strokeDashoffset = String(CIRCUMFERENCE);
            });
        }

        function startProgressFor(idx){
            resetProgressAll();
            const obj = navButtons[idx];
            if(!obj || !obj.progressEl) return;
            const el = obj.progressEl;
            // ensure correct dasharray
            el.style.strokeDasharray = String(CIRCUMFERENCE);
            // force reflow to restart transition
            void el.getBoundingClientRect();
            // animate dashoffset from full -> 0 over interval
            el.style.transition = `stroke-dashoffset ${interval}ms linear`;
            el.style.strokeDashoffset = '0';
        }

        function pointerDown(event){
            if(event.pointerType === 'mouse' && event.button !== 0) return;
            isPointerDown = true;
            startX = event.clientX;
            carousel.classList.add('pv-carousel--dragging');
            prevTranslate = currentTranslate;
            track.style.transition = 'none';
            stopAutoPlay();
            event.target.setPointerCapture?.(event.pointerId);
        }

        function pointerMove(event){
            if(!isPointerDown) return;
            const deltaX = event.clientX - startX;
            currentTranslate = clamp(prevTranslate - deltaX);
            updateTrack();
        }

        function pointerUp(){
            if(!isPointerDown) return;
            isPointerDown = false;
            carousel.classList.remove('pv-carousel--dragging');
            track.style.transition = '';
            const {cardWidth} = getDimensions();
            const nearestIndex = Math.round(currentTranslate / (cardWidth + gap));
            moveTo(nearestIndex);
            startAutoPlay();
        }

        carousel.addEventListener('pointerdown', pointerDown);
        carousel.addEventListener('pointermove', pointerMove);
        carousel.addEventListener('pointerup', pointerUp);
        carousel.addEventListener('pointercancel', pointerUp);
        carousel.addEventListener('mouseleave', pointerUp);
        carousel.addEventListener('touchstart', () => {}, {passive: true});
        window.addEventListener('resize', () => {
            layoutTrack();
            moveTo(currentIndex);
        });

        layoutTrack();
        createNavButtons();
        moveTo(0);
        startAutoPlay();
    }

    document.addEventListener('DOMContentLoaded', function(){
        document.querySelectorAll('.pv-carousel[data-src]').forEach(loadCarousel);
    });
})();