import * as THREE from 'three';
import { Tank } from './Tank';
import { Obstacle } from '../environment/Obstacle';
import { DifficultyLevel } from '../core/GameState';

// Define heat map cell structure
interface HeatMapCell {
  position: THREE.Vector2;
  heat: number;
}

export class AIController {
  private tank: Tank;
  private playerTank: Tank;
  private obstacles: Obstacle[];
  private otherTanks: Tank[] = []; // Reference to other tanks for tactical spacing
  
  private state: 'idle' | 'chase' | 'attack' | 'retreat' | 'reposition' = 'attack';
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
  
  // Pathfinding and positioning parameters
  private wallAvoidanceDistance: number = 20; // Increased from 15 to 20
  private cornerAvoidanceDistance: number = 30; // Increased from 20 to 30
  private tankSpacingDistance: number = 12; // Minimum distance to maintain from other tanks
  private obstacleAvoidanceDistance: number = 8; // Minimum distance to maintain from obstacles
  private centralAreaPreference: number = 0.8; // Increased from 0.7 to 0.8
  private positionStickiness: number = 0; // How long the tank has been in the same area
  private lastPosition: THREE.Vector3 = new THREE.Vector3(); // Last recorded position
  private positionUpdateTimer: number = 0; // Timer for updating position stickiness
  private repositionCooldown: number = 0; // Cooldown for forced repositioning
  private edgeAvoidanceMultiplier: number = 2.0; // New parameter to increase edge avoidance force
  private stuckCheckInterval: number = 3.0; // Check if stuck every 3 seconds
  private stuckCheckTimer: number = 0; // Timer for checking if stuck
  private stuckThreshold: number = 2.0; // Distance threshold to consider tank stuck
  private previousPositions: THREE.Vector3[] = []; // Store previous positions to detect being stuck
  private positionHistorySize: number = 5; // Number of previous positions to store
  private forcedCentralMovementTimer: number = 0; // Timer for forcing movement toward center
  
  // Heat map for position discouragement
  private heatMap: HeatMapCell[] = [];
  private heatMapResolution: number = 15; // Increased from 10 to 15 for more granular tracking
  private heatDecayRate: number = 0.1; // Rate at which heat decays per second
  private heatGenerationRate: number = 1.5; // Increased from 1.0 to 1.5
  private edgeHeatMultiplier: number = 2.0; // Generate more heat near edges
  
  // Arena boundaries - adding these to prevent tanks from drifting out
  private readonly ARENA_BOUNDS = {
    minX: -48, // Slightly inside the actual arena bounds to account for tank radius
    maxX: 48,
    minZ: -48,
    maxZ: 48
  };
  
  // Corner positions for avoidance
  private readonly CORNER_POSITIONS = [
    new THREE.Vector2(-48, -48), // Bottom-left
    new THREE.Vector2(48, -48),  // Bottom-right
    new THREE.Vector2(48, 48),   // Top-right
    new THREE.Vector2(-48, 48)   // Top-left
  ];
  
  // Edge zones for enhanced avoidance
  private readonly EDGE_ZONE_SIZE = 25; // Increased from implicit value to explicit 25
  
  constructor(tank: Tank, playerTank: Tank, obstacles: Obstacle[]) {
    this.tank = tank;
    this.playerTank = playerTank;
    this.obstacles = obstacles;
    
    // Initialize heat map
    this.initializeHeatMap();
    
    // Set initial state
    this.changeState('idle');
    
    // Randomize initial shoot timer to prevent all tanks from shooting at once
    this.shootTimer = Math.random() * this.shootCooldown;
    
    // Initialize last position
    this.lastPosition.copy(this.tank.getPosition());
    
    // Initialize position history with current position
    const currentPos = this.tank.getPosition().clone();
    for (let i = 0; i < this.positionHistorySize; i++) {
      this.previousPositions.push(currentPos.clone());
    }
    
    // Set a random initial forced central movement timer
    this.forcedCentralMovementTimer = 10 + Math.random() * 10;
  }
  
  // Initialize the heat map grid
  private initializeHeatMap(): void {
    this.heatMap = [];
    const cellSize = 96 / this.heatMapResolution; // 96 is the arena width/height
    
    for (let i = 0; i < this.heatMapResolution; i++) {
      for (let j = 0; j < this.heatMapResolution; j++) {
        const x = this.ARENA_BOUNDS.minX + cellSize * (i + 0.5);
        const z = this.ARENA_BOUNDS.minZ + cellSize * (j + 0.5);
        
        // Pre-heat edges and corners to discourage initial movement there
        let initialHeat = 0;
        
        // Check if cell is near an edge
        const distanceToEdge = Math.min(
          Math.abs(x - this.ARENA_BOUNDS.minX),
          Math.abs(x - this.ARENA_BOUNDS.maxX),
          Math.abs(z - this.ARENA_BOUNDS.minZ),
          Math.abs(z - this.ARENA_BOUNDS.maxZ)
        );
        
        if (distanceToEdge < this.EDGE_ZONE_SIZE) {
          // Apply more heat the closer to the edge
          initialHeat = 5 * (1 - distanceToEdge / this.EDGE_ZONE_SIZE);
        }
        
        // Check if cell is near a corner
        for (const corner of this.CORNER_POSITIONS) {
          const distanceToCorner = new THREE.Vector2(x, z).distanceTo(corner);
          if (distanceToCorner < this.cornerAvoidanceDistance) {
            // Apply even more heat to corners
            const cornerHeat = 8 * (1 - distanceToCorner / this.cornerAvoidanceDistance);
            initialHeat = Math.max(initialHeat, cornerHeat);
          }
        }
        
        this.heatMap.push({
          position: new THREE.Vector2(x, z),
          heat: initialHeat
        });
      }
    }
  }
  
  // Update the heat map based on tank position
  private updateHeatMap(deltaTime: number): void {
    // Decay heat for all cells
    for (const cell of this.heatMap) {
      cell.heat = Math.max(0, cell.heat - this.heatDecayRate * deltaTime);
    }
    
    // Find the cell that contains the tank
    const tankPosition = this.tank.getPosition();
    const currentCell = this.findHeatMapCell(tankPosition.x, tankPosition.z);
    
    if (currentCell) {
      // Check if tank is near an edge or corner
      const distanceToEdge = Math.min(
        Math.abs(tankPosition.x - this.ARENA_BOUNDS.minX),
        Math.abs(tankPosition.x - this.ARENA_BOUNDS.maxX),
        Math.abs(tankPosition.z - this.ARENA_BOUNDS.minZ),
        Math.abs(tankPosition.z - this.ARENA_BOUNDS.maxZ)
      );
      
      let heatMultiplier = 1.0;
      
      // Apply more heat if near an edge
      if (distanceToEdge < this.EDGE_ZONE_SIZE) {
        heatMultiplier = 1.0 + this.edgeHeatMultiplier * (1 - distanceToEdge / this.EDGE_ZONE_SIZE);
      }
      
      // Check if near a corner
      for (const corner of this.CORNER_POSITIONS) {
        const distanceToCorner = new THREE.Vector2(tankPosition.x, tankPosition.z).distanceTo(corner);
        if (distanceToCorner < this.cornerAvoidanceDistance) {
          // Apply even more heat if near a corner
          const cornerMultiplier = 1.0 + this.edgeHeatMultiplier * 1.5 * (1 - distanceToCorner / this.cornerAvoidanceDistance);
          heatMultiplier = Math.max(heatMultiplier, cornerMultiplier);
        }
      }
      
      // Increase heat for the current cell
      currentCell.heat = Math.min(10, currentCell.heat + this.heatGenerationRate * deltaTime * heatMultiplier);
      
      // Also increase heat for neighboring cells with a falloff
      for (const cell of this.heatMap) {
        if (cell !== currentCell) {
          const distance = cell.position.distanceTo(new THREE.Vector2(tankPosition.x, tankPosition.z));
          const falloff = Math.max(0, 1 - distance / 20); // 20 is the falloff radius
          
          if (falloff > 0) {
            cell.heat = Math.min(10, cell.heat + this.heatGenerationRate * deltaTime * falloff * 0.5 * heatMultiplier);
          }
        }
      }
    }
  }
  
  // Find the heat map cell that contains the given position
  private findHeatMapCell(x: number, z: number): HeatMapCell | null {
    const cellSize = 96 / this.heatMapResolution;
    
    for (const cell of this.heatMap) {
      const minX = cell.position.x - cellSize / 2;
      const maxX = cell.position.x + cellSize / 2;
      const minZ = cell.position.y - cellSize / 2; // Note: y in Vector2 corresponds to z in 3D
      const maxZ = cell.position.y + cellSize / 2;
      
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        return cell;
      }
    }
    
    return null;
  }
  
  // Get the heat value at a specific position
  private getHeatAtPosition(x: number, z: number): number {
    const cell = this.findHeatMapCell(x, z);
    return cell ? cell.heat : 0;
  }
  
  // Set reference to other tanks for tactical spacing
  public setOtherTanks(tanks: Tank[]): void {
    this.otherTanks = tanks.filter(t => t !== this.tank);
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
        this.wallAvoidanceDistance = 15;
        this.cornerAvoidanceDistance = 20;
        this.centralAreaPreference = 0.6;
        this.edgeAvoidanceMultiplier = 1.5;
        break;
        
      case DifficultyLevel.MEDIUM:
        this.detectionRange = 40;
        this.attackRange = 25;
        this.retreatHealth = 30;
        this.minDistance = 15;
        this.shootCooldown = 2;
        this.shootProbability = 0.7;
        this.aimAccuracy = 0.2; // Default accuracy
        this.wallAvoidanceDistance = 20;
        this.cornerAvoidanceDistance = 30;
        this.centralAreaPreference = 0.8;
        this.edgeAvoidanceMultiplier = 2.0;
        break;
        
      case DifficultyLevel.HARD:
        this.detectionRange = 50;
        this.attackRange = 30;
        this.retreatHealth = 25;
        this.minDistance = 12;
        this.shootCooldown = 1.5;
        this.shootProbability = 0.8;
        this.aimAccuracy = 0.1; // More accurate
        this.wallAvoidanceDistance = 25;
        this.cornerAvoidanceDistance = 35;
        this.centralAreaPreference = 0.9;
        this.edgeAvoidanceMultiplier = 2.5;
        break;
        
      case DifficultyLevel.INSANE:
        this.detectionRange = 60;
        this.attackRange = 40;
        this.retreatHealth = 20;
        this.minDistance = 10;
        this.shootCooldown = 1;
        this.shootProbability = 0.9;
        this.aimAccuracy = 0.05; // Very accurate
        this.wallAvoidanceDistance = 30;
        this.cornerAvoidanceDistance = 40;
        this.centralAreaPreference = 1.0;
        this.edgeAvoidanceMultiplier = 3.0;
        break;
    }
  }
  
  public update(deltaTime: number): void {
    // Update state timer
    this.stateTimer -= deltaTime;
    
    // Update shoot timer
    this.shootTimer -= deltaTime;
    
    // Update reposition cooldown
    if (this.repositionCooldown > 0) {
      this.repositionCooldown -= deltaTime;
    }
    
    // Update heat map
    this.updateHeatMap(deltaTime);
    
    // Update position stickiness
    this.updatePositionStickiness(deltaTime);
    
    // Update stuck check timer
    this.stuckCheckTimer -= deltaTime;
    if (this.stuckCheckTimer <= 0) {
      this.checkIfStuck();
      this.stuckCheckTimer = this.stuckCheckInterval;
    }
    
    // Update forced central movement timer
    this.forcedCentralMovementTimer -= deltaTime;
    if (this.forcedCentralMovementTimer <= 0) {
      this.forceCentralMovement();
      // Reset timer with some randomness
      this.forcedCentralMovementTimer = 15 + Math.random() * 15;
    }
    
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
      case 'reposition':
        this.executeRepositionState(deltaTime);
        break;
    }
    
    // Handle shooting logic
    this.updateShooting(distanceToPlayer);
    
    // Check if we need to force a reposition due to camping
    this.checkForCamping();
    
    // Update position history
    this.updatePositionHistory();
  }
  
  private updatePositionHistory(): void {
    // Add current position to history and remove oldest
    this.previousPositions.push(this.tank.getPosition().clone());
    if (this.previousPositions.length > this.positionHistorySize) {
      this.previousPositions.shift();
    }
  }
  
  private checkIfStuck(): void {
    if (this.previousPositions.length < this.positionHistorySize) return;
    
    // Calculate average position
    const avgPosition = new THREE.Vector3();
    this.previousPositions.forEach(pos => avgPosition.add(pos));
    avgPosition.divideScalar(this.previousPositions.length);
    
    // Calculate maximum distance from average position
    let maxDistance = 0;
    this.previousPositions.forEach(pos => {
      const distance = pos.distanceTo(avgPosition);
      maxDistance = Math.max(maxDistance, distance);
    });
    
    // If max distance is below threshold, tank is considered stuck
    if (maxDistance < this.stuckThreshold) {
      // Force a reposition to get unstuck
      this.changeState('reposition');
      this.repositionCooldown = 0; // Allow immediate repositioning
      
      // Clear position history to avoid repeated triggers
      const currentPos = this.tank.getPosition().clone();
      this.previousPositions = [];
      for (let i = 0; i < this.positionHistorySize; i++) {
        this.previousPositions.push(currentPos.clone());
      }
    }
  }
  
  private forceCentralMovement(): void {
    // Only force central movement if not actively engaging the player
    if (this.state !== 'attack' && this.state !== 'chase') {
      // Check if tank is near an edge or corner
      const position = this.tank.getPosition();
      const distanceToEdge = Math.min(
        Math.abs(position.x - this.ARENA_BOUNDS.minX),
        Math.abs(position.x - this.ARENA_BOUNDS.maxX),
        Math.abs(position.z - this.ARENA_BOUNDS.minZ),
        Math.abs(position.z - this.ARENA_BOUNDS.maxZ)
      );
      
      let isNearEdgeOrCorner = distanceToEdge < this.EDGE_ZONE_SIZE;
      
      // Check if near a corner
      if (!isNearEdgeOrCorner) {
        for (const corner of this.CORNER_POSITIONS) {
          const distanceToCorner = new THREE.Vector2(position.x, position.z).distanceTo(corner);
          if (distanceToCorner < this.cornerAvoidanceDistance) {
            isNearEdgeOrCorner = true;
            break;
          }
        }
      }
      
      if (isNearEdgeOrCorner) {
        // Force movement toward center
        this.changeState('reposition');
        this.setIntelligentRepositionTarget(true); // true = force central position
      }
    }
  }
  
  private updatePositionStickiness(deltaTime: number): void {
    // Update timer
    this.positionUpdateTimer -= deltaTime;
    
    if (this.positionUpdateTimer <= 0) {
      // Check if tank has moved significantly
      const currentPosition = this.tank.getPosition();
      const distanceMoved = currentPosition.distanceTo(this.lastPosition);
      
      if (distanceMoved < 5) {
        // Tank hasn't moved much, increase stickiness
        this.positionStickiness += 1;
      } else {
        // Tank has moved, decrease stickiness
        this.positionStickiness = Math.max(0, this.positionStickiness - 1);
      }
      
      // Update last position
      this.lastPosition.copy(currentPosition);
      
      // Reset timer
      this.positionUpdateTimer = 1.0; // Check every second
    }
  }
  
  private checkForCamping(): void {
    // If tank has been in the same area for too long, force a reposition
    if (this.positionStickiness > 3 && this.repositionCooldown <= 0) { // Reduced from 5 to 3
      // Check if near a wall or corner
      const isNearWallOrCorner = this.isNearWallOrCorner();
      
      if (isNearWallOrCorner || this.positionStickiness > 5) { // Reduced from 10 to 5
        this.changeState('reposition');
        this.repositionCooldown = 5; // Reduced from 10 to 5 seconds
        this.positionStickiness = 0;
      }
    }
  }
  
  private isNearWallOrCorner(): boolean {
    const position = this.tank.getPosition();
    
    // Check distance to walls
    const distanceToNearestWall = Math.min(
      Math.abs(position.x - this.ARENA_BOUNDS.minX),
      Math.abs(position.x - this.ARENA_BOUNDS.maxX),
      Math.abs(position.z - this.ARENA_BOUNDS.minZ),
      Math.abs(position.z - this.ARENA_BOUNDS.maxZ)
    );
    
    if (distanceToNearestWall < this.wallAvoidanceDistance) {
      return true;
    }
    
    // Check distance to corners
    for (const corner of this.CORNER_POSITIONS) {
      const distanceToCorner = new THREE.Vector2(position.x, position.z).distanceTo(corner);
      if (distanceToCorner < this.cornerAvoidanceDistance) {
        return true;
      }
    }
    
    return false;
  }
  
  private updateState(distanceToPlayer: number): void {
    // Don't change state if we're in reposition mode and timer hasn't expired
    if (this.state === 'reposition' && this.stateTimer > 0) {
      return;
    }
    
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
      case 'reposition':
        if (this.stateTimer <= 0) {
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
  
  private changeState(newState: 'idle' | 'chase' | 'attack' | 'retreat' | 'reposition'): void {
    this.state = newState;
    
    // Set state-specific timers and behaviors
    switch (newState) {
      case 'idle':
        this.stateTimer = 2 + Math.random() * 3;
        this.setIntelligentTargetPosition();
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
        this.setIntelligentRetreatPosition();
        this.shootingEnabled = true; // Can shoot while retreating, but less frequently
        this.shootProbability = 0.4;
        this.shootCooldown = 3; // Longer cooldown while retreating
        break;
      case 'reposition':
        this.stateTimer = 3 + Math.random() * 2;
        this.setIntelligentRepositionTarget();
        this.shootingEnabled = false; // Focus on movement during repositioning
        break;
    }
  }
  
  private executeIdleState(deltaTime: number): void {
    if (this.stateTimer <= 0) {
      this.setIntelligentTargetPosition();
      this.stateTimer = 2 + Math.random() * 3;
    }
    
    this.moveTowardsTarget(deltaTime);
  }
  
  private executeChaseState(deltaTime: number): void {
    // Update target to player position
    this.targetPosition.copy(this.playerTank.getPosition());
    
    // Apply tactical adjustments
    this.applyTacticalPositioning();
    
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
    
    // Apply tactical adjustments
    this.applyTacticalPositioning();
    
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
      this.setIntelligentRetreatPosition();
      this.stateTimer = 3;
    }
    
    this.moveTowardsTarget(deltaTime);
  }
  
  private executeRepositionState(deltaTime: number): void {
    if (this.stateTimer <= 0 || this.tank.getPosition().distanceTo(this.targetPosition) < 5) {
      this.setIntelligentRepositionTarget();
      this.stateTimer = 2 + Math.random() * 2;
    }
    
    this.moveTowardsTarget(deltaTime);
  }
  
  // Apply tactical positioning adjustments to the current target
  private applyTacticalPositioning(): void {
    const currentPosition = this.tank.getPosition();
    
    // Avoid walls with increased force
    this.avoidWalls();
    
    // Avoid corners with increased force
    this.avoidCorners();
    
    // Maintain spacing from other tanks
    this.maintainTankSpacing();
    
    // Avoid obstacles
    this.avoidObstacles();
    
    // Prefer central area with increased weight
    this.preferCentralArea();
    
    // Avoid high heat areas with increased sensitivity
    this.avoidHighHeatAreas();
  }
  
  // Adjust target position to avoid walls
  private avoidWalls(): void {
    const currentPosition = this.tank.getPosition();
    
    // Check distance to each wall and adjust target if too close
    // Left wall
    if (Math.abs(currentPosition.x - this.ARENA_BOUNDS.minX) < this.wallAvoidanceDistance) {
      // Too close to left wall, push target right
      const pushForce = (this.wallAvoidanceDistance - Math.abs(currentPosition.x - this.ARENA_BOUNDS.minX)) * this.edgeAvoidanceMultiplier;
      this.targetPosition.x += pushForce;
    }
    
    // Right wall
    if (Math.abs(currentPosition.x - this.ARENA_BOUNDS.maxX) < this.wallAvoidanceDistance) {
      // Too close to right wall, push target left
      const pushForce = (this.wallAvoidanceDistance - Math.abs(currentPosition.x - this.ARENA_BOUNDS.maxX)) * this.edgeAvoidanceMultiplier;
      this.targetPosition.x -= pushForce;
    }
    
    // Bottom wall
    if (Math.abs(currentPosition.z - this.ARENA_BOUNDS.minZ) < this.wallAvoidanceDistance) {
      // Too close to bottom wall, push target up
      const pushForce = (this.wallAvoidanceDistance - Math.abs(currentPosition.z - this.ARENA_BOUNDS.minZ)) * this.edgeAvoidanceMultiplier;
      this.targetPosition.z += pushForce;
    }
    
    // Top wall
    if (Math.abs(currentPosition.z - this.ARENA_BOUNDS.maxZ) < this.wallAvoidanceDistance) {
      // Too close to top wall, push target down
      const pushForce = (this.wallAvoidanceDistance - Math.abs(currentPosition.z - this.ARENA_BOUNDS.maxZ)) * this.edgeAvoidanceMultiplier;
      this.targetPosition.z -= pushForce;
    }
  }
  
  // Adjust target position to avoid corners
  private avoidCorners(): void {
    const currentPosition = this.tank.getPosition();
    
    // Check distance to each corner
    for (const corner of this.CORNER_POSITIONS) {
      const distanceToCorner = new THREE.Vector2(currentPosition.x, currentPosition.z).distanceTo(corner);
      
      if (distanceToCorner < this.cornerAvoidanceDistance) {
        // Too close to a corner, move away from it with increased force
        const directionFromCorner = new THREE.Vector2(
          currentPosition.x - corner.x,
          currentPosition.z - corner.y
        ).normalize();
        
        // Adjust target position with increased force
        const pushForce = (this.cornerAvoidanceDistance - distanceToCorner) * this.edgeAvoidanceMultiplier * 1.5;
        this.targetPosition.x += directionFromCorner.x * pushForce;
        this.targetPosition.z += directionFromCorner.y * pushForce;
      }
    }
  }
  
  // Adjust target position to maintain spacing from other tanks
  private maintainTankSpacing(): void {
    const currentPosition = this.tank.getPosition();
    
    // Check distance to each other tank
    for (const otherTank of this.otherTanks) {
      const otherPosition = otherTank.getPosition();
      const distanceToTank = currentPosition.distanceTo(otherPosition);
      
      if (distanceToTank < this.tankSpacingDistance) {
        // Too close to another tank, move away from it
        const direction = new THREE.Vector3()
          .subVectors(currentPosition, otherPosition)
          .normalize();
        
        // Adjust target position
        const pushDistance = this.tankSpacingDistance - distanceToTank;
        this.targetPosition.add(direction.multiplyScalar(pushDistance));
      }
    }
    
    // Also maintain distance from player tank if not in attack mode
    if (this.state !== 'attack' && this.state !== 'chase') {
      const distanceToPlayer = this.getDistanceToPlayer();
      
      if (distanceToPlayer < this.tankSpacingDistance) {
        // Too close to player tank, move away from it
        const direction = new THREE.Vector3()
          .subVectors(currentPosition, this.playerTank.getPosition())
          .normalize();
        
        // Adjust target position
        const pushDistance = this.tankSpacingDistance - distanceToPlayer;
        this.targetPosition.add(direction.multiplyScalar(pushDistance));
      }
    }
  }
  
  // Adjust target position to avoid obstacles
  private avoidObstacles(): void {
    const currentPosition = this.tank.getPosition();
    
    // Check distance to each obstacle
    for (const obstacle of this.obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const distanceToObstacle = new THREE.Vector2(currentPosition.x, currentPosition.z)
        .distanceTo(new THREE.Vector2(obstaclePosition.x, obstaclePosition.z));
      
      const avoidanceDistance = this.obstacleAvoidanceDistance + obstacle.getRadius();
      
      if (distanceToObstacle < avoidanceDistance) {
        // Too close to an obstacle, move away from it
        const direction = new THREE.Vector2(
          currentPosition.x - obstaclePosition.x,
          currentPosition.z - obstaclePosition.z
        ).normalize();
        
        // Adjust target position
        const pushDistance = avoidanceDistance - distanceToObstacle;
        this.targetPosition.x += direction.x * pushDistance;
        this.targetPosition.z += direction.y * pushDistance;
      }
    }
  }
  
  // Adjust target position to prefer central area
  private preferCentralArea(): void {
    // Apply central preference with varying strength based on state
    const centralPreferenceMultiplier = this.state === 'attack' || this.state === 'chase' ? 0.3 : 1.0;
    
    const currentPosition = this.tank.getPosition();
    
    // Calculate vector from current position to center
    const toCenter = new THREE.Vector3(-currentPosition.x, 0, -currentPosition.z);
    
    // Calculate distance from center
    const distanceFromCenter = Math.sqrt(currentPosition.x * currentPosition.x + currentPosition.z * currentPosition.z);
    
    // Apply stronger central pull the further from center
    let centralPullStrength = this.centralAreaPreference * 10;
    
    // Increase pull strength exponentially as distance increases
    if (distanceFromCenter > 20) {
      centralPullStrength *= (1 + (distanceFromCenter - 20) / 20);
    }
    
    // Apply central pull
    toCenter.normalize().multiplyScalar(centralPullStrength * centralPreferenceMultiplier);
    
    // Adjust target position
    this.targetPosition.add(toCenter);
  }
  
  // Adjust target position to avoid high heat areas
  private avoidHighHeatAreas(): void {
    const currentPosition = this.tank.getPosition();
    const currentHeat = this.getHeatAtPosition(currentPosition.x, currentPosition.z);
    
    // If current position is hot, adjust target away from hot areas
    if (currentHeat > 3) { // Reduced threshold from 5 to 3
      // Find the coolest direction to move
      let coolestDirection = new THREE.Vector2(0, 0);
      let lowestHeat = currentHeat;
      
      // Check heat in 12 directions (increased from 8)
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const checkDistance = 15;
        const checkX = currentPosition.x + Math.cos(angle) * checkDistance;
        const checkZ = currentPosition.z + Math.sin(angle) * checkDistance;
        
        // Ensure the check position is within bounds
        const boundedX = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, checkX));
        const boundedZ = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, checkZ));
        
        const heatAtCheck = this.getHeatAtPosition(boundedX, boundedZ);
        
        if (heatAtCheck < lowestHeat) {
          lowestHeat = heatAtCheck;
          coolestDirection.set(Math.cos(angle), Math.sin(angle));
        }
      }
      
      // If we found a cooler direction, adjust target
      if (lowestHeat < currentHeat) {
        const pushDistance = 15 * (currentHeat / 10); // Increased from 10 to 15
        this.targetPosition.x += coolestDirection.x * pushDistance;
        this.targetPosition.z += coolestDirection.y * pushDistance;
      }
    }
  }
  
  private setIntelligentTargetPosition(): void {
    // Start with a random position
    this.setRandomTargetPosition();
    
    // Apply tactical adjustments
    this.applyTacticalPositioning();
    
    // Ensure the target is within bounds
    this.ensureTargetWithinBounds();
  }
  
  private setIntelligentRetreatPosition(): void {
    // Start with a position away from the player
    this.setRetreatPosition();
    
    // Apply tactical adjustments
    this.applyTacticalPositioning();
    
    // Ensure the target is within bounds
    this.ensureTargetWithinBounds();
  }
  
  private setIntelligentRepositionTarget(forceCentral: boolean = false): void {
    if (forceCentral) {
      // Move directly toward center with some randomness
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 10; // Small random offset from exact center
      
      this.targetPosition.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
    } else {
      // Prioritize central area for repositioning
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 20;
      
      // Bias towards center
      const centerBias = 0.8; // Increased from 0.7
      const randomX = Math.cos(angle) * distance * (1 - centerBias);
      const randomZ = Math.sin(angle) * distance * (1 - centerBias);
      
      this.targetPosition.set(randomX, 0, randomZ);
    }
    
    // Apply tactical adjustments
    this.applyTacticalPositioning();
    
    // Ensure the target is within bounds
    this.ensureTargetWithinBounds();
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
  
  private ensureTargetWithinBounds(): void {
    // Ensure the target position is within arena bounds with a margin
    const margin = 10; // Increased from 5 to 10
    this.targetPosition.x = Math.max(this.ARENA_BOUNDS.minX + margin, Math.min(this.ARENA_BOUNDS.maxX - margin, this.targetPosition.x));
    this.targetPosition.z = Math.max(this.ARENA_BOUNDS.minZ + margin, Math.min(this.ARENA_BOUNDS.maxZ - margin, this.targetPosition.z));
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
      
      // Calculate new position - FIXED: Use positive direction for forward movement
      let newX = position.x + forward.x * 5 * deltaTime;
      let newZ = position.z + forward.z * 5 * deltaTime;
      
      // Ensure the new position is within arena bounds
      newX = Math.max(this.ARENA_BOUNDS.minX, Math.min(this.ARENA_BOUNDS.maxX, newX));
      newZ = Math.max(this.ARENA_BOUNDS.minZ, Math.min(this.ARENA_BOUNDS.maxZ, newZ));
      
      // Update tank position
      this.tank.setPosition(newX, position.y, newZ);
      
      // If we're very close to the target, consider it reached
      const distanceToTarget = this.tank.getPosition().distanceTo(this.targetPosition);
      if (distanceToTarget < 2) {
        if (this.state === 'idle' || this.state === 'reposition') {
          this.setIntelligentTargetPosition();
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
      
      // Calculate new position - FIXED: Use positive direction for forward movement
      let newX = position.x + forward.x * 5 * deltaTime;
      let newZ = position.z + forward.z * 5 * deltaTime;
      
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
