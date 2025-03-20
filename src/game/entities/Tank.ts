import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { v4 as uuidv4 } from '../utils/uuid';

export class Tank {
  private id: string;
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private rotation: number = 0;
  
  private tankBody: THREE.Mesh;
  private tankTurret: THREE.Mesh;
  private tankGroup: THREE.Group;
  
  // Health bar elements
  private healthBarGroup: THREE.Group;
  private healthBarBackground: THREE.Mesh;
  private healthBarFill: THREE.Mesh;
  private healthBarWidth: number = 3;
  private healthBarHeight: number = 0.3;
  
  private speed: number = 10;
  private rotationSpeed: number = 2;
  
  private health: number = 100;
  private maxHealth: number = 100;
  private maxAmmo: number = 5;
  private currentAmmo: number = 5;
  private reloadTime: number = 1.5;
  private reloadTimer: number = 0;
  private fireRate: number = 0.5;
  private fireTimer: number = 0;
  private damage: number = 20; // Damage dealt by projectiles
  
  private radius: number = 2;
  private color: number = 0x3498db;
  
  constructor(scene: THREE.Scene, x: number, y: number, z: number) {
    this.id = uuidv4();
    this.scene = scene;
    this.position = new THREE.Vector3(x, y, z);
    this.tankGroup = new THREE.Group();
    this.healthBarGroup = new THREE.Group();
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
    
    // Initialize health bar
    this.initializeHealthBar();
    
    // Position the tank
    this.tankGroup.position.copy(this.position);
    
    // Add tank to scene
    this.scene.add(this.tankGroup);
  }
  
  private initializeHealthBar(): void {
    // Create health bar background (black background)
    const backgroundGeometry = new THREE.PlaneGeometry(this.healthBarWidth, this.healthBarHeight);
    const backgroundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });
    this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    
    // Create health bar fill (green foreground)
    const fillGeometry = new THREE.PlaneGeometry(this.healthBarWidth, this.healthBarHeight);
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x2ecc71,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    
    // Position the fill slightly in front of the background to avoid z-fighting
    this.healthBarFill.position.z = 0.01;
    
    // Set the origin of the health bar to the left side
    this.healthBarFill.geometry.translate(this.healthBarWidth / 2, 0, 0);
    this.healthBarBackground.geometry.translate(this.healthBarWidth / 2, 0, 0);
    
    // Add health bar elements to the health bar group
    this.healthBarGroup.add(this.healthBarBackground);
    this.healthBarGroup.add(this.healthBarFill);
    
    // Position the health bar above the tank
    this.healthBarGroup.position.set(0, 3.5, 0);
    
    // Add health bar group to the tank group
    this.tankGroup.add(this.healthBarGroup);
    
    // Update the health bar to match initial health
    this.updateHealthBar();
  }
  
  private updateHealthBar(): void {
    if (!this.healthBarFill) return;
    
    // Calculate health percentage
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
    
    // Scale the health bar fill based on current health
    this.healthBarFill.scale.x = healthPercent;
    
    // Adjust the position to keep the left edge aligned
    this.healthBarFill.position.x = -this.healthBarWidth * (1 - healthPercent) / 2;
    
    // Change color based on health percentage
    const fillMaterial = this.healthBarFill.material as THREE.MeshBasicMaterial;
    
    if (healthPercent > 0.6) {
      fillMaterial.color.setHex(0x2ecc71); // Green
    } else if (healthPercent > 0.3) {
      fillMaterial.color.setHex(0xf39c12); // Orange
    } else {
      fillMaterial.color.setHex(0xe74c3c); // Red
    }
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
      
      // Move tank forward/backward
      if (movement.z !== 0) {
        const moveSpeed = this.speed * deltaTime * movement.z;
        const moveX = Math.sin(this.rotation) * moveSpeed;
        const moveZ = Math.cos(this.rotation) * moveSpeed;
        
        this.position.x -= moveX;
        this.position.z -= moveZ;
        this.tankGroup.position.copy(this.position);
      }
    }
    
    // Make health bar face the camera if camera is provided
    if (camera && this.healthBarGroup) {
      this.updateHealthBarOrientation(camera);
    }
  }
  
  // Make the health bar always face the camera (billboarding)
  private updateHealthBarOrientation(camera: THREE.Camera): void {
    // Get the camera position
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    // Calculate direction from health bar to camera
    const direction = new THREE.Vector3();
    direction.subVectors(cameraPosition, this.healthBarGroup.getWorldPosition(new THREE.Vector3()));
    
    // Remove the y component to only rotate around the y-axis
    direction.y = 0;
    direction.normalize();
    
    // Set the health bar rotation to face the camera
    this.healthBarGroup.lookAt(
      this.healthBarGroup.getWorldPosition(new THREE.Vector3()).add(direction)
    );
  }
  
  public destroy(): void {
    this.scene.remove(this.tankGroup);
  }
  
  public reset(): void {
    this.health = this.maxHealth;
    this.currentAmmo = this.maxAmmo;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.updateHealthBar();
  }
  
  // Getters and setters
  public getId(): string {
    return this.id;
  }
  
  public getMeshId(): number {
    return this.tankGroup.id;
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
  
  public getRadius(): number {
    return this.radius;
  }
  
  public getHealth(): number {
    return this.health;
  }
  
  public setHealth(health: number): void {
    this.health = health;
    this.updateHealthBar();
  }
  
  public getMaxHealth(): number {
    return this.maxHealth;
  }
  
  public setMaxHealth(maxHealth: number): void {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.updateHealthBar();
  }
  
  public getDamage(): number {
    return this.damage;
  }
  
  public setDamage(damage: number): void {
    this.damage = damage;
  }
  
  public getSpeed(): number {
    return this.speed;
  }
  
  public setSpeed(speed: number): void {
    this.speed = speed;
  }
  
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Update the health bar
    this.updateHealthBar();
    
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
    
    // Update the health bar
    this.updateHealthBar();
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
      
      // Add muzzle flash effect
      this.createMuzzleFlash();
    }
  }
  
  private createMuzzleFlash(): void {
    // Create a point light for muzzle flash
    const muzzleFlash = new THREE.PointLight(
      this.color === 0xff0000 ? 0xff6600 : 0x00aaff, 
      2, 
      10
    );
    
    // Position at the end of the barrel
    const barrelPos = this.getBarrelPosition();
    muzzleFlash.position.copy(barrelPos);
    
    // Add to scene
    this.scene.add(muzzleFlash);
    
    // Remove after a short time
    setTimeout(() => {
      this.scene.remove(muzzleFlash);
    }, 100);
  }
  
  public setColor(color: number): void {
    this.color = color;
    (this.tankBody.material as THREE.MeshPhongMaterial).color.set(color);
    (this.tankTurret.material as THREE.MeshPhongMaterial).color.set(color);
  }
  
  public getColor(): number {
    return this.color;
  }
  
  public getForwardDirection(): THREE.Vector3 {
    // Create a forward vector (positive Z is forward in Three.js)
    const direction = new THREE.Vector3(0, 0, 1);
    
    // Apply the tank's rotation to this vector
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
    
    return direction;
  }
  
  public getTurretDirection(): THREE.Vector3 {
    // Now the turret always faces the same direction as the tank body
    return this.getForwardDirection();
  }
  
  public getBarrelPosition(): THREE.Vector3 {
    // Get the forward direction vector
    const direction = this.getForwardDirection();
    
    // Calculate the position at the end of the barrel
    // The barrel extends 3 units from the center of the turret
    // The turret is positioned at the center of the tank, 1 unit above the ground
    return new THREE.Vector3(
      this.position.x + direction.x * 3,  // 3 units forward from tank center
      this.position.y + 1,                // 1 unit above ground (center of turret)
      this.position.z + direction.z * 3   // 3 units forward from tank center
    );
  }
}
