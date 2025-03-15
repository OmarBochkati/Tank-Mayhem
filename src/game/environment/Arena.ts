import * as THREE from 'three';

export class Arena {
  private scene: THREE.Scene;
  private width: number;
  private depth: number;
  
  constructor(scene: THREE.Scene, width: number, depth: number) {
    this.scene = scene;
    this.width = width;
    this.depth = depth;
  }
  
  public initialize(): void {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(this.width, this.depth);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Create arena walls
    this.createWalls();
    
    // Add some decorative elements
    this.addDecorations();
  }
  
  private createWalls(): void {
    const wallHeight = 5;
    const wallThickness = 2;
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(this.width + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -halfDepth - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.scene.add(northWall);
    
    // South wall
    const southWallGeometry = new THREE.BoxGeometry(this.width + wallThickness * 2, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight / 2, halfDepth + wallThickness / 2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    this.scene.add(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.depth);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(halfWidth + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);
    
    // West wall
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.depth);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-halfWidth - wallThickness / 2, wallHeight / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.scene.add(westWall);
  }
  
  private addDecorations(): void {
    // Add some rocks
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    
    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const scale = 0.5 + Math.random() * 1.5;
      rock.scale.set(scale, scale, scale);
      
      const x = (Math.random() - 0.5) * (this.width - 5);
      const z = (Math.random() - 0.5) * (this.depth - 5);
      
      rock.position.set(x, scale / 2, z);
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      this.scene.add(rock);
    }
    
    // Add some trees
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    
    for (let i = 0; i < 10; i++) {
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      
      leaves.position.y = 3.5;
      
      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);
      
      const x = (Math.random() - 0.5) * (this.width - 10);
      const z = (Math.random() - 0.5) * (this.depth - 10);
      
      tree.position.set(x, 1.5, z);
      
      tree.castShadow = true;
      tree.receiveShadow = true;
      
      this.scene.add(tree);
    }
  }
}
