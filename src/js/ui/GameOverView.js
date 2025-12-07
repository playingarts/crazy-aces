/**
 * GameOverView - Handles game over screen UI
 * Displays win/lose state, discount information, and confetti
 */

export class GameOverView {
    constructor(elements, animationController) {
        this.elements = elements;
        this.animationController = animationController;
    }

    /**
     * Show game over screen with advanced UI states
     * @param {boolean} playerWon - Whether player won
     * @param {number} winStreak - Current win streak
     * @param {boolean} discountClaimed - Whether discount was already claimed
     */
    showGameOver(playerWon, winStreak, discountClaimed = false) {
        if (!this.elements.gameOver || !this.elements.gameOverOverlay) return;

        const resultText = document.getElementById('resultText');
        const gameOverIcon = document.getElementById('gameOverIcon');
        const discountSection = document.getElementById('discountSection');
        const discountText = document.getElementById('discountText');
        const playMoreBtn = document.getElementById('playMoreBtn');
        const playAgainBtn = document.getElementById('playAgainBtn');
        const emailFormInline = document.getElementById('emailFormInline');
        const discountButtonsContainer = document.getElementById('discountButtonsContainer');
        const discountInfo = document.getElementById('discountInfo');

        // Hide all elements first
        if (discountSection) discountSection.style.display = 'none';
        if (playMoreBtn) playMoreBtn.style.display = 'none';
        if (playAgainBtn) playAgainBtn.style.display = 'none';
        if (gameOverIcon) {
            gameOverIcon.style.display = 'none';
            gameOverIcon.innerHTML = '';
        }
        if (emailFormInline) {
            emailFormInline.style.display = 'none';

            // Reset email form if it was replaced with success message
            // Check if it doesn't contain the form element
            if (!emailFormInline.querySelector('form')) {
                emailFormInline.innerHTML = `
                    <form data-action="email-form">
                        <input type="email" id="emailInput" class="email-input" placeholder="your@email.com" />
                        <div class="email-error" id="emailError"></div>
                        <div class="email-form-buttons">
                            <button type="submit" class="send-email-btn" id="sendDiscountBtn" data-action="send-discount">Send Discount</button>
                            <button type="button" class="cancel-email-btn" data-action="hide-email-form">Cancel</button>
                        </div>
                    </form>
                `;
            }
        }

        if (playerWon) {
            const discount = this.getDiscountFromStreak(winStreak);

            if (resultText) {
                resultText.textContent = 'You Win!';
                resultText.className = 'result-text win';
            }

            if (gameOverIcon) {
                gameOverIcon.innerHTML = '🎉';
                gameOverIcon.style.display = 'flex';
            }

            // Show Play More button
            if (playMoreBtn) playMoreBtn.style.display = 'block';

            // Check if discount was already claimed
            if (discountClaimed) {
                if (discountText) {
                    const streakText = winStreak === 1 ? '1 win' : `${winStreak} wins in a row`;
                    discountText.innerHTML = `${streakText}! <strong>You already claimed your discount!</strong>`;
                }
                if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            } else {
                // Show discount section with discount and claim button
                if (discountText) {
                    const streakText = winStreak === 1 ? '1 win' : `${winStreak} wins in a row`;
                    discountText.innerHTML = `${streakText} - ${discount}% Discount Unlocked!`;
                }

                const claimPercent = document.getElementById('claimPercent');
                if (claimPercent) claimPercent.textContent = discount;

                // Update "Play to get X%" button visibility and text based on current discount
                const playMoreBtnSmall = document.getElementById('playMoreBtnSmall');
                if (discount >= 15) {
                    // At max discount, hide the play more button
                    if (playMoreBtnSmall) playMoreBtnSmall.style.display = 'none';
                } else {
                    // Show button with next discount level
                    const nextDiscount = discount === 5 ? 10 : 15;
                    const playMorePercent = document.getElementById('playMorePercent');
                    if (playMorePercent) playMorePercent.textContent = nextDiscount;
                    if (playMoreBtnSmall) playMoreBtnSmall.style.display = 'block';
                }

                if (discountButtonsContainer) discountButtonsContainer.style.display = 'flex';
            }

            if (discountSection) discountSection.style.display = 'block';
            // Launch confetti through animation controller
            this.animationController.launchConfetti();
        } else {
            // Player lost
            if (resultText) {
                resultText.textContent = 'You Lost!';
                resultText.className = 'result-text lose';
            }

            if (gameOverIcon) {
                gameOverIcon.innerHTML = '😢';
                gameOverIcon.style.display = 'flex';
            }

            // Show Play More button
            if (playMoreBtn) playMoreBtn.style.display = 'block';

            // Show discount section with "You lost the streak" message
            if (discountText) {
                discountText.innerHTML = `<strong>You lost the streak!</strong>`;
            }
            if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            if (discountSection) discountSection.style.display = 'block';
        }

        this.elements.gameOver.classList.add('show');
        this.elements.gameOverOverlay.classList.add('show');
    }

    /**
     * Hide game over screen with animation
     */
    hideGameOver() {
        if (this.elements.gameOver && this.elements.gameOverOverlay) {
            // Add hiding class to trigger slide-down animation
            this.elements.gameOver.classList.add('hiding');
            this.elements.gameOverOverlay.classList.add('hiding');
            this.elements.gameOver.classList.remove('show');
            this.elements.gameOverOverlay.classList.remove('show');

            // Wait for animation to complete, then remove hiding class
            setTimeout(() => {
                this.elements.gameOver.classList.remove('hiding');
                this.elements.gameOverOverlay.classList.remove('hiding');
            }, 300); // Match animation duration
        }
    }

    /**
     * Calculate discount from win streak
     * @param {number} winStreak - Current win streak
     * @returns {number} Discount percentage
     */
    getDiscountFromStreak(winStreak) {
        if (winStreak === 1) return 5;
        if (winStreak === 2) return 10;
        if (winStreak >= 3) return 15;
        return 0;
    }
}
