import './style.css';
import { Game } from './game/Game';

// Create UI elements
function createUIElements() {
  // Create game container if it doesn't exist
  let gameContainer = document.getElementById('game-container');
  if (!gameContainer) {
    gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    document.body.appendChild(gameContainer);
  }

  // Create health bar
  let healthBar = document.getElementById('health-bar');
  if (!healthBar) {
    healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.position = 'absolute';
    healthBar.style.top = '10px';
    healthBar.style.left = '20px';
    healthBar.style.width = '200px';
    healthBar.style.height = '20px';
    healthBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    healthBar.style.border = '2px solid white';
    healthBar.style.borderRadius = '10px';
    healthBar.style.overflow = 'hidden';
    document.body.appendChild(healthBar);

    const healthFill = document.createElement('div');
    healthFill.id = 'health-fill';
    healthFill.style.width = '100%';
    healthFill.style.height = '100%';
    healthFill.style.backgroundColor = '#2ecc71';
    healthFill.style.transition = 'width 0.3s, background-color 0.3s';
    healthBar.appendChild(healthFill);
  }
  

  // Create game over screen
  let gameOver = document.getElementById('game-over');
  if (!gameOver) {
    gameOver = document.createElement('div');
    gameOver.id = 'game-over';
    gameOver.style.position = 'absolute';
    gameOver.style.top = '50%';
    gameOver.style.left = '50%';
    gameOver.style.transform = 'translate(-50%, -50%)';
    gameOver.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOver.style.color = 'white';
    gameOver.style.padding = '30px';
    gameOver.style.borderRadius = '10px';
    gameOver.style.textAlign = 'center';
    gameOver.style.display = 'none';
    gameOver.style.zIndex = '1000';
    document.body.appendChild(gameOver);

    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = 'Game Over';
    gameOver.appendChild(gameOverTitle);

    const scoreText = document.createElement('p');
    scoreText.textContent = 'Your Score: ';
    const finalScore = document.createElement('span');
    finalScore.id = 'final-score';
    finalScore.textContent = '0';
    scoreText.appendChild(finalScore);
    gameOver.appendChild(scoreText);

    const highScoreText = document.createElement('p');
    highScoreText.textContent = 'High Score: ';
    const highScore = document.createElement('span');
    highScore.id = 'high-score';
    highScore.textContent = '0';
    highScoreText.appendChild(highScore);
    gameOver.appendChild(highScoreText);

    const restartButton = document.createElement('button');
    restartButton.id = 'restart-button';
    restartButton.textContent = 'Play Again';
    restartButton.style.padding = '10px 20px';
    restartButton.style.backgroundColor = '#2ecc71';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.color = 'white';
    restartButton.style.fontSize = '16px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.marginTop = '20px';
    gameOver.appendChild(restartButton);
  }

  
}

// Global game instance
let game: Game;

// Function to handle restart button click
function handleRestartClick() {
  const gameOverElement = document.getElementById('game-over');
  if (gameOverElement) {
    gameOverElement.style.display = 'none';
  }
  
  if (game) {
    game.restart();
  }
}

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  // Create UI elements
  createUIElements();

  // Add direct event listener to restart button
  document.body.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target && target.id === 'restart-button') {
      handleRestartClick();
    }
  });

  // Initialize the game
  game = new Game();
  game.initialize();

  // Start the game
  game.start();

  // Handle game over
  game.onGameOver = (score: number) => {
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const highScoreElement = document.getElementById('high-score');
    
    if (gameOverElement && finalScoreElement && highScoreElement) {
      // Show game over screen
      gameOverElement.style.display = 'block';
      
      // Update score display
      finalScoreElement.textContent = score.toString();
      
      // Get high score from localStorage
      let highScore = parseInt(localStorage.getItem('tankGameHighScore') || '0');
      
      // Update high score if current score is higher
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('tankGameHighScore', highScore.toString());
      }
      
      highScoreElement.textContent = highScore.toString();
    }
  };

  // Handle window resize
  window.addEventListener('resize', () => {
    // Game handles resize internally
  });
});
