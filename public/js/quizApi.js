// public/js/quizApi.js

/**
 * Dohvaća dostupne regije s API-ja.
 * @returns {Promise<Array>} Niz objekata regija.
 * @throws {Error} Ako je došlo do greške prilikom dohvaćanja.
 */
export async function fetchRegions() {
    try {
        const response = await fetch('/api/regije');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Abrufen der Regionen:', error);
        throw error;
    }
}

/**
 * Dohvaća pitanja za kviz na temelju odabranih regija.
 * @param {string|Array} selectedRegion Odabrana regija ili niz regija ('all' ili ['Bayern', 'Hessen']).
 * @param {number} brojPitanja Broj pitanja koja se trebaju dohvatiti.
 * @returns {Promise<Array>} Niz objekata pitanja.
 * @throws {Error} Ako je došlo do greške prilikom dohvaćanja.
 */
export async function fetchQuizQuestions(selectedRegion, brojPitanja) {
    try {
        let url = '/api/kviz-pitanja';
        const params = [];
        if (selectedRegion && selectedRegion !== 'all') {
            if (Array.isArray(selectedRegion)) {
                params.push(...selectedRegion.map(r => 'regija=' + encodeURIComponent(r)));
            } else {
                params.push('regija=' + encodeURIComponent(selectedRegion));
            }
        }
        if (brojPitanja) {
            params.push('broj=' + encodeURIComponent(brojPitanja));
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Quizfragen:', error);
        throw error;
    }
}