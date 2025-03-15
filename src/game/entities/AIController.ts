import * as THREE from 'three';
import { Tank } from './Tank';
import { Obstacle } from '../environment/Obstacle';

export class AIController {
  private tank: Tank;
  private playerTank: Tank;
  private obstacles: Obstacle[];
  
  private state: 'idle' | 'chase' | 'attack' | 'retreat' = 'idle';
  private stateTimer: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Shooting parameters
  private shootTimer: number = 0;
  private shootCooldown: number = 2; // Base cooldown between shots
  private shootProbability: number = 0.7; // Probability to shoot when conditions are met
  private shootingEnabled: boolean = true; // Flag to enable/disable shooting
  
  private readonly DETECTION_RANGE: number = 40;
  private readonly ATTACK_RANGE: number = 25;
  private readonly RETREAT_HEALTH: number = 30;
  private readonly MIN_DISTANCE: number = 15;
  
  constructor(tank: Tank, playerTank: Tank, obstacles: Obstacle[]) {
    this.tank = tank;
    this.playerTank = playerTank;
    this.obstacles = obstacles;
    
    // Set initial state
    this.changeState('idle');
    
    // Randomize initial shoot timer to prevent all tanks from shooting at once
    this.shootTimer = Math.random() * this.shootCooldown;
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
    if (this.tank.getHealth() < this.RETREAT_HEALTH && this.state !== 'retreat') {
      this.changeState('retreat');
      return;
    }
    
    // State transitions based on distance to player
    switch (this.state) {
      case 'idle':
        if (distanceToPlayer < this.DETECTION_RANGE) {
          this.changeState('chase');
        }
        break;
      case 'chase':
        if (distanceToPlayer < this.ATTACK_RANGE) {
          this.changeState('attack');
        } else if (distanceToPlayer > this.DETECTION_RANGE) {
          this.changeState('idle');
        }
        break;
      case 'attack':
        if (distanceToPlayer > this.ATTACK_RANGE) {
          this.changeState('chase');
        }
        break;
      case 'retreat':
        if (this.tank.getHealth() > this.RETREAT_HEALTH * 1.5 && this.stateTimer <= 0) {
          if (distanceToPlayer < this.ATTACK_RANGE) {
            this.changeState('attack');
          } else if (distanceToPlayer < this.DETECTION_RANGE) {
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
        this.shootProbability = 0.3;
        break;
      case 'attack':
        this.stateTimer = 0.5;
        this.shootingEnabled = true; // Most likely to shoot in attack state
        this.shootProbability = 0.7;
        this.shootCooldown = 1.5; // Shoot more frequently in attack mode
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
    if (this.getDistanceToPlayer() < this.MIN_DISTANCE) {
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
    if (distanceToPlayer < this.MIN_DISTANCE) {
      this.moveAwayFromTarget(deltaTime);
    } else if (distanceToPlayer > this.ATTACK_RANGE * 0.8) {
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
      if (distanceToPlayer < this.ATTACK_RANGE * 0.5) {
        shootChance += 0.2; // More likely to shoot when very close
      } else if (distanceToPlayer > this.ATTACK_RANGE) {
        shootChance -= 0.2; // Less likely to shoot when far away
      }
      
      // Adjust probability based on aim
      if (this.isAimedAtTarget()) {
        shootChance += 0.3; // Much more likely to shoot when aimed at player
      } else {
        shootChance -= 0.3; // Much less likely to shoot when not aimed
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
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    
    this.targetPosition.set(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
  }
  
  private setRetreatPosition(): void {
    // Get direction away from player
    const direction = new THREE.Vector3();
    direction.subVectors(this.tank.getPosition(), this.playerTank.getPosition()).normalize();
    
    // Set target position away from player
    this.targetPosition.copy(this.tank.getPosition()).add(
      direction.multiplyScalar(30 + Math.random() * 20)
    );
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
      
      position.x -= forward.x * 5 * deltaTime;
      position.z -= forward.z * 5 * deltaTime;
      
      this.tank.setPosition(position.x, position.y, position.z);
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
      
      position.x -= forward.x * 5 * deltaTime;
      position.z -= forward.z * 5 * deltaTime;
      
      this.tank.setPosition(position.x, position.y, position.z);
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
    return Math.abs(angleDiff) < 0.2;
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
