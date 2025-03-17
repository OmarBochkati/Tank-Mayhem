import * as THREE from 'three';

export class Arena {
  private scene: THREE.Scene;
  private width: number;
  private depth: number;
  private floor: THREE.Mesh;
  private walls: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene, width: number, depth: number) {
    this.scene = scene;
    this.width = width;
    this.depth = depth;
  }
  
  public initialize(): void {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(this.width, this.depth);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x555555,
      side: THREE.DoubleSide,
      shininess: 10
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    
    // Create grid lines on the floor for better depth perception
    const gridHelper = new THREE.GridHelper(this.width, 20, 0x000000, 0x333333);
    gridHelper.position.y = 0.01; // Slightly above floor to avoid z-fighting
    this.scene.add(gridHelper);
    
    // Create walls
    this.createWalls();
    
    // Add arena corners for better visibility
    this.createCornerMarkers();
  }
  
  private createWalls(): void {
    const wallHeight = 5;
    const wallThickness = 2;
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    
    // Create wall material with emissive property for better visibility
    const wallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x3498db,
      emissive: 0x1a5276,
      emissiveIntensity: 0.3,
      shininess: 30
    });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(this.width + wallThickness, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -halfDepth - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.scene.add(northWall);
    this.walls.push(northWall);
    
    // South wall
    const southWallGeometry = new THREE.BoxGeometry(this.width + wallThickness, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight / 2, halfDepth + wallThickness / 2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    this.scene.add(southWall);
    this.walls.push(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.depth);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(halfWidth + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);
    this.walls.push(eastWall);
    
    // West wall
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.depth);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-halfWidth - wallThickness / 2, wallHeight / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.scene.add(westWall);
    this.walls.push(westWall);
  }
  
  private createCornerMarkers(): void {
    const markerSize = 3;
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    const markerHeight = 8; // Taller markers for better visibility
    
    // Create a bright material for the corner markers
    const markerMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    // Create corner markers
    const cornerPositions = [
      { x: -halfWidth, z: -halfDepth }, // Northwest
      { x: halfWidth, z: -halfDepth },  // Northeast
      { x: halfWidth, z: halfDepth },   // Southeast
      { x: -halfWidth, z: halfDepth }   // Southwest
    ];
    
    cornerPositions.forEach(pos => {
      const markerGeometry = new THREE.CylinderGeometry(markerSize / 2, markerSize / 2, markerHeight, 8);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(pos.x, markerHeight / 2, pos.z);
      marker.castShadow = true;
      marker.receiveShadow = true;
      this.scene.add(marker);
      
      // Add a point light at each corner for better illumination
      const cornerLight = new THREE.PointLight(0xff0000, 0.5, 20);
      cornerLight.position.set(pos.x, markerHeight, pos.z);
      this.scene.add(cornerLight);
    });
  }
  
  public getWidth(): number {
    return this.width;
  }
  
  public getDepth(): number {
    return this.depth;
  }
}
