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
     * @param {number} gamesPlayed - Total games played in session
     * @param {boolean} discountClaimed - Whether discount was already claimed
     */
    showGameOver(playerWon, winStreak, gamesPlayed = 0, discountClaimed = false) {
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

        // Update milestone checkboxes
        this.updateMilestones(winStreak, gamesPlayed);

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
            const discount = this.getDiscountFromStreak(winStreak, gamesPlayed);

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
                    const streakText = `${winStreak} win${winStreak === 1 ? '' : 's'} in a row`;
                    discountText.textContent = `${streakText}! You already claimed your discount!`;
                }
                if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            } else {
                // Show discount section with discount and claim button
                if (discountText) {
                    // New messaging based on discount tier
                    let message = '';
                    if (discount === 15) {
                        message = '15% Champion Bonus Unlocked!';
                    } else if (discount === 10) {
                        message = '10% Winner Bonus Unlocked!';
                    } else {
                        message = '5% Welcome Bonus Unlocked!';
                    }
                    discountText.textContent = message;
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
            // Player lost - but still gets 5% Welcome Bonus if they played!
            const discount = this.getDiscountFromStreak(0, gamesPlayed);

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

            // Check if discount was already claimed
            if (discountClaimed) {
                if (discountText) {
                    discountText.textContent = 'You already claimed your discount!';
                }
                if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            } else if (discount > 0) {
                // Player gets 5% Welcome Bonus for playing!
                if (discountText) {
                    discountText.textContent = '5% Welcome Bonus Unlocked!';
                }

                const claimPercent = document.getElementById('claimPercent');
                if (claimPercent) claimPercent.textContent = discount;

                // Hide "Play more to get X%" button on loss - milestones show the path
                const playMoreBtnSmall = document.getElementById('playMoreBtnSmall');
                if (playMoreBtnSmall) playMoreBtnSmall.style.display = 'none';

                if (discountButtonsContainer) discountButtonsContainer.style.display = 'flex';
            } else {
                // No games played yet (shouldn't happen)
                if (discountText) {
                    discountText.textContent = 'You lost the streak!';
                }
                if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            }
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
     * Calculate discount from win streak and games played
     * New system:
     * - Play 1 game (win or lose) = 5% Welcome Bonus
     * - WIN 1 game = 10%
     * - WIN 2 games in a row = 15%
     *
     * @param {number} winStreak - Current consecutive win streak
     * @param {number} gamesPlayed - Total games played in this session
     * @returns {number} Discount percentage
     */
    getDiscountFromStreak(winStreak, gamesPlayed = 0) {
        // Highest discount tier wins
        if (winStreak >= 2) return 15; // 2+ consecutive wins
        if (winStreak >= 1) return 10; // 1 win
        if (gamesPlayed >= 1) return 5; // Played at least 1 game (even if lost)
        return 0;
    }

    /**
     * Update milestone checkboxes based on progress
     * @param {number} winStreak - Current consecutive win streak
     * @param {number} gamesPlayed - Total games played in this session
     */
    updateMilestones(winStreak, gamesPlayed) {
        const milestone1 = document.getElementById('milestone1');
        const milestone2 = document.getElementById('milestone2');
        const milestone3 = document.getElementById('milestone3');

        // Milestone 1: Play 1 game (always completed after first game)
        if (milestone1) {
            if (gamesPlayed >= 1) {
                milestone1.innerHTML = '<span class="milestone-icon">✅</span> Play 1 game → 5% Welcome Bonus';
            } else {
                milestone1.innerHTML = '<span class="milestone-icon unchecked">⬜</span> Play 1 game → 5% Welcome Bonus';
            }
        }

        // Milestone 2: Win 1 game
        if (milestone2) {
            if (winStreak >= 1) {
                milestone2.innerHTML = '<span class="milestone-icon">✅</span> Win 1 game → 10% Winner Bonus';
            } else {
                milestone2.innerHTML = '<span class="milestone-icon unchecked">⬜</span> Win 1 game → 10% Winner Bonus';
            }
        }

        // Milestone 3: Win 2+ games in a row
        if (milestone3) {
            if (winStreak >= 2) {
                milestone3.innerHTML = '<span class="milestone-icon">✅</span> Win 2+ games in a row → 15% Champion Bonus';
            } else {
                milestone3.innerHTML = '<span class="milestone-icon unchecked">⬜</span> Win 2+ games in a row → 15% Champion Bonus';
            }
        }
    }
}
