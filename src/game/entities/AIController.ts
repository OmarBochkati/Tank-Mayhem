import * as THREE from 'three';
import { Tank } from './Tank';
import { Obstacle } from '../environment/Obstacle';
import { DifficultyLevel } from '../core/GameState';

export class AIController {
  private tank: Tank;
  private playerTank: Tank;
  private obstacles: Obstacle[];
  
  private state: 'idle' | 'chase' | 'attack' | 'retreat' = 'chase';
  private stateTimer: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Shooting parameters
  private shootTimer: number = 0;
  private shootCooldown: number = 2; // Base cooldown between shots
  private shootProbability: number = 0.7; // Probability to shoot when conditions are met
  private shootingEnabled: boolean = true; // Flag to enable/disable shooting
  
  // AI difficulty parameters
  private difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
  private detectionRange: number = 40;
  private attackRange: number = 25;
  private retreatHealth: number = 30;
  private minDistance: number = 15;
  private aimAccuracy: number = 0.2; // Lower is more accurate
  
  // Arena boundaries - adding these to prevent tanks from drifting out
  private readonly ARENA_BOUNDS = {
    minX: -48, // Slightly inside the actual arena bounds to account for tank radius
    maxX: 48,
    minZ: -48,
    maxZ: 48
  };
  
  constructor(tank: Tank, playerTank: Tank, obstacles: Obstacle[]) {
    this.tank = tank;
    this.playerTank = playerTank;
    this.obstacles = obstacles;
    
    // Set initial state
    this.changeState('idle');
    
    // Randomize initial shoot timer to prevent all tanks from shooting at once
    this.shootTimer = Math.random() * this.shootCooldown;
  }
  
  public setDifficulty(difficulty: DifficultyLevel): void {
    this.difficulty = difficulty;
    
    // Adjust AI parameters based on difficulty
    switch (difficulty) {
      case DifficultyLevel.EASY:
        this.detectionRange = 30;
        this.attackRange = 20;
        this.retreatHealth = 40;
        this.minDistance = 18;
        this.shootCooldown = 3;
        this.shootProbability = 0.5;
        this.aimAccuracy = 0.4; // Less accurate
        break;
        
      case DifficultyLevel.MEDIUM:
        this.detectionRange = 40;
        this.attackRange = 25;
        this.retreatHealth = 30;
        this.minDistance = 15;
        this.shootCooldown = 2;
        this.shootProbability = 0.7;
        this.aimAccuracy = 0.2; // Default accuracy
        break;
        
      case DifficultyLevel.HARD:
        this.detectionRange = 50;
        this.attackRange = 30;
        this.retreatHealth = 25;
        this.minDistance = 12;
        this.shootCooldown = 1.5;
        this.shootProbability = 0.8;
        this.aimAccuracy = 0.1; // More accurate
        break;
        
      case DifficultyLevel.INSANE:
        this.detectionRange = 60;
        this.attackRange = 40;
        this.retreatHealth = 20;
        this.minDistance = 10;
        this.shootCooldown = 1;
        this.shootProbability = 0.9;
        this.aimAccuracy = 0.05; // Very accurate
        break;
    }
  }
  
  public update(deltaTime: number): void {
    // Update state timer
    this.stateTimer -= deltaTime;
    
    // Update shoot timer
    this.shootTimer -= deltaTime;
    
    // Get distance to player
    const distanceToPlayer = this.getDistanceToPlayer();
    
    // Check if we need to change state
    this.updateState(distanceToPlayer);
    
    // Execute current state behavior
    switch (this.state) {
      case 'idle':
        this.executeIdleState(deltaTime);
        break;
      case 'chase':
        this.executeChaseState(deltaTime);
        break;
      case 'attack':
        this.executeAttackState(deltaTime);
        break;
      case 'retreat':
        this.executeRetreatState(deltaTime);
        break;
    }
    
    // Handle shooting logic
    this.updateShooting(distanceToPlayer);
  }
  
  private updateState(distanceToPlayer: number): void {
    // Check if we need to retreat based on health
    if (this.tank.getHealth() < this.retreatHealth && this.state !== 'retreat') {
      this.changeState('retreat');
      return;
    }
    
    // State transitions based on distance to player
    switch (this.state) {
      case 'idle':
        if (distanceToPlayer < this.detectionRange) {
          this.changeState('chase');
        }
        break;
      case 'chase':
        if (distanceToPlayer < this.attackRange) {
          this.changeState('attack');
        } else if (distanceToPlayer > this.detectionRange) {
          this.changeState('idle');
        }
        break;
      case 'attack':
        if (distanceToPlayer > this.attackRange) {
          this.changeState('chase');
        }
        break;
      case 'retreat':
        if (this.tank.getHealth() > this.retreatHealth * 1.5 && this.stateTimer <= 0) {
          if (distanceToPlayer < this.attackRange) {
            this.changeState('attack');
          } else if (distanceToPlayer < this.detectionRange) {
            this.changeState('chase');
          } else {
            this.changeState('idle');
          }
        }
        break;
    }
  }
  
  private changeState(newState: 'idle' | 'chase' | 'attack' | 'retreat'): void {
    this.state = newState;
    
    // Set state-specific timers and behaviors
    switch (newState) {
      case 'idle':
        this.stateTimer = 2 + Math.random() * 3;
        this.setRandomTargetPosition();
        this.shootingEnabled = false; // Don't shoot in idle state
        break;
      case 'chase':
        this.stateTimer = 0.5;
        this.shootingEnabled = true; // Can shoot while chasing, but less likely
        this.shootProbability = this.difficulty === DifficultyLevel.INSANE ? 0.5 : 0.3;
        break;
      case 'attack':
        this.stateTimer = 0.5;
        this.shootingEnabled = true; // Most likely to shoot in attack state
        this.shootProbability = this.difficulty === DifficultyLevel.EASY ? 0.6 : 0.7;
        this.shootCooldown = this.difficulty === DifficultyLevel.INSANE ? 1 : 1.5; // Shoot more frequently in attack mode
        break;
      case 'retreat':
        this.stateTimer = 5 + Math.random() * 5;
        this.setRetreatPosition();
        this.shootingEnabled = true; // Can shoot while retreating, but less frequently
        this.shootProbability = 0.4;
        this.shootCooldown = 3; // Longer cooldown while retreating
        break;
    }
  }
  
  private executeIdleState(deltaTime: number): void {
    if (this.stateTimer <= 0) {
      this.setRandomTargetPosition();
      this.stateTimer = 2 + Math.random() * 3;
    }
    
    this.moveTowardsTarget(deltaTime);
  }
  
  private executeChaseState(deltaTime: number): void {
    // Update target to player position
    this.targetPosition.copy(this.playerTank.getPosition());
    
    // Keep some distance
    if (this.getDistanceToPlayer() < this.minDistance) {
      this.moveAwayFromTarget(deltaTime);
    } else {
      this.moveTowardsTarget(deltaTime);
    }
  }
  
  private executeAttackState(deltaTime: number): void {
    // Update target to player position
    this.targetPosition.copy(this.playerTank.getPosition());
    
    // Keep optimal attack distance
    const distanceToPlayer = this.getDistanceToPlayer();
    if (distanceToPlayer < this.minDistance) {
      this.moveAwayFromTarget(deltaTime);
    } else if (distanceToPlayer > this.attackRange * 0.8) {
      this.moveTowardsTarget(deltaTime);
    } else {
      // We're at a good distance, just aim at the player
      this.aimAtTarget(deltaTime);
    }
  }
  
  private executeRetreatState(deltaTime: number): void {
    if (this.stateTimer <= 0) {
      this.setRetreatPosition();
      this.stateTimer = 3;
    }
    
    this.moveTowardsTarget(deltaTime);
  }
  
  private updateShooting(distanceToPlayer: number): void {
    // Only attempt to shoot if enabled for current state and cooldown has expired
    if (this.shootingEnabled && this.shootTimer <= 0 && this.tank.canFire()) {
      // Higher probability to shoot when player is closer and we're aimed at them
      let shootChance = this.shootProbability;
      
      // Adjust probability based on distance
      if (distanceToPlayer < this.attackRange * 0.5) {
        shootChance += 0.2; // More likely to shoot when very close
      } else if (distanceToPlayer > this.attackRange) {
        shootChance -= 0.2; // Less likely to shoot when far away
      }
      
      // Adjust probability based on aim
      if (this.isAimedAtTarget()) {
        shootChance += 0.3; // Much more likely to shoot when aimed at player
      } else {
        shootChance -= 0.3; // Much less likely to shoot when not aimed
      }
      
      // Difficulty adjustment
      if (this.difficulty === DifficultyLevel.HARD) {
        shootChance += 0.1;
      } else if (this.difficulty === DifficultyLevel.INSANE) {
        shootChance += 0.2;
      }
      
      // Clamp probability between 0.1 and 0.9
      shootChance = Math.max(0.1, Math.min(0.9, shootChance));
      
      // Random chance to shoot
      if (Math.random() < shootChance) {
        this.tank.fire();
        
        // Set cooldown with some randomness
        this.shootTimer = this.shootCooldown * (0.8 + Math.random() * 0.4);
      } else {
        // If we decided not to shoot, still set a shorter cooldown
        this.shootTimer = 0.5;
      }
    }
  }
  
  private setRandomTargetPosition(): void {
    // Generate a random position within the arena bounds
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    
    // Start with the tank's current position
    const currentPos = this.tank.getPosition();
    
    // Calculate new position
    let x = currentPos.x + Math.cos(angle) * distance;
    let z = currentPos.z + Math.sin(angle) * distance;
    
    // Ensure the target position is within arena bounds
    x = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, x));
    z = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, z));
    
    this.targetPosition.set(x, 0, z);
  }
  
  private setRetreatPosition(): void {
    // Get direction away from player
    const direction = new THREE.Vector3();
    direction.subVectors(this.tank.getPosition(), this.playerTank.getPosition()).normalize();
    
    // Calculate retreat position
    let x = this.tank.getPosition().x + direction.x * (30 + Math.random() * 10);
    let z = this.tank.getPosition().z + direction.z * (30 + Math.random() * 10);
    
    // Ensure the retreat position is within arena bounds
    x = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, x));
    z = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, z));
    
    this.targetPosition.set(x, 0, z);
  }
  
  private moveTowardsTarget(deltaTime: number): void {
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.tank.getPosition()).normalize();
    
    // Calculate angle to target
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = this.tank.getRotation();
    
    // Calculate the difference between angles
    let angleDiff = targetAngle - currentAngle;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Rotate towards target
    if (Math.abs(angleDiff) > 0.1) {
      const rotationAmount = Math.sign(angleDiff) * Math.min(2 * deltaTime, Math.abs(angleDiff));
      this.tank.setRotation(currentAngle + rotationAmount);
    } else {
      // Move forward if facing the target
      const position = this.tank.getPosition();
      const forward = this.tank.getForwardDirection();
      
      // Calculate new position
      let newX = position.x - forward.x * 5 * deltaTime;
      let newZ = position.z - forward.z * 5 * deltaTime;
      
      // Ensure the new position is within arena bounds
      newX = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, newX));
      newZ = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, newZ));
      
      // Update tank position
      this.tank.setPosition(newX, position.y, newZ);
      
      // If we're very close to the target, consider it reached
      const distanceToTarget = this.tank.getPosition().distanceTo(this.targetPosition);
      if (distanceToTarget < 2) {
        if (this.state === 'idle') {
          this.setRandomTargetPosition();
        }
      }
    }
  }
  
  private moveAwayFromTarget(deltaTime: number): void {
    // Calculate direction away from target
    const direction = new THREE.Vector3();
    direction.subVectors(this.tank.getPosition(), this.targetPosition).normalize();
    
    // Calculate angle away from target
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = this.tank.getRotation();
    
    // Calculate the difference between angles
    let angleDiff = targetAngle - currentAngle;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Rotate away from target
    if (Math.abs(angleDiff) > 0.1) {
      const rotationAmount = Math.sign(angleDiff) * Math.min(2 * deltaTime, Math.abs(angleDiff));
      this.tank.setRotation(currentAngle + rotationAmount);
    } else {
      // Move forward if facing away from the target
      const position = this.tank.getPosition();
      const forward = this.tank.getForwardDirection();
      
      // Calculate new position
      let newX = position.x - forward.x * 5 * deltaTime;
      let newZ = position.z - forward.z * 5 * deltaTime;
      
      // Ensure the new position is within arena bounds
      newX = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, newX));
      newZ = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, newZ));
      
      // Update tank position
      this.tank.setPosition(newX, position.y, newZ);
    }
  }
  
  private aimAtTarget(deltaTime: number): void {
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.tank.getPosition()).normalize();
    
    // Calculate angle to target
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = this.tank.getRotation();
    
    // Calculate the difference between angles
    let angleDiff = targetAngle - currentAngle;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Rotate towards target
    if (Math.abs(angleDiff) > 0.05) {
      const rotationAmount = Math.sign(angleDiff) * Math.min(2 * deltaTime, Math.abs(angleDiff));
      this.tank.setRotation(currentAngle + rotationAmount);
    }
  }
  
  private isAimedAtTarget(): boolean {
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.tank.getPosition()).normalize();
    
    // Calculate angle to target
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = this.tank.getRotation();
    
    // Calculate the difference between angles
    let angleDiff = targetAngle - currentAngle;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Return true if we're aimed at the target
    // Use the aim accuracy parameter which varies by difficulty
    return Math.abs(angleDiff) < this.aimAccuracy;
  }
  
  private getDistanceToPlayer(): number {
    return this.tank.getPosition().distanceTo(this.playerTank.getPosition());
  }
  
  // Method to be called from Game class
  public tryShoot(): boolean {
    if (this.shootingEnabled && this.tank.canFire() && this.isAimedAtTarget()) {
      return true;
    }
    return false;
  }
}
