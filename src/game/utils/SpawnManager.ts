import * as THREE from 'three';
import { Tank } from '../entities/Tank';
import { Obstacle } from '../environment/Obstacle';
import { PowerUp } from '../entities/PowerUp';
import { DifficultyLevel } from '../core/GameState';

/**
 * SpawnManager handles player spawning in multiplayer games.
 * It ensures fair, balanced spawn locations and provides spawn protection.
 */
export class SpawnManager {
  // Configuration parameters
  private config: SpawnConfig = {
    minPlayerDistance: 20,        // Minimum distance between spawned players
    minObstacleDistance: 8,       // Minimum distance from obstacles
    minWallDistance: 15,          // Minimum distance from arena walls
    minPowerUpDistance: 10,       // Minimum distance from power-ups
    spawnProtectionDuration: 4,   // Seconds of spawn protection
    maxSpawnAttempts: 30,         // Maximum attempts to find a valid spawn point
    spawnDistributionPattern: SpawnDistributionPattern.UNIFORM,
    spawnDensity: 0.7             // 0-1 value controlling how densely packed spawns can be
  };

  // Arena boundaries
  private arenaBounds = {
    minX: -50,
    maxX: 50,
    minZ: -50,
    maxZ: 50
  };

  // Track protected players and their protection timers
  private protectedPlayers: Map<string, number> = new Map();

  // Cache of valid spawn points for quick respawning
  private cachedSpawnPoints: THREE.Vector3[] = [];
  private maxCachedPoints: number = 10;

  // Track all active tanks for collision detection
  private activeTanks: Tank[] = [];
  private obstacles: Obstacle[] = [];
  private powerUps: PowerUp[] = [];

  /**
   * Initialize the spawn manager with arena boundaries
   */
  constructor(arenaBounds?: { minX: number, maxX: number, minZ: number, maxZ: number }) {
    if (arenaBounds) {
      this.arenaBounds = arenaBounds;
    }
  }

  /**
   * Configure the spawn manager with custom settings
   * @param config Spawn configuration parameters
   */
  public configure(config: Partial<SpawnConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Clear cached spawn points when configuration changes
    this.cachedSpawnPoints = [];
  }

  /**
   * Set the arena boundaries
   * @param bounds The arena boundaries
   */
  public setArenaBounds(bounds: { minX: number, maxX: number, minZ: number, maxZ: number }): void {
    this.arenaBounds = bounds;
    
    // Clear cached spawn points when arena size changes
    this.cachedSpawnPoints = [];
  }

  /**
   * Update the list of active tanks for collision detection
   * @param tanks Array of active tanks
   */
  public setActiveTanks(tanks: Tank[]): void {
    this.activeTanks = tanks;
  }

  /**
   * Update the list of obstacles for collision detection
   * @param obstacles Array of obstacles
   */
  public setObstacles(obstacles: Obstacle[]): void {
    this.obstacles = obstacles;
    
    // Clear cached spawn points when obstacles change
    this.cachedSpawnPoints = [];
  }

  /**
   * Update the list of power-ups for spawn balancing
   * @param powerUps Array of power-ups
   */
  public setPowerUps(powerUps: PowerUp[]): void {
    this.powerUps = powerUps;
  }

  /**
   * Find a valid spawn position for a new player
   * @param playerId The ID of the player to spawn
   * @param difficulty Current game difficulty level (affects spawn positioning)
   * @returns A valid spawn position or null if none found
   */
  public getSpawnPosition(playerId: string, difficulty: DifficultyLevel = DifficultyLevel.MEDIUM): THREE.Vector3 | null {
    // Try to use a cached spawn point first (with some randomness to avoid predictability)
    if (this.cachedSpawnPoints.length > 0 && Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * this.cachedSpawnPoints.length);
      const cachedPoint = this.cachedSpawnPoints[randomIndex];
      
      // Verify the cached point is still valid
      if (this.isValidSpawnPoint(cachedPoint)) {
        // Remove the used point from cache to avoid spawning multiple players at the same spot
        this.cachedSpawnPoints.splice(randomIndex, 1);
        return cachedPoint;
      }
    }

    // Adjust spawn parameters based on difficulty
    this.adjustSpawnParametersForDifficulty(difficulty);

    // Try to find a valid spawn point
    let attempts = 0;
    while (attempts < this.config.maxSpawnAttempts) {
      const position = this.generateSpawnPosition();
      
      if (this.isValidSpawnPoint(position)) {
        // Cache this valid spawn point for future use
        this.cacheSpawnPoint(position);
        
        // Apply spawn protection
        this.applySpawnProtection(playerId);
        
        return position;
      }
      
      attempts++;
    }

    // If we couldn't find a valid spawn point after max attempts,
    // use a fallback method to ensure we can still spawn the player
    return this.getFallbackSpawnPosition();
  }

  /**
   * Generate a spawn position based on the current distribution pattern
   */
  private generateSpawnPosition(): THREE.Vector3 {
    const { minX, maxX, minZ, maxZ } = this.arenaBounds;
    const arenaWidth = maxX - minX;
    const arenaDepth = maxZ - minZ;
    
    let x: number, z: number;
    
    switch (this.config.spawnDistributionPattern) {
      case SpawnDistributionPattern.UNIFORM:
        // Uniform distribution across the entire arena
        x = minX + Math.random() * arenaWidth;
        z = minZ + Math.random() * arenaDepth;
        break;
        
      case SpawnDistributionPattern.PERIMETER:
        // Spawn along the perimeter of the arena
        if (Math.random() < 0.5) {
          // Spawn along X edges
          x = Math.random() < 0.5 ? minX + this.config.minWallDistance : maxX - this.config.minWallDistance;
          z = minZ + Math.random() * arenaDepth;
        } else {
          // Spawn along Z edges
          x = minX + Math.random() * arenaWidth;
          z = Math.random() < 0.5 ? minZ + this.config.minWallDistance : maxZ - this.config.minWallDistance;
        }
        break;
        
      case SpawnDistributionPattern.QUADRANTS:
        // Divide the arena into quadrants and spawn in one of them
        const quadrant = Math.floor(Math.random() * 4);
        const halfWidth = arenaWidth / 2;
        const halfDepth = arenaDepth / 2;
        const centerX = minX + halfWidth;
        const centerZ = minZ + halfDepth;
        
        switch (quadrant) {
          case 0: // Top-left
            x = minX + Math.random() * halfWidth;
            z = minZ + Math.random() * halfDepth;
            break;
          case 1: // Top-right
            x = centerX + Math.random() * halfWidth;
            z = minZ + Math.random() * halfDepth;
            break;
          case 2: // Bottom-left
            x = minX + Math.random() * halfWidth;
            z = centerZ + Math.random() * halfDepth;
            break;
          case 3: // Bottom-right
            x = centerX + Math.random() * halfWidth;
            z = centerZ + Math.random() * halfDepth;
            break;
        }
        break;
        
      case SpawnDistributionPattern.CENTRAL:
        // Spawn closer to the center of the arena
        const centerRadius = Math.min(arenaWidth, arenaDepth) * 0.3;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * centerRadius;
        
        x = (minX + maxX) / 2 + Math.cos(angle) * distance;
        z = (minZ + maxZ) / 2 + Math.sin(angle) * distance;
        break;
        
      default:
        // Default to uniform distribution
        x = minX + Math.random() * arenaWidth;
        z = minZ + Math.random() * arenaDepth;
    }
    
    return new THREE.Vector3(x, 0, z);
  }

  /**
   * Check if a position is a valid spawn point
   * @param position The position to check
   * @returns True if the position is valid for spawning
   */
  private isValidSpawnPoint(position: THREE.Vector3): boolean {
    // Check distance from arena walls
    if (!this.isWithinArenaBounds(position, this.config.minWallDistance)) {
      return false;
    }
    
    // Check distance from other tanks
    for (const tank of this.activeTanks) {
      const distance = position.distanceTo(tank.getPosition());
      if (distance < this.config.minPlayerDistance) {
        return false;
      }
    }
    
    // Check distance from obstacles
    for (const obstacle of this.obstacles) {
      const obstaclePos = obstacle.getPosition();
      const distance = Math.sqrt(
        Math.pow(position.x - obstaclePos.x, 2) +
        Math.pow(position.z - obstaclePos.z, 2)
      );
      
      // Account for obstacle radius
      if (distance < this.config.minObstacleDistance + obstacle.getRadius()) {
        return false;
      }
    }
    
    // Check distance from power-ups (for game balance)
    for (const powerUp of this.powerUps) {
      const powerUpPos = powerUp.getPosition();
      const distance = Math.sqrt(
        Math.pow(position.x - powerUpPos.x, 2) +
        Math.pow(position.z - powerUpPos.z, 2)
      );
      
      if (distance < this.config.minPowerUpDistance) {
        return false;
      }
    }
    
    // Additional game balance checks can be added here
    
    return true;
  }

  /**
   * Check if a position is within the arena bounds with a margin
   * @param position The position to check
   * @param margin Margin from the arena walls
   * @returns True if the position is within bounds
   */
  private isWithinArenaBounds(position: THREE.Vector3, margin: number): boolean {
    return (
      position.x >= this.arenaBounds.minX + margin &&
      position.x <= this.arenaBounds.maxX - margin &&
      position.z >= this.arenaBounds.minZ + margin &&
      position.z <= this.arenaBounds.maxZ - margin
    );
  }

  /**
   * Cache a valid spawn point for future use
   * @param position The position to cache
   */
  private cacheSpawnPoint(position: THREE.Vector3): void {
    // Limit the cache size
    if (this.cachedSpawnPoints.length >= this.maxCachedPoints) {
      this.cachedSpawnPoints.shift(); // Remove oldest point
    }
    
    this.cachedSpawnPoints.push(position.clone());
  }

  /**
   * Apply spawn protection to a player
   * @param playerId The ID of the player to protect
   */
  public applySpawnProtection(playerId: string): void {
    this.protectedPlayers.set(playerId, this.config.spawnProtectionDuration);
  }

  /**
   * Check if a player has spawn protection
   * @param playerId The ID of the player to check
   * @returns True if the player has spawn protection
   */
  public hasSpawnProtection(playerId: string): boolean {
    return this.protectedPlayers.has(playerId);
  }

  /**
   * Get the remaining spawn protection time for a player
   * @param playerId The ID of the player to check
   * @returns Remaining protection time in seconds, or 0 if not protected
   */
  public getSpawnProtectionTime(playerId: string): number {
    return this.protectedPlayers.get(playerId) || 0;
  }

  /**
   * Update spawn protection timers
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Update spawn protection timers
    for (const [playerId, timeRemaining] of this.protectedPlayers.entries()) {
      const newTime = timeRemaining - deltaTime;
      
      if (newTime <= 0) {
        // Protection expired
        this.protectedPlayers.delete(playerId);
      } else {
        // Update remaining time
        this.protectedPlayers.set(playerId, newTime);
      }
    }
  }

  /**
   * Reset the spawn manager for a new game round
   */
  public reset(): void {
    // Clear spawn protection
    this.protectedPlayers.clear();
    
    // Clear cached spawn points
    this.cachedSpawnPoints = [];
  }

  /**
   * Adjust spawn parameters based on game difficulty
   * @param difficulty The current game difficulty
   */
  private adjustSpawnParametersForDifficulty(difficulty: DifficultyLevel): void {
    switch (difficulty) {
      case DifficultyLevel.EASY:
        // More forgiving spawn parameters for easy difficulty
        this.config.minPlayerDistance = 25;
        this.config.minObstacleDistance = 10;
        this.config.spawnProtectionDuration = 5;
        this.config.spawnDistributionPattern = SpawnDistributionPattern.UNIFORM;
        break;
        
      case DifficultyLevel.MEDIUM:
        // Default spawn parameters
        this.config.minPlayerDistance = 20;
        this.config.minObstacleDistance = 8;
        this.config.spawnProtectionDuration = 4;
        this.config.spawnDistributionPattern = SpawnDistributionPattern.UNIFORM;
        break;
        
      case DifficultyLevel.HARD:
        // Tighter spawn parameters for hard difficulty
        this.config.minPlayerDistance = 15;
        this.config.minObstacleDistance = 6;
        this.config.spawnProtectionDuration = 3;
        this.config.spawnDistributionPattern = SpawnDistributionPattern.QUADRANTS;
        break;
        
      case DifficultyLevel.INSANE:
        // Minimal spawn protection for insane difficulty
        this.config.minPlayerDistance = 10;
        this.config.minObstacleDistance = 4;
        this.config.spawnProtectionDuration = 2;
        this.config.spawnDistributionPattern = SpawnDistributionPattern.PERIMETER;
        break;
    }
  }

  /**
   * Get a fallback spawn position when no valid position can be found
   * This is a last resort to ensure players can always spawn
   */
  private getFallbackSpawnPosition(): THREE.Vector3 {
    // Try center of the arena first
    const centerPosition = new THREE.Vector3(
      (this.arenaBounds.minX + this.arenaBounds.maxX) / 2,
      0,
      (this.arenaBounds.minZ + this.arenaBounds.maxZ) / 2
    );
    
    // If center is clear, use it
    if (this.isValidSpawnPoint(centerPosition)) {
      return centerPosition;
    }
    
    // Otherwise, find the position furthest from all other entities
    let bestPosition = centerPosition;
    let bestDistance = 0;
    
    // Try several random positions and pick the best one
    for (let i = 0; i < 20; i++) {
      const position = this.generateSpawnPosition();
      let minDistance = Number.MAX_VALUE;
      
      // Find minimum distance to any tank
      for (const tank of this.activeTanks) {
        const distance = position.distanceTo(tank.getPosition());
        minDistance = Math.min(minDistance, distance);
      }
      
      // Find minimum distance to any obstacle
      for (const obstacle of this.obstacles) {
        const obstaclePos = obstacle.getPosition();
        const distance = Math.sqrt(
          Math.pow(position.x - obstaclePos.x, 2) +
          Math.pow(position.z - obstaclePos.z, 2)
        ) - obstacle.getRadius();
        
        minDistance = Math.min(minDistance, distance);
      }
      
      // If this position is better than our current best, update it
      if (minDistance > bestDistance) {
        bestDistance = minDistance;
        bestPosition = position;
      }
    }
    
    return bestPosition;
  }

  /**
   * Precompute and cache valid spawn points for faster spawning
   * @param count Number of spawn points to precompute
   */
  public precomputeSpawnPoints(count: number = 10): void {
    this.cachedSpawnPoints = [];
    
    for (let i = 0; i < count && i < this.maxCachedPoints; i++) {
      let attempts = 0;
      while (attempts < this.config.maxSpawnAttempts) {
        const position = this.generateSpawnPosition();
        
        if (this.isValidSpawnPoint(position)) {
          this.cachedSpawnPoints.push(position);
          break;
        }
        
        attempts++;
      }
    }
  }

  /**
   * Get the visual effect for spawn protection
   * @param tank The tank to apply the effect to
   * @param playerId The ID of the player
   * @param scene The THREE.js scene
   * @returns The created visual effect object (for later removal)
   */
  public createSpawnProtectionEffect(tank: Tank, playerId: string, scene: THREE.Scene): THREE.Object3D | null {
    if (!this.hasSpawnProtection(playerId)) {
      return null;
    }
    
    // Create a shield effect around the tank
    const radius = tank.getRadius() * 1.2;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(geometry, material);
    shield.position.copy(tank.getPosition());
    shield.position.y = radius / 2;
    
    scene.add(shield);
    
    return shield;
  }

  /**
   * Update the spawn protection visual effect
   * @param effect The visual effect object
   * @param tank The tank with spawn protection
   * @param playerId The ID of the player
   * @param deltaTime Time since last update
   * @param scene The THREE.js scene
   * @returns True if the effect should be kept, false if it should be removed
   */
  public updateSpawnProtectionEffect(
    effect: THREE.Object3D,
    tank: Tank,
    playerId: string,
    deltaTime: number,
    scene: THREE.Scene
  ): boolean {
    if (!this.hasSpawnProtection(playerId)) {
      scene.remove(effect);
      return false;
    }
    
    // Update position to follow the tank
    effect.position.copy(tank.getPosition());
    effect.position.y = tank.getRadius() * 1.2 / 2;
    
    // Pulse the shield based on remaining time
    const remainingTime = this.getSpawnProtectionTime(playerId);
    const pulseFrequency = 2; // Hz
    const pulseAmount = 0.2;
    
    const material = (effect as THREE.Mesh).material as THREE.MeshBasicMaterial;
    material.opacity = 0.3 + Math.sin(Date.now() / 1000 * Math.PI * pulseFrequency) * pulseAmount;
    
    // Make the shield fade out as protection time decreases
    material.opacity *= remainingTime / this.config.spawnProtectionDuration;
    
    return true;
  }
}

/**
 * Spawn configuration parameters
 */
export interface SpawnConfig {
  minPlayerDistance: number;
  minObstacleDistance: number;
  minWallDistance: number;
  minPowerUpDistance: number;
  spawnProtectionDuration: number;
  maxSpawnAttempts: number;
  spawnDistributionPattern: SpawnDistributionPattern;
  spawnDensity: number;
}

/**
 * Spawn distribution patterns
 */
export enum SpawnDistributionPattern {
  UNIFORM,    // Evenly distributed across the entire arena
  PERIMETER,  // Distributed around the perimeter of the arena
  QUADRANTS,  // Distributed in the four quadrants of the arena
  CENTRAL     // Concentrated toward the center of the arena
}
