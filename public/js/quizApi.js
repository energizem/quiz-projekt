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
 * @param {boolean} simulacija Indikator je li u pitanju simulacija kviza.
 * @returns {Promise<Array>} Niz objekata pitanja.
 * @throws {Error} Ako je došlo do greške prilikom dohvaćanja.
 */
export async function fetchQuizQuestions(selectedRegion, brojPitanja, simulacija) {
    let url = '/api/kviz-pitanja';

    // Pretvori selectedRegion u array ako nije već
    let regije = Array.isArray(selectedRegion) ? selectedRegion : [selectedRegion];

    // Dodaj regije u query string
    const params = regije.map(r => `regija=${encodeURIComponent(r)}`).join('&');

    // Dodaj simulacija i broj ako treba
    if (simulacija) {
        url += `?${params}&simulacija=true&broj=${brojPitanja || 12}`;
    } else if (params) {
        url += `?${params}&broj=${brojPitanja || 360}`;
    }

    const res = await fetch(url);
    return await res.json();
}