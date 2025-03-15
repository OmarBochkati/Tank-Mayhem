import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { v4 as uuidv4 } from '../utils/uuid';

export class Tank {
  private id: string;
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private rotation: number = 0;
  private turretRotation: number = 0;
  
  private tankBody: THREE.Mesh;
  private tankTurret: THREE.Mesh;
  private tankGroup: THREE.Group;
  
  private speed: number = 10;
  private rotationSpeed: number = 2;
  private turretRotationSpeed: number = 3;
  
  private health: number = 100;
  private maxHealth: number = 100;
  private maxAmmo: number = 5;
  private currentAmmo: number = 5;
  private reloadTime: number = 1.5;
  private reloadTimer: number = 0;
  private fireRate: number = 0.5;
  private fireTimer: number = 0;
  
  private radius: number = 2;
  private color: number = 0x3498db;
  
  // For cursor aiming
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  
  constructor(scene: THREE.Scene, x: number, y: number, z: number) {
    this.id = uuidv4();
    this.scene = scene;
    this.position = new THREE.Vector3(x, y, z);
    this.tankGroup = new THREE.Group();
  }
  
  public initialize(): void {
    // Create tank body
    const bodyGeometry = new THREE.BoxGeometry(3, 1, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: this.color });
    this.tankBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.tankBody.castShadow = true;
    this.tankBody.receiveShadow = true;
    
    // Create tank turret
    const turretGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
    const turretMaterial = new THREE.MeshPhongMaterial({ color: this.color });
    this.tankTurret = new THREE.Mesh(turretGeometry, turretMaterial);
    this.tankTurret.position.y = 1;
    this.tankTurret.castShadow = true;
    this.tankTurret.receiveShadow = true;
    
    // Create tank barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
    const barrelMaterial = new THREE.MeshPhongMaterial({ color: this.color });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = 1.5;
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    
    // Add barrel to turret
    this.tankTurret.add(barrel);
    
    // Add body and turret to tank group
    this.tankGroup.add(this.tankBody);
    this.tankGroup.add(this.tankTurret);
    
    // Position the tank
    this.tankGroup.position.copy(this.position);
    
    // Add tank to scene
    this.scene.add(this.tankGroup);
  }
  
  public update(deltaTime: number, inputManager?: InputManager, camera?: THREE.Camera): void {
    // Update reload timer
    if (this.reloadTimer > 0) {
      this.reloadTimer -= deltaTime;
      if (this.reloadTimer <= 0 && this.currentAmmo < this.maxAmmo) {
        this.currentAmmo++;
        if (this.currentAmmo < this.maxAmmo) {
          this.reloadTimer = this.reloadTime;
        }
      }
    }
    
    // Update fire timer
    if (this.fireTimer > 0) {
      this.fireTimer -= deltaTime;
    }
    
    // Handle input if provided
    if (inputManager) {
      const movement = inputManager.getMovementInput();
      
      // Rotate tank body
      if (movement.x !== 0) {
        this.rotation += movement.x * this.rotationSpeed * deltaTime;
        this.tankGroup.rotation.y = this.rotation;
      }
      
      // Move tank forward/backward - FIXED: positive Z is forward
      if (movement.z !== 0) {
        const moveSpeed = this.speed * deltaTime * movement.z;
        const moveX = Math.sin(this.rotation) * moveSpeed;
        const moveZ = Math.cos(this.rotation) * moveSpeed;
        
        this.position.x -= moveX;
        this.position.z -= moveZ;
        this.tankGroup.position.copy(this.position);
      }
      
      // Aim turret at cursor position if camera is provided
      if (camera) {
        this.aimAtCursor(inputManager, camera);
      }
    }
  }
  
  // Updated method to aim the turret at the cursor position
  private aimAtCursor(inputManager: InputManager, camera: THREE.Camera): void {
    // Get the mouse position in normalized device coordinates
    const mousePos = inputManager.getMousePosition();
    
    // Create a ray from the camera through the mouse position
    this.raycaster.setFromCamera(new THREE.Vector2(mousePos.x, mousePos.y), camera);
    
    // Find where the ray intersects the ground plane
    const targetPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, targetPoint);
    
    // Calculate direction from tank to target point
    const direction = new THREE.Vector3();
    direction.subVectors(targetPoint, this.position).normalize();
    
    // Calculate the angle for the turret
    const targetAngle = Math.atan2(direction.x, direction.z);
    
    // Smoothly rotate the turret towards the target angle
    const angleDiff = this.normalizeAngle(targetAngle - this.turretRotation);
    
    if (Math.abs(angleDiff) > 0.01) {
      const rotationAmount = Math.sign(angleDiff) * Math.min(this.turretRotationSpeed * 0.1, Math.abs(angleDiff));
      this.turretRotation += rotationAmount;
      this.tankTurret.rotation.y = this.turretRotation;
    }
  }
  
  // Helper method to normalize an angle to the range [-PI, PI]
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
  
  public destroy(): void {
    this.scene.remove(this.tankGroup);
  }
  
  public reset(): void {
    this.health = this.maxHealth;
    this.currentAmmo = this.maxAmmo;
    this.reloadTimer = 0;
    this.fireTimer = 0;
  }
  
  // Getters and setters
  public getId(): string {
    return this.id;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.tankGroup.position.copy(this.position);
  }
  
  public getRotation(): number {
    return this.rotation;
  }
  
  public setRotation(rotation: number): void {
    this.rotation = rotation;
    this.tankGroup.rotation.y = this.rotation;
  }
  
  public getTurretRotation(): number {
    return this.turretRotation;
  }
  
  public setTurretRotation(rotation: number): void {
    this.turretRotation = rotation;
    this.tankTurret.rotation.y = this.turretRotation;
  }
  
  public getRadius(): number {
    return this.radius;
  }
  
  public getHealth(): number {
    return this.health;
  }
  
  public getMaxHealth(): number {
    return this.maxHealth;
  }
  
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Visual feedback for damage
    const flashMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const originalMaterial = this.tankBody.material as THREE.MeshPhongMaterial;
    
    this.tankBody.material = flashMaterial;
    this.tankTurret.material = flashMaterial;
    
    setTimeout(() => {
      this.tankBody.material = originalMaterial;
      this.tankTurret.material = originalMaterial;
    }, 100);
  }
  
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  
  public getCurrentAmmo(): number {
    return this.currentAmmo;
  }
  
  public getMaxAmmo(): number {
    return this.maxAmmo;
  }
  
  public canFire(): boolean {
    return this.currentAmmo > 0 && this.fireTimer <= 0;
  }
  
  public fire(): void {
    if (this.canFire()) {
      this.currentAmmo--;
      this.fireTimer = this.fireRate;
      
      if (this.reloadTimer <= 0 && this.currentAmmo < this.maxAmmo) {
        this.reloadTimer = this.reloadTime;
      }
    }
  }
  
  public setColor(color: number): void {
    this.color = color;
    (this.tankBody.material as THREE.MeshPhongMaterial).color.set(color);
    (this.tankTurret.material as THREE.MeshPhongMaterial).color.set(color);
  }
  
  public getForwardDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
    return direction;
  }
  
  public getTurretDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.turretRotation);
    return direction;
  }
  
  public getBarrelPosition(): THREE.Vector3 {
    const direction = this.getTurretDirection();
    return new THREE.Vector3(
      this.position.x + direction.x * 3,
      this.position.y + 1,
      this.position.z + direction.z * 3
    );
  }
}
