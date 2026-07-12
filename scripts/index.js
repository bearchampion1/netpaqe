// trigger entrance animations after DOM content loaded
document.addEventListener('DOMContentLoaded', function(){
    // small timeout so CSS can apply initial state
    requestAnimationFrame(function(){
        document.body.classList.add('is-loaded');
    });

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