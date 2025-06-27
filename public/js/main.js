// public/js/main.js
import { fetchRegions } from './quizApi.js';
import { initializeQuiz, handleSubmitOrRepeatQuiz } from './quizLogic.js';
import { setCurrentQuizMode, resetQuizState, setShuffledQuestions } from './quizState.js';
import { displayPruefungsmodusQuestions, displayLernmodusQuestion } from './quizUI.js';

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
    const selectedRegions = getSelectedRegions();
    const mode = document.querySelector('input[name="quizMode"]:checked').value;
    const brojPitanja = document.getElementById('broj-pitanja').value;
    initializeQuiz(selectedRegions, mode, brojPitanja);
});

document.addEventListener('DOMContentLoaded', () => {
    const regionSelect = document.getElementById('region-select');
    const startQuizButton = document.getElementById('start-quiz');
    const submitButton = document.getElementById('submit-quiz');

    const quizModeRadios = document.querySelectorAll('input[name="quizMode"]');
    quizModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            setCurrentQuizMode(event.target.value);
        });
    });

    startQuizButton.addEventListener('click', () => {
        const selectedRegions = getSelectedRegions();
        const mode = document.querySelector('input[name="quizMode"]:checked').value;
        const brojPitanja = document.getElementById('broj-pitanja').value;
        initializeQuiz(selectedRegions, mode, brojPitanja);
    });

    submitButton.addEventListener('click', handleSubmitOrRepeatQuiz);

    popuniRegijeSelect();
});

document.getElementById('simulacija-ispita').addEventListener('click', () => {
    const simulacijaRegije = [
        "BW Allgemeine Fischkunde",
        "BW Gerätekunde, Fangtechnik",
        "BW Spezielle Fischkunde",
        "BW Gewässerökologie und Fischhege",
        "BW Rechtskunde"
    ];
    const brojPitanjaPoRegiji = 12;
    const mode = document.querySelector('input[name="quizMode"]:checked').value;
    initializeQuiz(simulacijaRegije, mode, brojPitanjaPoRegiji, true);
});

document.getElementById('start-note-quiz').addEventListener('click', async () => {
    const res = await fetch('/api/pitanja-note');
    const pitanja = await res.json();
    if (pitanja.length === 0) {
        alert('Nema označenih pitanja!');
        return;
    }
    initializeQuizWithQuestions(pitanja, 'exam'); // ili 'learning' po želji
});

// Nova funkcija za pokretanje kviza s već dohvaćenim pitanjima
export function initializeQuizWithQuestions(pitanja, mode = 'exam') {
    resetQuizState();
    setCurrentQuizMode(mode);
    setShuffledQuestions(pitanja.map(q => ({
        ...q,
        shuffledAnswers: [...q.odgovori].sort(() => Math.random() - 0.5)
    })));
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-content').style.display = 'block';
    document.getElementById('results-area').style.display = 'none';
    document.getElementById('submit-quiz').style.display = 'none';

    if (mode === 'learning') {
        displayLernmodusQuestion();
    } else {
        displayPruefungsmodusQuestions();
        document.getElementById('submit-quiz').textContent = 'Quiz abgeben';
        document.getElementById('submit-quiz').style.display = 'block';
    }
}