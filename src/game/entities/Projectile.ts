import * as THREE from 'three';
import { Tank } from './Tank';

export class Projectile {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private position: THREE.Vector3;
  private direction: THREE.Vector3;
  private speed: number = 30;
  private radius: number = 0.3;
  private sourceId: string;
  private damage: number;
  
  constructor(scene: THREE.Scene, sourceTank: Tank) {
    this.scene = scene;
    this.sourceId = sourceTank.getId();
    
    // Get the position at the end of the tank's barrel
    this.position = sourceTank.getBarrelPosition();
    
    // Get the direction the tank's turret is facing
    this.direction = sourceTank.getTurretDirection();
    
    // Get the damage from the source tank
    this.damage = sourceTank.getDamage();
  }
  
  public initialize(): void {
    // Create projectile geometry
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffff00,
      emissive: 0xff8800,
      emissiveIntensity: 0.5
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    
    // Position the projectile
    this.mesh.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Add a point light to the projectile
    const light = new THREE.PointLight(0xff8800, 1, 5);
    this.mesh.add(light);
  }
  
  public update(deltaTime: number): void {
    // Move the projectile in its direction
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
    this.position.z += this.direction.z * this.speed * deltaTime;
    
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
