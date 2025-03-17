import * as THREE from 'three';
import { DifficultyLevel } from '../core/GameState';

export class UIManager {
  private healthElement: HTMLElement | null = null;
  private healthBar: HTMLElement | null = null;
  private healthFill: HTMLElement | null = null;
  private speedElement: HTMLElement | null = null;
  private damageElement: HTMLElement | null = null;
  private ammoElement: HTMLElement | null = null;
  private scoreElement: HTMLElement | null = null;
  private timerElement: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;
  private controlsElement: HTMLElement | null = null;
  private difficultyElement: HTMLElement | null = null;
  
  private startTime: number = 0;
  private scorePopups: { element: HTMLElement, expires: number }[] = [];
  
  constructor() {
    this.createUI();
  }
  
  private createUI(): void {
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '0';
    uiContainer.style.left = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.height = '100%';
    uiContainer.style.pointerEvents = 'none';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    uiContainer.style.zIndex = '10';
    document.body.appendChild(uiContainer);

    // Create health bar	  
    this.healthBar = document.createElement('div');
    this.healthBar.id = 'health-bar';
    this.healthBar.style.position = 'absolute';
    this.healthBar.style.top = '20px';
    this.healthBar.style.left = '20px';
    this.healthBar.style.width = '200px';
    this.healthBar.style.height = '20px';
    this.healthBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.healthBar.style.border = '2px solid white';
    this.healthBar.style.borderRadius = '10px';
    this.healthBar.style.overflow = 'hidden';
    this.healthBar.style.zIndex = '20';
    uiContainer.appendChild(this.healthBar);

    this.healthFill = document.createElement('div');
    this.healthFill.id = 'health-fill';
    this.healthFill.style.width = '100%';
    this.healthFill.style.height = '100%';
    this.healthFill.style.backgroundColor = '#2ecc71';
    this.healthFill.style.transition = 'width 0.3s, background-color 0.3s';
    this.healthBar.appendChild(this.healthFill);
    
    // Create health display
    this.healthElement = document.createElement('div');
    this.healthElement.id = 'health-display';
    this.healthElement.style.position = 'absolute';
    this.healthElement.style.top = '45px';
    this.healthElement.style.left = '20px';
    this.healthElement.style.color = '#fff';
    this.healthElement.style.fontSize = '16px';
    this.healthElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.healthElement);
    
    // Create ammo display
    this.ammoElement = document.createElement('div');
    this.ammoElement.id = 'ammo-display';
    this.ammoElement.style.position = 'absolute';
    this.ammoElement.style.top = '70px';
    this.ammoElement.style.left = '20px';
    this.ammoElement.style.color = '#fff';
    this.ammoElement.style.fontSize = '16px';
    this.ammoElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.ammoElement);
    
    // Create score display
    this.scoreElement = document.createElement('div');
    this.scoreElement.id = 'score-display';
    this.scoreElement.style.position = 'absolute';
    this.scoreElement.style.top = '95px';
    this.scoreElement.style.left = '20px';
    this.scoreElement.style.color = '#fff';
    this.scoreElement.style.fontSize = '16px';
    this.scoreElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.scoreElement);

    // Create damage display
    this.damageElement = document.createElement('div');
    this.damageElement.id = 'damage-display';
    this.damageElement.style.position = 'absolute';
    this.damageElement.style.top = '120px';
    this.damageElement.style.left = '20px';
    this.damageElement.style.color = '#fff';
    this.damageElement.style.fontSize = '16px';
    this.damageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.damageElement);

    // Create speed display
    this.speedElement = document.createElement('div');
    this.speedElement.id = 'speed-display';
    this.speedElement.style.position = 'absolute';
    this.speedElement.style.top = '145px';
    this.speedElement.style.left = '20px';
    this.speedElement.style.color = '#fff';
    this.speedElement.style.fontSize = '16px';
    this.speedElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.speedElement);
    
    // Create timer display
    this.timerElement = document.createElement('div');
    this.timerElement.id = 'timer-display';
    this.timerElement.style.position = 'absolute';
    this.timerElement.style.top = '20px';
    this.timerElement.style.right = '20px';
    this.timerElement.style.color = '#fff';
    this.timerElement.style.fontSize = '16px';
    this.timerElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    uiContainer.appendChild(this.timerElement);
    
    // Create difficulty display
    this.difficultyElement = document.createElement('div');
    this.difficultyElement.id = 'difficulty-display';
    this.difficultyElement.style.position = 'absolute';
    this.difficultyElement.style.top = '45px';
    this.difficultyElement.style.right = '20px';
    this.difficultyElement.style.color = '#fff';
    this.difficultyElement.style.fontSize = '16px';
    this.difficultyElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    this.difficultyElement.textContent = 'Difficulty: Medium';
    uiContainer.appendChild(this.difficultyElement);
    
    // Create message display
    this.messageElement = document.createElement('div');
    this.messageElement.id = 'message-display';
    this.messageElement.style.position = 'absolute';
    this.messageElement.style.top = '50%';
    this.messageElement.style.left = '50%';
    this.messageElement.style.transform = 'translate(-50%, -50%)';
    this.messageElement.style.color = '#fff';
    this.messageElement.style.fontSize = '24px';
    this.messageElement.style.textAlign = 'center';
    this.messageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    this.messageElement.style.opacity = '0';
    this.messageElement.style.transition = 'opacity 0.3s ease-in-out';
    this.messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.messageElement.style.padding = '10px 20px';
    this.messageElement.style.borderRadius = '5px';
    uiContainer.appendChild(this.messageElement);
    
    // Create controls legend
    this.controlsElement = document.createElement('div');
    this.controlsElement.id = 'controls-display';
    this.controlsElement.style.position = 'absolute';
    this.controlsElement.style.bottom = '20px';
    this.controlsElement.style.left = '20px';
    this.controlsElement.style.color = '#fff';
    this.controlsElement.style.fontSize = '14px';
    this.controlsElement.style.textAlign = 'left';
    this.controlsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.controlsElement.style.padding = '10px';
    this.controlsElement.style.borderRadius = '5px';
    this.controlsElement.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
    this.controlsElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Controls:</div>
      <div>W - Move Forward</div>
      <div>S - Move Backward</div>
      <div>A - Turn Left</div>
      <div>D - Turn Right</div>
      <div>Space - Fire</div>
    `;
    uiContainer.appendChild(this.controlsElement);
    
    // Set initial values
    this.updateHealth(100);
    this.updateSpeed(20);
    this.updateDamage(20);
    this.updateAmmo(5, 5);
    this.updateScore(0);
    this.updateTimer(0);
  }

  public updateSpeed(speed: number): void {
    if (this.speedElement) {
      this.speedElement.textContent = `Speed: ${Math.max(0, Math.floor(speed))}`;
    }
  }	

  public updateDamage(damage: number): void {
    if (this.damageElement) {
      this.damageElement.textContent = `Damage: ${Math.max(0, Math.floor(damage))}`;
    }
  }	
  
  public updateHealth(health: number): void {
    if (this.healthElement) {
      this.healthElement.textContent = `Health: ${Math.max(0, Math.floor(health))}`;
      this.healthFill.style.width = `${Math.max(0, Math.floor(health))}%`;
      
      // Change color based on health
      if (health > 60) {
        this.healthElement.style.color = '#2ecc71'; // Green
        this.healthFill.style.backgroundColor = '#2ecc71';
      } else if (health > 30) {
        this.healthElement.style.color = '#f39c12'; // Orange
        this.healthFill.style.backgroundColor = '#f39c12';
      } else {
        this.healthElement.style.color = '#e74c3c'; // Red
        this.healthFill.style.backgroundColor = '#e74c3c';
      }
    }
  }
  
  public updateAmmo(current: number, max: number): void {
    if (this.ammoElement) {
      this.ammoElement.textContent = `Ammo: ${current}/${max}`;
      
      // Change color based on ammo
      if (current === 0) {
        this.ammoElement.style.color = '#e74c3c'; // Red
      } else if (current < max / 2) {
        this.ammoElement.style.color = '#f39c12'; // Orange
      } else {
        this.ammoElement.style.color = '#fff'; // White
      }
    }
  }
  
  public updateScore(score: number): void {
    if (this.scoreElement) {
      this.scoreElement.textContent = `Score: ${score}`;
    }
  }
  
  public updateDifficulty(difficultyName: string): void {
    if (this.difficultyElement) {
      this.difficultyElement.textContent = `Difficulty: ${difficultyName}`;
      
      // Change color based on difficulty
      switch (difficultyName) {
        case 'Easy':
          this.difficultyElement.style.color = '#2ecc71'; // Green
          break;
        case 'Medium':
          this.difficultyElement.style.color = '#3498db'; // Blue
          break;
        case 'Hard':
          this.difficultyElement.style.color = '#f39c12'; // Orange
          break;
        case 'Insane':
          this.difficultyElement.style.color = '#e74c3c'; // Red
          break;
        default:
          this.difficultyElement.style.color = '#fff'; // White
      }
    }
  }
  
  public startTimer(): void {
    this.startTime = Date.now();
  }
  
  public updateTimer(elapsedSeconds?: number): void {
    if (this.timerElement) {
      let seconds: number;
      
      if (elapsedSeconds !== undefined) {
        seconds = elapsedSeconds;
      } else {
        seconds = (Date.now() - this.startTime) / 1000;
      }
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      
      this.timerElement.textContent = `Time: ${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
  }
  
  public showMessage(message: string, duration: number = 3000): void {
    if (this.messageElement) {
      this.messageElement.textContent = message;
      this.messageElement.style.opacity = '1';
      
      setTimeout(() => {
        if (this.messageElement) {
          this.messageElement.style.opacity = '0';
        }
      }, duration);
    }
  }
  
  public showPowerUpMessage(type: string): void {
    let message = '';
    
    switch (type) {
      case 0:
        message = 'Health Restored!';
        break;
      case 1:
        message = 'Ammo Replenished!';
        break;
      case 2:
        message = 'Speed Boost!';
        break;
      case 3:
        message = 'Damage Boost!';
        break;
      default:
        message = `${type} Power-Up Collected!`;
    }
    
    this.showMessage(message, 2000);
  }
  
  public showScorePopup(text: string, position: THREE.Vector3): void {
    // Create a score popup element
    const popup = document.createElement('div');
    popup.textContent = text;
    popup.style.position = 'absolute';
    popup.style.color = '#ffff00';
    popup.style.fontSize = '20px';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
    popup.style.pointerEvents = 'none';
    popup.style.zIndex = '30';
    
    // Convert 3D position to screen coordinates
    // This is a simplified version - in a real game, you'd use a proper 3D to 2D projection
    const screenX = (position.x / 100 + 0.5) * window.innerWidth;
    const screenY = (-position.z / 100 + 0.5) * window.innerHeight;
    
    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;
    popup.style.transform = 'translate(-50%, -50%)';
    
    // Add animation
    popup.style.animation = 'scorePopup 1.5s ease-out';
    
    // Add the popup to the document
    document.body.appendChild(popup);
    
    // Store the popup for cleanup
    const expireTime = Date.now() + 1500;
    this.scorePopups.push({ element: popup, expires: expireTime });
    
    // Clean up expired popups
    this.cleanupScorePopups();
  }
  
  private cleanupScorePopups(): void {
    const now = Date.now();
    
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      if (this.scorePopups[i].expires <= now) {
        document.body.removeChild(this.scorePopups[i].element);
        this.scorePopups.splice(i, 1);
      }
    }
  }
  
  public showGameOver(score: number): void {
    // Create game over container
    const gameOverContainer = document.createElement('div');
    gameOverContainer.id = 'game-over-container';
    gameOverContainer.style.position = 'absolute';
    gameOverContainer.style.top = '0';
    gameOverContainer.style.left = '0';
    gameOverContainer.style.width = '100%';
    gameOverContainer.style.height = '100%';
    gameOverContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverContainer.style.display = 'flex';
    gameOverContainer.style.flexDirection = 'column';
    gameOverContainer.style.justifyContent = 'center';
    gameOverContainer.style.alignItems = 'center';
    gameOverContainer.style.color = '#fff';
    gameOverContainer.style.fontFamily = 'Arial, sans-serif';
    gameOverContainer.style.zIndex = '1000';
    
    // Game over title
    const gameOverTitle = document.createElement('h1');
    gameOverTitle.textContent = 'Game Over';
    gameOverTitle.style.fontSize = '48px';
    gameOverTitle.style.marginBottom = '20px';
    gameOverContainer.appendChild(gameOverTitle);
    
    // Score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.textContent = `Your Score: ${score}`;
    scoreDisplay.style.fontSize = '24px';
    scoreDisplay.style.marginBottom = '30px';
    gameOverContainer.appendChild(scoreDisplay);
    
    // High score display
    const highScore = this.getHighScore();
    if (score > highScore) {
      this.setHighScore(score);
      
      const newHighScoreDisplay = document.createElement('div');
      newHighScoreDisplay.textContent = 'New High Score!';
      newHighScoreDisplay.style.fontSize = '28px';
      newHighScoreDisplay.style.color = '#ffff00';
      newHighScoreDisplay.style.marginBottom = '20px';
      gameOverContainer.appendChild(newHighScoreDisplay);
    } else {
      const highScoreDisplay = document.createElement('div');
      highScoreDisplay.textContent = `High Score: ${highScore}`;
      highScoreDisplay.style.fontSize = '18px';
      highScoreDisplay.style.marginBottom = '30px';
      gameOverContainer.appendChild(highScoreDisplay);
    }
    
    // Difficulty selection for next game
    const difficultyContainer = document.createElement('div');
    difficultyContainer.style.display = 'flex';
    difficultyContainer.style.flexDirection = 'column';
    difficultyContainer.style.alignItems = 'center';
    difficultyContainer.style.marginBottom = '20px';
    
    const difficultyLabel = document.createElement('div');
    difficultyLabel.textContent = 'Select Difficulty:';
    difficultyLabel.style.fontSize = '18px';
    difficultyLabel.style.marginBottom = '10px';
    difficultyContainer.appendChild(difficultyLabel);
    
    const difficultyButtonsContainer = document.createElement('div');
    difficultyButtonsContainer.style.display = 'flex';
    difficultyButtonsContainer.style.gap = '10px';
    
    const createDifficultyButton = (text: string, difficulty: DifficultyLevel, color: string) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.padding = '8px 15px';
      button.style.fontSize = '16px';
      button.style.backgroundColor = color;
      button.style.color = '#fff';
      button.style.border = 'none';
      button.style.borderRadius = '5px';
      button.style.cursor = 'pointer';
      button.style.transition = 'opacity 0.3s';
      button.style.pointerEvents = 'auto';
      
      button.addEventListener('mouseover', () => {
        button.style.opacity = '0.8';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.opacity = '1';
      });
      
      button.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('changeDifficulty', {
          detail: { difficulty }
        }));
      });
      
      return button;
    };
    
    difficultyButtonsContainer.appendChild(createDifficultyButton('Easy', DifficultyLevel.EASY, '#2ecc71'));
    difficultyButtonsContainer.appendChild(createDifficultyButton('Medium', DifficultyLevel.MEDIUM, '#3498db'));
    difficultyButtonsContainer.appendChild(createDifficultyButton('Hard', DifficultyLevel.HARD, '#f39c12'));
    difficultyButtonsContainer.appendChild(createDifficultyButton('Insane', DifficultyLevel.INSANE, '#e74c3c'));
    
    difficultyContainer.appendChild(difficultyButtonsContainer);
    gameOverContainer.appendChild(difficultyContainer);
    
    // Restart button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Play Again';
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '18px';
    restartButton.style.backgroundColor = '#3498db';
    restartButton.style.color = '#fff';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.transition = 'background-color 0.3s';
    restartButton.style.pointerEvents = 'auto';
    
    restartButton.addEventListener('mouseover', () => {
      restartButton.style.backgroundColor = '#2980b9';
    });
    
    restartButton.addEventListener('mouseout', () => {
      restartButton.style.backgroundColor = '#3498db';
    });
    
    restartButton.addEventListener('click', () => {
      document.body.removeChild(gameOverContainer);
      window.dispatchEvent(new Event('restartGame'));
    });
    
    gameOverContainer.appendChild(restartButton);
    
    // Add to document
    document.body.appendChild(gameOverContainer);
    
    // Add CSS for score popup animation
    if (!document.getElementById('score-popup-style')) {
      const style = document.createElement('style');
      style.id = 'score-popup-style';
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
    }
  }
  
  private getHighScore(): number {
    const highScore = localStorage.getItem('tankGameHighScore');
    return highScore ? parseInt(highScore, 10) : 0;
  }
  
  private setHighScore(score: number): void {
    localStorage.setItem('tankGameHighScore', score.toString());
  }
  
  public reset(): void {
    this.updateHealth(100);
    this.updateAmmo(5, 5);
    this.updateScore(0);
    this.updateTimer(0);
    this.updateSpeed(20);
    this.updateDamage(20);
    
    // Clear any score popups
    this.scorePopups.forEach(popup => {
      if (document.body.contains(popup.element)) {
        document.body.removeChild(popup.element);
      }
    });
    this.scorePopups = [];
  }
}
