export enum GameMode {
  SINGLE_PLAYER,
  MULTIPLAYER,
  CHALLENGE
}

export class GameState {
  private gameRunning: boolean = false;
  private gameMode: GameMode = GameMode.SINGLE_PLAYER;
  private score: number = 0;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private highScore: number = 0;
  
  constructor() {
    this.reset();
    // Load high score from localStorage if available
    this.loadHighScore();
  }
  
  public startGame(): void {
    this.gameRunning = true;
    this.startTime = Date.now();
  }
  
  public endGame(): void {
    this.gameRunning = false;
    this.elapsedTime = (Date.now() - this.startTime) / 1000;
    
    // Update high score if current score is higher
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }
  
  public reset(): void {
    this.gameRunning = false;
    this.score = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
  }
  
  public isGameRunning(): boolean {
    return this.gameRunning;
  }
  
  public getGameMode(): GameMode {
    return this.gameMode;
  }
  
  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
  }
  
  public getScore(): number {
    return this.score;
  }
  
  public addScore(points: number): void {
    this.score += points;
  }
  
  public getElapsedTime(): number {
    if (this.gameRunning) {
      return (Date.now() - this.startTime) / 1000;
    }
    return this.elapsedTime;
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
