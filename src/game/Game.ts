import * as THREE from 'three';
import { Tank } from './entities/Tank';
import { Arena } from './environment/Arena';
import { InputManager } from './core/InputManager';
import { PhysicsEngine } from './core/PhysicsEngine';
import { GameState, GameMode, DifficultyLevel } from './core/GameState';
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
  
  // Game settings - these will be adjusted based on difficulty
  private respawnEnemyDelay: number = 5; // seconds
  private respawnEnemyTimer: number = 0;
  private maxEnemyTanks: number = 5;
  private powerUpSpawnInterval: number = 15; // seconds
  private powerUpTimer: number = 10; // Start first power-up after 10 seconds
  private enemyTankHealth: number = 100;
  private enemyTankSpeed: number = 10;
  private enemyTankDamage: number = 20;
  
  public onGameOver: (score: number) => void = () => {};
  
  constructor() {
    this.scene = new THREE.Scene();
    // Create camera with wider field of view to see more of the arena
    this.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    // Set clear color to dark gray to better see arena boundaries
    this.renderer.setClearColor(0x222222);
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);
    
    // Set up camera - position higher and further back to see more of the arena
    this.camera.position.set(0, 60, 60);
    this.camera.lookAt(0, 0, 0);
    
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0x606060); // Brighter ambient light
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 30, 10); // Higher light position
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    // Increase shadow camera frustum to cover more area
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    directionalLight.shadow.camera.far = 130;
    this.scene.add(directionalLight);
    
    // Add a secondary light to better illuminate the bottom of the arena
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.5);
    secondaryLight.position.set(-10, 20, -30);
    this.scene.add(secondaryLight);
    
    // Initialize arena
    this.arena.initialize();
    
    // Initialize player tank
    this.playerTank.initialize();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('restartGame', this.restart.bind(this));
    window.addEventListener('changeDifficulty', (e: CustomEvent) => {
      this.setDifficulty(e.detail.difficulty);
    });
    
    // Initialize input manager
    this.inputManager.initialize();
    
    // Start animation loop
    this.animate();
  }
  
  public start(): void {
    this.gameState.setGameMode(GameMode.SINGLE_PLAYER);
    this.gameState.startGame();
    
    // Apply difficulty settings
    this.applyDifficultySettings();
    
    // Reset player tank
    this.playerTank.reset();
    
    // Create enemy tanks
    this.createEnemyTanks(this.getInitialEnemyCount());
    
    // Create obstacles - adjusted based on difficulty
    this.createObstacles(this.getObstacleCount());
    
    // Start the game timer
    this.uiManager.startTimer();
    
    // Reset timers
    this.respawnEnemyTimer = this.respawnEnemyDelay;
    this.powerUpTimer = 10;
    
    // Show difficulty message
    this.uiManager.showMessage(`Difficulty: ${this.gameState.getDifficultyName()}`, 2000);
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
  
  public setDifficulty(difficulty: DifficultyLevel): void {
    this.gameState.setDifficultyLevel(difficulty);
    
    // If game is already running, apply the new settings
    if (this.gameState.isGameRunning()) {
      this.applyDifficultySettings();
      this.uiManager.showMessage(`Difficulty changed to: ${this.gameState.getDifficultyName()}`, 2000);
    }
  }
  
  private applyDifficultySettings(): void {
    const difficulty = this.gameState.getDifficultyLevel();
    
    switch (difficulty) {
      case DifficultyLevel.EASY:
        this.maxEnemyTanks = 3;
        this.respawnEnemyDelay = 8;
        this.powerUpSpawnInterval = 10;
        this.enemyTankHealth = 80;
        this.enemyTankSpeed = 8;
        this.enemyTankDamage = 15;
        break;
        
      case DifficultyLevel.MEDIUM:
        this.maxEnemyTanks = 5;
        this.respawnEnemyDelay = 5;
        this.powerUpSpawnInterval = 15;
        this.enemyTankHealth = 100;
        this.enemyTankSpeed = 10;
        this.enemyTankDamage = 20;
        break;
        
      case DifficultyLevel.HARD:
        this.maxEnemyTanks = 7;
        this.respawnEnemyDelay = 3;
        this.powerUpSpawnInterval = 20;
        this.enemyTankHealth = 120;
        this.enemyTankSpeed = 12;
        this.enemyTankDamage = 25;
        break;
        
      case DifficultyLevel.INSANE:
        this.maxEnemyTanks = 10;
        this.respawnEnemyDelay = 2;
        this.powerUpSpawnInterval = 30;
        this.enemyTankHealth = 150;
        this.enemyTankSpeed = 15;
        this.enemyTankDamage = 35;
        break;
    }
  }
  
  private getInitialEnemyCount(): number {
    const difficulty = this.gameState.getDifficultyLevel();
    
    switch (difficulty) {
      case DifficultyLevel.EASY:
        return 2;
      case DifficultyLevel.MEDIUM:
        return 3;
      case DifficultyLevel.HARD:
        return 4;
      case DifficultyLevel.INSANE:
        return 6;
      default:
        return 3;
    }
  }
  
  private getObstacleCount(): number {
    const difficulty = this.gameState.getDifficultyLevel();
    
    switch (difficulty) {
      case DifficultyLevel.EASY:
        return 4;
      case DifficultyLevel.MEDIUM:
        return 6;
      case DifficultyLevel.HARD:
        return 8;
      case DifficultyLevel.INSANE:
        return 10;
      default:
        return 6;
    }
  }
  
  private createEnemyTanks(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnEnemyTank();
    }
    
    // Update each AI controller with references to all other tanks
    this.updateAITankReferences();
  }
  
  private updateAITankReferences(): void {
    // Provide each AI controller with references to all tanks for tactical spacing
    this.aiControllers.forEach(controller => {
      controller.setOtherTanks([...this.enemyTanks, this.playerTank]);
    });
  }
  
  private spawnEnemyTank(): void {
    // Find a position away from the player and other tanks
    let x, z;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 20) {
      // Prioritize central area for spawning
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 20; // Keep away from center but not too far
      
      x = Math.cos(angle) * distance;
      z = Math.sin(angle) * distance;
      
      // Check distance from player
      const distToPlayer = Math.sqrt(
        Math.pow(x - this.playerTank.getPosition().x, 2) +
        Math.pow(z - this.playerTank.getPosition().z, 2)
      );
      
      // Ensure tank is at least 20 units away from player
      if (distToPlayer > 15) {
        validPosition = true;
        
        // Check distance from other tanks
        for (const tank of this.enemyTanks) {
          const distToTank = Math.sqrt(
            Math.pow(x - tank.getPosition().x, 2) +
            Math.pow(z - tank.getPosition().z, 2)
          );
          
          if (distToTank < 12) { // Increased minimum spacing between tanks
            validPosition = false;
            break;
          }
        }
        
        // Check distance from obstacles
        if (validPosition) {
          for (const obstacle of this.obstacles) {
            const obstaclePos = obstacle.getPosition();
            const distToObstacle = Math.sqrt(
              Math.pow(x - obstaclePos.x, 2) +
              Math.pow(z - obstaclePos.z, 2)
            );
            
            if (distToObstacle < 8 + obstacle.getRadius()) {
              validPosition = false;
              break;
            }
          }
        }
        
        // Check distance from walls
        if (validPosition) {
          const distToWall = Math.min(
            Math.abs(x - this.arenaBounds.minX),
            Math.abs(x - this.arenaBounds.maxX),
            Math.abs(z - this.arenaBounds.minZ),
            Math.abs(z - this.arenaBounds.maxZ)
          );
          
          if (distToWall < 20) { // Increased from 15 to 20 to keep further from walls
            validPosition = false;
          }
        }
      }
      
      attempts++;
    }
    
    // If we couldn't find a valid position, use a fallback
    if (!validPosition) {
      // Use a more central position as fallback
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 15; // Smaller distance to stay more central
      x = Math.cos(angle) * distance;
      z = Math.sin(angle) * distance;
    }
    
    const tank = new Tank(this.scene, x, 0, z);
    tank.initialize();
    tank.setColor(0xff0000);
    
    // Apply difficulty-based settings
    tank.setMaxHealth(this.enemyTankHealth);
    tank.setHealth(this.enemyTankHealth);
    tank.setSpeed(this.enemyTankSpeed);
    tank.setDamage(this.enemyTankDamage);
    
    this.enemyTanks.push(tank);
    
    // Create AI controller for this tank
    const aiController = new AIController(tank, this.playerTank, this.obstacles);
    
    // Set AI difficulty
    aiController.setDifficulty(this.gameState.getDifficultyLevel());
    
    this.aiControllers.push(aiController);
  }
  
  private createObstacles(count: number): void {
    for (let i = 0; i < count; i++) {
      // Distribute obstacles more evenly around the arena
      // Use polar coordinates to ensure better distribution
      const radius = 15 + Math.random() * 30; // Distance from center (15-45)
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.5); // Even angular distribution with some randomness
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Size based on difficulty
      let sizeMin = 1;
      let sizeMax = 3;
      
      if (this.gameState.getDifficultyLevel() === DifficultyLevel.HARD) {
        sizeMin = 1.5;
        sizeMax = 4;
      } else if (this.gameState.getDifficultyLevel() === DifficultyLevel.INSANE) {
        sizeMin = 2;
        sizeMax = 5;
      }
      
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      
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
          // Award points for destroying an enemy tank
          this.gameState.addScore(this.POINTS_PER_ENEMY_TANK);
          
          // Update UI
          this.uiManager.updateScore(this.gameState.getScore());
          
          // Show score popup
          this.uiManager.showScorePopup(
            `+${this.POINTS_PER_ENEMY_TANK}`, 
            tank.getPosition()
          );
          
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
      
      // Update AI controllers and handle AI shooting
      this.aiControllers.forEach((controller, index) => {
        if (index < this.enemyTanks.length) {
          controller.update(deltaTime);
          
          // Check if AI should shoot
          if (controller.tryShoot()) {
            this.fireProjectile(this.enemyTanks[index]);
          }
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
        this.uiManager.showGameOver(this.gameState.getScore());
        this.onGameOver(this.gameState.getScore());
      }
      
      // Update UI
      this.uiManager.updateHealth(this.playerTank.getHealth());
      this.uiManager.updateSpeed(this.playerTank.getSpeed());
      this.uiManager.updateDamage(this.playerTank.getDamage());
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
        // Update AI tank references after spawning a new tank
        this.updateAITankReferences();
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
          
          // If player hit an enemy tank
          if (projectile.getSourceId() === this.playerTank.getId() && 
              this.enemyTanks.includes(hitTank)) {
            // Award points for hitting an enemy tank (even if not destroyed)
            const hitPoints = 10; // Points for just hitting a tank
            this.gameState.addScore(hitPoints);
            
            // Update UI
            this.uiManager.updateScore(this.gameState.getScore());
            
            // Show score popup
            this.uiManager.showScorePopup(
              `+${hitPoints}`, 
              hitTank.getPosition()
            );
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
        
        // Award points for collecting a power-up
        const powerUpPoints = 25;
        this.gameState.addScore(powerUpPoints);
        
        // Update UI
        this.uiManager.updateScore(this.gameState.getScore());
        
        // Show score popup
        this.uiManager.showScorePopup(
          `+${powerUpPoints}`, 
          powerUp.getPosition()
        );
        
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
      
      // Update AI tank references after removing a tank
      this.updateAITankReferences();
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
    // Spawn power-ups in more central locations to encourage movement
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 25; // Reduced from 30 to keep power-ups even more central
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    const powerUp = new PowerUp(this.scene, x, 0, z);
    powerUp.initialize();
    
    this.powerUps.push(powerUp);
  }
}
