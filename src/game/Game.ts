import * as THREE from 'three';
import { Tank } from './entities/Tank';
import { Arena } from './environment/Arena';
import { InputManager } from './core/InputManager';
import { PhysicsEngine } from './core/PhysicsEngine';
import { GameState, GameMode } from './core/GameState';
import { AIController } from './entities/AIController';
import { Projectile } from './entities/Projectile';
import { Obstacle } from './environment/Obstacle';
import { PowerUp } from './entities/PowerUp';
import { UIManager } from './ui/UIManager';
import { ExplosionEffect } from './effects/ExplosionEffect';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  private arena: Arena;
  private playerTank: Tank;
  private enemyTanks: Tank[] = [];
  private obstacles: Obstacle[] = [];
  private projectiles: Projectile[] = [];
  private powerUps: PowerUp[] = [];
  private explosions: ExplosionEffect[] = [];
  
  private inputManager: InputManager;
  private physicsEngine: PhysicsEngine;
  private gameState: GameState;
  private uiManager: UIManager;
  
  private aiControllers: AIController[] = [];
  
  // Arena boundaries
  private arenaBounds = {
    minX: -50,
    maxX: 50,
    minZ: -50,
    maxZ: 50
  };
  
  // Scoring constants
  private readonly POINTS_PER_ENEMY_TANK = 100;
  private readonly POINTS_PER_OBSTACLE = 10;
  
  // Game settings
  private respawnEnemyDelay: number = 5; // seconds
  private respawnEnemyTimer: number = 0;
  private maxEnemyTanks: number = 5;
  private powerUpSpawnInterval: number = 15; // seconds
  private powerUpTimer: number = 10; // Start first power-up after 10 seconds
  
  public onGameOver: (score: number) => void = () => {};
  
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();
    
    this.inputManager = new InputManager();
    this.physicsEngine = new PhysicsEngine();
    this.gameState = new GameState();
    this.uiManager = new UIManager();
    
    this.arena = new Arena(this.scene, 100, 100);
    this.playerTank = new Tank(this.scene, 0, 0, 0);
  }
  
  public initialize(): void {
    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);
    
    // Set up camera
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);
    
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Initialize arena
    this.arena.initialize();
    
    // Initialize player tank
    this.playerTank.initialize();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Initialize input manager
    this.inputManager.initialize();
    
    // Start animation loop
    this.animate();
  }
  
  public start(): void {
    this.gameState.setGameMode(GameMode.SINGLE_PLAYER);
    this.gameState.startGame();
    
    // Reset player tank
    this.playerTank.reset();
    
    // Create enemy tanks
    this.createEnemyTanks(3);
    
    // Create obstacles
    this.createObstacles(10);
    
    // Start the game timer
    this.uiManager.startTimer();
    
    // Reset timers
    this.respawnEnemyTimer = this.respawnEnemyDelay;
    this.powerUpTimer = 10;
  }
  
  public restart(): void {
    // Clear all entities
    this.reset();
    
    // Recreate player tank if it was destroyed
    if (!this.playerTank || !this.scene.getObjectById(this.playerTank.getMeshId())) {
      this.playerTank = new Tank(this.scene, 0, 0, 0);
      this.playerTank.initialize();
    }
    
    // Start the game again
    this.start();
  }
  
  public reset(): void {
    // Clear all entities
    this.enemyTanks.forEach(tank => tank.destroy());
    this.enemyTanks = [];
    
    this.aiControllers = [];
    
    this.obstacles.forEach(obstacle => obstacle.destroy());
    this.obstacles = [];
    
    this.projectiles.forEach(projectile => projectile.destroy());
    this.projectiles = [];
    
    this.powerUps.forEach(powerUp => powerUp.destroy());
    this.powerUps = [];
    
    this.explosions.forEach(explosion => explosion.destroy());
    this.explosions = [];
    
    // Reset game state
    this.gameState.reset();
    
    // Reset UI
    this.uiManager.reset();
  }
  
  private createEnemyTanks(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnEnemyTank();
    }
  }
  
  private spawnEnemyTank(): void {
    // Find a position away from the player and other tanks
    let x, z;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 20) {
      x = (Math.random() - 0.5) * 80;
      z = (Math.random() - 0.5) * 80;
      
      // Check distance from player
      const distToPlayer = Math.sqrt(
        Math.pow(x - this.playerTank.getPosition().x, 2) +
        Math.pow(z - this.playerTank.getPosition().z, 2)
      );
      
      // Ensure tank is at least 20 units away from player
      if (distToPlayer > 20) {
        validPosition = true;
        
        // Check distance from other tanks
        for (const tank of this.enemyTanks) {
          const distToTank = Math.sqrt(
            Math.pow(x - tank.getPosition().x, 2) +
            Math.pow(z - tank.getPosition().z, 2)
          );
          
          if (distToTank < 10) {
            validPosition = false;
            break;
          }
        }
      }
      
      attempts++;
    }
    
    // If we couldn't find a valid position, use a fallback
    if (!validPosition) {
      x = (Math.random() - 0.5) * 80;
      z = (Math.random() - 0.5) * 80;
    }
    
    const tank = new Tank(this.scene, x, 0, z);
    tank.initialize();
    tank.setColor(0xff0000);
    
    this.enemyTanks.push(tank);
    
    // Create AI controller for this tank
    const aiController = new AIController(tank, this.playerTank, this.obstacles);
    this.aiControllers.push(aiController);
  }
  
  private createObstacles(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      const size = 2 + Math.random() * 5;
      
      const obstacle = new Obstacle(this.scene, x, 0, z, size);
      obstacle.initialize();
      
      this.obstacles.push(obstacle);
    }
  }
  
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = this.clock.getDelta();
    
    if (this.gameState.isGameRunning()) {
      // Update timers
      this.updateTimers(deltaTime);
      
      // Store previous position of player tank for collision detection
      const prevPlayerPosition = this.playerTank.getPosition().clone();
      
      // Update player tank - pass the camera to the tank
      this.playerTank.update(deltaTime, this.inputManager, this.camera);
      
      // Check for collisions with arena boundaries
      this.enforceArenaBoundaries(this.playerTank);
      
      // Check for collisions with obstacles and other tanks
      if (this.checkTankCollisions(this.playerTank, [...this.enemyTanks], this.obstacles)) {
        // If collision detected, revert to previous position
        this.playerTank.setPosition(prevPlayerPosition.x, prevPlayerPosition.y, prevPlayerPosition.z);
      }
      
      // Check for fire input
      if (this.inputManager.getFireInput()) {
        this.fireProjectile(this.playerTank);
      }
      
      // Update enemy tanks with collision detection
      this.enemyTanks.forEach((tank, index) => {
        // Check if tank is destroyed
        if (tank.getHealth() <= 0) {
          this.destroyEnemyTank(index);
          return;
        }
        
        const prevPosition = tank.getPosition().clone();
        
        // Pass camera to enemy tanks for health bar billboarding
        tank.update(deltaTime, undefined, this.camera);
        
        // Check for arena boundaries
        this.enforceArenaBoundaries(tank);
        
        // Check for collisions with obstacles and other tanks (including player)
        const otherTanks = [this.playerTank, ...this.enemyTanks.filter(t => t !== tank)];
        if (this.checkTankCollisions(tank, otherTanks, this.obstacles)) {
          // If collision detected, revert to previous position
          tank.setPosition(prevPosition.x, prevPosition.y, prevPosition.z);
        }
      });
      
      // Update AI controllers
      this.aiControllers.forEach((controller, index) => {
        if (index < this.enemyTanks.length) {
          controller.update(deltaTime);
        }
      });
      
      // Update projectiles
      this.updateProjectiles(deltaTime);
      
      // Update power-ups
      this.updatePowerUps(deltaTime);
      
      // Update explosions
      this.updateExplosions(deltaTime);
      
      // Check for game over conditions
      if (this.playerTank.getHealth() <= 0) {
        this.createExplosion(this.playerTank.getPosition(), 5);
        this.playerTank.destroy();
        this.gameState.endGame();
        this.onGameOver(this.gameState.getScore());
      }
      
      // Update UI
      this.uiManager.updateHealth(this.playerTank.getHealth());
      this.uiManager.updateAmmo(this.playerTank.getCurrentAmmo(), this.playerTank.getMaxAmmo());
      this.uiManager.updateScore(this.gameState.getScore());
      this.uiManager.updateTimer(this.gameState.getElapsedTime());
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  private updateTimers(deltaTime: number): void {
    // Update enemy respawn timer
    if (this.enemyTanks.length < this.maxEnemyTanks) {
      this.respawnEnemyTimer -= deltaTime;
      if (this.respawnEnemyTimer <= 0) {
        this.spawnEnemyTank();
        this.respawnEnemyTimer = this.respawnEnemyDelay;
      }
    }
    
    // Update power-up spawn timer
    this.powerUpTimer -= deltaTime;
    if (this.powerUpTimer <= 0) {
      this.spawnPowerUp();
      this.powerUpTimer = this.powerUpSpawnInterval;
    }
  }
  
  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime);
      
      // Check for collisions
      const collisionResult = this.physicsEngine.checkProjectileCollisions(
        projectile, 
        [this.playerTank, ...this.enemyTanks], 
        this.obstacles
      );
      
      if (collisionResult.hasCollided) {
        // Create explosion effect at collision point
        this.createExplosion(projectile.getPosition(), 1);
        
        // Handle tank hit
        if (collisionResult.hitTank) {
          const hitTank = collisionResult.hitTank;
          
          // Check if tank was destroyed
          if (hitTank.getHealth() <= 0) {
            // If player hit an enemy tank
            if (projectile.getSourceId() === this.playerTank.getId() && 
                this.enemyTanks.includes(hitTank)) {
              // Award points
              this.gameState.addScore(this.POINTS_PER_ENEMY_TANK);
              
              // Update UI
              this.uiManager.updateScore(this.gameState.getScore());
              
              // Show score popup
              this.uiManager.showScorePopup(
                `+${this.POINTS_PER_ENEMY_TANK}`, 
                hitTank.getPosition()
              );
            }
          }
        }
        
        // Handle obstacle hit
        if (collisionResult.hitObstacle) {
          const hitObstacle = collisionResult.hitObstacle;
          
          // Check if obstacle was destroyed
          if (hitObstacle.getHealth() <= 0) {
            // If player destroyed the obstacle
            if (projectile.getSourceId() === this.playerTank.getId()) {
              // Award points
              this.gameState.addScore(this.POINTS_PER_OBSTACLE);
              
              // Update UI
              this.uiManager.updateScore(this.gameState.getScore());
              
              // Show score popup
              this.uiManager.showScorePopup(
                `+${this.POINTS_PER_OBSTACLE}`, 
                hitObstacle.getPosition()
              );
            }
            
            // Remove obstacle
            const obstacleIndex = this.obstacles.indexOf(hitObstacle);
            if (obstacleIndex !== -1) {
              hitObstacle.destroy();
              this.obstacles.splice(obstacleIndex, 1);
            }
          }
        }
        
        // Remove projectile
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  private updatePowerUps(deltaTime: number): void {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.update(deltaTime);
      
      // Check for collisions with player
      if (this.physicsEngine.checkPowerUpCollision(powerUp, this.playerTank)) {
        powerUp.applyEffect(this.playerTank);
        
        // Show effect message
        this.uiManager.showPowerUpMessage(powerUp.getType());
        
        // Remove power-up
        powerUp.destroy();
        this.powerUps.splice(i, 1);
      }
    }
  }
  
  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i];
      
      if (explosion.update(deltaTime)) {
        // Explosion is finished, remove it
        explosion.destroy();
        this.explosions.splice(i, 1);
      }
    }
  }
  
  private destroyEnemyTank(index: number): void {
    if (index >= 0 && index < this.enemyTanks.length) {
      const tank = this.enemyTanks[index];
      
      // Create explosion effect
      this.createExplosion(tank.getPosition(), 3);
      
      // Remove tank and AI controller
      tank.destroy();
      this.enemyTanks.splice(index, 1);
      this.aiControllers.splice(index, 1);
    }
  }
  
  private createExplosion(position: THREE.Vector3, size: number): void {
    const explosion = new ExplosionEffect(this.scene, position, size);
    explosion.initialize();
    this.explosions.push(explosion);
    
    // Play explosion sound
    // this.audioManager.playSound('explosion'); // Would be implemented in a real audio system
  }
  
  // Check if a tank collides with any obstacles or other tanks
  private checkTankCollisions(tank: Tank, otherTanks: Tank[], obstacles: Obstacle[]): boolean {
    return this.physicsEngine.checkTankCollision(tank, obstacles, otherTanks);
  }
  
  // Keep tanks within arena boundaries
  private enforceArenaBoundaries(tank: Tank): void {
    const position = tank.getPosition();
    const radius = tank.getRadius();
    
    // Check X boundaries
    if (position.x - radius < this.arenaBounds.minX) {
      tank.setPosition(this.arenaBounds.minX + radius, position.y, position.z);
    } else if (position.x + radius > this.arenaBounds.maxX) {
      tank.setPosition(this.arenaBounds.maxX - radius, position.y, position.z);
    }
    
    // Check Z boundaries
    if (position.z - radius < this.arenaBounds.minZ) {
      tank.setPosition(position.x, position.y, this.arenaBounds.minZ + radius);
    } else if (position.z + radius > this.arenaBounds.maxZ) {
      tank.setPosition(position.x, position.y, this.arenaBounds.maxZ - radius);
    }
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Methods to be called from outside
  public fireProjectile(tank: Tank): void {
    if (tank.canFire()) {
      const projectile = new Projectile(this.scene, tank);
      projectile.initialize();
      this.projectiles.push(projectile);
      tank.fire();
    }
  }
  
  public spawnPowerUp(): void {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    
    const powerUp = new PowerUp(this.scene, x, 0, z);
    powerUp.initialize();
    
    this.powerUps.push(powerUp);
  }
}
