// public/js/quizState.js

// Interno stanje kviza
let _state = {
    userAnswers: {},
    currentQuizMode: 'learning',
    shuffledQuestions: [],
    currentQuestionIndex: 0,
    answeredQuestionsForLernmodus: []
};

// Getteri za pristup stanju
export const getUserAnswers = () => _state.userAnswers;
export const getCurrentQuizMode = () => _state.currentQuizMode;
export const getShuffledQuestions = () => _state.shuffledQuestions;
export const getCurrentQuestionIndex = () => _state.currentQuestionIndex;
export const getAnsweredQuestionsForLernmodus = () => _state.answeredQuestionsForLernmodus;


// Setteri za ažuriranje stanja (OVDJE JE KLJUČNA PROMJENA: koriste se za mutaciju _state objekta)
export const setUserAnswers = (newAnswers) => {
    _state.userAnswers = { ...newAnswers }; // Korištenje spread operatora za novu referencu, osiguravajući reaktivnost ako se objekt mijenja
};

export const setCurrentQuizMode = (mode) => {
    _state.currentQuizMode = mode;
};

export const setShuffledQuestions = (questions) => {
    _state.shuffledQuestions = [...questions]; // Stvori novu referencu na niz
};

export const incrementCurrentQuestionIndex = () => {
    _state.currentQuestionIndex++;
};

export const decrementCurrentQuestionIndex = () => {
    _state.currentQuestionIndex--;
};

export const addAnsweredQuestionForLernmodus = (qObj) => {
    _state.answeredQuestionsForLernmodus.push(qObj);
};

export const popAnsweredQuestionForLernmodus = () => {
    return _state.answeredQuestionsForLernmodus.pop();
};

export const resetQuizState = () => {
    _state.userAnswers = {};
    _state.currentQuizMode = 'learning';
    _state.shuffledQuestions = [];
    _state.currentQuestionIndex = 0;
    _state.answeredQuestionsForLernmodus = [];
};