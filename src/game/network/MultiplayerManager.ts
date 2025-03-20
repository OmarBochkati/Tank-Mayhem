import { Game } from '../Game';
import { NetworkManager, PlayerData, RoomInfo } from './NetworkManager';
import { LobbyUI } from './LobbyUI';
import { GameMode, DifficultyLevel } from '../core/GameState';
import { ColorManager } from '../utils/ColorManager';
import { SpawnDistributionPattern } from '../utils/SpawnManager';

/**
 * MultiplayerManager handles the integration between the game and networking,
 * as well as managing the multiplayer UI and game flow.
 */
export class MultiplayerManager {
  private game: Game;
  private networkManager: NetworkManager;
  private lobbyUI: LobbyUI;
  private colorManager: ColorManager;
  
  private remotePlayers: Map<string, PlayerData> = new Map();
  private isInMultiplayerMode: boolean = false;
  private isInLobby: boolean = false;
  
  // Player respawn settings
  private respawnDelay: number = 3; // seconds
  private respawnTimer: number = 0;
  private isWaitingToRespawn: boolean = false;
  
  constructor(game: Game) {
    this.game = game;
    this.networkManager = new NetworkManager(game);
    this.lobbyUI = new LobbyUI();
    this.colorManager = new ColorManager();
    
    // Set up event listeners for the lobby UI
    this.setupLobbyUIEventListeners();
  }
  
  /**
   * Initialize the multiplayer manager
   */
  public initialize(): void {
    // Initialize the lobby UI
    this.lobbyUI.initialize();
    
    // Set up network manager callbacks
    this.setupNetworkCallbacks();
    
    // Set up custom event listeners
    document.addEventListener('refreshRooms', () => {
      console.log('Refreshing rooms list...');
      if (this.networkManager.isConnectedToServer()) {
        // Request updated room list from server
        this.refreshRoomsList();
      }
    });
  }
  
  /**
   * Set up event listeners for the lobby UI
   */
  private setupLobbyUIEventListeners(): void {
    // Connect button
    this.lobbyUI.onConnect((serverUrl: string, playerName: string) => {
      this.connectToServer(serverUrl, playerName);
    });
    
    // Create room button
    this.lobbyUI.onCreateRoom((roomName: string, maxPlayers: number) => {
      console.log(`Create room button clicked: ${roomName}, ${maxPlayers}`);
      this.networkManager.createRoom(roomName, maxPlayers);
    });
    
    // Join room button
    this.lobbyUI.onJoinRoom((roomId: string) => {
      this.networkManager.joinRoom(roomId);
    });
    
    // Leave room button
    this.lobbyUI.onLeaveRoom(() => {
      this.leaveRoom();
    });
    
    // Start game button
    this.lobbyUI.onStartGame(() => {
      this.startMultiplayerGame();
    });
    
    // Send chat message
    this.lobbyUI.onSendChatMessage((message: string) => {
      this.networkManager.sendChatMessage(message);
    });
    
    // Set difficulty
    this.lobbyUI.onSetDifficulty((difficulty: DifficultyLevel) => {
      // Only the host can set difficulty
      if (this.networkManager.isRoomHost()) {
        this.game.setDifficulty(difficulty);
        
        // Configure spawn manager based on difficulty
        let spawnPattern = SpawnDistributionPattern.UNIFORM;
        switch (difficulty) {
          case DifficultyLevel.EASY:
            spawnPattern = SpawnDistributionPattern.UNIFORM;
            break;
          case DifficultyLevel.MEDIUM:
            spawnPattern = SpawnDistributionPattern.QUADRANTS;
            break;
          case DifficultyLevel.HARD:
            spawnPattern = SpawnDistributionPattern.PERIMETER;
            break;
          case DifficultyLevel.INSANE:
            spawnPattern = SpawnDistributionPattern.CENTRAL;
            break;
        }
        
        this.game.getSpawnManager().configure({
          spawnDistributionPattern: spawnPattern,
          spawnProtectionDuration: 4
        });
        
        // TODO: Broadcast difficulty change to other players
      }
    });
    
    // Set spawn distribution pattern
    this.lobbyUI.onSetSpawnPattern((pattern: SpawnDistributionPattern) => {
      // Only the host can set spawn pattern
      if (this.networkManager.isRoomHost()) {
        this.game.getSpawnManager().configure({
          spawnDistributionPattern: pattern
        });
        
        // TODO: Broadcast spawn pattern change to other players
      }
    });
  }
  
  /**
   * Set up callbacks for the network manager
   */
  private setupNetworkCallbacks(): void {
    // Player joined callback
    this.networkManager.onPlayerJoined((player: PlayerData) => {
      console.log(`Player joined callback: ${player.name}`);
      
      // Assign a color to the player if they don't have one
      if (!player.color || player.color === 0) {
        player.color = this.colorManager.getPlayerColor(player.id);
      }
      
      this.remotePlayers.set(player.id, player);
      this.lobbyUI.addPlayer(player);
      
      // Add player to the game if we're already in a game
      if (this.isInMultiplayerMode && !this.isInLobby) {
        this.game.addRemotePlayer(player.id, player.name, player.position, player.rotation, player.color);
      }
    });
    
    // Player left callback
    this.networkManager.onPlayerLeft((playerId: string) => {
      this.remotePlayers.delete(playerId);
      this.lobbyUI.removePlayer(playerId);
      
      // Remove player from the game if we're in a game
      if (this.isInMultiplayerMode && !this.isInLobby) {
        this.game.removeRemotePlayer(playerId);
      }
      
      // Free up the player's color
      this.colorManager.removePlayer(playerId);
    });
    
    // Game state update callback
    this.networkManager.onGameStateUpdate((state) => {
      // Ensure all players have colors
      state.players.forEach(player => {
        if (!player.color || player.color === 0) {
          player.color = this.colorManager.getPlayerColor(player.id);
        }
      });
      
      // Update game state with remote data
      this.game.updateFromNetworkState(state);
      
      // If the game is in progress, start the game
      if (state.inProgress && this.isInLobby) {
        this.startGame();
      }
    });
    
    // Chat message callback
    this.networkManager.onChatMessage((message) => {
      this.lobbyUI.addChatMessage(message.sender, message.text);
    });
    
    // Error callback
    this.networkManager.onError((error) => {
      this.lobbyUI.showError(error);
    });
    
    // Room joined callback
    this.networkManager.onRoomJoined((roomName: string) => {
      console.log(`Room joined callback: ${roomName}`);
      this.lobbyUI.showRoom(roomName);
    });
    
    // Player death callback
    this.networkManager.onPlayerDeath((playerId: string) => {
      // If this is the local player, start respawn timer
      if (playerId === this.networkManager.getPlayerId()) {
        this.startRespawnTimer();
      }
    });
  }
  
  /**
   * Connect to the game server
   */
  public connectToServer(serverUrl: string, playerName: string): void {
    // Reset color manager when connecting to a new server
    this.colorManager.reset();
    
    // Assign a color for the local player
    const localPlayerId = this.networkManager.getPlayerId();
    const playerColor = this.colorManager.getPlayerColor(localPlayerId);
    
    // Initialize network manager with player color
    this.networkManager.initialize(serverUrl, playerName, playerColor);
    this.lobbyUI.showConnecting();
    
    // Check connection status after a delay
    setTimeout(() => {
      if (this.networkManager.isConnectedToServer()) {
        this.lobbyUI.showRoomList();
        this.isInLobby = true;
      } else {
        // For development/testing, allow mock connection
        if (serverUrl === 'http://localhost:3000') {
          console.log('Using mock connection for development');
          this.lobbyUI.showRoomList();
          this.isInLobby = true;
          
          // Create some mock rooms for testing
          this.createMockRooms();
        } else {
          this.lobbyUI.showError('Failed to connect to server');
        }
      }
    }, 2000);
  }
  
  /**
   * Create mock rooms for testing without a server
   */
  private createMockRooms(): void {
    const mockRooms: RoomInfo[] = [
      { id: 'mock-1', name: 'Test Room 1', players: 1, maxPlayers: 4, inProgress: false },
      { id: 'mock-2', name: 'Test Room 2', players: 2, maxPlayers: 4, inProgress: false },
      { id: 'mock-3', name: 'Game in Progress', players: 3, maxPlayers: 4, inProgress: true }
    ];
    
    document.dispatchEvent(new CustomEvent('roomsUpdated', { detail: { rooms: mockRooms } }));
  }
  
  /**
   * Refresh the rooms list
   */
  private refreshRoomsList(): void {
    if (this.networkManager.isConnectedToServer()) {
      // For development/testing, refresh mock rooms
      if (this.networkManager.getCurrentRoomId().startsWith('mock-')) {
        this.createMockRooms();
      } else {
        // Request updated room list from server
        // This is handled by the server, which will emit a 'rooms_list' event
      }
    }
  }
  
  /**
   * Leave the current room
   */
  public leaveRoom(): void {
    this.networkManager.leaveRoom();
    this.remotePlayers.clear();
    this.lobbyUI.clearPlayers();
    this.lobbyUI.showRoomList();
    this.isInLobby = true;
    
    // If we were in a game, return to single player mode
    if (this.isInMultiplayerMode) {
      this.isInMultiplayerMode = false;
      this.game.setMultiplayerMode(false);
    }
  }
  
  /**
   * Start a multiplayer game (host only)
   */
  public startMultiplayerGame(): void {
    if (!this.networkManager.isRoomHost()) {
      this.lobbyUI.showError('Only the host can start the game');
      return;
    }
    
    this.networkManager.startGame();
    this.startGame();
  }
  
  /**
   * Start the game (called when server signals game start)
   */
  private startGame(): void {
    this.isInLobby = false;
    this.isInMultiplayerMode = true;
    
    // Hide the lobby UI
    this.lobbyUI.hide();
    
    // Set the game to multiplayer mode
    this.game.setMultiplayerMode(true);
    this.game.setGameMode(GameMode.MULTIPLAYER);
    
    // Set the player's tank color
    const localPlayerId = this.networkManager.getPlayerId();
    const playerColor = this.colorManager.getPlayerColor(localPlayerId);
    this.game.getPlayerTank().setColor(playerColor);
    
    // Add all remote players to the game
    this.remotePlayers.forEach((player, playerId) => {
      // Ensure the player has a color
      if (!player.color || player.color === 0) {
        player.color = this.colorManager.getPlayerColor(playerId);
      }
      
      this.game.addRemotePlayer(playerId, player.name, player.position, player.rotation, player.color);
    });
    
    // Start the game
    this.game.start();
  }
  
  /**
   * Start the respawn timer when player dies
   */
  private startRespawnTimer(): void {
    this.isWaitingToRespawn = true;
    this.respawnTimer = this.respawnDelay;
    
    // Show respawn countdown message
    this.game.getPlayerTank().setHealth(0);
    this.lobbyUI.showMessage(`Respawning in ${this.respawnDelay} seconds...`, this.respawnDelay * 1000);
  }
  
  /**
   * Update method called every frame
   */
  public update(deltaTime: number): void {
    if (!this.isInMultiplayerMode) return;
    
    // Update network manager for interpolation
    this.networkManager.update(deltaTime);
    
    // Update respawn timer
    if (this.isWaitingToRespawn) {
      this.respawnTimer -= deltaTime;
      
      if (this.respawnTimer <= 0) {
        this.isWaitingToRespawn = false;
        this.respawnPlayer();
      }
    }
    
    // If we're in a game, send our position and rotation
    if (!this.isInLobby && !this.isWaitingToRespawn) {
      const playerTank = this.game.getPlayerTank();
      if (playerTank && playerTank.getHealth() > 0) {
        this.networkManager.sendPlayerPosition(playerTank.getPosition());
        this.networkManager.sendPlayerRotation(playerTank.getRotation());
      }
    }
  }
  
  /**
   * Respawn the player
   */
  private respawnPlayer(): void {
    // Respawn the player at a new position
    this.game.respawnPlayer();
    
    // Notify the server that we've respawned
    this.networkManager.sendPlayerRespawn();
  }
  
  /**
   * Send a fire event to other players
   */
  public sendFireEvent(position: { x: number, y: number, z: number }, direction: { x: number, y: number, z: number }): void {
    if (this.isInMultiplayerMode && !this.isInLobby && !this.isWaitingToRespawn) {
      this.networkManager.sendPlayerFire(position, direction);
    }
  }
  
  /**
   * Send a hit event to other players
   */
  public sendHitEvent(targetId: string, damage: number): void {
    if (this.isInMultiplayerMode && !this.isInLobby) {
      this.networkManager.sendPlayerHit(targetId, damage);
    }
  }
  
  /**
   * Send a power-up collection event to other players
   */
  public sendPowerUpCollectedEvent(powerUpId: string): void {
    if (this.isInMultiplayerMode && !this.isInLobby) {
      this.networkManager.sendPowerUpCollected(powerUpId);
    }
  }
  
  /**
   * Show the multiplayer lobby
   */
  public showLobby(): void {
    this.lobbyUI.show();
    this.isInLobby = true;
  }
  
  /**
   * Hide the multiplayer lobby
   */
  public hideLobby(): void {
    this.lobbyUI.hide();
    this.isInLobby = false;
  }
  
  /**
   * Check if we're in multiplayer mode
   */
  public isMultiplayerMode(): boolean {
    return this.isInMultiplayerMode;
  }
  
  /**
   * Get the network manager
   */
  public getNetworkManager(): NetworkManager {
    return this.networkManager;
  }
  
  /**
   * Get the color manager
   */
  public getColorManager(): ColorManager {
    return this.colorManager;
  }
  
  /**
   * Clean up resources when the multiplayer manager is destroyed
   */
  public destroy(): void {
    this.networkManager.destroy();
    this.lobbyUI.destroy();
    
    document.removeEventListener('refreshRooms', () => {});
  }
}
