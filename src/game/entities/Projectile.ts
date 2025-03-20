import * as THREE from 'three';
import { Tank } from './Tank';
import { v4 as uuidv4 } from '../utils/uuid';

export class Projectile {
  private id: string;
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private direction: THREE.Vector3;
  private speed: number = 50;
  private mesh: THREE.Mesh;
  private sourceId: string;
  private damage: number;
  private radius: number = 0.3;
  private lifetime: number = 3; // Seconds before projectile is automatically destroyed
  private timeAlive: number = 0;
  
  constructor(scene: THREE.Scene, sourceTank: Tank, id?: string) {
    this.id = id || uuidv4();
    this.scene = scene;
    this.sourceId = sourceTank.getId();
    this.damage = sourceTank.getDamage();
    
    // Get the position at the end of the tank's barrel
    this.position = sourceTank.getBarrelPosition();
    
    // Get the direction the tank is facing
    this.direction = sourceTank.getForwardDirection();
    
    // Create mesh
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshPhongMaterial({ 
      color: sourceTank.getColor() === 0xff0000 ? 0xff6600 : 0x00aaff,
      emissive: sourceTank.getColor() === 0xff0000 ? 0xff3300 : 0x0066ff,
      emissiveIntensity: 0.5
    });
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Add a point light to the projectile for a glowing effect
    const light = new THREE.PointLight(
      sourceTank.getColor() === 0xff0000 ? 0xff6600 : 0x00aaff,
      1,
      5
    );
    this.mesh.add(light);
  }
  
  public initialize(): void {
    // Position the mesh
    this.mesh.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  public update(deltaTime: number): void {
    // Update position based on direction and speed
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
    this.position.z += this.direction.z * this.speed * deltaTime;
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Update lifetime
    this.timeAlive += deltaTime;
  }
  
  public destroy(): void {
    this.scene.remove(this.mesh);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getDirection(): THREE.Vector3 {
    return this.direction.clone();
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
  
  public getId(): string {
    return this.id;
  }
  
  public isExpired(): boolean {
    return this.timeAlive >= this.lifetime;
  }
}
