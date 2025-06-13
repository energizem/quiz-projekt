// public/js/main.js
import { fetchRegions } from './quizApi.js';
import { initializeQuiz, handleSubmitOrRepeatQuiz } from './quizLogic.js';
import { setCurrentQuizMode } from './quizState.js';

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
        const selectedRegion = regionSelect.value;
        console.log('Start Quiz Clicked. Selected Region:', selectedRegion, 'Mode:', document.querySelector('input[name="quizMode"]:checked').value); // Dodaj ovo
        initializeQuiz(selectedRegion, document.querySelector('input[name="quizMode"]:checked').value);
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
});