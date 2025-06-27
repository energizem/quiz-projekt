// public/js/quizUI.js
import { shuffleArray, setupTranslationToggle } from './utils.js';
import {
    getUserAnswers, getCurrentQuizMode, getShuffledQuestions,
    getCurrentQuestionIndex, getAnsweredQuestionsForLernmodus
} from './quizState.js';
import { saveUserAnswer, handleLernmodusNextButtonClick, handleLernmodusPrevButtonClick, updateNextButtonState } from './quizLogic.js';

/**
 * Generira HTML element za karticu pitanja.
 * @param {Object} question Objekt pitanja.
 * @param {string} questionNumberPrefix Prefiks za broj pitanja (npr. "1. ", "2. ").
 * @param {string} modeClass Dodatna CSS klasa za stiliziranje kartice (npr. 'pruefungsmodus', 'lernmodus-answered', 'results').
 * @param {boolean} showAnswerTranslations Flag za prikazivanje gumba za prijevod odgovora.
 * @param {boolean} disableInputs Flag za onemogućavanje inputa (za prikaz rezultata/odgovorenih pitanja).
 * @returns {HTMLElement} Kreirani HTML element kartice pitanja.
 */
export function createQuestionCard(question, questionNumberPrefix, modeClass = '', showAnswerTranslations = false, disableInputs = false) {
    const questionCard = document.createElement('div');
    questionCard.className = `question-card ${modeClass}`;
    questionCard.id = `question-${question.id}`;
    questionCard.style.position = 'relative';

    // --- Zaglavlje pitanja ---
    const questionHeader = document.createElement('div');
    questionHeader.style.display = 'flex';
    questionHeader.style.alignItems = 'center';
    questionHeader.style.justifyContent = 'space-between';

    // Lijevo: tekst pitanja
    const questionText = document.createElement('p');
    questionText.className = 'question-text';
    questionText.innerHTML = `${questionNumberPrefix}${question.tekst_de}`;

    // Desno: gumbi (zvjezdica i prijevod)
    const rightButtons = document.createElement('div');
    rightButtons.style.display = 'flex';
    rightButtons.style.alignItems = 'center';

    // Zvjezdica
    const noteBtn = document.createElement('button');
    noteBtn.className = 'note-btn';
    noteBtn.setAttribute('aria-label', question.note ? 'Ukloni oznaku s pitanja' : 'Označi pitanje');
    noteBtn.innerHTML = question.note ? '★' : '☆';
    noteBtn.style.background = 'transparent';
    noteBtn.style.color = question.note ? 'orange' : '#bbb';
    noteBtn.style.fontSize = '1.3em';
    noteBtn.style.padding = '2px 6px';
    noteBtn.style.width = '32px';
    noteBtn.style.height = '32px';
    noteBtn.style.lineHeight = '1';
    noteBtn.style.marginLeft = '10px';
    noteBtn.onclick = async () => {
        const noviStatus = !question.note;
        await fetch(`/api/pitanja/${question.id}/note`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noviStatus })
        });
        question.note = noviStatus;
        noteBtn.innerHTML = noviStatus ? '★' : '☆';
        noteBtn.style.color = noviStatus ? 'orange' : '#bbb';
        noteBtn.setAttribute('aria-label', noviStatus ? 'Ukloni oznaku s pitanja' : 'Označi pitanje');
    };
    rightButtons.appendChild(noteBtn);

    // Gumb za prijevod pitanja (ako treba)
    if (showAnswerTranslations && question.tekst_hr) {
        const translateBtn = document.createElement('button');
        translateBtn.className = 'translate-btn';
        translateBtn.textContent = '[+]';
        translateBtn.style.marginLeft = '8px';
        translateBtn.style.fontSize = '1em';
        translateBtn.style.background = 'transparent';
        translateBtn.style.border = 'none';
        translateBtn.style.cursor = 'pointer';

        // Prikaz prijevoda pitanja
        translateBtn.onclick = () => {
            if (questionText.innerHTML.includes(question.tekst_hr)) {
                questionText.innerHTML = `${questionNumberPrefix}${question.tekst_de}`;
                translateBtn.textContent = '[+]';
            } else {
                questionText.innerHTML = `${questionNumberPrefix}${question.tekst_de}<br><span class="translation-text"><b>HR:</b> ${question.tekst_hr}</span>`;
                translateBtn.textContent = '[-]';
            }
        };
        rightButtons.appendChild(translateBtn);
    }

    questionHeader.appendChild(questionText);
    questionHeader.appendChild(rightButtons);
    questionCard.appendChild(questionHeader);

    // --- Slika pitanja ---
    if (question.slika_url) {
        const questionImage = document.createElement('img');
        questionImage.className = 'question-image';
        questionImage.src = question.slika_url;
        questionCard.appendChild(questionImage);
    }

    // --- Odgovori ---
    const answersDiv = document.createElement('div');
    answersDiv.className = 'answers';

    const correctAnswersCount = question.odgovori.filter(a => a.tocan).length;
    const inputType = correctAnswersCount > 1 ? 'checkbox' : 'radio';

    const answersToDisplay = question.shuffledAnswers || question.odgovori;

    answersToDisplay.forEach(answer => {
        const label = document.createElement('label');
        label.setAttribute('data-answer-id', answer.id);

        const input = document.createElement('input');
        input.type = inputType;
        input.name = `question-${question.id}`;
        input.value = answer.id;
        input.disabled = disableInputs;

        const answerContentContainer = document.createElement('span');
        answerContentContainer.className = 'answer-content-container';

        const answerText = document.createElement('span');
        answerText.textContent = answer.tekst_de;

        if (getUserAnswers()[question.id] && getUserAnswers()[question.id].includes(answer.id)) {
            input.checked = true;
        }

        label.appendChild(input);
        answerContentContainer.appendChild(answerText);
        label.appendChild(answerContentContainer);

        if (showAnswerTranslations) {
            const answerToggleButton = document.createElement('span');
            answerToggleButton.className = 'toggle-translation-button';
            answerToggleButton.textContent = ' [+]';

            const answerTranslationDiv = document.createElement('div');
            answerTranslationDiv.className = 'translation-text hidden-translation';
            answerTranslationDiv.innerHTML = `**HR:** ${answer.tekst_hr}`;

            setupTranslationToggle(answerToggleButton, answerTranslationDiv);

            answerContentContainer.appendChild(answerToggleButton);
            label.appendChild(answerTranslationDiv);
        }

        answersDiv.appendChild(label);
    });

    questionCard.appendChild(answersDiv);
    return questionCard;
}

// Pomoćna funkcija za stil i tekst gumba
function setNoteBtnStyleAndText(btn, isNoted) {
    btn.textContent = isNoted ? 'Ukloni oznaku' : 'Note';
    btn.style.background = isNoted ? 'orange' : 'gold';
}

/**
 * Prikazuje jedno pitanje s opcijom prikaza prethodnog rezultata (za Lernmodus).
 */
export function displayLernmodusQuestion() {
    const quizArea = document.getElementById('quiz-area');
    quizArea.innerHTML = '';

    let lastQuestionCard = null; // Varijabla za držanje reference na zadnju prikazanu karticu

    // Prikaz prethodno odgovorenih pitanja s rezultatima (ako ih ima)
    getAnsweredQuestionsForLernmodus().forEach((qObj, idx) => {
        const question = qObj.question;
        const userAnswerIds = qObj.userAnswerIds;
        const correctAnswers = question.odgovori.filter(a => a.tocan);
        const correctIds = correctAnswers.map(a => a.id).sort();
        const sortedUserAnswerIds = [...userAnswerIds].sort();

        const userCorrectlyAnswered = (
            sortedUserAnswerIds.length === correctIds.length &&
            sortedUserAnswerIds.every((val, i) => val === correctIds[i])
        );

        const resultCard = createQuestionCard(question, (idx + 1) + '. ', 'lernmodus-answered', true, true);
        resultCard.classList.add(userCorrectlyAnswered ? 'correct-question' : 'incorrect-question');
        quizArea.appendChild(resultCard);
        lastQuestionCard = resultCard; // Ažurirajte referencu na zadnju karticu

        const answersDiv = resultCard.querySelector('.answers');
        const labels = answersDiv.querySelectorAll('label');
        labels.forEach(label => {
            const answerId = parseInt(label.getAttribute('data-answer-id'));
            const isCorrect = correctIds.includes(answerId);
            const isSelected = userAnswerIds.includes(answerId);

            label.classList.remove('correct-highlight', 'incorrect', 'user-choice-highlight', 'wrong-choice-highlight');

            if (isCorrect) {
                label.classList.add('correct-highlight');
            }
            if (isSelected) {
                label.classList.add('user-choice-highlight');
                if (!isCorrect) {
                    label.classList.add('wrong-choice-highlight');
                }
            }
        });
    });

    // Prikaz trenutnog neodgovorenog pitanja
    if (getCurrentQuestionIndex() < getShuffledQuestions().length) {
        const question = getShuffledQuestions()[getCurrentQuestionIndex()];
        const currentQuestionCard = createQuestionCard(question, (getAnsweredQuestionsForLernmodus().length + 1) + '. ', 'lernmodus-current', true, false);
        quizArea.appendChild(currentQuestionCard);

        const answersDiv = currentQuestionCard.querySelector('.answers');
        const inputs = currentQuestionCard.querySelectorAll('input');
        const inputType = inputs.length > 0 ? inputs[0].type : '';

        const navDiv = document.createElement('div');
        navDiv.className = 'quiz-navigation-single';

        // UKLONJEN KOD ZA "VORHERIGE FRAGE" GUMB
        // const prevButton = document.createElement('button');
        // prevButton.textContent = 'Vorherige Frage';
        // prevButton.className = 'nav-button prev-button';
        // prevButton.disabled = (getCurrentQuestionIndex() === 0 && getAnsweredQuestionsForLernmodus().length === 0);
        // prevButton.addEventListener('click', handleLernmodusPrevButtonClick);

        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button next-button';

        if (getCurrentQuestionIndex() === getShuffledQuestions().length - 1) {
            nextButton.textContent = 'Quiz abgeben';
        } else {
            nextButton.textContent = 'Nächste Frage';
        }

        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                saveUserAnswer(question.id, parseInt(e.target.value), e.target.checked, e.target.type);
                updateNextButtonState(nextButton, question.id, inputType);
            });
        });
        updateNextButtonState(nextButton, question.id, inputType);
        nextButton.addEventListener('click', () => handleLernmodusNextButtonClick(nextButton));

        // navDiv.appendChild(prevButton); // UKLONJEN DODAVANJE GUMBA
        navDiv.appendChild(nextButton);
        currentQuestionCard.appendChild(navDiv);

        // KOD ZA SKROLANJE:
        if (lastQuestionCard) {
            lastQuestionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }


    } else {
        document.getElementById('submit-quiz').textContent = 'Quiz abgeben';
        document.getElementById('submit-quiz').click();
    }
}

/**
 * Prikazuje sva pitanja odjednom (za Prüfungsmodus).
 */
export function displayPruefungsmodusQuestions() {
    const quizArea = document.getElementById('quiz-area');
    quizArea.innerHTML = '';
    document.getElementById('results-area').style.display = 'none';

    console.log('--- displayPruefungsmodusQuestions is called ---');
    getShuffledQuestions().forEach((question, index) => {
        console.log(`Creating card for question ${question.id} in Pruefungsmodus: showAnswerTranslations=true, disableInputs=false`);
        const questionCard = createQuestionCard(question, `${index + 1}. `, 'pruefungsmodus', true, false);
        quizArea.appendChild(questionCard);

        const inputs = questionCard.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                saveUserAnswer(question.id, parseInt(e.target.value), e.target.checked, e.target.type);
            });
        });
    });
}

/**
 * Prikazuje ukupne rezultate kviza.
 */
export function displayResults() {
    const resultsArea = document.getElementById('results-area');
    resultsArea.innerHTML = '<h2>Quiz Ergebnisse:</h2>';
    let correctCount = 0;

    getShuffledQuestions().forEach((question, index) => {
        const userAnswerIds = getUserAnswers()[question.id] || [];
        const correctAnswers = question.odgovori.filter(a => a.tocan);
        const correctIds = correctAnswers.map(a => a.id).sort();
        const sortedUserAnswerIds = [...userAnswerIds].sort();

        const userCorrectlyAnswered = (
            sortedUserAnswerIds.length === correctIds.length &&
            sortedUserAnswerIds.every((val, i) => val === correctIds[i])
        );

        const resultDiv = createQuestionCard(question, `${index + 1}. `, 'lernmodus-answered results', true, true);
        resultDiv.classList.add(userCorrectlyAnswered ? 'correct-question' : 'incorrect-question');
        resultsArea.appendChild(resultDiv);

        const answersDiv = resultDiv.querySelector('.answers');
        const labels = answersDiv.querySelectorAll('label');
        labels.forEach(label => {
            const answerId = parseInt(label.getAttribute('data-answer-id'));
            const isCorrect = correctIds.includes(answerId);
            const isSelected = userAnswerIds.includes(answerId);

            label.classList.remove('correct-highlight', 'incorrect', 'user-choice-highlight', 'wrong-choice-highlight');

            if (isCorrect) {
                label.classList.add('correct-highlight');
            }
            if (isSelected) {
                label.classList.add('user-choice-highlight');
                if (!isCorrect) {
                    label.classList.add('wrong-choice-highlight');
                }
            }
        });

        const resultText = document.createElement('p');
        resultText.innerHTML = `Ihre Antwort: <strong>${userCorrectlyAnswered ? 'RICHTIG' : 'FALSCH'}</strong>`;
        resultDiv.appendChild(resultText);

        if (userCorrectlyAnswered) {
            correctCount++;
        }
    });

    const totalScore = document.createElement('p');
    totalScore.innerHTML = `Insgesamt richtige Antworten: <strong>${correctCount} / ${getShuffledQuestions().length}</strong>`;
    resultsArea.prepend(totalScore);

    resultsArea.style.display = 'block';
    document.getElementById('submit-quiz').textContent = 'Quiz wiederholen';
    document.getElementById('submit-quiz').style.display = 'block';
}