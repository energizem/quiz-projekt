// public/js/utils.js

/**
 * Nasumično miješa niz koristeći Fisher-Yates algoritam.
 * @param {Array} array Niz za miješanje.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Postavlja event listener za prebacivanje prijevoda na gumbu.
 * @param {HTMLElement} button Gumb za prevođenje.
 * @param {HTMLElement} translationDiv HTML element koji sadrži prijevod.
 */
export function setupTranslationToggle(button, translationDiv) {
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Spriječi da klik na gumb utječe na labelu ili druge elemente
        translationDiv.classList.toggle('hidden-translation');
        if (translationDiv.classList.contains('hidden-translation')) {
            button.textContent = ' [+]';
        } else {
            button.textContent = ' [–]';
        }
    });
}