document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const playerScoreDisplay = document.getElementById('player-score');
    const questionModal = document.getElementById('question-modal');
    const modalCategory = document.getElementById('modal-category');
    const modalPoints = document.getElementById('modal-points');
    const modalQuestionText = document.getElementById('modal-question-text');
    // const answerInput = document.getElementById('answer-input'); // Removed
    const choiceContainer = document.getElementById('choice-container'); // Added
    const submitAnswerButton = document.getElementById('submit-answer-button');
    const feedbackDisplay = document.getElementById('feedback');
    const correctAnswerDisplay = document.getElementById('correct-answer-display');
    const correctAnswerText = document.getElementById('correct-answer-text');
    const closeModalButton = document.querySelector('.close-button');
    const resetGameButton = document.getElementById('reset-game-button');

    let categories = [];
    let currentPlayerScore = 0;
    let currentQuestionData = null;

    const POINT_VALUES = [200, 400, 600, 800, 1000];
    const AUTO_CLOSE_MODAL_DELAY = 3000; // ms, e.g., 3 seconds. Set to 0 to disable.

    const playSound = (soundName) => {
        console.log(`Playing sound: ${soundName}`);
    };

    async function loadGameData() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            categories = data.categories;
            categories.forEach(category => {
                category.questions.forEach(q => {
                    q.answered = false;
                });
            });
            return true;
        } catch (error) {
            console.error("Could not load game data:", error);
            gameBoard.innerHTML = "<p>Error loading game data. Please try refreshing.</p>";
            return false;
        }
    }

    function initializeBoard() {
        gameBoard.innerHTML = '';
        feedbackDisplay.textContent = '';
        correctAnswerDisplay.style.display = 'none';

        categories.forEach((category, categoryIndex) => {
            const column = document.createElement('div');
            column.classList.add('category-column');

            const header = document.createElement('div');
            header.classList.add('category-header');
            header.textContent = category.name;
            column.appendChild(header);

            POINT_VALUES.forEach(points => {
                const questionCell = document.createElement('div');
                questionCell.classList.add('question-cell');
                const questionData = category.questions.find(q => q.points === points);

                if (questionData && !questionData.answered) {
                    questionCell.textContent = `$${points}`;
                    questionCell.dataset.categoryIndex = categoryIndex;
                    questionCell.dataset.points = points;
                    questionCell.addEventListener('click', handleQuestionClick);
                } else {
                    questionCell.textContent = '';
                    questionCell.classList.add('answered');
                }
                column.appendChild(questionCell);
            });
            gameBoard.appendChild(column);
        });
    }

    function handleQuestionClick(event) {
        const targetCell = event.target;
        if (targetCell.classList.contains('answered') || !targetCell.dataset.categoryIndex) {
            return;
        }

        playSound('reveal');

        const categoryIndex = parseInt(targetCell.dataset.categoryIndex);
        const points = parseInt(targetCell.dataset.points);
        const category = categories[categoryIndex];
        currentQuestionData = category.questions.find(q => q.points === points);

        // Check if the question is in the new multiple-choice format
        if (currentQuestionData && currentQuestionData.options && typeof currentQuestionData.answer === 'number') {
            modalCategory.textContent = category.name;
            modalPoints.textContent = `Points: $${currentQuestionData.points}`;
            modalQuestionText.textContent = currentQuestionData.question;

            choiceContainer.innerHTML = ''; // Clear previous choices
            currentQuestionData.options.forEach((option, index) => {
                const li = document.createElement('li');
                li.classList.add('choice-item'); // For styling

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'jeopardy_choice';
                input.value = index;
                input.id = `choice-${index}`;

                const label = document.createElement('label');
                label.htmlFor = `choice-${index}`;
                label.textContent = option;

                li.appendChild(input);
                li.appendChild(label);
                choiceContainer.appendChild(li);
            });

            feedbackDisplay.textContent = '';
            feedbackDisplay.className = '';
            correctAnswerDisplay.style.display = 'none';
            submitAnswerButton.disabled = false;

            questionModal.style.display = 'block';
        } else {
            // Optionally handle questions not in the new format (e.g., mark as unplayable)
            console.warn("Selected question is not in multiple-choice format or is missing options/answer index.", currentQuestionData);
            targetCell.textContent = 'N/A'; // Mark cell as not applicable
            targetCell.classList.add('answered'); // Treat as answered to prevent re-selection
            targetCell.removeEventListener('click', handleQuestionClick);
            return; // Do not open modal for non-compatible questions
        }
    }

    function submitAnswer() {
        if (!currentQuestionData) return;

        const selectedOption = choiceContainer.querySelector('input[name="jeopardy_choice"]:checked');

        if (!selectedOption) {
            feedbackDisplay.textContent = "Please select an answer.";
            feedbackDisplay.className = 'incorrect'; // Or a neutral warning class
            return;
        }

        const userAnswerIndex = parseInt(selectedOption.value);
        const correctAnswerIndex = currentQuestionData.answer;

        if (userAnswerIndex === correctAnswerIndex) {
            feedbackDisplay.textContent = 'Correct!';
            feedbackDisplay.className = 'correct';
            updateScore(currentQuestionData.points);
            playSound('correct');
        } else {
            feedbackDisplay.textContent = 'Incorrect!';
            feedbackDisplay.className = 'incorrect';
            updateScore(-currentQuestionData.points);
            // Display the text of the correct option
            correctAnswerText.textContent = currentQuestionData.options[correctAnswerIndex];
            correctAnswerDisplay.style.display = 'block';
            playSound('incorrect');
        }

        currentQuestionData.answered = true;
        // Disable all radio buttons
        choiceContainer.querySelectorAll('input[name="jeopardy_choice"]').forEach(input => {
            input.disabled = true;
        });
        submitAnswerButton.disabled = true;

        const allCells = gameBoard.querySelectorAll('.question-cell');
        allCells.forEach(cell => {
            const cellCategoryIndex = parseInt(cell.dataset.categoryIndex);
            const cellPoints = parseInt(cell.dataset.points);
            let qCategoryIndex = -1;
            for(let i=0; i < categories.length; i++) {
                if(categories[i].questions.includes(currentQuestionData)) {
                    qCategoryIndex = i;
                    break;
                }
            }
            if (cellCategoryIndex === qCategoryIndex && cellPoints === currentQuestionData.points) {
                cell.textContent = '';
                cell.classList.add('answered');
                cell.removeEventListener('click', handleQuestionClick);
            }
        });

        if (AUTO_CLOSE_MODAL_DELAY > 0) {
            setTimeout(closeModal, AUTO_CLOSE_MODAL_DELAY);
        }
    }

    function updateScore(points) {
        currentPlayerScore += points;
        playerScoreDisplay.textContent = `Player 1: $${currentPlayerScore}`;
    }

    function closeModal() {
        questionModal.style.display = 'none';
        if (choiceContainer) { // Clear choices when modal is closed
            choiceContainer.innerHTML = '';
        }
        currentQuestionData = null;
    }

    async function resetGame() {
        currentPlayerScore = 0;
        updateScore(0);

        if (categories && categories.length > 0) {
            categories.forEach(category => {
                category.questions.forEach(q => {
                    q.answered = false;
                });
            });
            initializeBoard();
        } else {
            const loaded = await loadGameData();
            if (loaded) {
                initializeBoard();
            }
        }
        feedbackDisplay.textContent = '';
        correctAnswerDisplay.style.display = 'none';
        closeModal();
        console.log("Game Reset");
    }

    submitAnswerButton.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitAnswer();
        }
    });
    closeModalButton.addEventListener('click', closeModal);
    resetGameButton.addEventListener('click', resetGame);

    window.onclick = function(event) {
        if (event.target == questionModal) {
            closeModal();
        }
    }

    async function startGame() {
        const dataLoaded = await loadGameData();
        if (dataLoaded) {
            initializeBoard();
            updateScore(0);
        }
    }

    startGame();
});
