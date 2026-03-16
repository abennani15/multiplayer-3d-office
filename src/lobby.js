/**
 * Lobby — character & name selection screen.
 * Returns a Promise that resolves to { name, character } once the user
 * has filled in the form and clicked "Enter Office".
 */
export function showLobby() {
    return new Promise((resolve) => {
        const lobby = document.getElementById('lobby');
        const nameInput = document.getElementById('player-name');
        const enterBtn = document.getElementById('enter-btn');
        const cards = document.querySelectorAll('.character-card');

        let selectedChar = null;

        // Character card selection
        cards.forEach((card) => {
            card.addEventListener('click', () => {
                cards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedChar = card.dataset.char;
                _validate();
            });
        });

        // Name input validation
        nameInput.addEventListener('input', _validate);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') enterBtn.click();
        });

        // Enter button
        enterBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name || !selectedChar) return;
            lobby.classList.add('hidden');
            resolve({ name, character: selectedChar });
        });

        function _validate() {
            const hasName = nameInput.value.trim().length > 0;
            enterBtn.disabled = !(hasName && selectedChar);
        }
    });
}
