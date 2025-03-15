import * as THREE from 'three';
import { Tank } from './Tank';
import { Obstacle } from '../environment/Obstacle';

export class AIController {
  private tank: Tank;
  private targetTank: Tank;
  private obstacles: Obstacle[];
  
  private moveTimer: number = 0;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private rotationDirection: number = 0;
  
  private fireTimer: number = 0;
  private fireDelay: number = 2;
  
  private detectionRange: number = 30;
  private firingRange: number = 20;
  
  constructor(tank: Tank, targetTank: Tank, obstacles: Obstacle[]) {
    this.tank = tank;
    this.targetTank = targetTank;
    this.obstacles = obstacles;
    
    // Initialize with random movement
    this.setRandomMovement();
  }
  
  public update(deltaTime: number): void {
    // Update timers
    this.moveTimer -= deltaTime;
    this.fireTimer -= deltaTime;
    
    // Check if it's time to change movement
    if (this.moveTimer <= 0) {
      this.setRandomMovement();
    }
    
    // Get distance to target
    const targetPosition = this.targetTank.getPosition();
    const tankPosition = this.tank.getPosition();
    const distanceToTarget = new THREE.Vector3()
      .subVectors(targetPosition, tankPosition)
      .length();
    
    // If target is within detection range, aim at it
    if (distanceToTarget < this.detectionRange) {
      this.aimAtTarget();
      
      // If within firing range and can fire, shoot
      if (distanceToTarget < this.firingRange && this.fireTimer <= 0 && this.tank.canFire()) {
        this.fireTimer = this.fireDelay;
        this.tank.fire();
      }
    }
    
    // Apply movement
    this.applyMovement(deltaTime);
  }
  
  private setRandomMovement(): void {
    // Set random movement duration between 1-3 seconds
    this.moveTimer = 1 + Math.random() * 2;
    
    // Set random movement direction
    const angle = Math.random() * Math.PI * 2;
    this.moveDirection.set(Math.sin(angle), 0, Math.cos(angle));
    
    // Set random rotation direction (-1 for left, 1 for right, 0 for none)
    this.rotationDirection = Math.floor(Math.random() * 3) - 1;
  }
  
  private aimAtTarget(): void {
    const targetPosition = this.targetTank.getPosition();
    const tankPosition = this.tank.getPosition();
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, tankPosition)
      .normalize();
    
    // Calculate angle to target
    const targetAngle = Math.atan2(direction.x, direction.z);
    
    // Set turret rotation to face target
    this.tank.setTurretRotation(targetAngle);
  }
  
  private applyMovement(deltaTime: number): void {
    // Apply rotation
    if (this.rotationDirection !== 0) {
      const currentRotation = this.tank.getRotation();
      this.tank.setRotation(currentRotation + this.rotationDirection * deltaTime);
    }
    
    // Apply movement - simplified for AI
    const currentPosition = this.tank.getPosition();
    const moveAmount = 5 * deltaTime; // Speed factor
    
    // Calculate new position
    const newPosition = new THREE.Vector3(
      currentPosition.x + this.moveDirection.x * moveAmount,
      currentPosition.y,
      currentPosition.z + this.moveDirection.z * moveAmount
    );
    
    // Check if new position would be within arena bounds
    const arenaSize = 100; // Should match the arena size
    const tankRadius = this.tank.getRadius();
    
    if (
      Math.abs(newPosition.x) < arenaSize / 2 - tankRadius &&
      Math.abs(newPosition.z) < arenaSize / 2 - tankRadius
    ) {
      // Check for collisions with obstacles
      let collision = false;
      
      for (const obstacle of this.obstacles) {
        const obstaclePosition = obstacle.getPosition();
        const obstacleRadius = obstacle.getRadius();
        
        const distance = new THREE.Vector2(
          newPosition.x - obstaclePosition.x,
          newPosition.z - obstaclePosition.z
        ).length();
        
        if (distance < tankRadius + obstacleRadius) {
          collision = true;
          break;
        }
      }
      
      // If no collision, apply the movement
      if (!collision) {
        this.tank.setPosition(newPosition.x, newPosition.y, newPosition.z);
      } else {
        // If collision, change direction
        this.setRandomMovement();
      }
    } else {
      // If out of bounds, change direction
      this.setRandomMovement();
    }
  }
}
