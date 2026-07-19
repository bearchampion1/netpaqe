// trigger entrance animations after DOM content loaded
document.addEventListener('DOMContentLoaded', function(){
    // small timeout so CSS can apply initial state
    requestAnimationFrame(function(){
        document.body.classList.add('is-loaded');
    });

    var menuButton = document.querySelector('.menu_button');
    var pageMenu = document.getElementById('pageMenu');

    if(menuButton && pageMenu){
        var setMenuOpen = function(isOpen){
            pageMenu.hidden = !isOpen;
            menuButton.setAttribute('aria-expanded', String(isOpen));
            menuButton.setAttribute('aria-label', isOpen ? '關閉選單' : '開啟選單');
        };

        setMenuOpen(false);

        menuButton.addEventListener('click', function(){
            setMenuOpen(pageMenu.hidden);
        });

        pageMenu.addEventListener('click', function(event){
            if(event.target.closest('a')){
                setMenuOpen(false);
            }
        });

        document.addEventListener('click', function(event){
            if(pageMenu.hidden){
                return;
            }

            if(!pageMenu.contains(event.target) && !menuButton.contains(event.target)){
                setMenuOpen(false);
            }
        });

        document.addEventListener('keydown', function(event){
            if(event.key === 'Escape'){
                setMenuOpen(false);
            }
        });
    }

    var ytButton = document.querySelector('.card_board a.card_button[href*="youtube.com"]');
    if(ytButton){
        var clearFocus = function(){
            ytButton.blur();
        };
        var clearFocusTimer = null;

        var scheduleClearFocus = function(){
            if(clearFocusTimer){
                window.clearTimeout(clearFocusTimer);
            }
            clearFocusTimer = window.setTimeout(function(){
                clearFocus();
                clearFocusTimer = null;
            }, 2000);
        };

        ytButton.addEventListener('click', function(){
            scheduleClearFocus();
        });

        ytButton.addEventListener('touchend', function(){
            scheduleClearFocus();
        }, { passive: true });

        window.addEventListener('pageshow', clearFocus);
    }
});