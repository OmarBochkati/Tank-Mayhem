import * as THREE from 'three';
import { Tank } from '../entities/Tank';
import { Projectile } from '../entities/Projectile';
import { Obstacle } from '../environment/Obstacle';
import { PowerUp } from '../entities/PowerUp';

export class PhysicsEngine {
  constructor() {}
  
  // Check if a tank collides with any obstacles or other tanks
  public checkTankCollision(tank: Tank, obstacles: Obstacle[], otherTanks: Tank[]): boolean {
    const tankPosition = tank.getPosition();
    const tankRadius = tank.getRadius();
    
    // Check collision with obstacles
    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const obstacleRadius = obstacle.getRadius();
      
      const distance = Math.sqrt(
        Math.pow(tankPosition.x - obstaclePosition.x, 2) +
        Math.pow(tankPosition.z - obstaclePosition.z, 2)
      );
      
      if (distance < tankRadius + obstacleRadius) {
        return true;
      }
    }
    
    // Check collision with other tanks
    for (const otherTank of otherTanks) {
      if (otherTank.getId() === tank.getId()) continue;
      
      const otherPosition = otherTank.getPosition();
      const otherRadius = otherTank.getRadius();
      
      const distance = Math.sqrt(
        Math.pow(tankPosition.x - otherPosition.x, 2) +
        Math.pow(tankPosition.z - otherPosition.z, 2)
      );
      
      if (distance < tankRadius + otherRadius) {
        return true;
      }
    }
    
    return false;
  }
  
  // Check if a projectile collides with any tanks or obstacles
  public checkProjectileCollisions(
    projectile: Projectile, 
    tanks: Tank[], 
    obstacles: Obstacle[]
  ): { 
    hasCollided: boolean, 
    hitTank?: Tank, 
    hitObstacle?: Obstacle 
  } {
    const projectilePosition = projectile.getPosition();
    const projectileRadius = projectile.getRadius();
    const projectileSourceId = projectile.getSourceId();
    
    // Check collision with tanks
    for (const tank of tanks) {
      // Skip the tank that fired the projectile
      if (tank.getId() === projectileSourceId) continue;
      
      const tankPosition = tank.getPosition();
      const tankRadius = tank.getRadius();
      
      const distance = Math.sqrt(
        Math.pow(projectilePosition.x - tankPosition.x, 2) +
        Math.pow(projectilePosition.y - (tankPosition.y + 1), 2) + // Add 1 to y for tank height
        Math.pow(projectilePosition.z - tankPosition.z, 2)
      );
      
      if (distance < projectileRadius + tankRadius) {
        // Apply damage to the tank
        tank.takeDamage(projectile.getDamage());
        
        return {
          hasCollided: true,
          hitTank: tank
        };
      }
    }
    
    // Check collision with obstacles
    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.getPosition();
      const obstacleRadius = obstacle.getRadius();
      
      const distance = Math.sqrt(
        Math.pow(projectilePosition.x - obstaclePosition.x, 2) +
        Math.pow(projectilePosition.y - (obstaclePosition.y + obstacleRadius / 2), 2) +
        Math.pow(projectilePosition.z - obstaclePosition.z, 2)
      );
      
      if (distance < projectileRadius + obstacleRadius) {
        // Apply damage to the obstacle
        obstacle.takeDamage(projectile.getDamage());
        
        return {
          hasCollided: true,
          hitObstacle: obstacle
        };
      }
    }
    
    return { hasCollided: false };
  }
  
  // Check if a power-up collides with a tank
  public checkPowerUpCollision(powerUp: PowerUp, tank: Tank): boolean {
    const powerUpPosition = powerUp.getPosition();
    const powerUpRadius = powerUp.getRadius();
    const tankPosition = tank.getPosition();
    const tankRadius = tank.getRadius();
    
    const distance = Math.sqrt(
      Math.pow(powerUpPosition.x - tankPosition.x, 2) +
      Math.pow(powerUpPosition.z - tankPosition.z, 2)
    );
    
    return distance < powerUpRadius + tankRadius;
  }
}
