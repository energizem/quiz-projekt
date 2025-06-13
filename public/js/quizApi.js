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
        throw error; // Proslijedi grešku dalje
    }
}

/**
 * Dohvaća pitanja za kviz na temelju odabrane regije.
 * @param {string} selectedRegion Odabrana regija ('all' ili specifičan naziv).
 * @returns {Promise<Array>} Niz objekata pitanja.
 * @throws {Error} Ako je došlo do greške prilikom dohvaćanja.
 */
export async function fetchQuizQuestions(selectedRegion) {
    try {
        let url = '/api/kviz-pitanja';
        if (selectedRegion && selectedRegion !== 'all') {
            url += `?regija=${selectedRegion}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Quizfragen:', error);
        throw error; // Proslijedi grešku dalje
    }
}