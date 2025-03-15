import * as THREE from 'three';
import { Tank } from '../entities/Tank';
import { Projectile } from '../entities/Projectile';
import { Obstacle } from '../environment/Obstacle';
import { PowerUp } from '../entities/PowerUp';

export class PhysicsEngine {
  private static readonly COLLISION_THRESHOLD = 0.1;
  
  constructor() {}
  
  public checkTankCollision(tank: Tank, obstacles: Obstacle[], otherTanks: Tank[]): boolean {
    const tankPosition = tank.getPosition();
    const tankRadius = tank.getRadius();
    
    // Check collision with obstacles
    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const obstacleRadius = obstacle.getRadius();
      
      const distance = new THREE.Vector2(
        tankPosition.x - obstaclePosition.x,
        tankPosition.z - obstaclePosition.z
      ).length();
      
      if (distance < tankRadius + obstacleRadius + PhysicsEngine.COLLISION_THRESHOLD) {
        return true;
      }
    }
    
    // Check collision with other tanks
    for (const otherTank of otherTanks) {
      if (tank === otherTank) continue;
      
      const otherPosition = otherTank.getPosition();
      const otherRadius = otherTank.getRadius();
      
      const distance = new THREE.Vector2(
        tankPosition.x - otherPosition.x,
        tankPosition.z - otherPosition.z
      ).length();
      
      if (distance < tankRadius + otherRadius + PhysicsEngine.COLLISION_THRESHOLD) {
        return true;
      }
    }
    
    return false;
  }
  
  public checkProjectileCollisions(
    projectile: Projectile, 
    tanks: Tank[], 
    obstacles: Obstacle[]
  ): { 
    hasCollided: boolean; 
    hitTank: Tank | null; 
    hitObstacle: Obstacle | null;
  } {
    const projectilePosition = projectile.getPosition();
    const projectileRadius = projectile.getRadius();
    const sourceId = projectile.getSourceId();
    
    const result = {
      hasCollided: false,
      hitTank: null,
      hitObstacle: null
    };
    
    // Check collision with tanks
    for (const tank of tanks) {
      // Skip the tank that fired this projectile
      if (tank.getId() === sourceId) continue;
      
      const tankPosition = tank.getPosition();
      const tankRadius = tank.getRadius();
      
      const distance = new THREE.Vector3(
        projectilePosition.x - tankPosition.x,
        projectilePosition.y - tankPosition.y,
        projectilePosition.z - tankPosition.z
      ).length();
      
      if (distance < projectileRadius + tankRadius) {
        tank.takeDamage(projectile.getDamage());
        result.hasCollided = true;
        result.hitTank = tank;
        return result;
      }
    }
    
    // Check collision with obstacles
    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const obstacleRadius = obstacle.getRadius();
      
      const distance = new THREE.Vector3(
        projectilePosition.x - obstaclePosition.x,
        projectilePosition.y - obstaclePosition.y,
        projectilePosition.z - obstaclePosition.z
      ).length();
      
      if (distance < projectileRadius + obstacleRadius) {
        obstacle.takeDamage(projectile.getDamage());
        result.hasCollided = true;
        result.hitObstacle = obstacle;
        return result;
      }
    }
    
    // Check if projectile is out of bounds
    const arenaSize = 100; // Should match the arena size
    if (
      Math.abs(projectilePosition.x) > arenaSize / 2 ||
      Math.abs(projectilePosition.z) > arenaSize / 2
    ) {
      result.hasCollided = true;
      return result;
    }
    
    return result;
  }
  
  public checkPowerUpCollision(powerUp: PowerUp, tank: Tank): boolean {
    const powerUpPosition = powerUp.getPosition();
    const tankPosition = tank.getPosition();
    const distance = new THREE.Vector2(
      powerUpPosition.x - tankPosition.x,
      powerUpPosition.z - tankPosition.z
    ).length();
    
    return distance < tank.getRadius() + powerUp.getRadius();
  }
  
  public resolveCollision(tank: Tank, obstacles: Obstacle[], otherTanks: Tank[]): void {
    const tankPosition = tank.getPosition();
    const tankRadius = tank.getRadius();
    
    // Resolve collision with obstacles
    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const obstacleRadius = obstacle.getRadius();
      
      const dx = tankPosition.x - obstaclePosition.x;
      const dz = tankPosition.z - obstaclePosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < tankRadius + obstacleRadius + PhysicsEngine.COLLISION_THRESHOLD) {
        // Calculate push direction
        const pushX = dx / distance;
        const pushZ = dz / distance;
        
        // Calculate push amount
        const pushAmount = tankRadius + obstacleRadius + PhysicsEngine.COLLISION_THRESHOLD - distance;
        
        // Push tank away from obstacle
        tank.setPosition(
          tankPosition.x + pushX * pushAmount,
          tankPosition.y,
          tankPosition.z + pushZ * pushAmount
        );
      }
    }
    
    // Resolve collision with other tanks
    for (const otherTank of otherTanks) {
      if (tank === otherTank) continue;
      
      const otherPosition = otherTank.getPosition();
      const otherRadius = otherTank.getRadius();
      
      const dx = tankPosition.x - otherPosition.x;
      const dz = tankPosition.z - otherPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < tankRadius + otherRadius + PhysicsEngine.COLLISION_THRESHOLD) {
        // Calculate push direction
        const pushX = dx / distance;
        const pushZ = dz / distance;
        
        // Calculate push amount
        const pushAmount = (tankRadius + otherRadius + PhysicsEngine.COLLISION_THRESHOLD - distance) / 2;
        
        // Push both tanks away from each other
        tank.setPosition(
          tankPosition.x + pushX * pushAmount,
          tankPosition.y,
          tankPosition.z + pushZ * pushAmount
        );
        
        otherTank.setPosition(
          otherPosition.x - pushX * pushAmount,
          otherPosition.y,
          otherPosition.z - pushZ * pushAmount
        );
      }
    }
  }
}
