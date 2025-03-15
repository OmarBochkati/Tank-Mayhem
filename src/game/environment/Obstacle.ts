import * as THREE from 'three';

export class Obstacle {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private mesh: THREE.Mesh;
  private radius: number;
  private health: number = 100;
  private maxHealth: number = 100;
  private destructible: boolean = true;
  
  constructor(scene: THREE.Scene, x: number, y: number, z: number, radius: number) {
    this.scene = scene;
    this.position = new THREE.Vector3(x, y, z);
    this.radius = radius;
    
    // Larger obstacles have more health
    this.maxHealth = 50 + radius * 20;
    this.health = this.maxHealth;
  }
  
  public initialize(): void {
    // Create obstacle mesh
    const geometry = new THREE.BoxGeometry(this.radius * 2, this.radius * 2, this.radius * 2);
    const material = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown color
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Position the obstacle
    this.mesh.position.copy(this.position);
    this.mesh.position.y = this.radius; // Center vertically
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  public update(deltaTime: number): void {
    // Obstacles don't need to be updated every frame
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
  
  public getHealth(): number {
    return this.health;
  }
  
  public takeDamage(amount: number): void {
    if (!this.destructible) return;
    
    this.health = Math.max(0, this.health - amount);
    
    // Visual feedback for damage
    const damagePercentage = this.health / this.maxHealth;
    
    // Change color based on damage
    const color = new THREE.Color();
    color.setRGB(
      0.55 + (1 - damagePercentage) * 0.45, // More red as damage increases
      0.27 * damagePercentage,              // Less green as damage increases
      0.08 * damagePercentage               // Less blue as damage increases
    );
    
    (this.mesh.material as THREE.MeshPhongMaterial).color.copy(color);
    
    // Scale down slightly as damage increases
    const scale = 0.8 + damagePercentage * 0.2;
    this.mesh.scale.set(scale, scale, scale);
    
    // If destroyed, show destruction effect
    if (this.health <= 0) {
      this.showDestructionEffect();
    }
  }
  
  private showDestructionEffect(): void {
    // Create debris particles
    const particleCount = 20;
    const particleGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const particleMaterial = new THREE.MeshPhongMaterial({ 
      color: (this.mesh.material as THREE.MeshPhongMaterial).color 
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Position particle at obstacle position with slight random offset
      particle.position.copy(this.position);
      particle.position.x += (Math.random() - 0.5) * this.radius;
      particle.position.y += (Math.random() - 0.5) * this.radius + this.radius;
      particle.position.z += (Math.random() - 0.5) * this.radius;
      
      // Add random rotation
      particle.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      this.scene.add(particle);
      
      // Animate particle flying away and fading
      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.5 + 0.5, // Mostly upward
        Math.random() - 0.5
      ).normalize();
      
      const speed = 5 + Math.random() * 5;
      
      // Use animation loop or GSAP if available
      const animateParticle = () => {
        particle.position.x += direction.x * speed * 0.05;
        particle.position.y += direction.y * speed * 0.05;
        particle.position.z += direction.z * speed * 0.05;
        
        particle.rotation.x += 0.1;
        particle.rotation.y += 0.1;
        
        // Apply gravity
        direction.y -= 0.01;
        
        // Scale down
        particle.scale.multiplyScalar(0.95);
        
        if (particle.scale.x > 0.01) {
          requestAnimationFrame(animateParticle);
        } else {
          this.scene.remove(particle);
        }
      };
      
      animateParticle();
    }
  }
  
  public setDestructible(destructible: boolean): void {
    this.destructible = destructible;
  }
}
