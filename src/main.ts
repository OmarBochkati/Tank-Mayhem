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
    healthBar.style.bottom = '20px';
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

  // Create ammo counter
  let ammoCounter = document.getElementById('ammo-counter');
  if (!ammoCounter) {
    ammoCounter = document.createElement('div');
    ammoCounter.id = 'ammo-counter';
    ammoCounter.style.position = 'absolute';
    ammoCounter.style.bottom = '50px';
    ammoCounter.style.left = '20px';
    ammoCounter.style.color = 'white';
    ammoCounter.style.fontSize = '18px';
    ammoCounter.style.fontFamily = 'Arial, sans-serif';
    ammoCounter.textContent = 'Ammo: 5/5';
    document.body.appendChild(ammoCounter);
  }

  // Create timer
  let timer = document.getElementById('timer');
  if (!timer) {
    timer = document.createElement('div');
    timer.id = 'timer';
    timer.style.position = 'absolute';
    timer.style.top = '20px';
    timer.style.right = '20px';
    timer.style.color = 'white';
    timer.style.fontSize = '18px';
    timer.style.fontFamily = 'Arial, sans-serif';
    timer.textContent = 'Time: 0:00';
    document.body.appendChild(timer);
  }

  // Create score display
  let score = document.getElementById('score');
  if (!score) {
    score = document.createElement('div');
    score.id = 'score';
    score.style.position = 'absolute';
    score.style.top = '20px';
    score.style.left = '20px';
    score.style.color = 'white';
    score.style.fontSize = '24px';
    score.style.fontFamily = 'Arial, sans-serif';
    score.textContent = 'Score: 0';
    document.body.appendChild(score);
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

  // Create controls legend
  let controls = document.getElementById('controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'controls';
    controls.style.position = 'absolute';
    controls.style.bottom = '20px';
    controls.style.right = '20px';
    controls.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    controls.style.color = 'white';
    controls.style.padding = '10px';
    controls.style.borderRadius = '5px';
    controls.style.fontFamily = 'Arial, sans-serif';
    controls.style.fontSize = '14px';
    controls.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>W, S, A, D - Move tank</p>
      <p>Mouse - Aim turret</p>
      <p>Left Click/Space - Fire</p>
    `;
    document.body.appendChild(controls);
  }
}

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  // Create UI elements
  createUIElements();

  // Initialize the game
  const game = new Game();
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
      const highScore = localStorage.getItem('tankGameHighScore') || '0';
      highScoreElement.textContent = highScore;
      
      // Handle restart button
      const restartButton = document.getElementById('restart-button');
      if (restartButton) {
        restartButton.onclick = () => {
          gameOverElement.style.display = 'none';
          game.restart();
        };
      }
    }
  };

  // Handle window resize
  window.addEventListener('resize', () => {
    // Game handles resize internally
  });
});
