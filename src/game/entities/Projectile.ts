import * as THREE from 'three';
import { Tank } from './Tank';

export class Projectile {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private direction: THREE.Vector3;
  private velocity: number = 30;
  private mesh: THREE.Mesh;
  private sourceId: string;
  private damage: number = 25;
  private radius: number = 0.3;
  
  constructor(scene: THREE.Scene, sourceTank: Tank) {
    this.scene = scene;
    this.sourceId = sourceTank.getId();
    
    // Get the position from the tank's barrel
    this.position = sourceTank.getBarrelPosition();
    
    // Get the forward direction from the tank
    // The key fix: we need to use the tank's forward direction
    this.direction = sourceTank.getForwardDirection().clone();
  }
  
  public initialize(): void {
    // Create projectile mesh
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Position the projectile
    this.mesh.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  public update(deltaTime: number): void {
    // Move projectile in its direction
    const moveAmount = this.velocity * deltaTime;
    
    this.position.x += this.direction.x * moveAmount;
    this.position.y += this.direction.y * moveAmount;
    this.position.z += this.direction.z * moveAmount;
    
    // Update mesh position
    this.mesh.position.copy(this.position);
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
  
  public getSourceId(): string {
    return this.sourceId;
  }
  
  public getDamage(): number {
    return this.damage;
  }
}
