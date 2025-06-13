// public/js/quizLogic.js
import {
    getUserAnswers, getCurrentQuizMode, getShuffledQuestions,
    getCurrentQuestionIndex, getAnsweredQuestionsForLernmodus,
    setUserAnswers, setCurrentQuizMode, setShuffledQuestions,
    incrementCurrentQuestionIndex, decrementCurrentQuestionIndex,
    addAnsweredQuestionForLernmodus, popAnsweredQuestionForLernmodus,
    resetQuizState
} from './quizState.js';
import { fetchQuizQuestions } from './quizApi.js';
import { displayLernmodusQuestion, displayPruefungsmodusQuestions, displayResults } from './quizUI.js';
import { shuffleArray } from './utils.js';

/**
 * Inicijalizira kviz, dohvaća pitanja i prikazuje UI ovisno o modu.
 * @param {string} selectedRegion Odabrana regija.
 * @param {string} mode Odabrani mod ('learning' ili 'exam').
 */
export async function initializeQuiz(selectedRegion, mode) {
    try {
        const data = await fetchQuizQuestions(selectedRegion);

        if (data.length > 0) {
            resetQuizState(); // PRVO RESETIRAJ STANJE
            setCurrentQuizMode(mode); // TEK SADA POSTAVI PRAVI MOD!
            console.log('initializeQuiz: AFTER RESET, Current quiz mode set to:', getCurrentQuizMode()); // Debug log za provjeru

            // KLJUČNA PROMJENA OVDJE: Promiješajte odgovore za svako pitanje JEDNOM
            const questionsWithShuffledAnswers = data.map(q => {
                const shuffledAnswers = [...q.odgovori];
                shuffleArray(shuffledAnswers); // Promiješajte odgovore za trenutno pitanje
                return { ...q, shuffledAnswers: shuffledAnswers }; // Dodajte promiješane odgovore kao novo svojstvo
            });

            setShuffledQuestions(questionsWithShuffledAnswers); // Spremite pitanja s već promiješanim odgovorima
            shuffleArray(getShuffledQuestions()); // Promiješajte redoslijed pitanja (ako to već niste radili)

            document.getElementById('quiz-setup').style.display = 'none';
            document.getElementById('quiz-content').style.display = 'block';
            document.getElementById('results-area').style.display = 'none';
            document.getElementById('submit-quiz').style.display = 'none';

            if (getCurrentQuizMode() === 'learning') { // Koristi getter
                console.log('Quiz Mode: LEARNING. Calling displayLernmodusQuestion.'); // Debug log
                displayLernmodusQuestion();
            } else { // Prüfungsmodus
                console.log('Quiz Mode: EXAM. Calling displayPruefungsmodusQuestions.'); // Debug log
                displayPruefungsmodusQuestions();
                document.getElementById('submit-quiz').textContent = 'Quiz abgeben';
                document.getElementById('submit-quiz').style.display = 'block';
            }

        } else {
            console.log('No questions available for this region.'); // Debug log
            document.getElementById('quiz-area').innerHTML = '<p>Keine Fragen für diese Region verfügbar. Bitte wählen Sie eine andere Region.</p>';
            document.getElementById('submit-quiz').style.display = 'none';
            document.getElementById('quiz-content').style.display = 'block'; // Pobrini se da je kviz sadržaj vidljiv da se poruka prikaže
        }

    } catch (error) {
        console.error('Fehler beim Laden der Quizfragen in initializeQuiz:', error); // Ažurirani debug log
        document.getElementById('quiz-area').innerHTML = '<p style="color: red;">Fehler beim Laden des Quiz. Bitte versuchen Sie es später erneut.</p>';
        document.getElementById('quiz-content').style.display = 'none'; // Sakrij kviz sadržaj ako je greška
        document.getElementById('submit-quiz').style.display = 'none';
    }
}

/**
 * Sprema korisnikov odabir za određeno pitanje.
 * @param {number} questionId ID pitanja.
 * @param {number} answerId ID odabranog odgovora.
 * @param {boolean} isChecked Je li odgovor odabran (true) ili poništen (false).
 * @param {string} inputType 'radio' ili 'checkbox'.
 */
export function saveUserAnswer(questionId, answerId, isChecked, inputType) {
    let currentAnswers = getUserAnswers()[questionId] ? [...getUserAnswers()[questionId]] : [];

    if (inputType === 'radio') {
        currentAnswers = [answerId];
    } else if (inputType === 'checkbox') {
        if (isChecked) {
            if (!currentAnswers.includes(answerId)) {
                currentAnswers.push(answerId);
            }
        } else {
            currentAnswers = currentAnswers.filter(id => id !== answerId);
        }
    }
    setUserAnswers({ ...getUserAnswers(), [questionId]: currentAnswers }); // Ažuriraj stanje
    console.log(`Frage ${questionId}: Aktuelle Nutzerauswahl:`, getUserAnswers()[questionId]);
}

/**
 * Ažurira stanje gumba "Nächste Frage" (disabled/enabled).
 * @param {HTMLElement} nextButton Referenca na gumb "Nächste Frage".
 * @param {number} questionId ID trenutnog pitanja.
 * @param {string} inputType Tip inputa ('radio' ili 'checkbox').
 */
export function updateNextButtonState(nextButton, questionId, inputType) {
    const hasUserAnswered = getUserAnswers()[questionId] && getUserAnswers()[questionId].length > 0;
    nextButton.disabled = !hasUserAnswered;
}

/**
 * Logika za klik na gumb "Nächste Frage" u Lernmodus.
 * @param {HTMLElement} nextButton Referenca na gumb "Nächste Frage".
 */
export function handleLernmodusNextButtonClick(nextButton) {
    const currentQuestion = getShuffledQuestions()[getCurrentQuestionIndex()];
    const currentUserAnswers = getUserAnswers()[currentQuestion.id] || [];

    if (currentUserAnswers.length === 0) {
        alert('Bitte wählen Sie mindestens eine Antwort aus.');
        return;
    }

    addAnsweredQuestionForLernmodus({
        question: currentQuestion,
        userAnswerIds: currentUserAnswers
    });

    incrementCurrentQuestionIndex();
    if (getCurrentQuestionIndex() < getShuffledQuestions().length) {
        displayLernmodusQuestion();
    } else {
        // Ako je ovo zadnje pitanje u Lernmodus, prebacite na submit kviz
        document.getElementById('submit-quiz').textContent = 'Quiz abgeben';
        document.getElementById('submit-quiz').click(); // Simuliraj klik na submit
    }
}

/**
 * Logika za klik na gumb "Vorherige Frage" u Lernmodus.
 */
export function handleLernmodusPrevButtonClick() {
    if (getAnsweredQuestionsForLernmodus().length > 0) {
        // Vrati se na prethodno odgovoreno pitanje
        const prevQuestion = popAnsweredQuestionForLernmodus();
        // Postavi trenutni indeks na to pitanje da se pravilno prikaže
        // (Ovisno o tome kako želite da se ponaša "prije").
        // Za sada, jednostavno vraćanje na prethodno stanje prikazuje prethodno pitanje
        // i re-renderira listu prethodno odgovorenih pitanja.
    } else if (getCurrentQuestionIndex() > 0) {
        decrementCurrentQuestionIndex();
    }
    displayLernmodusQuestion();
}

/**
 * Logika za rukovanje klikom na glavni gumb "Quiz abgeben" / "Quiz wiederholen".
 */
export function handleSubmitOrRepeatQuiz() {
    const submitButton = document.getElementById('submit-quiz');
    if (submitButton.textContent === 'Quiz abgeben') {
        console.log('Submitting quiz...'); // Debug log
        document.getElementById('quiz-content').style.display = 'none';
        submitButton.style.display = 'none'; // Sakrij gumb odmah
        displayResults();
    } else {
        console.log('Repeating quiz (page reload)...'); // Debug log
        location.reload(); // Jednostavno osvježi stranicu za ponavljanje
    }
}