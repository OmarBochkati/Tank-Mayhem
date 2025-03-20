import * as THREE from 'three';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private mouseDown: boolean = false;
  
  constructor() {}
  
  public initialize(): void {
    // Set up keyboard event listeners
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Set up mouse event listeners
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
  }
  
  private onMouseMove(event: MouseEvent): void {
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.mouseDown = true;
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.mouseDown = false;
  }
  
  public getMovementInput(): THREE.Vector3 {
    const movement = new THREE.Vector3(0, 0, 0);
    
    // Rotation (left/right)
    if (this.keys['a'] || this.keys['arrowleft']) {
      movement.x = 1; // Rotate left
    } else if (this.keys['d'] || this.keys['arrowright']) {
      movement.x = -1; // Rotate right
    }
    
    // Forward/backward movement
    if (this.keys['s'] || this.keys['arrowdown']) {
      movement.z = 1; // Forward
    } else if (this.keys['w'] || this.keys['arrowup']) {
      movement.z = -1; // Backward
    }
    
    return movement;
  }
  
  public getFireInput(): boolean {
    return this.mouseDown || this.keys[' '];
  }
  
  public getMousePosition(): { x: number, y: number } {
    return this.mousePosition;
  }
  
  public isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true;
  }
}
