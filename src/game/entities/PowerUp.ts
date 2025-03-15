import * as THREE from 'three';
import { Tank } from './Tank';

export enum PowerUpType {
  HEALTH,
  AMMO,
  SPEED,
  DAMAGE
}

export class PowerUp {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private mesh: THREE.Mesh;
  private type: PowerUpType;
  private radius: number = 1;
  private rotationSpeed: number = 1;
  
  constructor(scene: THREE.Scene, x: number, y: number, z: number) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, y, z);
    this.type = Math.floor(Math.random() * 4); // Random power-up type
  }
  
  public initialize(): void {
    // Create power-up mesh
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (this.type) {
      case PowerUpType.HEALTH:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        break;
      case PowerUpType.AMMO:
        geometry = new THREE.ConeGeometry(0.7, 1.5, 4);
        material = new THREE.MeshPhongMaterial({ color: 0xff9900 });
        break;
      case PowerUpType.SPEED:
        geometry = new THREE.SphereGeometry(0.7, 8, 8);
        material = new THREE.MeshPhongMaterial({ color: 0x0099ff });
        break;
      case PowerUpType.DAMAGE:
        geometry = new THREE.TetrahedronGeometry(0.8);
        material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        break;
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Position the power-up
    this.mesh.position.copy(this.position);
    this.mesh.position.y = 1; // Hover above ground
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  public update(deltaTime: number): void {
    // Rotate the power-up
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    
    // Make it hover up and down
    const hoverHeight = 0.5;
    const hoverSpeed = 1;
    this.mesh.position.y = 1 + Math.sin(Date.now() * 0.002 * hoverSpeed) * hoverHeight;
  }
  
  public destroy(): void {
    this.scene.remove(this.mesh);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getRadius(): number {
    return this.radius;
  }
  
  public getType(): PowerUpType {
    return this.type;
  }
  
  public applyEffect(tank: Tank): void {
    switch (this.type) {
      case PowerUpType.HEALTH:
        tank.heal(50);
        break;
      case PowerUpType.AMMO:
        // Refill ammo (handled in Tank class)
        tank.fire(); // Trigger reload
        tank.fire();
        tank.fire();
        tank.fire();
        tank.fire();
        break;
      case PowerUpType.SPEED:
        // Speed boost would be implemented here
        break;
      case PowerUpType.DAMAGE:
        // Damage boost would be implemented here
        break;
    }
  }
}
