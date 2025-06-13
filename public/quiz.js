// OVO IDE NA SAM VRH public/quiz.js DATOTEKE, IZNAD document.addEventListener
let userAnswers = {}; // Objekt za pohranu korisničkih odabira { questionId: [answerId, ...] }
let currentQuizMode = 'learning'; // Inicijalna vrijednost: Lernmodus

let currentQuestionIndex = 0; // Za Lernmodus: Trenutno pitanje koje se prikazuje
let shuffledQuestions = []; // Kopija pitanja koja će biti prikazana u redoslijedu
let answeredQuestionsForLernmodus = []; // Pohranjuje odgovorena pitanja za prikaz rezultata na sljedećoj stranici

// Nova funkcija za nasumično miješanje niza (Fisher-Yates algoritam)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Zamijeni elemente
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const quizSetupDiv = document.getElementById('quiz-setup');
    const regionSelect = document.getElementById('region-select');
    const startQuizButton = document.getElementById('start-quiz');
    const quizContentDiv = document.getElementById('quiz-content'); // Referenca na cijeli kviz dio

    const quizArea = document.getElementById('quiz-area'); // Ovo je div gdje se prikazuju pitanja tijekom kviza
    const submitButton = document.getElementById('submit-quiz'); // Glavni submit/repeat button
    const resultsArea = document.getElementById('results-area'); // Ovo je div gdje se prikazuju rezultati

    let allQuestions = []; // Sva pitanja dobivena s backend-a

    // Dohvati radio gumbe za odabir načina rada
    const quizModeRadios = document.querySelectorAll('input[name="quizMode"]');
    quizModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentQuizMode = event.target.value;
            console.log("Ausgewählter Modus:", currentQuizMode); // Za debugging
        });
    });

    // --- Funkcija: Dohvaćanje dostupnih regija i punjenje dropdown menija ---
    async function fetchRegions() {
        try {
            const response = await fetch('/api/regije');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const regions = await response.json();

            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.regija;
                option.textContent = region.regija;
                regionSelect.appendChild(option);
            });

            quizSetupDiv.style.display = 'block';
        } catch (error) {
            console.error('Fehler beim Abrufen der Regionen:', error);
            quizSetupDiv.innerHTML = '<p style="color: red;">Fehler beim Laden der Regionen. Bitte versuchen Sie es später erneut.</p>';
        }
    }

    // --- Funkcija: Dohvaćanje pitanja i inicijalizacija kviza ---
    async function initializeQuiz(selectedRegion, mode) {
        currentQuizMode = mode;
        try {
            let url = '/api/kviz-pitanja';
            if (selectedRegion && selectedRegion !== 'all') {
                url += `?regija=${selectedRegion}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            allQuestions = data;
            shuffledQuestions = [...allQuestions];
            shuffleArray(shuffledQuestions);

            if (shuffledQuestions.length > 0) {
                userAnswers = {}; // Reset user answers
                answeredQuestionsForLernmodus = []; // Reset answered questions for Lernmodus

                quizSetupDiv.style.display = 'none';
                quizContentDiv.style.display = 'block';
                resultsArea.style.display = 'none'; // Hide results if visible

                if (currentQuizMode === 'learning') {
                    currentQuestionIndex = 0;
                    displayLernmodusQuestion(); // Start Lernmodus (first question)
                } else { // Prüfungsmodus
                    displayPruefungsmodusQuestions(); // Display all questions
                    submitButton.textContent = 'Quiz abgeben';
                    submitButton.style.display = 'block';
                }

            } else {
                quizArea.innerHTML = '<p>Keine Fragen für diese Region verfügbar. Bitte wählen Sie eine andere Region.</p>';
                submitButton.style.display = 'none';
                quizContentDiv.style.display = 'block';
            }

        } catch (error) {
            console.error('Fehler beim Laden der Quizfragen:', error);
            quizArea.innerHTML = '<p style="color: red;">Fehler beim Laden des Quiz. Bitte versuchen Sie es später erneut.</p>';
            quizContentDiv.style.display = 'none';
            submitButton.style.display = 'none';
        }
    }

    // --- Lernmodus: Prikazuje jedno pitanje s opcijom prikaza prethodnog rezultata ---
    function displayLernmodusQuestion() {
        quizArea.innerHTML = ''; // Clear previous content

        // 1. Prikaz prethodno odgovorenih pitanja s rezultatima (ako ih ima)
        if (answeredQuestionsForLernmodus.length > 0) {
            answeredQuestionsForLernmodus.forEach((qObj, idx) => {
                const question = qObj.question;
                const userAnswerIds = qObj.userAnswerIds;
                const correctAnswers = question.odgovori.filter(a => a.tocan);
                const correctIds = correctAnswers.map(a => a.id).sort();
                const sortedUserAnswerIds = [...userAnswerIds].sort();

                const userCorrectlyAnswered = (
                    sortedUserAnswerIds.length === correctIds.length &&
                    sortedUserAnswerIds.every((val, i) => val === correctIds[i])
                );

                const resultCard = createQuestionCard(question, (idx + 1) + '. ', 'lernmodus-answered');
                resultCard.classList.add(userCorrectlyAnswered ? 'correct-question' : 'incorrect-question');
                quizArea.appendChild(resultCard);

                // Apply results highlights
                const answersDiv = resultCard.querySelector('.answers');
                const labels = answersDiv.querySelectorAll('label');
                labels.forEach(label => {
                    const answerId = parseInt(label.getAttribute('data-answer-id'));
                    const isCorrect = correctIds.includes(answerId);
                    const isSelected = userAnswerIds.includes(answerId);

                    if (isCorrect) {
                        label.classList.add('correct-highlight');
                    }
                    if (isSelected) {
                        label.classList.add('user-choice-highlight');
                        if (!isCorrect) {
                            label.classList.add('wrong-choice-highlight');
                        }
                    }
                    label.querySelector('input').disabled = true; // Disable inputs for answered questions
                });
            });
        }

        // 2. Prikaz trenutnog neodgovorenog pitanja
        if (currentQuestionIndex < shuffledQuestions.length) {
            const question = shuffledQuestions[currentQuestionIndex];
            const currentQuestionCard = createQuestionCard(question, (answeredQuestionsForLernmodus.length + 1) + '. ', 'lernmodus-current');
            quizArea.appendChild(currentQuestionCard);

            const answersDiv = currentQuestionCard.querySelector('.answers');
            const inputs = answersDiv.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    saveUserAnswer(question.id, parseInt(e.target.value), e.target.checked, e.target.type);
                });
            });

            // Navigacijski gumbi
            const navDiv = document.createElement('div');
            navDiv.className = 'quiz-navigation-single';

            const prevButton = document.createElement('button');
            prevButton.textContent = 'Vorherige Frage';
            prevButton.className = 'nav-button prev-button';
            prevButton.disabled = (currentQuestionIndex === 0 && answeredQuestionsForLernmodus.length === 0);
            prevButton.addEventListener('click', () => {
                if (answeredQuestionsForLernmodus.length > 0) {
                    // Ako je prethodno pitanje prikazano, makni ga
                    answeredQuestionsForLernmodus.pop();
                } else if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                }
                displayLernmodusQuestion();
            });

            const nextButton = document.createElement('button');
            nextButton.className = 'nav-button next-button';
            // Postavi tekst gumba: "Nächste Frage" ili "Quiz abgeben"
            if (currentQuestionIndex === shuffledQuestions.length - 1) {
                nextButton.textContent = 'Quiz abgeben';
            } else {
                nextButton.textContent = 'Nächste Frage';
            }

            // Ažuriraj stanje gumba "Nächste Frage" na temelju korisnikovih odabira za trenutno pitanje
            updateNextButtonState(nextButton, question.id, inputs[0].type);

            // Listener za "change" na inputima će sada pozvati updateNextButtonState
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    updateNextButtonState(nextButton, question.id, inputs[0].type);
                });
            });

            nextButton.addEventListener('click', () => {
                const currentQuestion = shuffledQuestions[currentQuestionIndex];
                const currentUserAnswers = userAnswers[currentQuestion.id] || [];

                // Provjeri je li pitanje odgovoreno
                if (currentUserAnswers.length === 0) {
                    alert('Bitte wählen Sie mindestens eine Antwort aus.');
                    return; // Zaustavi prelazak na sljedeće pitanje
                }

                // Dodaj trenutno pitanje u listu odgovorenih za prikaz na sljedećoj stranici
                answeredQuestionsForLernmodus.push({
                    question: currentQuestion,
                    userAnswerIds: currentUserAnswers
                });

                // Prijeđi na sljedeće pitanje
                currentQuestionIndex++;
                if (currentQuestionIndex < shuffledQuestions.length) {
                    displayLernmodusQuestion(); // Prikaži sljedeće pitanje
                } else {
                    // Ako je zadnje pitanje, idi na prikaz ukupnih rezultata
                    submitButton.textContent = 'Quiz abgeben';
                    submitButton.click(); // Programatski klikni na submit button
                }
            });

            navDiv.appendChild(prevButton);
            navDiv.appendChild(nextButton);
            currentQuestionCard.appendChild(navDiv); // Dodaj navigacijske gumbe unutar questionCard
        } else {
            // Sva pitanja su odgovorena u Lernmodus, idi na prikaz ukupnih rezultata
            submitButton.textContent = 'Quiz abgeben';
            submitButton.click(); // Programatski klikni na submit button
        }
    }

    // Pomoćna funkcija za kreiranje kartice pitanja (ponovna upotreba koda)
    function createQuestionCard(question, questionNumberPrefix, modeClass = '') {
        const questionCard = document.createElement('div');
        questionCard.className = `question-card ${modeClass}`;
        questionCard.id = `question-${question.id}`;

        const questionTextAndToggleButtonContainer = document.createElement('div');
        questionTextAndToggleButtonContainer.className = 'question-text-and-toggle-container';

        const questionText = document.createElement('p');
        questionText.className = 'question-text';
        questionText.innerHTML = `${questionNumberPrefix}${question.tekst_de}`;

        const toggleButton = document.createElement('span');
        toggleButton.className = 'toggle-translation-button';
        toggleButton.textContent = ' [+]';

        const translationDiv = document.createElement('div');
        translationDiv.className = 'translation-text hidden-translation';
        translationDiv.innerHTML = `**HR:** ${question.tekst_hr}`;

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            translationDiv.classList.toggle('hidden-translation');
            if (translationDiv.classList.contains('hidden-translation')) {
                toggleButton.textContent = ' [+]';
            } else {
                toggleButton.textContent = ' [–]';
            }
        });

        questionTextAndToggleButtonContainer.appendChild(questionText);
        questionTextAndToggleButtonContainer.appendChild(toggleButton);
        questionCard.appendChild(questionTextAndToggleButtonContainer);
        questionCard.appendChild(translationDiv);

        if (question.slika_url) {
            const questionImage = document.createElement('img');
            questionImage.className = 'question-image';
            questionImage.src = question.slika_url;
            questionImage.alt = 'Fragebild';
            questionCard.appendChild(questionImage);
        }

        const answersDiv = document.createElement('div');
        answersDiv.className = 'answers';

        const correctAnswersCount = question.odgovori.filter(a => a.tocan).length;
        const inputType = correctAnswersCount > 1 ? 'checkbox' : 'radio';

        const shuffledAnswers = [...question.odgovori];
        shuffleArray(shuffledAnswers);

        shuffledAnswers.forEach(answer => {
            const label = document.createElement('label');
            label.setAttribute('data-answer-id', answer.id);

            const input = document.createElement('input');
            input.type = inputType;
            input.name = `question-${question.id}`;
            input.value = answer.id;

            const answerContentContainer = document.createElement('span');
            answerContentContainer.className = 'answer-content-container';

            const answerText = document.createElement('span');
            answerText.textContent = answer.tekst_de;

            // Postavi checked stanje inputa
            if (userAnswers[question.id] && userAnswers[question.id].includes(answer.id)) {
                input.checked = true;
            }

            label.appendChild(input);
            answerContentContainer.appendChild(answerText);
            label.appendChild(answerContentContainer);

            // U Lernmodus prikaži gumb za prijevod odgovora, u Prüfungsmodus ne
            if (currentQuizMode === 'learning') {
                const answerToggleButton = document.createElement('span');
                answerToggleButton.className = 'toggle-translation-button';
                answerToggleButton.textContent = ' [+]';

                const answerTranslationDiv = document.createElement('div');
                answerTranslationDiv.className = 'translation-text hidden-translation';
                answerTranslationDiv.innerHTML = `**HR:** ${answer.tekst_hr}`;

                answerToggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    answerTranslationDiv.classList.toggle('hidden-translation');
                    if (answerTranslationDiv.classList.contains('hidden-translation')) {
                        answerToggleButton.textContent = ' [+]';
                    } else {
                        answerToggleButton.textContent = ' [–]';
                    }
                });
                answerContentContainer.appendChild(answerToggleButton);
                label.appendChild(answerTranslationDiv);
            }

            answersDiv.appendChild(label);
        });

        questionCard.appendChild(answersDiv);
        return questionCard;
    }


    // AŽURIRANO: Nova funkcija za ažuriranje stanja gumba "Nächste Frage"
    function updateNextButtonState(nextButton, questionId, inputType) {
        const hasUserAnswered = userAnswers[questionId] && userAnswers[questionId].length > 0;
        nextButton.disabled = !hasUserAnswered;
    }

    // --- Prüfungsmodus: Prikazuje sva pitanja odjednom ---
    function displayPruefungsmodusQuestions() {
        quizArea.innerHTML = '';
        resultsArea.style.display = 'none';

        shuffledQuestions.forEach((question, index) => {
            const questionCard = createQuestionCard(question, `${index + 1}. `, 'pruefungsmodus');
            quizArea.appendChild(questionCard);

            // U Prüfungsmodus inputi ostaju omogućeni i nema trenutne povratne informacije
            const inputs = questionCard.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    saveUserAnswer(question.id, parseInt(e.target.value), e.target.checked, e.target.type);
                });
            });

            // U Prüfungsmodus nema gumba za prijevod odgovora, samo za pitanje
            questionCard.querySelectorAll('.answers .toggle-translation-button').forEach(btn => btn.remove());
            questionCard.querySelectorAll('.answers .translation-text').forEach(div => div.remove());
        });
    }

    // --- Funkcija za spremanje korisnikovog odabira ---
    function saveUserAnswer(questionId, answerId, isChecked, inputType) {
        if (!userAnswers[questionId]) {
            userAnswers[questionId] = [];
        }

        if (inputType === 'radio') {
            userAnswers[questionId] = [answerId]; // For radio, only one selection
        } else if (inputType === 'checkbox') {
            if (isChecked) {
                if (!userAnswers[questionId].includes(answerId)) {
                    userAnswers[questionId].push(answerId);
                }
            } else {
                userAnswers[questionId] = userAnswers[questionId].filter(id => id !== answerId);
            }
        }
        console.log(`Frage ${questionId}: Aktuelle Nutzerauswahl:`, userAnswers[questionId]);
    }

    // --- Jedinstveni Event-Listener za gumb "Quiz abgeben" / "Quiz wiederholen" ---
    function handleSubmitButtonClick() {
        if (submitButton.textContent === 'Quiz abgeben') {
            quizContentDiv.style.display = 'none';
            submitButton.style.display = 'none';
            displayResults(); // Pozovi funkciju za prikaz rezultata
        } else {
            location.reload();
        }
    }
    submitButton.addEventListener('click', handleSubmitButtonClick);


    // --- Funkcija za prikaz rezultata (ukupni rezultati na kraju) ---
    function displayResults() {
        resultsArea.innerHTML = '<h2>Quiz Ergebnisse:</h2>';
        let correctCount = 0;

        shuffledQuestions.forEach((question, index) => {
            const userAnswerIds = userAnswers[question.id] || [];
            const correctAnswers = question.odgovori.filter(a => a.tocan);
            const correctIds = correctAnswers.map(a => a.id).sort();
            const sortedUserAnswerIds = [...userAnswerIds].sort();

            const userCorrectlyAnswered = (
                sortedUserAnswerIds.length === correctIds.length &&
                sortedUserAnswerIds.every((val, i) => val === correctIds[i])
            );

            const resultDiv = document.createElement('div');
            resultDiv.className = `question-card ${userCorrectlyAnswered ? 'correct-question' : 'incorrect-question'}`;

            const questionHtml = `
                <div class="question-text-and-toggle-container">
                    <p class="question-text">${index + 1}. ${question.tekst_de}</p>
                    <span class="toggle-translation-button-result"> [+]</span>
                </div>
                <div class="translation-text hidden-translation">
                    **HR:** ${question.tekst_hr}
                </div>
                ${question.slika_url ? `<img class="question-image" src="${question.slika_url}" alt="Fragebild">` : ''}
            `;

            let answersHtml = '<div class="answers">';
            question.odgovori.forEach(answer => {
                let labelClass = '';
                const isThisAnswerCorrect = answer.tocan;
                const didUserSelectThis = userAnswerIds.includes(answer.id);

                if (isThisAnswerCorrect) {
                    labelClass += ' correct-highlight';
                }
                if (didUserSelectThis) {
                    labelClass += ' user-choice-highlight';
                    if (!isThisAnswerCorrect) {
                        labelClass += ' wrong-choice-highlight';
                    }
                }
                labelClass = labelClass.trim().replace(/\s+/g, ' ');

                answersHtml += `
                    <label class="${labelClass}">
                        <input type="${question.odgovori.filter(a => a.tocan).length > 1 ? 'checkbox' : 'radio'}" name="question-${question.id}" value="${answer.id}" style="display: none;" disabled>
                        <span class="answer-content-container">
                            <span>${answer.tekst_de}</span>
                            ${currentQuizMode === 'learning' ? `<span class="toggle-translation-button-result"> [+]</span>` : ''}
                        </span>
                        ${currentQuizMode === 'learning' ? `<div class="translation-text hidden-translation">**HR:** ${answer.tekst_hr}</div>` : ''}
                    </label>
                `;
            });
            answersHtml += '</div>';

            resultDiv.innerHTML = questionHtml + answersHtml + `
                <p>Ihre Antwort: <strong>${userCorrectlyAnswered ? 'RICHTIG' : 'FALSCH'}</strong></p>
            `;
            resultsArea.appendChild(resultDiv);

            // Add translation toggles for results view
            const resultToggleButtons = resultDiv.querySelectorAll('.toggle-translation-button-result');
            resultToggleButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    let translationDiv = button.closest('.question-text-and-toggle-container') ? button.closest('.question-text-and-toggle-container').nextElementSibling : null;
                    if (!translationDiv) {
                        translationDiv = button.closest('.answer-content-container') ? button.closest('.answer-content-container').nextElementSibling : null;
                    }

                    if (translationDiv) {
                        translationDiv.classList.toggle('hidden-translation');
                        button.textContent = translationDiv.classList.contains('hidden-translation') ? ' [+]' : ' [–]';
                    } else {
                        console.error('Translation div not found for toggle button:', button);
                    }
                });
            });

            if (userCorrectlyAnswered) {
                correctCount++;
            }
        });

        const totalScore = document.createElement('p');
        totalScore.innerHTML = `Insgesamt richtige Antworten: <strong>${correctCount} / ${shuffledQuestions.length}</strong>`;
        resultsArea.prepend(totalScore);

        resultsArea.style.display = 'block';
        submitButton.textContent = 'Quiz wiederholen';
        submitButton.style.display = 'block';
    }

    // --- Event Listener za gumb "Quiz starten" ---
    startQuizButton.addEventListener('click', () => {
        const selectedRegion = regionSelect.value;
        initializeQuiz(selectedRegion, currentQuizMode);
    });

    // --- Inicijalizacija: Dohvati regije kada se stranica učita ---
    fetchRegions();
});