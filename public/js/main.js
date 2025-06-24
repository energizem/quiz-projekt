// public/js/main.js
import { fetchRegions } from './quizApi.js';
import { initializeQuiz, handleSubmitOrRepeatQuiz } from './quizLogic.js';
import { setCurrentQuizMode } from './quizState.js';

// --- Popuni select s regijama ---
async function popuniRegijeSelect() {
    const res = await fetch('/api/regije');
    const regije = await res.json();
    const select = document.getElementById('region-select');
    // Prvo izbriši sve osim "Alle Regionen"
    select.innerHTML = '<option value="all">Alle Regionen</option>';
    regije.forEach(r => {
        if (r.regija && r.regija !== 'all') {
            const opt = document.createElement('option');
            opt.value = r.regija;
            opt.textContent = r.regija;
            select.appendChild(opt);
        }
    });
}

// --- Dohvati odabrane regije ---
function getSelectedRegions() {
    const select = document.getElementById('region-select');
    // Ako je "Alle Regionen" odabrano, šalji samo "all"
    if (select.value === "all") return ["all"];
    return Array.from(select.selectedOptions).map(opt => opt.value).filter(v => v !== "all");
}

// --- Pokreni quiz s odabranim regijama ---
document.getElementById('start-quiz').addEventListener('click', async () => {
    const regije = getSelectedRegions();
    let url = '/api/kviz-pitanja';
    if (regije.length > 0 && !regije.includes("all")) {
        url += '?' + regije.map(r => 'regija=' + encodeURIComponent(r)).join('&');
    }
    // Ovdje dohvati pitanja i dalje radi što trebaš
    const res = await fetch(url);
    const pitanja = await res.json();
    // ...dalje radi što trebaš s pitanjima...
    console.log(pitanja); // Za test
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded in main.js'); // Dodaj ovo
    const regionSelect = document.getElementById('region-select');
    const startQuizButton = document.getElementById('start-quiz');
    const submitButton = document.getElementById('submit-quiz');

    const quizModeRadios = document.querySelectorAll('input[name="quizMode"]');
    quizModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            setCurrentQuizMode(event.target.value);
            console.log("Ausgewählter Modus:", event.target.value);
        });
    });

    startQuizButton.addEventListener('click', () => {
        const selectedRegions = getSelectedRegions();
        const mode = document.querySelector('input[name="quizMode"]:checked').value;
        const brojPitanja = document.getElementById('broj-pitanja').value;
        console.log('Start Quiz Clicked. Selected Regions:', selectedRegions, 'Mode:', mode, 'Broj pitanja:', brojPitanja);
        initializeQuiz(selectedRegions, mode, brojPitanja); // Dodaj broj pitanja kao parametar
    });

    submitButton.addEventListener('click', handleSubmitOrRepeatQuiz);

    console.log('Fetching regions...'); // Dodaj ovo
    fetchRegions()
        .then(regions => {
            console.log('Fetched regions:', regions); // Dodaj ovo
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.regija;
                option.textContent = region.regija;
                regionSelect.appendChild(option);
            });
            document.getElementById('quiz-setup').style.display = 'block'; // OVO JE BILO IZGUBLJENO!
        })
        .catch(error => {
            console.error('Error in fetchRegions in main.js:', error); // Dodaj ovo
            document.getElementById('quiz-setup').innerHTML = '<p style="color: red;">Fehler beim Laden der Regionen. Bitte versuchen Sie es später erneut.</p>';
        });

    popuniRegijeSelect();
});