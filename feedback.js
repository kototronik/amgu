document.addEventListener('DOMContentLoaded', () => {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbw_mM-Cwkst2M1JjgyC6fQvLg2NwLFMXvWe7YktY0nTPAxt5Lvy7wfOxc9VOAyI7YOv/exec'; 
    
    const form = document.getElementById('feedback-form');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('fb-submit');
    const stars = document.querySelectorAll('.star');
    const chips = document.querySelectorAll('.type-chip');

    const contactField = document.getElementById('fb-contact');
    contactField.addEventListener('input', () => {
        contactField.value = contactField.value.replace(/[^a-zA-Z0-9_@]/g, '');
    });
    let selectedType = 'Идея';
    let selectedRating = 0;

    chips.forEach(chip => {
        chip.onclick = () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedType = chip.getAttribute('data-type');
        };
    });
function getFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    

    const components = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        navigator.hardwareConcurrency, 
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'no-gpu'
    ];
    

    return btoa(components.join('|')).substr(0, 32);
}
    stars.forEach(star => {
        star.onclick = () => {
            selectedRating = parseInt(star.getAttribute('data-val'));
            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-val'));
                s.classList.toggle('active', sVal <= selectedRating);
            });
        };
    });

form.onsubmit = async (e) => {
        e.preventDefault();
        
        const contactInput = document.getElementById('fb-contact').value.trim();
        const commentInput = document.getElementById('fb-comment').value.trim();


        if (selectedRating === 0) {
            status.style.color = '#ffb700';
            status.textContent = 'звездочки забыл!';
            return;
        }


        const nickRegex = /^[a-zA-Z0-9_]*$/;
        if (contactInput !== "" && !nickRegex.test(contactInput.replace('@', ''))) {
            status.style.color = '#ffb700';
            status.textContent = 'ник только на английском!';
            return;
        }


        if (commentInput.length < 2) {
            status.style.color = '#ffb700';
            status.textContent = 'напиши хоть пару слов...';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        const payload = {
            uid: getFingerprint(),
            type: selectedType,
            rating: selectedRating,
            contact: contactInput,
            comment: commentInput
        };

        try {
            await fetch(scriptURL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            status.style.color = '#4bb543';
            status.textContent = 'спасибо! ща верну тебя обратно...';
            
            setTimeout(() => {
                if (typeof smartBack === "function") {
                    smartBack();
                } else {
                    window.history.back();
                }
            }, 1500);

        } catch (err) {
            console.error(err);
            status.style.color = '#fc5e53';
            status.textContent = 'ух ты емае, что-то пошло не так :(';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    };
});