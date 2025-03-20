export enum GameMode {
  SINGLE_PLAYER,
  MULTIPLAYER,
  CHALLENGE
}

export enum DifficultyLevel {
  EASY,
  MEDIUM,
  HARD,
  INSANE
}

export class GameState {
  private gameRunning: boolean = false;
  private gamePaused: boolean = false;
  private gameMode: GameMode = GameMode.SINGLE_PLAYER;
  private difficultyLevel: DifficultyLevel = DifficultyLevel.MEDIUM;
  private score: number = 0;
  private startTime: number = 0;
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;
  private elapsedTime: number = 0;
  private highScore: number = 0;
  
  constructor() {
    this.reset();
    // Load high score from localStorage if available
    this.loadHighScore();
  }
  
  public startGame(): void {
    this.gameRunning = true;
    this.gamePaused = false;
    this.startTime = Date.now();
    this.totalPausedTime = 0;
  }
  
  public pauseGame(): void {
    if (this.gameRunning && !this.gamePaused) {
      this.gamePaused = true;
      this.pauseStartTime = Date.now();
    }
  }
  
  public resumeGame(): void {
    if (this.gameRunning && this.gamePaused) {
      this.gamePaused = false;
      // Add the time spent paused to the total paused time
      this.totalPausedTime += (Date.now() - this.pauseStartTime);
    }
  }
  
  public endGame(): void {
    this.gameRunning = false;
    this.gamePaused = false;
    this.elapsedTime = this.calculateElapsedTime();
    
    // Update high score if current score is higher
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }
  
  public reset(): void {
    this.gameRunning = false;
    this.gamePaused = false;
    this.score = 0;
    this.startTime = 0;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    this.elapsedTime = 0;
  }
  
  public isGameRunning(): boolean {
    return this.gameRunning;
  }
  
  public isGamePaused(): boolean {
    return this.gamePaused;
  }
  
  public getGameMode(): GameMode {
    return this.gameMode;
  }
  
  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
  }
  
  public getDifficultyLevel(): DifficultyLevel {
    return this.difficultyLevel;
  }
  
  public setDifficultyLevel(level: DifficultyLevel): void {
    this.difficultyLevel = level;
  }
  
  public getDifficultyName(): string {
    switch (this.difficultyLevel) {
      case DifficultyLevel.EASY:
        return "Easy";
      case DifficultyLevel.MEDIUM:
        return "Medium";
      case DifficultyLevel.HARD:
        return "Hard";
      case DifficultyLevel.INSANE:
        return "Insane";
      default:
        return "Medium";
    }
  }
  
  public getScore(): number {
    return this.score;
  }
  
  public addScore(points: number): void {
    // Apply score multiplier based on difficulty
    let multiplier = 1.0;
    switch (this.difficultyLevel) {
      case DifficultyLevel.EASY:
        multiplier = 0.8;
        break;
      case DifficultyLevel.MEDIUM:
        multiplier = 1.0;
        break;
      case DifficultyLevel.HARD:
        multiplier = 1.5;
        break;
      case DifficultyLevel.INSANE:
        multiplier = 2.0;
        break;
    }
    
    this.score += Math.floor(points * multiplier);
  }
  
  private calculateElapsedTime(): number {
    if (!this.gameRunning) {
      return this.elapsedTime;
    }
    
    // If the game is paused, calculate time up to the pause point
    if (this.gamePaused) {
      return (this.pauseStartTime - this.startTime - this.totalPausedTime) / 1000;
    }
    
    // Otherwise calculate current elapsed time
    return (Date.now() - this.startTime - this.totalPausedTime) / 1000;
  }
  
  public getElapsedTime(): number {
    return this.calculateElapsedTime();
  }
  
  public getHighScore(): number {
    return this.highScore;
  }
  
  private loadHighScore(): void {
    const savedHighScore = localStorage.getItem('tankGameHighScore');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10);
    }
  }
  
  private saveHighScore(): void {
    localStorage.setItem('tankGameHighScore', this.highScore.toString());
  }
}
