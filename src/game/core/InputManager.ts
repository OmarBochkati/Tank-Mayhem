import * as THREE from 'three';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private mouseButtons: { [button: number]: boolean } = {};
  private touchActive: boolean = false;
  private touchPosition: { x: number, y: number } = { x: 0, y: 0 };
  private worldMousePosition: THREE.Vector2 = new THREE.Vector2();
  
  constructor() {}
  
  public initialize(): void {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Touch events for mobile
    window.addEventListener('touchstart', this.onTouchStart.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this));
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;
    // Also store the space key specifically
    if (event.key === ' ' || event.code === 'Space') {
      this.keys['space'] = true;
    }
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
    // Also update the space key specifically
    if (event.key === ' ' || event.code === 'Space') {
      this.keys['space'] = false;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    // Store normalized device coordinates (-1 to +1)
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Store actual screen coordinates for world position calculation
    this.worldMousePosition.x = event.clientX;
    this.worldMousePosition.y = event.clientY;
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.mouseButtons[event.button] = true;
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.mouseButtons[event.button] = false;
  }
  
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.touchActive = true;
    this.touchPosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    this.touchPosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
  
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    this.touchPosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    this.touchPosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
  
  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.touchActive = false;
  }
  
  // Public methods to check input state
  public isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true;
  }
  
  public isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons[button] === true;
  }
  
  public getMousePosition(): { x: number, y: number } {
    return { ...this.mousePosition };
  }
  
  public getWorldMousePosition(): THREE.Vector2 {
    return this.worldMousePosition.clone();
  }
  
  public isTouchActive(): boolean {
    return this.touchActive;
  }
  
  public getTouchPosition(): { x: number, y: number } {
    return { ...this.touchPosition };
  }
  
  // Helper methods for common input patterns
  public getMovementInput(): { x: number, z: number } {
    let x = 0;
    let z = 0;
    
    // WASD or Arrow keys - FIXED: W is forward, S is backward
    if (this.isKeyPressed('w') || this.isKeyPressed('arrowup')) z += 1;
    if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) z -= 1;
    if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft')) x -= 1;
    if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) x += 1;
    
    // Normalize for diagonal movement
    if (x !== 0 && z !== 0) {
      const length = Math.sqrt(x * x + z * z);
      x /= length;
      z /= length;
    }
    
    return { x, z };
  }
  
  public getFireInput(): boolean {
    return this.isMouseButtonPressed(0) || this.isKeyPressed('space');
  }
}
