import * as THREE from 'three';

export class ExplosionEffect {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private size: number;
  private duration: number = 1.0; // seconds
  private timer: number = 0;
  
  private particles: THREE.Mesh[] = [];
  private light: THREE.PointLight;
  
  constructor(scene: THREE.Scene, position: THREE.Vector3, size: number) {
    this.scene = scene;
    this.position = position.clone();
    this.size = size;
    
    // Create point light for explosion
    this.light = new THREE.PointLight(0xff9900, 1, this.size * 10);
    this.light.position.copy(this.position);
    this.light.position.y += 1; // Slightly above ground
  }
  
  public initialize(): void {
    // Add light to scene
    this.scene.add(this.light);
    
    // Create explosion particles
    const particleCount = Math.floor(this.size * 20);
    
    for (let i = 0; i < particleCount; i++) {
      // Create particle geometry
      const size = (0.2 + Math.random() * 0.8) * this.size * 0.5;
      const geometry = new THREE.SphereGeometry(size, 4, 4);
      
      // Create particle material with random color from fire palette
      const colorFactor = Math.random();
      const color = new THREE.Color();
      
      if (colorFactor < 0.3) {
        color.setHex(0xff9900); // Orange
      } else if (colorFactor < 0.6) {
        color.setHex(0xff0000); // Red
      } else if (colorFactor < 0.9) {
        color.setHex(0xffff00); // Yellow
      } else {
        color.setHex(0x000000); // Smoke (black)
      }
      
      const material = new THREE.MeshBasicMaterial({ color });
      
      // Create particle mesh
      const particle = new THREE.Mesh(geometry, material);
      
      // Position at explosion center
      particle.position.copy(this.position);
      particle.position.y += 1; // Start slightly above ground
      
      // Add to scene and particle array
      this.scene.add(particle);
      this.particles.push(particle);
      
      // Set random direction and speed for particle
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 0.5, // Mostly upward
        Math.random() * 2 - 1
      ).normalize();
      
      const speed = (0.5 + Math.random() * 1.5) * this.size;
      
      // Store direction and speed on particle object
      (particle as any).direction = direction;
      (particle as any).speed = speed;
    }
  }
  
  public update(deltaTime: number): boolean {
    this.timer += deltaTime;
    
    // Calculate progress (0 to 1)
    const progress = Math.min(this.timer / this.duration, 1);
    
    // Update light intensity
    this.light.intensity = (1 - progress) * this.size;
    
    // Update particles
    for (const particle of this.particles) {
      // Get direction and speed
      const direction = (particle as any).direction as THREE.Vector3;
      const speed = (particle as any).speed as number;
      
      // Move particle
      particle.position.x += direction.x * speed * deltaTime;
      particle.position.y += direction.y * speed * deltaTime;
      particle.position.z += direction.z * speed * deltaTime;
      
      // Apply "gravity" to direction
      direction.y -= 1.5 * deltaTime;
      
      // Scale down particle as explosion progresses
      const scale = 1 - progress;
      particle.scale.set(scale, scale, scale);
      
      // Fade out material
      const material = particle.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - progress;
      material.transparent = true;
    }
    
    // Return true if explosion is finished
    return progress >= 1;
  }
  
  public destroy(): void {
    // Remove light
    this.scene.remove(this.light);
    
    // Remove all particles
    for (const particle of this.particles) {
      this.scene.remove(particle);
    }
    
    this.particles = [];
  }
}
