// Neovim Mastery Platform - Main JavaScript
// Author: @nvimmaster implementation by cursor

class NeovimMastery {
    constructor() {
        this.challengeData = null;
        this.filteredChallenges = [];
        this.completedChallenges = new Set();
        this.currentFlashcard = 0;
        this.flashcardStats = {
            correct: 0,
            incorrect: 0,
            total: 0
        };
        this.selectedChoice = null;

        // Practice editor properties
        this.editor = null;
        this.currentExercise = null;
        this.exerciseStats = {
            completed: 0,
            total: 0,
            success: 0
        };

        this.init();
    }

    async init() {
        try {
            await this.loadChallengeData();
            this.loadProgress();
            this.setupEventListeners();
            this.renderChallenges();
            this.renderTagFilters();
            this.updateStats();
            this.initFlashcards();
            this.initPracticeEditor();
            this.setupKeyboardShortcuts();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load challenge data. Please refresh the page.');
        }
    }

    async loadChallengeData() {
        try {
            const response = await fetch('./neovim-mastery.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.challengeData = await response.json();
            this.filteredChallenges = [...this.challengeData.challenges];
        } catch (error) {
            console.error('Error loading challenge data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.getElementById('challenges-tab').addEventListener('click', () => this.switchTab('challenges'));
        document.getElementById('practice-tab').addEventListener('click', () => this.switchTab('practice'));
        document.getElementById('flashcards-tab').addEventListener('click', () => this.switchTab('flashcards'));

        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Filter functionality
        document.querySelectorAll('[data-filter]').forEach(filter => {
            filter.addEventListener('click', (e) => this.handleFilter(e));
        });

        // Challenge grid delegation
        document.getElementById('challenge-grid').addEventListener('click', (e) => {
            const challenge = e.target.closest('.challenge');
            if (challenge) {
                this.openChallengeModal(parseInt(challenge.dataset.challengeId));
            }
        });

        // Modal functionality
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('toggle-completion').addEventListener('click', () => this.toggleChallengeCompletion());
        document.getElementById('practice-challenge').addEventListener('click', () => this.togglePractice());
        document.getElementById('challenge-modal').addEventListener('click', (e) => {
            if (e.target.id === 'challenge-modal') this.closeModal();
        });

        // Editor functionality
        document.getElementById('reset-editor').addEventListener('click', () => this.resetEditor());
        document.getElementById('check-progress').addEventListener('click', () => this.checkProgress());
        document.getElementById('editor-vim-mode').addEventListener('change', (e) => this.switchVimMode(e.target.value));

        // Progress management
        document.getElementById('reset-progress').addEventListener('click', () => this.resetProgress());
        document.getElementById('export-progress').addEventListener('click', () => this.exportProgress());

        // Flashcard controls
        document.getElementById('show-hint').addEventListener('click', () => this.showHint());
        document.getElementById('reveal-answer').addEventListener('click', () => this.revealAnswer());
        document.getElementById('prev-card').addEventListener('click', () => this.previousCard());
        document.getElementById('next-card').addEventListener('click', () => this.nextCard());

        // Flashcard choices delegation
        document.getElementById('flashcard-choices').addEventListener('click', (e) => {
            if (e.target.classList.contains('choice-button')) {
                this.selectChoice(e.target);
            }
        });

        // Practice editor controls
        document.getElementById('exercise-select').addEventListener('change', (e) => this.selectExercise(e.target.value));
        document.getElementById('start-exercise').addEventListener('click', () => this.startExercise());
        document.getElementById('reset-exercise').addEventListener('click', () => this.resetExercise());
        document.getElementById('submit-exercise').addEventListener('click', () => this.submitExercise());

        // Modal feedback controls
        const feedbackClose = document.getElementById('feedback-close');
        const tryAnother = document.getElementById('try-another');
        const practiceChallenge = document.getElementById('practice-challenge');

        if (feedbackClose) feedbackClose.addEventListener('click', () => this.closeFeedbackModal());
        if (tryAnother) tryAnother.addEventListener('click', () => this.tryAnotherExercise());
        if (practiceChallenge) practiceChallenge.addEventListener('click', () => this.practiceFromChallenge());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Focus search on '/'
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }

            // Clear search on 'Escape'
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('search-input');
                if (document.activeElement === searchInput) {
                    searchInput.value = '';
                    this.handleSearch('');
                    searchInput.blur();
                } else if (document.getElementById('challenge-modal').classList.contains('hidden') === false) {
                    this.closeModal();
                }
            }

            // Flashcard keyboard shortcuts
            if (!document.getElementById('flashcards-section').classList.contains('hidden')) {
                if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    this.revealAnswer();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousCard();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextCard();
                }
            }
        });
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.setAttribute('aria-pressed', 'false');
        });
        document.getElementById(`${tab}-tab`).setAttribute('aria-pressed', 'true');

        // Show/hide sections
        document.getElementById('challenges-section').classList.toggle('hidden', tab !== 'challenges');
        document.getElementById('practice-section').classList.toggle('hidden', tab !== 'practice');
        document.getElementById('flashcards-section').classList.toggle('hidden', tab !== 'flashcards');

        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.pushState({}, '', url);
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        this.applyFilters(searchTerm);
    }

    handleFilter(e) {
        const filter = e.target;
        const filterType = filter.dataset.filter;
        const filterValue = filter.dataset.value;

        if (filterType === 'difficulty') {
            // Toggle difficulty filter
            document.querySelectorAll('[data-filter="difficulty"]').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            filter.classList.add('active');
            filter.setAttribute('aria-pressed', 'true');
        } else if (filterType === 'tag') {
            // Toggle tag filter
            filter.classList.toggle('active');
            const pressed = filter.classList.contains('active');
            filter.setAttribute('aria-pressed', pressed.toString());
        }

        this.applyFilters();
    }

    applyFilters(searchTerm = '') {
        const activeDifficulty = document.querySelector('[data-filter="difficulty"].active')?.dataset.value || 'all';
        const activeTags = Array.from(document.querySelectorAll('[data-filter="tag"].active')).map(btn => btn.dataset.value);

        if (!searchTerm) {
            searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        }

        this.filteredChallenges = this.challengeData.challenges.filter(challenge => {
            // Search filter
            const matchesSearch = !searchTerm ||
                challenge.title.toLowerCase().includes(searchTerm) ||
                challenge.description.toLowerCase().includes(searchTerm) ||
                challenge.tags.some(tag => tag.toLowerCase().includes(searchTerm));

            // Difficulty filter
            const matchesDifficulty = activeDifficulty === 'all' || challenge.difficulty === activeDifficulty;

            // Tag filter
            const matchesTags = activeTags.length === 0 || activeTags.some(tag => challenge.tags.includes(tag));

            return matchesSearch && matchesDifficulty && matchesTags;
        });

        this.renderChallenges();
        this.updateResultsCount();
    }

    renderChallenges() {
        const grid = document.getElementById('challenge-grid');
        grid.innerHTML = '';

        this.filteredChallenges.forEach(challenge => {
            const challengeElement = this.createChallengeCard(challenge);
            grid.appendChild(challengeElement);
        });

        // Update difficulty counts
        this.updateDifficultyCounts();
    }

    createChallengeCard(challenge) {
        const isCompleted = this.completedChallenges.has(challenge.id);
        const card = document.createElement('div');
        card.className = `challenge ${isCompleted ? 'completed' : ''}`;
        card.dataset.challengeId = challenge.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const tagsHtml = challenge.tags.slice(0, 3).map(tag =>
            `<span class="challenge-tag">${tag}</span>`
        ).join('');

        card.innerHTML = `
            <div class="challenge-header">
                <h3 class="challenge-title">${challenge.title}</h3>
                <span class="challenge-difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
            </div>
            <p class="challenge-description">${challenge.description}</p>
            <div class="challenge-meta">
                <span class="challenge-time">~${challenge.expected_time_min} min</span>
                <div class="challenge-tags">${tagsHtml}</div>
                ${isCompleted ? '<div class="challenge-status completed"><span class="challenge-status-icon">✓</span> Completed</div>' : ''}
            </div>
        `;

        // Add keyboard navigation
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openChallengeModal(challenge.id);
            }
        });

        return card;
    }

    renderTagFilters() {
        const tagFilters = document.getElementById('tag-filters');
        const allTags = [...new Set(this.challengeData.challenges.flatMap(c => c.tags))].sort();

        tagFilters.innerHTML = allTags.map(tag =>
            `<button class="chip" data-filter="tag" data-value="${tag}" aria-pressed="false">${tag}</button>`
        ).join('');
    }

    updateDifficultyCounts() {
        const counts = {
            all: this.challengeData.challenges.length,
            Beginner: 0,
            Intermediate: 0,
            Advanced: 0,
            Expert: 0
        };

        this.challengeData.challenges.forEach(challenge => {
            counts[challenge.difficulty]++;
        });

        Object.entries(counts).forEach(([difficulty, count]) => {
            const element = document.getElementById(`count-${difficulty.toLowerCase()}`);
            if (element) {
                element.textContent = count;
            }
        });
    }

    updateResultsCount() {
        const count = this.filteredChallenges.length;
        const resultsElement = document.getElementById('results-count');
        resultsElement.textContent = `Showing ${count} challenge${count !== 1 ? 's' : ''}`;
    }

    updateStats() {
        const completed = this.completedChallenges.size;
        const total = this.challengeData.challenges.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        document.getElementById('completed-count').textContent = completed;
        document.getElementById('total-count').textContent = total;
        document.querySelector('.progress-fill').style.width = `${percentage}%`;
    }

    openChallengeModal(challengeId) {
        const challenge = this.challengeData.challenges.find(c => c.id === challengeId);
        if (!challenge) {
            console.error('Challenge not found:', challengeId);
            return;
        }

        this.currentChallenge = challenge;
        console.log('Opening challenge:', challenge.title);

        const modal = document.getElementById('challenge-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const toggleButton = document.getElementById('toggle-completion');
        const practiceButton = document.getElementById('practice-challenge');

        modalTitle.textContent = challenge.title;

        const isCompleted = this.completedChallenges.has(challengeId);
        toggleButton.textContent = isCompleted ? 'Mark Incomplete' : 'Mark Complete';
        toggleButton.dataset.challengeId = challengeId;

        // Update practice button for two-part process
        practiceButton.textContent = 'Begin Practice Session';
        practiceButton.classList.remove('button-active');

        // Reset practice state
        this.practiceState = 'preparation';

        // Reset modal to single-column layout initially
        modal.classList.remove('editor-mode', 'editor-active');

        const criteriaHtml = challenge.acceptance_criteria.map(criteria =>
            `<li class="modal-criteria-item"><span class="modal-criteria-icon">✓</span> ${criteria}</li>`
        ).join('');

        const modalContent = `
            <div class="practice-phase-indicator">
                <div class="phase-step active" data-phase="1">
                    <span class="step-number">1</span>
                    <span class="step-title">Review Challenge</span>
                </div>
                <div class="phase-divider"></div>
                <div class="phase-step" data-phase="2">
                    <span class="step-number">2</span>
                    <span class="step-title">Practice Session</span>
                </div>
            </div>

            <div class="modal-section challenge-overview">
                <h4 class="modal-section-title">Challenge Overview</h4>
                <p class="modal-section-content">${challenge.description}</p>
            </div>

            <div class="practice-details">
                <div class="modal-section">
                    <h4 class="modal-section-title">Difficulty & Duration</h4>
                    <p class="modal-section-content">
                        <span class="difficulty-badge ${challenge.difficulty.toLowerCase()}">${challenge.difficulty}</span>
                        <span class="duration-info">Expected time: ~${challenge.expected_time_min} minutes</span>
                    </p>
                </div>

                <div class="modal-section">
                    <h4 class="modal-section-title">Success Criteria</h4>
                    <ul class="modal-criteria-list">${criteriaHtml}</ul>
                </div>

                <div class="modal-section">
                    <h4 class="modal-section-title">Skills Focus</h4>
                    <div class="tags-container">
                        ${challenge.tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('')}
                    </div>
                </div>

                <div class="modal-section preparation-tips">
                    <h4 class="modal-section-title">Preparation Tips</h4>
                    <ul class="tips-list">
                        <li>🎯 Review the challenge description carefully</li>
                        <li>⏱️ Set aside ${challenge.expected_time_min} minutes for focused practice</li>
                        <li>🎹 Ensure you're comfortable with basic Vim navigation</li>
                        <li>📝 Keep the acceptance criteria in mind while practicing</li>
                    </ul>
                </div>
            </div>
        `;

        modalBody.innerHTML = modalContent;

        // Ensure editor section is hidden initially
        const editorSection = document.getElementById('modal-editor-section');
        editorSection.style.display = 'none';

        // Ensure modal body is visible and properly styled
        modalBody.style.display = 'block';
        modalBody.style.opacity = '1';

        // Force a reflow to ensure content is rendered
        modalBody.offsetHeight;

        console.log('Modal content set, body innerHTML length:', modalBody.innerHTML.length);

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');

        // Focus management
        document.getElementById('modal-close').focus();

        // Trap focus within modal
        this.trapFocus(modal);
    }

    closeModal() {
        const modal = document.getElementById('challenge-modal');
        const editorSection = document.getElementById('modal-editor-section');

        modal.classList.add('hidden');
        modal.classList.remove('editor-active', 'editor-mode');
        modal.setAttribute('aria-hidden', 'true');

        // Hide editor section and clean up
        if (editorSection) {
            editorSection.style.display = 'none';
        }

        // Clean up editor instance
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        // Reset current challenge and session
        this.currentChallenge = null;
        this.editorSession = null;
        this.practiceState = 'preparation';
    }

    toggleChallengeCompletion() {
        const toggleButton = document.getElementById('toggle-completion');
        const challengeId = parseInt(toggleButton.dataset.challengeId);

        if (this.completedChallenges.has(challengeId)) {
            this.completedChallenges.delete(challengeId);
        } else {
            this.completedChallenges.add(challengeId);
        }

        this.saveProgress();
        this.updateStats();
        this.renderChallenges();
        this.closeModal();
    }

    // Flashcard functionality
    initFlashcards() {
        if (!this.challengeData.flashcards_sample) return;

        this.flashcards = [...this.challengeData.flashcards_sample];
        this.currentFlashcard = 0;
        this.renderFlashcard();
        this.updateFlashcardProgress();
    }

    renderFlashcard() {
        const flashcard = this.flashcards[this.currentFlashcard];
        if (!flashcard) return;

        document.getElementById('flashcard-question').textContent = flashcard.question;

        const choicesContainer = document.getElementById('flashcard-choices');
        choicesContainer.innerHTML = flashcard.choices.map((choice, index) =>
            `<button class="choice-button" data-choice="${index}">${choice}</button>`
        ).join('');

        // Reset states
        document.getElementById('flashcard-choices').classList.remove('hidden');
        document.getElementById('flashcard-answer').classList.add('hidden');
        document.getElementById('flashcard-hint').classList.add('hidden');
        document.getElementById('show-hint').classList.remove('hidden');
        document.getElementById('reveal-answer').classList.remove('hidden');

        this.selectedChoice = null;
        this.updateFlashcardNavigation();
    }

    selectChoice(choiceButton) {
        // Remove previous selection
        document.querySelectorAll('.choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select new choice
        choiceButton.classList.add('selected');
        this.selectedChoice = parseInt(choiceButton.dataset.choice);
    }

    showHint() {
        const flashcard = this.flashcards[this.currentFlashcard];
        const hintElement = document.getElementById('flashcard-hint');

        hintElement.textContent = flashcard.hint;
        hintElement.classList.remove('hidden');
        document.getElementById('show-hint').classList.add('hidden');
    }

    revealAnswer() {
        const flashcard = this.flashcards[this.currentFlashcard];
        const correctIndex = flashcard.correct_index;
        const answerElement = document.getElementById('flashcard-answer');

        // Show correct answer
        answerElement.textContent = `Correct answer: ${flashcard.choices[correctIndex]}`;
        answerElement.classList.remove('hidden');

        // Update choice buttons
        document.querySelectorAll('.choice-button').forEach((btn, index) => {
            btn.disabled = true;
            if (index === correctIndex) {
                btn.classList.add('correct');
            } else if (index === this.selectedChoice && index !== correctIndex) {
                btn.classList.add('incorrect');
            }
        });

        // Track stats
        if (this.selectedChoice !== null) {
            if (this.selectedChoice === correctIndex) {
                this.flashcardStats.correct++;
            } else {
                this.flashcardStats.incorrect++;
            }
            this.flashcardStats.total++;
            this.updateFlashcardStats();
        }

        document.getElementById('reveal-answer').classList.add('hidden');
    }

    nextCard() {
        if (this.currentFlashcard < this.flashcards.length - 1) {
            this.currentFlashcard++;
            this.renderFlashcard();
            this.updateFlashcardProgress();
        }
    }

    previousCard() {
        if (this.currentFlashcard > 0) {
            this.currentFlashcard--;
            this.renderFlashcard();
            this.updateFlashcardProgress();
        }
    }

    updateFlashcardProgress() {
        const current = this.currentFlashcard + 1;
        const total = this.flashcards.length;
        const percentage = (current / total) * 100;

        document.getElementById('current-card').textContent = current;
        document.getElementById('total-cards').textContent = total;
        document.getElementById('flashcard-progress').style.width = `${percentage}%`;
    }

    updateFlashcardNavigation() {
        document.getElementById('prev-card').disabled = this.currentFlashcard === 0;
        document.getElementById('next-card').disabled = this.currentFlashcard === this.flashcards.length - 1;
    }

    updateFlashcardStats() {
        const { correct, incorrect, total } = this.flashcardStats;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        document.getElementById('correct-count').textContent = correct;
        document.getElementById('incorrect-count').textContent = incorrect;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
    }

    // Progress management
    saveProgress() {
        const progress = {
            completedChallenges: Array.from(this.completedChallenges),
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('neovim-mastery-progress', JSON.stringify(progress));
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('neovim-mastery-progress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.completedChallenges = new Set(progress.completedChallenges || []);
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            this.completedChallenges.clear();
            localStorage.removeItem('neovim-mastery-progress');
            this.updateStats();
            this.renderChallenges();
        }
    }

    exportProgress() {
        const progress = {
            completedChallenges: Array.from(this.completedChallenges),
            totalChallenges: this.challengeData.challenges.length,
            completionPercentage: Math.round((this.completedChallenges.size / this.challengeData.challenges.length) * 100),
            exportDate: new Date().toISOString(),
            platform: 'Neovim Mastery'
        };

        const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neovim-mastery-progress-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Practice Editor Functionality
    initPracticeEditor() {
        if (!this.challengeData.practice_exercises) return;

        this.populateExerciseSelector();
        this.loadExerciseProgress();
        this.updateExerciseStats();
    }

    populateExerciseSelector() {
        const select = document.getElementById('exercise-select');
        if (!select) return;

        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select a practice exercise...</option>';

        this.challengeData.practice_exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.id;
            option.textContent = `${exercise.title} (${exercise.difficulty})`;
            select.appendChild(option);
        });
    }

    selectExercise(exerciseId) {
        if (!exerciseId) {
            this.clearExerciseInfo();
            return;
        }

        const exercise = this.challengeData.practice_exercises.find(ex => ex.id == exerciseId);
        if (!exercise) return;

        this.currentExercise = exercise;
        this.displayExerciseInfo(exercise);

        document.getElementById('start-exercise').disabled = false;
        document.getElementById('reset-exercise').disabled = true;
        document.getElementById('submit-exercise').classList.add('hidden');
    }

    displayExerciseInfo(exercise) {
        const descriptionEl = document.getElementById('exercise-description');
        const goalsEl = document.getElementById('exercise-goals');

        if (descriptionEl) {
            descriptionEl.innerHTML = `
                <h4>Description</h4>
                <p>${exercise.description}</p>
                <p><strong>Difficulty:</strong> ${exercise.difficulty}</p>
            `;
        }

        if (goalsEl && exercise.goals) {
            const goalsHtml = exercise.goals.map(goal => `<li>${goal}</li>`).join('');
            goalsEl.innerHTML = `
                <h4>Goals</h4>
                <ul>${goalsHtml}</ul>
                <p><em>Hint: ${exercise.hint}</em></p>
            `;
        }
    }

    clearExerciseInfo() {
        const descriptionEl = document.getElementById('exercise-description');
        const goalsEl = document.getElementById('exercise-goals');

        if (descriptionEl) descriptionEl.innerHTML = '';
        if (goalsEl) goalsEl.innerHTML = '';

        document.getElementById('start-exercise').disabled = true;
        document.getElementById('reset-exercise').disabled = true;
        document.getElementById('submit-exercise').classList.add('hidden');
    }

    startExercise() {
        if (!this.currentExercise) return;

        this.initCodeMirrorEditor();
        this.loadExerciseContent();

        document.getElementById('start-exercise').disabled = true;
        document.getElementById('reset-exercise').disabled = false;
        document.getElementById('submit-exercise').classList.remove('hidden');
    }

    initCodeMirrorEditor() {
        const textarea = document.getElementById('code-editor');
        if (!textarea || this.editor) return;

        this.editor = CodeMirror.fromTextArea(textarea, {
            mode: 'javascript',
            theme: 'default',
            keyMap: 'vim',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            tabSize: 4,
            showCursorWhenSelecting: true,
            cursorBlinkRate: 530
        });

        // Update status indicators
        this.editor.on('cursorActivity', () => {
            this.updateEditorStatus();
        });

        this.editor.on('vim-mode-change', (e) => {
            this.updateVimMode(e.mode);
        });

        // Add custom CSS to editor
        this.editor.getWrapperElement().style.height = '400px';
        this.editor.getWrapperElement().style.border = '1px solid var(--color-divider)';
        this.editor.getWrapperElement().style.borderRadius = 'var(--radius-md)';
    }

    loadExerciseContent() {
        if (!this.editor || !this.currentExercise) return;

        this.editor.setValue(this.currentExercise.initial_text);
        this.editor.setCursor(0, 0);
        this.editor.focus();
        this.updateEditorStatus();
    }

    updateEditorStatus() {
        if (!this.editor) return;

        const cursor = this.editor.getCursor();
        const positionEl = document.getElementById('cursor-position');
        if (positionEl) {
            positionEl.textContent = `${cursor.line + 1}:${cursor.ch + 1}`;
        }
    }

    updateVimMode(mode) {
        const modeEl = document.getElementById('vim-mode');
        if (modeEl) {
            modeEl.textContent = mode.toUpperCase();
            modeEl.className = `vim-mode mode-${mode.toLowerCase()}`;
        }
    }

    resetExercise() {
        if (!this.currentExercise) return;

        this.loadExerciseContent();
        document.getElementById('submit-exercise').classList.remove('hidden');
    }

    submitExercise() {
        if (!this.editor || !this.currentExercise) return;

        const userContent = this.editor.getValue();
        const cursor = this.editor.getCursor();

        const result = this.evaluateExercise(userContent, cursor);
        this.showFeedback(result);

        // Update stats
        if (result.success) {
            this.exerciseStats.success++;
        }
        this.exerciseStats.completed++;
        this.saveExerciseProgress();
        this.updateExerciseStats();
    }

    evaluateExercise(userContent, cursor) {
        const exercise = this.currentExercise;
        let success = false;
        let feedback = '';
        let encouragement = '';

        switch (exercise.solution_check) {
            case 'cursor_position':
                const targetLine = exercise.target_line - 1; // Convert to 0-based
                const targetCol = exercise.target_column;
                success = cursor.line === targetLine && Math.abs(cursor.ch - targetCol) <= 2;
                feedback = success ?
                    `Perfect! You navigated to line ${cursor.line + 1}, column ${cursor.ch + 1}!` :
                    `Try to reach line ${exercise.target_line}, column ${exercise.target_column}. You're at ${cursor.line + 1}:${cursor.ch + 1}`;
                break;

            case 'text_content':
                success = userContent.trim() === exercise.expected_result.trim();
                feedback = success ?
                    'Excellent! Your text matches the expected result!' :
                    'The text doesn\'t quite match. Check your edits and try again.';
                break;

            case 'word_navigation':
                // For word navigation, we check if they used vim motions (simplified check)
                success = true; // For now, assume success if they tried
                feedback = 'Great job practicing word navigation! Keep using w, b, and e to master word movements.';
                break;

            case 'visual_selection':
                success = true; // Visual mode practice is about learning, not exact results
                feedback = 'Well done! Visual mode is powerful for selecting and manipulating text.';
                break;

            case 'text_objects':
                success = true; // Text objects practice
                feedback = 'Excellent! Text objects make vim editing incredibly efficient.';
                break;

            default:
                success = true;
                feedback = 'Exercise completed! Keep practicing to master these skills.';
        }

        if (success) {
            const encouragements = [
                "🎉 Outstanding work!",
                "⚡ You're becoming a Vim master!",
                "🚀 Excellent progress!",
                "💪 Strong Vim skills!",
                "🎯 Perfect execution!",
                "🔥 You're on fire!",
                "⭐ Stellar performance!"
            ];
            encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
        }

        return { success, feedback, encouragement };
    }

    showFeedback(result) {
        const modal = document.getElementById('feedback-modal');
        const content = document.getElementById('feedback-content');

        if (!modal || !content) return;

        const iconClass = result.success ? 'success' : 'warning';
        const icon = result.success ? '🎉' : '💡';

        content.innerHTML = `
            <div class="feedback-header ${iconClass}">
                <div class="feedback-icon">${icon}</div>
                <h3 class="feedback-title">${result.success ? result.encouragement : 'Keep Practicing!'}</h3>
            </div>
            <div class="feedback-body">
                <p class="feedback-message">${result.feedback}</p>
                ${result.success ? `
                    <div class="achievement">
                        <p>🏆 Exercise completed successfully!</p>
                        <p>Ready for the next challenge?</p>
                    </div>
                ` : `
                    <div class="tip">
                        <p><strong>Tip:</strong> ${this.currentExercise.hint}</p>
                    </div>
                `}
            </div>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    tryAnotherExercise() {
        this.closeFeedbackModal();
        document.getElementById('exercise-select').value = '';
        this.clearExerciseInfo();
        this.currentExercise = null;
    }

    practiceFromChallenge() {
        this.closeFeedbackModal();
        this.switchTab('practice');
        // Could auto-select a related exercise based on the challenge
    }

    updateExerciseStats() {
        const completedEl = document.getElementById('exercises-completed');
        const successRateEl = document.getElementById('success-rate');

        if (completedEl) {
            completedEl.textContent = this.exerciseStats.completed;
        }

        if (successRateEl) {
            const rate = this.exerciseStats.completed > 0 ?
                Math.round((this.exerciseStats.success / this.exerciseStats.completed) * 100) : 0;
            successRateEl.textContent = `${rate}%`;
        }
    }

    saveExerciseProgress() {
        const progress = {
            exerciseStats: this.exerciseStats,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('neovim-mastery-exercise-progress', JSON.stringify(progress));
    }

    loadExerciseProgress() {
        try {
            const saved = localStorage.getItem('neovim-mastery-exercise-progress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.exerciseStats = { ...this.exerciseStats, ...progress.exerciseStats };
            }
        } catch (error) {
            console.error('Failed to load exercise progress:', error);
        }
    }

    // Utility functions
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-danger);
            color: white;
            padding: 16px 20px;
            border-radius: var(--radius-md);
            box-shadow: var(--elevation-level2);
            z-index: 1000;
            max-width: 400px;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Editor Integration Methods
    startPractice() {
        if (!this.currentChallenge) return;

        const editorSection = document.getElementById('modal-editor-section');
        const practiceButton = document.getElementById('practice-challenge');
        const modal = document.getElementById('challenge-modal');
        const modalBody = document.getElementById('modal-body');

        // Transition to Phase 2: Practice Session
        this.practiceState = 'active';

        // Update phase indicators
        this.updatePhaseIndicators();

        // Switch to two-column layout
        modal.classList.add('editor-mode', 'editor-active');

        // Restructure modal content for two-column layout
        this.setupTwoColumnLayout();

        // Update button to show practice is active
        practiceButton.textContent = 'End Practice Session';
        practiceButton.classList.add('button-active');

        // Show editor section
        editorSection.style.display = 'flex';

        // Initialize CodeMirror editor
        this.initializeEditor();

        // Start tracking session
        this.editorSession = {
            startTime: Date.now(),
            actions: [],
            targetsMet: new Set(),
            challengeId: this.currentChallenge.id
        };

        // Update progress indicator
        this.updateProgressIndicator('Practice session started. Begin with Vim commands!');

        // Focus editor
        setTimeout(() => {
            if (this.editor) {
                this.editor.focus();
            }
        }, 100);
    }

    setupTwoColumnLayout() {
        const modalBody = document.getElementById('modal-body');
        const editorSection = document.getElementById('modal-editor-section');

        // Get current content
        const currentContent = modalBody.innerHTML;

        // Create two-column structure
        modalBody.innerHTML = `
            <div class="modal-content-left">
                ${currentContent}
            </div>
            <div class="modal-content-right">
                ${editorSection.outerHTML}
            </div>
        `;

        // Update the editor section reference
        const newEditorSection = modalBody.querySelector('.modal-content-right .modal-editor-section');
        if (newEditorSection) {
            newEditorSection.id = 'modal-editor-section';
        }
    }

    initializeEditor() {
        // Find the textarea in the new layout
        const textarea = document.querySelector('.modal-content-right #challenge-editor');

        if (!textarea) {
            console.error('Editor textarea not found in new layout');
            return;
        }

        if (this.editor) {
            this.editor.toTextArea();
        }

        // Create CodeMirror instance with Vim mode
        this.editor = CodeMirror.fromTextArea(textarea, {
            lineNumbers: true,
            mode: 'text/plain',
            keyMap: 'vim',
            theme: 'default',
            lineWrapping: true,
            cursorHeight: 1,
            lineNumberFormatter: (line) => line
        });

        // Set initial content based on challenge
        this.setupChallengeContent();

        // Setup event listeners
        this.setupEditorEventListeners();

        // Update status indicators
        this.updateModeIndicator('NORMAL');
        this.updatePositionIndicator();
    }

    setupChallengeContent() {
        if (!this.currentChallenge) return;

        const challenge = this.currentChallenge;
        let initialContent = '';

        // Generate practice content based on challenge type
        switch (challenge.tags[0]) {
            case 'motions':
                initialContent = this.generateMotionsPractice();
                break;
            case 'editing':
                initialContent = this.generateEditingPractice();
                break;
            case 'search':
                initialContent = this.generateSearchPractice();
                break;
            case 'windows':
                initialContent = this.generateWindowsPractice();
                break;
            case 'visual':
                initialContent = this.generateVisualPractice();
                break;
            default:
                initialContent = this.generateDefaultPractice();
        }

        this.editor.setValue(initialContent);
        this.editor.setCursor(0, 0);
    }

    generateMotionsPractice() {
        return `Welcome to Neovim Motions Practice!

Line 2: Navigate here using j (down)
Line 3: Try moving with k (up)
Line 4: Use h and l for left and right
Line 5: Practice word movements with w and b

TARGET LINE - Navigate here using line number commands
Line 7: Use 0 to go to beginning of line
Line 8: Use $ to go to end of line
Line 9: Try gg to go to top, G to go to bottom

PRACTICE GOALS:
- Navigate to line 6 using movement commands
- Move cursor to the word "TARGET" using hjkl
- Return to beginning of file using gg
- Jump to end of file using G
- Practice word boundaries with w, b, e

Remember: h=left, j=down, k=up, l=right
No arrow keys allowed!`;
    }

    generateEditingPractice() {
        return `Editing Practice - Text Manipulation

const oldVariableName = "hello";
const anotherBadName = "world";
const unnecessaryLine = "delete this line";
const keepThisOne = "important data";

TASKS:
1. Change 'oldVariableName' to 'newName' using ciw
2. Delete the word 'anotherBadName' using diw
3. Delete the entire 'unnecessaryLine' using dd
4. Practice with text objects: ci", ci(, ci{

function example(oldParam) {
    return "change this string";
}

Practice these commands:
- ciw (change inner word)
- diw (delete inner word)
- dd (delete line)
- cw (change word)
- dw (delete word)`;
    }

    generateSearchPractice() {
        return `Search Practice - Finding and Replacing

The quick brown fox jumps over the lazy dog.
The fox is quick and the dog is lazy.
A fox and a dog are both animals.
Quick foxes are faster than lazy dogs.

SEARCH TASKS:
1. Search for 'fox' using /fox
2. Navigate between matches using n and N
3. Search backwards for 'dog' using ?dog
4. Use * to search for word under cursor
5. Use # for backward search of word under cursor

REPLACE TASKS:
1. Replace first 'fox' with 'cat': :s/fox/cat/
2. Replace all 'fox' on line: :s/fox/cat/g
3. Replace all in file: :%s/dog/puppy/g

Practice patterns:
- /pattern (search forward)
- ?pattern (search backward)
- n (next match)
- N (previous match)
- * (search word under cursor)
- :s/old/new/ (substitute)`;
    }

    generateWindowsPractice() {
        return `Windows and Splits Practice

This is the main window content.
Practice window management commands here.

WINDOW COMMANDS TO PRACTICE:
1. :split or :sp - horizontal split
2. :vsplit or :vsp - vertical split
3. Ctrl+w + h/j/k/l - move between windows
4. Ctrl+w + = - equalize window sizes
5. Ctrl+w + _ - maximize height
6. Ctrl+w + | - maximize width
7. :close or Ctrl+w + c - close window

TAB COMMANDS:
1. :tabnew - new tab
2. :tabclose - close tab
3. gt or :tabnext - next tab
4. gT or :tabprev - previous tab
5. :tabmove - move tab position

Note: In this practice environment,
actual window splitting is simulated.
Focus on learning the commands!`;
    }

    generateVisualPractice() {
        return `Visual Mode Practice

function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
        total += item.price * item.quantity;
    }
    return total;
}

const config = {
    debug: true,
    version: "1.0.0",
    features: ["auth", "api", "ui"]
};

VISUAL MODE TASKS:
1. Select 'calculateTotal' using v and w/e
2. Select entire function using V (line visual)
3. Select the object block using Ctrl+v (block visual)
4. Practice text objects: vip, vap, vi", vi(, vi{

VISUAL COMMANDS:
- v: character visual mode
- V: line visual mode
- Ctrl+v: block visual mode
- o: switch cursor to other end
- gv: reselect last visual selection

After selection, try:
- d: delete selection
- y: yank (copy) selection
- c: change selection
- >: indent selection`;
    }

    generateDefaultPractice() {
        return `Neovim Practice Session

Welcome to your practice session for: ${this.currentChallenge.title}

Challenge Description:
${this.currentChallenge.description}

Acceptance Criteria:
${this.currentChallenge.acceptance_criteria.map(criteria => `- ${criteria}`).join('\n')}

This is your practice space. Start experimenting with Vim commands!

Some sample text to practice on:
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco.

Use this area to practice the skills needed for this challenge.
Remember to focus on the acceptance criteria above.

Happy practicing!`;
    }

    setupEditorEventListeners() {
        if (!this.editor) return;

        // Track cursor position
        this.editor.on('cursorActivity', () => {
            this.updatePositionIndicator();
            this.trackEditorAction('cursor');
        });

        // Track mode changes
        this.editor.on('vim-mode-change', (e) => {
            this.updateModeIndicator(e.mode);
            this.trackEditorAction('mode', { mode: e.mode });
        });

        // Track content changes
        this.editor.on('change', () => {
            this.trackEditorAction('edit');
            this.checkChallengeProgress();
        });

        // Track vim commands
        CodeMirror.Vim.defineEx('write', 'w', () => {
            this.trackEditorAction('command', { command: 'write' });
            this.updateProgressIndicator('File saved!', 'success');
        });
    }

    updateModeIndicator(mode = 'NORMAL') {
        const indicator = document.querySelector('.modal-content-right #mode-indicator') || document.getElementById('mode-indicator');
        if (indicator) {
            indicator.textContent = mode.toUpperCase();
            indicator.className = `mode-indicator mode-${mode.toLowerCase()}`;
        }
    }

    updatePositionIndicator() {
        if (!this.editor) return;

        const cursor = this.editor.getCursor();
        const indicator = document.querySelector('.modal-content-right #position-indicator') || document.getElementById('position-indicator');
        if (indicator) {
            indicator.textContent = `${cursor.line + 1}:${cursor.ch + 1}`;
        }
    }

    updateProgressIndicator(message, type = 'info') {
        const indicator = document.querySelector('.modal-content-right #progress-indicator') || document.getElementById('progress-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.className = `progress-indicator ${type}`;
        }
    }

    trackEditorAction(type, data = {}) {
        if (!this.editorSession) return;

        this.editorSession.actions.push({
            type,
            timestamp: Date.now(),
            data
        });
    }

    checkChallengeProgress() {
        if (!this.currentChallenge || !this.editorSession) return;

        const sessionDuration = Date.now() - this.editorSession.startTime;
        const actionCount = this.editorSession.actions.length;

        // Simple progress checking based on action count and time
        if (actionCount > 10 && sessionDuration > 30000) { // 30 seconds and 10+ actions
            this.showCompletionSuggestion();
        }
    }

    showCompletionSuggestion() {
        const sessionDuration = Math.floor((Date.now() - this.editorSession.startTime) / 1000);
        const actionCount = this.editorSession.actions.length;

        this.updateProgressIndicator(
            `Good progress! ${actionCount} actions in ${sessionDuration}s. Ready to complete?`,
            'success'
        );

        // Auto-suggest completion after good practice session
        setTimeout(() => {
            if (confirm('You\'ve been practicing well! Would you like to mark this challenge as completed?')) {
                this.completeChallenge();
            }
        }, 2000);
    }

    completeChallenge() {
        if (!this.currentChallenge) return;

        const challengeId = this.currentChallenge.id;
        this.completedChallenges.add(challengeId);
        this.saveProgress();
        this.updateStats();
        this.renderChallenges();

        // Update UI
        const toggleButton = document.getElementById('toggle-completion');
        toggleButton.textContent = 'Mark Incomplete';

        // Show success animation
        this.showCompletionFeedback();

        // Update progress indicator
        this.updateProgressIndicator('Challenge completed! 🎉', 'success');
    }

    showCompletionFeedback() {
        const modal = document.querySelector('.modal');
        modal.classList.add('challenge-completed-flash');

        setTimeout(() => {
            modal.classList.remove('challenge-completed-flash');
        }, 600);

        // Show feedback modal
        setTimeout(() => {
            this.showFeedbackModal();
        }, 800);
    }

    showFeedbackModal() {
        const feedbackModal = document.getElementById('feedback-modal');
        const feedbackContent = document.getElementById('feedback-content');

        const sessionStats = this.getSessionStats();

        feedbackContent.innerHTML = `
            <div class="feedback-success">
                <h3>🎉 Challenge Completed!</h3>
                <h4>${this.currentChallenge.title}</h4>
                <div class="session-stats">
                    <p><strong>Practice Time:</strong> ${sessionStats.duration}</p>
                    <p><strong>Actions Performed:</strong> ${sessionStats.actions}</p>
                    <p><strong>Focus Areas:</strong> ${this.currentChallenge.tags.join(', ')}</p>
                </div>
                <p class="encouragement">Great job! You're becoming a Vim master! 🚀</p>
            </div>
        `;

        feedbackModal.classList.remove('hidden');
        feedbackModal.setAttribute('aria-hidden', 'false');

        // Setup feedback modal event listeners
        document.getElementById('feedback-close').onclick = () => {
            feedbackModal.classList.add('hidden');
            feedbackModal.setAttribute('aria-hidden', 'true');
        };

        document.getElementById('try-another').onclick = () => {
            feedbackModal.classList.add('hidden');
            feedbackModal.setAttribute('aria-hidden', 'true');
            this.closeModal();
            this.suggestNextChallenge();
        };
    }

    getSessionStats() {
        if (!this.editorSession) return { duration: '0s', actions: 0 };

        const duration = Math.floor((Date.now() - this.editorSession.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        return {
            duration: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
            actions: this.editorSession.actions.length
        };
    }

    suggestNextChallenge() {
        // Find next uncompleted challenge
        const nextChallenge = this.challengeData.challenges.find(
            c => !this.completedChallenges.has(c.id) && c.id !== this.currentChallenge.id
        );

        if (nextChallenge) {
            setTimeout(() => {
                if (confirm(`Try the next challenge: "${nextChallenge.title}"?`)) {
                    this.openChallengeModal(nextChallenge.id);
                }
            }, 500);
        }
    }

    resetEditor() {
        if (!this.editor) return;

        this.setupChallengeContent();
        this.editorSession = {
            startTime: Date.now(),
            actions: [],
            targetsMet: new Set(),
            challengeId: this.currentChallenge?.id
        };

        this.updateProgressIndicator('Editor reset. Start practicing!');
        this.editor.focus();
    }

    checkProgress() {
        if (!this.editorSession) return;

        const sessionStats = this.getSessionStats();
        const progressMessage = `Session: ${sessionStats.duration}, ${sessionStats.actions} actions performed`;

        this.updateProgressIndicator(progressMessage, 'info');

        // Show detailed progress
        alert(`Progress Update:\n\nTime: ${sessionStats.duration}\nActions: ${sessionStats.actions}\nChallenge: ${this.currentChallenge?.title || 'None'}`);
    }

    switchVimMode(mode) {
        if (!this.editor) return;

        // This is mainly for display purposes
        // CodeMirror Vim mode handles actual mode switching
        this.updateModeIndicator(mode);
    }

    togglePractice() {
        if (this.practiceState === 'preparation') {
            this.startPractice();
        } else {
            this.endPracticeSession();
        }
    }

    updatePhaseIndicators() {
        const phases = document.querySelectorAll('.phase-step');
        phases.forEach(phase => {
            const phaseNum = phase.dataset.phase;
            if ((this.practiceState === 'preparation' && phaseNum === '1') ||
                (this.practiceState === 'active' && phaseNum === '2')) {
                phase.classList.add('active');
            } else {
                phase.classList.remove('active');
            }
        });
    }

    endPracticeSession() {
        const practiceButton = document.getElementById('practice-challenge');
        const modal = document.getElementById('challenge-modal');
        const modalBody = document.getElementById('modal-body');

        // Return to Phase 1: Review
        this.practiceState = 'preparation';
        this.updatePhaseIndicators();

        // Switch back to single-column layout
        modal.classList.remove('editor-mode', 'editor-active');

        // Restore original single-column content
        this.restoreSingleColumnLayout();

        // Reset button
        practiceButton.textContent = 'Begin Practice Session';
        practiceButton.classList.remove('button-active');

        // Clean up editor
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        // Reset session
        this.editorSession = null;
    }

    restoreSingleColumnLayout() {
        const modalBody = document.getElementById('modal-body');
        const leftContent = modalBody.querySelector('.modal-content-left');

        if (leftContent) {
            // Restore the original single-column content
            modalBody.innerHTML = leftContent.innerHTML;
        }

        // Ensure the editor section is back in its original position and hidden
        const editorSection = document.getElementById('modal-editor-section');
        if (editorSection) {
            editorSection.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NeovimMastery();
});

// Handle browser navigation
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'challenges';

    // Find the app instance and switch tab
    if (window.neovimMastery) {
        window.neovimMastery.switchTab(tab);
    }
});

// Service Worker registration for offline support (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker would be implemented here for offline functionality
        console.log('Service worker support detected');
    });
}
