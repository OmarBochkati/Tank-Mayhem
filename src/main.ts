import './style.css';
import { Game } from './game/Game';

// Create game container
const gameContainer = document.createElement('div');
gameContainer.id = 'game-container';
gameContainer.style.width = '100%';
gameContainer.style.height = '100%';
gameContainer.style.position = 'absolute';
gameContainer.style.top = '0';
gameContainer.style.left = '0';
document.body.appendChild(gameContainer);

// Initialize game
const game = new Game();
game.initialize();

// Start the game
game.start();

// Add CSS for score popup animation
const style = document.createElement('style');
style.textContent = `
  @keyframes scorePopup {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
    20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    80% { transform: translate(-50%, -80%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -100%) scale(1); opacity: 0; }
  }
`;
document.head.appendChild(style);
