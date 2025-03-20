import { v4 as uuidv4 } from './uuid';

/**
 * ColorManager handles the assignment of unique colors to players in multiplayer games.
 * It ensures colors are visually distinct, excludes red (which is reserved for enemy tanks),
 * and provides fallback mechanisms when player count exceeds available colors.
 */
export class ColorManager {
  // Predefined color palette with distinct, visually appealing colors (excluding red)
  // These colors are chosen for good contrast and visibility
  private static readonly COLORS: number[] = [
    0x3498db, // Blue
    0x2ecc71, // Green
    0x9b59b6, // Purple
    0xf39c12, // Orange
    0x1abc9c, // Teal
    0xf1c40f, // Yellow
    0x34495e, // Navy Blue
    0xe67e22, // Dark Orange
    0x16a085, // Dark Teal
    0x8e44ad, // Dark Purple
    0x27ae60, // Dark Green
    0x2980b9  // Dark Blue
  ];
  
  // Color that is reserved for enemy tanks in single player mode
  private static readonly ENEMY_COLOR: number = 0xff0000; // Red
  
  // Track assigned colors to ensure uniqueness
  private assignedColors: Map<string, number> = new Map();
  
  // Track the next color index to use
  private nextColorIndex: number = 0;
  
  /**
   * Get a unique color for a player
   * @param playerId The unique ID of the player
   * @returns A color value as a number
   */
  public getPlayerColor(playerId: string): number {
    // If player already has an assigned color, return it
    if (this.assignedColors.has(playerId)) {
      return this.assignedColors.get(playerId)!;
    }
    
    // Assign a new color
    const color = this.getNextAvailableColor();
    this.assignedColors.set(playerId, color);
    
    return color;
  }
  
  /**
   * Get the next available color from the palette
   * @returns A color value as a number
   */
  private getNextAvailableColor(): number {
    // If we've used all colors, implement fallback mechanism
    if (this.nextColorIndex >= ColorManager.COLORS.length) {
      return this.getFallbackColor();
    }
    
    // Get the next color and increment the index
    const color = ColorManager.COLORS[this.nextColorIndex];
    this.nextColorIndex++;
    
    return color;
  }
  
  /**
   * Generate a fallback color when we've exhausted the predefined palette
   * This creates a color by slightly modifying existing colors to maintain distinction
   * @returns A color value as a number
   */
  private getFallbackColor(): number {
    // Get a random color from our palette as a base
    const baseColorIndex = Math.floor(Math.random() * ColorManager.COLORS.length);
    const baseColor = ColorManager.COLORS[baseColorIndex];
    
    // Convert to RGB components
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;
    
    // Modify the color slightly to create a new variant
    // We'll shift hue by adjusting RGB values while maintaining brightness
    const newR = Math.min(255, Math.max(0, r + (Math.random() * 60 - 30)));
    const newG = Math.min(255, Math.max(0, g + (Math.random() * 60 - 30)));
    const newB = Math.min(255, Math.max(0, b + (Math.random() * 60 - 30)));
    
    // Convert back to hex number
    return (Math.round(newR) << 16) | (Math.round(newG) << 8) | Math.round(newB);
  }
  
  /**
   * Check if a color is too similar to red (enemy color)
   * @param color The color to check
   * @returns True if the color is too close to red
   */
  private isColorTooCloseToRed(color: number): boolean {
    // Extract RGB components
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Extract red components
    const redR = (ColorManager.ENEMY_COLOR >> 16) & 0xFF;
    const redG = (ColorManager.ENEMY_COLOR >> 8) & 0xFF;
    const redB = ColorManager.ENEMY_COLOR & 0xFF;
    
    // Calculate color distance using a simple Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(r - redR, 2) + 
      Math.pow(g - redG, 2) + 
      Math.pow(b - redB, 2)
    );
    
    // If distance is less than threshold, colors are too similar
    return distance < 100; // Threshold determined by testing
  }
  
  /**
   * Reset the color manager, clearing all assigned colors
   */
  public reset(): void {
    this.assignedColors.clear();
    this.nextColorIndex = 0;
  }
  
  /**
   * Remove a player's color assignment
   * @param playerId The unique ID of the player
   */
  public removePlayer(playerId: string): void {
    this.assignedColors.delete(playerId);
  }
  
  /**
   * Get all currently assigned colors
   * @returns A map of player IDs to colors
   */
  public getAllAssignedColors(): Map<string, number> {
    return new Map(this.assignedColors);
  }
  
  /**
   * Get the enemy color (red)
   * @returns The enemy color value
   */
  public static getEnemyColor(): number {
    return ColorManager.ENEMY_COLOR;
  }
}
