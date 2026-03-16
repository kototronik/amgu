import init from './init.js';

if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            window.location.reload(); 
            refreshing = true;
        }
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA: готов к работе'))
            .catch(err => console.error('PWA: ошибка', err));
    });
}

init();