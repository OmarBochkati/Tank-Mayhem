import * as THREE from 'three';
import { Tank } from './Tank';
import { v4 as uuidv4 } from '../utils/uuid';

export class PowerUp {
  private id: string;
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private mesh: THREE.Group;
  private type: number; // 0: Health, 1: Ammo, 2: Speed, 3: Damage
  private rotationSpeed: number = 1;
  private bobSpeed: number = 2;
  private bobHeight: number = 0.5;
  private initialY: number;
  private lifetime: number = 15; // Seconds before power-up disappears
  private timeAlive: number = 0;
  private radius: number = 1.5;
  
  constructor(scene: THREE.Scene, x: number, y: number, z: number, id?: string) {
    this.id = id || uuidv4();
    this.scene = scene;
    this.position = new THREE.Vector3(x, y, z);
    this.initialY = y;
    this.mesh = new THREE.Group();
    
    // Randomly select power-up type
    this.type = Math.floor(Math.random() * 4);
  }
  
  public initialize(): void {
    // Create base geometry
    const baseGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    
    // Create material based on power-up type
    let material: THREE.Material;
    
    switch (this.type) {
      case 0: // Health
        material = new THREE.MeshPhongMaterial({ 
          color: 0x2ecc71,
          emissive: 0x27ae60,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
        });
        break;
      case 1: // Ammo
        material = new THREE.MeshPhongMaterial({ 
          color: 0xf39c12,
          emissive: 0xe67e22,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
        });
        break;
      case 2: // Speed
        material = new THREE.MeshPhongMaterial({ 
          color: 0x3498db,
          emissive: 0x2980b9,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
        });
        break;
      case 3: // Damage
        material = new THREE.MeshPhongMaterial({ 
          color: 0xe74c3c,
          emissive: 0xc0392b,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
        });
        break;
      default:
        material = new THREE.MeshPhongMaterial({ 
          color: 0xffffff,
          emissive: 0xcccccc,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8
        });
    }
    
    const baseMesh = new THREE.Mesh(baseGeometry, material);
    this.mesh.add(baseMesh);
    
    // Add icon or symbol based on power-up type
    this.addTypeIcon();
    
    // Add a point light to the power-up for a glowing effect
    const light = new THREE.PointLight(this.getColorForType(), 1, 5);
    light.position.set(0, 0, 0);
    this.mesh.add(light);
    
    // Position the mesh
    this.mesh.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  private addTypeIcon(): void {
    let iconGeometry: THREE.BufferGeometry;
    
    switch (this.type) {
      case 0: // Health - cross
        iconGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
        const horizontalPart = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.3, 0.3),
          new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        const verticalPart = new THREE.Mesh(
          iconGeometry,
          new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        verticalPart.position.z = 0.8;
        horizontalPart.position.z = 0.8;
        this.mesh.add(horizontalPart);
        this.mesh.add(verticalPart);
        break;
        
      case 1: // Ammo - bullet
        iconGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
        const bulletMesh = new THREE.Mesh(
          iconGeometry,
          new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        bulletMesh.rotation.x = Math.PI / 2;
        bulletMesh.position.z = 0.8;
        this.mesh.add(bulletMesh);
        break;
        
      case 2: // Speed - lightning bolt
        // Create a simple lightning bolt shape
        const points = [
          new THREE.Vector3(0, 0.6, 0),
          new THREE.Vector3(-0.2, 0.2, 0),
          new THREE.Vector3(0.1, 0.2, 0),
          new THREE.Vector3(-0.1, -0.2, 0),
          new THREE.Vector3(0.2, -0.2, 0),
          new THREE.Vector3(0, -0.6, 0)
        ];
        
        const lightningGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lightningMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
        const lightningMesh = new THREE.Line(lightningGeometry, lightningMaterial);
        lightningMesh.position.z = 0.8;
        lightningMesh.scale.set(1.5, 1.5, 1.5);
        this.mesh.add(lightningMesh);
        break;
        
      case 3: // Damage - star
        // Create a simple star shape
        const starPoints = [];
        const outerRadius = 0.5;
        const innerRadius = 0.2;
        const numPoints = 5;
        
        for (let i = 0; i < numPoints * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i / numPoints) * Math.PI;
          starPoints.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
          ));
        }
        
        // Close the shape
        starPoints.push(starPoints[0].clone());
        
        const starGeometry = new THREE.BufferGeometry().setFromPoints(starPoints);
        const starMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
        const starMesh = new THREE.Line(starGeometry, starMaterial);
        starMesh.position.z = 0.8;
        this.mesh.add(starMesh);
        break;
    }
  }
  
  private getColorForType(): number {
    switch (this.type) {
      case 0: return 0x2ecc71; // Health - Green
      case 1: return 0xf39c12; // Ammo - Orange
      case 2: return 0x3498db; // Speed - Blue
      case 3: return 0xe74c3c; // Damage - Red
      default: return 0xffffff; // White
    }
  }
  
  public update(deltaTime: number): void {
    // Rotate the power-up
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    
    // Bob up and down
    const bobOffset = Math.sin(this.timeAlive * this.bobSpeed) * this.bobHeight;
    this.mesh.position.y = this.initialY + bobOffset;
    
    // Update lifetime
    this.timeAlive += deltaTime;
    
    // Make the power-up flash when it's about to expire
    if (this.lifetime - this.timeAlive < 3) {
      const flashRate = 5; // Flashes per second
      const visibility = Math.sin(this.timeAlive * flashRate * Math.PI) > 0;
      this.mesh.visible = visibility;
    }
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
  
  public getType(): number {
    return this.type;
  }
  
  public setType(type: number): void {
    this.type = type;
  }
  
  public getId(): string {
    return this.id;
  }
  
  public isExpired(): boolean {
    return this.timeAlive >= this.lifetime;
  }
  
  public applyEffect(tank: Tank): void {
    switch (this.type) {
      case 0: // Health
        tank.heal(50);
        break;
      case 1: // Ammo
        // Refill ammo
        for (let i = 0; i < tank.getMaxAmmo(); i++) {
          tank.fire(); // This is a hack to trigger the reload timer
        }
        break;
      case 2: // Speed
        tank.setSpeed(tank.getSpeed() * 1.5);
        // Speed boost is temporary
        setTimeout(() => {
          tank.setSpeed(tank.getSpeed() / 1.5);
        }, 10000); // 10 seconds
        break;
      case 3: // Damage
        tank.setDamage(tank.getDamage() * 1.5);
        // Damage boost is temporary
        setTimeout(() => {
          tank.setDamage(tank.getDamage() / 1.5);
        }, 10000); // 10 seconds
        break;
    }
  }
}
