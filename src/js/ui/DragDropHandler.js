/**
 * DragDropHandler - Handles all drag and drop interactions
 * Supports both mouse drag/drop and touch drag/drop for mobile
 */

export class DragDropHandler {
    constructor(elements) {
        this.elements = elements;
        this.draggedCardIndex = null;
        this.draggedCardElement = null;
        this.isDragging = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.cardOffsetX = 0;
        this.cardOffsetY = 0;
        this.onCardClickHandler = null;
        this.discardPileHandlersSetup = false;
    }

    /**
     * Setup all drag/drop handlers for a card element
     * @param {HTMLElement} cardEl - Card element
     * @param {number} cardIndex - Index of card in hand
     * @param {Function} onCardClick - Callback when card is clicked/played
     */
    setupCardHandlers(cardEl, cardIndex, onCardClick) {
        // Store callback
        this.onCardClickHandler = onCardClick;

        // Drag and drop handlers (desktop)
        cardEl.draggable = true;
        cardEl.addEventListener('dragstart', (e) => this.handleDragStart(e, cardIndex));
        cardEl.addEventListener('drag', (e) => this.handleDrag(e));
        cardEl.addEventListener('dragend', (e) => this.handleDragEnd(e));

        // Touch handlers (mobile)
        cardEl.addEventListener('touchstart', (e) => this.handleTouchStart(e, cardIndex));
        cardEl.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        cardEl.addEventListener('touchend', (e) => this.handleTouchEnd(e, onCardClick));
    }

    /**
     * Setup discard pile as drop target (only once)
     */
    setupDiscardPileDropTarget() {
        if (
            this.discardPileHandlersSetup ||
            !this.elements.tableCard ||
            !this.elements.tableCard.parentElement
        ) {
            return;
        }

        const discardPile = this.elements.tableCard.parentElement;
        discardPile.addEventListener('dragover', (e) => this.handleDragOver(e));
        discardPile.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        discardPile.addEventListener('drop', (e) => this.handleDrop(e));

        this.discardPileHandlersSetup = true;
    }

    /**
     * Handle drag start
     */
    handleDragStart(e, cardIndex) {
        this.draggedCardIndex = cardIndex;
        e.currentTarget.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    /**
     * Handle drag (while dragging) - not used in simple mode
     */
    handleDrag(e) {
        // Empty - using browser's native drag behavior
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        e.currentTarget.style.opacity = '1';
        this.draggedCardIndex = null;
    }

    /**
     * Handle drag over (for drop target)
     */
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';

        // Add visual feedback
        const discardPile = this.elements.tableCard?.parentElement;
        if (discardPile && !discardPile.classList.contains('drag-over')) {
            discardPile.classList.add('drag-over');
        }

        return false;
    }

    /**
     * Handle drag leave (remove visual feedback)
     */
    handleDragLeave(e) {
        const discardPile = this.elements.tableCard?.parentElement;
        if (discardPile) {
            discardPile.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop
     */
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();

        // Remove visual feedback
        const discardPile = this.elements.tableCard?.parentElement;
        if (discardPile) {
            discardPile.classList.remove('drag-over');
        }

        if (this.draggedCardIndex !== null && this.onCardClickHandler) {
            this.onCardClickHandler(this.draggedCardIndex);
        }

        return false;
    }

    /**
     * Handle touch start (mobile)
     */
    handleTouchStart(e, cardIndex) {
        const touch = e.touches[0];
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();

        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.draggedCardIndex = cardIndex;
        this.draggedCardElement = target;
        this.isDragging = false;

        // Calculate offset from touch point to card center
        this.cardOffsetX = touch.clientX - (rect.left + rect.width / 2);
        this.cardOffsetY = touch.clientY - (rect.top + rect.height / 2);
    }

    /**
     * Handle touch move (mobile)
     */
    handleTouchMove(e) {
        if (this.draggedCardIndex === null || !this.draggedCardElement) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchStartX);
        const deltaY = Math.abs(touch.clientY - this.touchStartY);

        // Start dragging if moved more than 10px
        if (deltaX > 10 || deltaY > 10) {
            if (!this.isDragging) {
                this.isDragging = true;
                // Make card follow finger
                this.draggedCardElement.style.position = 'fixed';
                this.draggedCardElement.style.zIndex = '1000';
                this.draggedCardElement.style.opacity = '0.8';
                this.draggedCardElement.style.pointerEvents = 'none';
                this.draggedCardElement.style.transition = 'none';
            }

            e.preventDefault(); // Prevent scrolling while dragging

            // Move card to follow finger
            this.draggedCardElement.style.left =
                touch.clientX - this.cardOffsetX - this.draggedCardElement.offsetWidth / 2 + 'px';
            this.draggedCardElement.style.top =
                touch.clientY - this.cardOffsetY - this.draggedCardElement.offsetHeight / 2 + 'px';

            // Check if over discard pile
            const discardPileEl = this.elements.tableCard?.parentElement;
            if (discardPileEl) {
                const rect = discardPileEl.getBoundingClientRect();
                const isOver =
                    touch.clientX >= rect.left &&
                    touch.clientX <= rect.right &&
                    touch.clientY >= rect.top &&
                    touch.clientY <= rect.bottom;

                if (isOver && !discardPileEl.classList.contains('drag-over')) {
                    discardPileEl.classList.add('drag-over');
                } else if (!isOver && discardPileEl.classList.contains('drag-over')) {
                    discardPileEl.classList.remove('drag-over');
                }
            }
        }
    }

    /**
     * Handle touch end (mobile)
     */
    handleTouchEnd(e, onCardClick) {
        if (this.draggedCardIndex === null) return;

        const discardPileEl = this.elements.tableCard?.parentElement;
        if (discardPileEl) {
            discardPileEl.classList.remove('drag-over');
        }

        // Check if card was played
        let wasPlayed = false;
        if (this.isDragging) {
            const touch = e.changedTouches[0];
            if (discardPileEl) {
                const rect = discardPileEl.getBoundingClientRect();
                const isOver =
                    touch.clientX >= rect.left &&
                    touch.clientX <= rect.right &&
                    touch.clientY >= rect.top &&
                    touch.clientY <= rect.bottom;

                if (isOver) {
                    wasPlayed = true;
                    onCardClick(this.draggedCardIndex);
                }
            }
        }

        // Reset card styling
        if (this.draggedCardElement && this.isDragging) {
            if (wasPlayed) {
                // Card was dropped on pile - hide it temporarily while game validates
                // Keep position/transforms in place so there's no flash
                this.draggedCardElement.style.opacity = '0';
                this.draggedCardElement.style.pointerEvents = 'none';

                // Clean up styles after a short delay
                // By then, animateCardPlay() will have taken over (if valid)
                // or the game will re-render the hand (if invalid)
                const elementToCleanup = this.draggedCardElement;
                setTimeout(() => {
                    elementToCleanup.style.position = '';
                    elementToCleanup.style.left = '';
                    elementToCleanup.style.top = '';
                    elementToCleanup.style.zIndex = '';
                    elementToCleanup.style.opacity = '';
                    elementToCleanup.style.pointerEvents = '';
                    elementToCleanup.style.transition = '';
                }, 100);
            } else {
                // Card was not played (drag cancelled) - reset immediately
                this.draggedCardElement.style.position = '';
                this.draggedCardElement.style.left = '';
                this.draggedCardElement.style.top = '';
                this.draggedCardElement.style.zIndex = '';
                this.draggedCardElement.style.opacity = '';
                this.draggedCardElement.style.pointerEvents = '';
                this.draggedCardElement.style.transition = '';
            }
        }

        this.draggedCardIndex = null;
        this.draggedCardElement = null;
        this.isDragging = false;
    }
}
