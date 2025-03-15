import { PowerUpType } from '../entities/PowerUp';
import * as THREE from 'three';

export class UIManager {
  private healthBarElement: HTMLElement | null;
  private healthFillElement: HTMLElement | null;
  private ammoCounterElement: HTMLElement | null;
  private timerElement: HTMLElement | null;
  private scoreElement: HTMLElement | null;
  
  constructor() {
    this.healthBarElement = document.getElementById('health-bar');
    this.healthFillElement = document.getElementById('health-fill');
    this.ammoCounterElement = document.getElementById('ammo-counter');
    this.timerElement = document.getElementById('timer');
    this.scoreElement = document.getElementById('score');
  }
  
  public updateHealth(health: number): void {
    if (!this.healthFillElement) return;
    
    const percentage = Math.max(0, Math.min(100, health));
    this.healthFillElement.style.width = `${percentage}%`;
    
    // Change color based on health
    if (percentage > 60) {
      this.healthFillElement.style.backgroundColor = '#2ecc71'; // Green
    } else if (percentage > 30) {
      this.healthFillElement.style.backgroundColor = '#f39c12'; // Orange
    } else {
      this.healthFillElement.style.backgroundColor = '#e74c3c'; // Red
    }
  }
  
  public updateAmmo(current: number, max: number): void {
    if (!this.ammoCounterElement) return;
    this.ammoCounterElement.textContent = `Ammo: ${current}/${max}`;
  }
  
  public updateTimer(seconds: number): void {
    if (!this.timerElement) return;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedTime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    this.timerElement.textContent = `Time: ${formattedTime}`;
  }
  
  public updateScore(score: number): void {
    if (!this.scoreElement) return;
    this.scoreElement.textContent = `Score: ${score}`;
  }
  
  public startTimer(): void {
    if (!this.timerElement) return;
    this.timerElement.textContent = 'Time: 0:00';
  }
  
  public reset(): void {
    this.updateHealth(100);
    this.updateAmmo(5, 5);
    if (this.timerElement) this.timerElement.textContent = 'Time: 0:00';
    this.updateScore(0);
  }
  
  public showScorePopup(text: string, position: THREE.Vector3): void {
    // Create a floating score popup
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    
    // Style the popup
    popup.style.position = 'absolute';
    popup.style.color = '#ffff00';
    popup.style.fontSize = '20px';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '2px 2px 2px rgba(0, 0, 0, 0.5)';
    popup.style.pointerEvents = 'none';
    
    // Convert 3D position to screen coordinates (simplified)
    // In a real implementation, you would use camera.project() to get accurate screen coordinates
    const screenX = (position.x / 100 + 0.5) * window.innerWidth;
    const screenY = (-position.z / 100 + 0.5) * window.innerHeight;
    
    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;
    
    // Add to document
    document.body.appendChild(popup);
    
    // Animate the popup
    let opacity = 1;
    let posY = screenY;
    
    const animatePopup = () => {
      opacity -= 0.02;
      posY -= 1;
      
      popup.style.opacity = opacity.toString();
      popup.style.top = `${posY}px`;
      
      if (opacity > 0) {
        requestAnimationFrame(animatePopup);
      } else {
        document.body.removeChild(popup);
      }
    };
    
    requestAnimationFrame(animatePopup);
  }
  
  public showPowerUpMessage(type: PowerUpType): void {
    let message = '';
    let color = '';
    
    switch (type) {
      case PowerUpType.HEALTH:
        message = 'Health Restored!';
        color = '#2ecc71'; // Green
        break;
      case PowerUpType.AMMO:
        message = 'Ammo Replenished!';
        color = '#f39c12'; // Orange
        break;
      case PowerUpType.SPEED:
        message = 'Speed Boost!';
        color = '#3498db'; // Blue
        break;
      case PowerUpType.DAMAGE:
        message = 'Damage Increased!';
        color = '#e74c3c'; // Red
        break;
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'powerup-message';
    messageElement.textContent = message;
    
    // Style the message
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.color = color;
    messageElement.style.fontSize = '32px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    messageElement.style.pointerEvents = 'none';
    messageElement.style.zIndex = '1000';
    
    // Add to document
    document.body.appendChild(messageElement);
    
    // Animate the message
    let opacity = 1;
    let scale = 1;
    
    const animateMessage = () => {
      opacity -= 0.02;
      scale += 0.01;
      
      messageElement.style.opacity = opacity.toString();
      messageElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      if (opacity > 0) {
        requestAnimationFrame(animateMessage);
      } else {
        document.body.removeChild(messageElement);
      }
    };
    
    // Start animation after a short delay
    setTimeout(() => {
      requestAnimationFrame(animateMessage);
    }, 500);
  }
}
