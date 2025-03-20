import { io, Socket } from 'socket.io-client';
import { Game } from '../Game';
import { Tank } from '../entities/Tank';
import { Projectile } from '../entities/Projectile';
import { PowerUp } from '../entities/PowerUp';
import { GameState, GameMode } from '../core/GameState';
import { v4 } from '../utils/uuid';

// Define message types for type safety
export enum MessageType {
  JOIN_GAME = 'join_game',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  GAME_STATE = 'game_state',
  PLAYER_POSITION = 'player_position',
  PLAYER_ROTATION = 'player_rotation',
  PLAYER_FIRE = 'player_fire',
  PLAYER_HIT = 'player_hit',
  SPAWN_POWER_UP = 'spawn_power_up',
  COLLECT_POWER_UP = 'collect_power_up',
  GAME_OVER = 'game_over',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
  CHAT_MESSAGE = 'chat_message'
}

// Player data interface
export interface PlayerData {
  id: string;
  name: string;
  position: { x: number, y: number, z: number };
  rotation: number;
  health: number;
  score: number;
  color: number;
}

// Game state interface for network transmission
export interface NetworkGameState {
  players: PlayerData[];
  powerUps: {
    id: string;
    type: number;
    position: { x: number, y: number, z: number };
  }[];
  projectiles: {
    id: string;
    sourceId: string;
    position: { x: number, y: number, z: number };
    direction: { x: number, y: number, z: number };
  }[];
  gameMode: GameMode;
  timeRemaining: number;
  inProgress: boolean;
}

// Room information
export interface RoomInfo {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  inProgress: boolean;
}

export class NetworkManager {
  private socket: Socket | null = null;
  private game: Game;
  private playerId: string = '';
  private playerName: string = '';
  private serverUrl: string = '';
  private isConnected: boolean = false;
  private isHost: boolean = false;
  private roomId: string = '';
  private rooms: RoomInfo[] = [];
  
  // Latency tracking
  private pingStartTime: number = 0;
  private latency: number = 0;
  private pingInterval: number | null = null;
  
  // State synchronization
  private lastSentPosition: { x: number, y: number, z: number } | null = null;
  private lastSentRotation: number | null = null;
  private positionThreshold: number = 0.1; // Minimum distance to trigger position update
  private rotationThreshold: number = 0.05; // Minimum rotation change to trigger update
  private updateRate: number = 100; // ms between position/rotation updates
  private lastUpdateTime: number = 0;
  
  // Interpolation and prediction
  private remotePlayerStates: Map<string, {
    currentPosition: { x: number, y: number, z: number },
    targetPosition: { x: number, y: number, z: number },
    currentRotation: number,
    targetRotation: number,
    lastUpdateTime: number
  }> = new Map();
  
  // Reconciliation
  private inputSequenceNumber: number = 0;
  private pendingInputs: any[] = [];
  
  // Event callbacks
  private onPlayerJoinedCallback: ((player: PlayerData) => void) | null = null;
  private onPlayerLeftCallback: ((playerId: string) => void) | null = null;
  private onGameStateUpdateCallback: ((state: NetworkGameState) => void) | null = null;
  private onChatMessageCallback: ((message: { sender: string, text: string }) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onRoomJoinedCallback: ((roomName: string) => void) | null = null;
  
  constructor(game: Game) {
    this.game = game;
    this.playerId = v4(); // Generate a unique ID for this player
  }
  
  /**
   * Initialize the network manager and connect to the server
   * @param serverUrl The URL of the game server
   * @param playerName The player's display name
   */
  public initialize(serverUrl: string, playerName: string): void {
    this.serverUrl = serverUrl;
    this.playerName = playerName;
    
    // Connect to the server
    this.connect();
  }
  
  /**
   * Connect to the game server
   */
  private connect(): void {
    try {
      // Connect to the server with query parameters
      this.socket = io(this.serverUrl, {
        query: {
          playerId: this.playerId,
          playerName: this.playerName
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start ping interval for latency measurement
      this.startPingInterval();
      
      console.log(`Connecting to server at ${this.serverUrl}`);
    } catch (error) {
      console.error('Failed to connect to server:', error);
      this.handleError('Connection failed. Please try again later.');
    }
  }
  
  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      // Request available rooms
      this.socket.emit('get_rooms');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.stopPingInterval();
      
      // Show disconnection message to user
      this.handleError('Disconnected from server. Attempting to reconnect...');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleError('Connection error. Please check your internet connection.');
    });
    
    // Room and game events
    this.socket.on('rooms_list', (rooms: RoomInfo[]) => {
      this.rooms = rooms;
      console.log('Available rooms:', rooms);
      
      // Notify UI about available rooms
      document.dispatchEvent(new CustomEvent('roomsUpdated', { detail: { rooms } }));
    });
    
    this.socket.on('room_joined', (data: { roomId: string, roomName: string }) => {
      console.log(`Joined room: ${data.roomName} (${data.roomId})`);
      this.roomId = data.roomId;
      
      // Notify UI that we've joined a room
      if (this.onRoomJoinedCallback) {
        this.onRoomJoinedCallback(data.roomName);
      }
    });
    
    this.socket.on(MessageType.PLAYER_JOINED, (player: PlayerData) => {
      console.log(`Player joined: ${player.name} (${player.id})`);
      
      if (this.onPlayerJoinedCallback) {
        this.onPlayerJoinedCallback(player);
      }
      
      // Initialize remote player state for interpolation
      this.remotePlayerStates.set(player.id, {
        currentPosition: player.position,
        targetPosition: player.position,
        currentRotation: player.rotation,
        targetRotation: player.rotation,
        lastUpdateTime: Date.now()
      });
    });
    
    this.socket.on(MessageType.PLAYER_LEFT, (playerId: string) => {
      console.log(`Player left: ${playerId}`);
      
      if (this.onPlayerLeftCallback) {
        this.onPlayerLeftCallback(playerId);
      }
      
      // Remove remote player state
      this.remotePlayerStates.delete(playerId);
    });
    
    this.socket.on(MessageType.GAME_STATE, (state: NetworkGameState) => {
      // Process full game state update
      if (this.onGameStateUpdateCallback) {
        this.onGameStateUpdateCallback(state);
      }
    });
    
    this.socket.on(MessageType.PLAYER_POSITION, (data: { id: string, position: { x: number, y: number, z: number }, timestamp: number }) => {
      // Update remote player position for interpolation
      const playerState = this.remotePlayerStates.get(data.id);
      if (playerState) {
        playerState.targetPosition = data.position;
        playerState.lastUpdateTime = Date.now();
        this.remotePlayerStates.set(data.id, playerState);
      } else {
        // Initialize state if it doesn't exist
        this.remotePlayerStates.set(data.id, {
          currentPosition: data.position,
          targetPosition: data.position,
          currentRotation: 0,
          targetRotation: 0,
          lastUpdateTime: Date.now()
        });
      }
    });
    
    this.socket.on(MessageType.PLAYER_ROTATION, (data: { id: string, rotation: number, timestamp: number }) => {
      // Update remote player rotation for interpolation
      const playerState = this.remotePlayerStates.get(data.id);
      if (playerState) {
        playerState.targetRotation = data.rotation;
        playerState.lastUpdateTime = Date.now();
        this.remotePlayerStates.set(data.id, playerState);
      }
    });
    
    this.socket.on(MessageType.PLAYER_FIRE, (data: { id: string, position: { x: number, y: number, z: number }, direction: { x: number, y: number, z: number } }) => {
      // Handle remote player firing
      this.game.handleRemotePlayerFire(data.id, data.position, data.direction);
    });
    
    this.socket.on(MessageType.PLAYER_HIT, (data: { targetId: string, sourceId: string, damage: number, health: number }) => {
      // Handle player hit event
      this.game.handleRemotePlayerHit(data.targetId, data.sourceId, data.damage, data.health);
    });
    
    this.socket.on(MessageType.SPAWN_POWER_UP, (data: { id: string, type: number, position: { x: number, y: number, z: number } }) => {
      // Handle power-up spawn
      this.game.spawnRemotePowerUp(data.id, data.type, data.position);
    });
    
    this.socket.on(MessageType.COLLECT_POWER_UP, (data: { id: string, playerId: string }) => {
      // Handle power-up collection
      this.game.collectRemotePowerUp(data.id, data.playerId);
    });
    
    this.socket.on(MessageType.GAME_OVER, (data: { winnerId: string, scores: { id: string, name: string, score: number }[] }) => {
      // Handle game over
      this.game.handleRemoteGameOver(data.winnerId, data.scores);
    });
    
    // Latency measurement
    this.socket.on(MessageType.PONG, (timestamp: number) => {
      const now = Date.now();
      this.latency = now - timestamp;
      console.log(`Current latency: ${this.latency}ms`);
      
      // Update UI with latency information
      document.dispatchEvent(new CustomEvent('latencyUpdate', { detail: { latency: this.latency } }));
    });
    
    // Chat messages
    this.socket.on(MessageType.CHAT_MESSAGE, (message: { sender: string, text: string }) => {
      if (this.onChatMessageCallback) {
        this.onChatMessageCallback(message);
      }
    });
    
    // Error handling
    this.socket.on(MessageType.ERROR, (error: string) => {
      console.error('Server error:', error);
      this.handleError(error);
    });
  }
  
  /**
   * Start periodic ping to measure latency
   */
  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.isConnected) {
        const timestamp = Date.now();
        this.socket.emit(MessageType.PING, timestamp);
      }
    }, 5000); // Ping every 5 seconds
  }
  
  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Handle errors and notify the user
   */
  private handleError(error: string): void {
    console.error('Network error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
  
  /**
   * Create a new game room
   * @param roomName The name of the room
   * @param maxPlayers Maximum number of players
   */
  public createRoom(roomName: string, maxPlayers: number = 4): void {
    if (!this.socket || !this.isConnected) {
      this.handleError('Not connected to server');
      return;
    }
    
    console.log(`Attempting to create room: ${roomName} with ${maxPlayers} max players`);
    
    // For debugging, create a mock room if no server is available
    if (this.serverUrl === 'http://localhost:3000' && !this.socket.connected) {
      console.log('Using mock room creation for debugging');
      this.mockCreateRoom(roomName, maxPlayers);
      return;
    }
    
    this.socket.emit('create_room', { name: roomName, maxPlayers }, (response: { success: boolean, roomId?: string, error?: string }) => {
      if (response && response.success && response.roomId) {
        this.roomId = response.roomId;
        this.isHost = true;
        console.log(`Created room: ${roomName} (${response.roomId})`);
        
        // Join the room we just created
        this.joinRoom(response.roomId);
      } else {
        const errorMsg = response && response.error ? response.error : 'Failed to create room';
        console.error('Room creation error:', errorMsg);
        this.handleError(errorMsg);
      }
    });
  }
  
  /**
   * Mock room creation for debugging without a server
   */
  private mockCreateRoom(roomName: string, maxPlayers: number): void {
    const mockRoomId = 'mock-' + Math.random().toString(36).substring(2, 9);
    this.roomId = mockRoomId;
    this.isHost = true;
    
    console.log(`Created mock room: ${roomName} (${mockRoomId})`);
    
    // Simulate room joined event
    setTimeout(() => {
      if (this.onRoomJoinedCallback) {
        this.onRoomJoinedCallback(roomName);
      }
      
      // Add a mock player (yourself)
      if (this.onPlayerJoinedCallback) {
        this.onPlayerJoinedCallback({
          id: this.playerId,
          name: this.playerName,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          health: 100,
          score: 0,
          color: 0x3498db
        });
      }
    }, 500);
  }
  
  /**
   * Join an existing game room
   * @param roomId The ID of the room to join
   */
  public joinRoom(roomId: string): void {
    if (!this.socket || !this.isConnected) {
      this.handleError('Not connected to server');
      return;
    }
    
    console.log(`Attempting to join room: ${roomId}`);
    
    // For debugging, join a mock room if no server is available
    if (roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && !this.socket.connected)) {
      console.log('Using mock room joining for debugging');
      this.mockJoinRoom(roomId);
      return;
    }
    
    this.socket.emit('join_room', { roomId }, (response: { success: boolean, roomName?: string, error?: string }) => {
      if (response && response.success) {
        this.roomId = roomId;
        console.log(`Joined room: ${roomId}`);
        
        // Notify UI that we've joined a room
        if (this.onRoomJoinedCallback && response.roomName) {
          this.onRoomJoinedCallback(response.roomName);
        }
        
        // Notify the game that we've joined a multiplayer game
        this.game.setMultiplayerMode(true);
      } else {
        const errorMsg = response && response.error ? response.error : 'Failed to join room';
        console.error('Room join error:', errorMsg);
        this.handleError(errorMsg);
      }
    });
  }
  
  /**
   * Mock room joining for debugging without a server
   */
  private mockJoinRoom(roomId: string): void {
    this.roomId = roomId;
    
    console.log(`Joined mock room: ${roomId}`);
    
    // Simulate room joined event
    setTimeout(() => {
      if (this.onRoomJoinedCallback) {
        this.onRoomJoinedCallback(`Mock Room ${roomId.substring(5, 8)}`);
      }
      
      // Add a mock player (yourself)
      if (this.onPlayerJoinedCallback) {
        this.onPlayerJoinedCallback({
          id: this.playerId,
          name: this.playerName,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          health: 100,
          score: 0,
          color: 0x3498db
        });
      }
      
      // Notify the game that we've joined a multiplayer game
      this.game.setMultiplayerMode(true);
    }, 500);
  }
  
  /**
   * Leave the current game room
   */
  public leaveRoom(): void {
    if (!this.roomId) {
      return;
    }
    
    console.log(`Attempting to leave room: ${this.roomId}`);
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      console.log('Using mock room leaving for debugging');
      this.mockLeaveRoom();
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      this.handleError('Not connected to server');
      return;
    }
    
    this.socket.emit('leave_room', { roomId: this.roomId }, (response: { success: boolean }) => {
      if (response && response.success) {
        console.log(`Left room: ${this.roomId}`);
        this.roomId = '';
        this.isHost = false;
        
        // Notify the game that we've left multiplayer mode
        this.game.setMultiplayerMode(false);
      }
    });
  }
  
  /**
   * Mock room leaving for debugging without a server
   */
  private mockLeaveRoom(): void {
    console.log(`Left mock room: ${this.roomId}`);
    this.roomId = '';
    this.isHost = false;
    
    // Notify the game that we've left multiplayer mode
    this.game.setMultiplayerMode(false);
  }
  
  /**
   * Start the game (host only)
   */
  public startGame(): void {
    if (!this.roomId || !this.isHost) {
      this.handleError('Only the host can start the game');
      return;
    }
    
    console.log(`Attempting to start game in room: ${this.roomId}`);
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      console.log('Using mock game start for debugging');
      this.mockStartGame();
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      this.handleError('Not connected to server');
      return;
    }
    
    this.socket.emit('start_game', { roomId: this.roomId }, (response: { success: boolean, error?: string }) => {
      if (!response || !response.success) {
        const errorMsg = response && response.error ? response.error : 'Failed to start game';
        console.error('Game start error:', errorMsg);
        this.handleError(errorMsg);
      }
    });
  }
  
  /**
   * Mock game start for debugging without a server
   */
  private mockStartGame(): void {
    console.log(`Started mock game in room: ${this.roomId}`);
    
    // Simulate game start event
    setTimeout(() => {
      // Notify the game that the game has started
      if (this.onGameStateUpdateCallback) {
        this.onGameStateUpdateCallback({
          players: [{
            id: this.playerId,
            name: this.playerName,
            position: { x: 0, y: 0, z: 0 },
            rotation: 0,
            health: 100,
            score: 0,
            color: 0x3498db
          }],
          powerUps: [],
          projectiles: [],
          gameMode: GameMode.MULTIPLAYER,
          timeRemaining: 300,
          inProgress: true
        });
      }
    }, 500);
  }
  
  /**
   * Send player position update to server
   * @param position The player's current position
   */
  public sendPlayerPosition(position: { x: number, y: number, z: number }): void {
    if (!this.roomId) {
      return;
    }
    
    const now = Date.now();
    
    // Throttle updates and only send if position has changed significantly
    if (now - this.lastUpdateTime < this.updateRate) {
      return;
    }
    
    if (this.lastSentPosition && 
        Math.abs(position.x - this.lastSentPosition.x) < this.positionThreshold &&
        Math.abs(position.y - this.lastSentPosition.y) < this.positionThreshold &&
        Math.abs(position.z - this.lastSentPosition.z) < this.positionThreshold) {
      return;
    }
    
    this.lastSentPosition = { ...position };
    this.lastUpdateTime = now;
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.PLAYER_POSITION, {
      position,
      timestamp: now,
      sequence: this.inputSequenceNumber++
    });
  }
  
  /**
   * Send player rotation update to server
   * @param rotation The player's current rotation
   */
  public sendPlayerRotation(rotation: number): void {
    if (!this.roomId) {
      return;
    }
    
    const now = Date.now();
    
    // Throttle updates and only send if rotation has changed significantly
    if (now - this.lastUpdateTime < this.updateRate) {
      return;
    }
    
    if (this.lastSentRotation !== null && 
        Math.abs(rotation - this.lastSentRotation) < this.rotationThreshold) {
      return;
    }
    
    this.lastSentRotation = rotation;
    this.lastUpdateTime = now;
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.PLAYER_ROTATION, {
      rotation,
      timestamp: now,
      sequence: this.inputSequenceNumber++
    });
  }
  
  /**
   * Send player fire event to server
   * @param position The position from which the projectile is fired
   * @param direction The direction of the projectile
   */
  public sendPlayerFire(position: { x: number, y: number, z: number }, direction: { x: number, y: number, z: number }): void {
    if (!this.roomId) {
      return;
    }
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.PLAYER_FIRE, {
      position,
      direction,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send player hit event to server
   * @param targetId The ID of the player who was hit
   * @param damage The amount of damage dealt
   */
  public sendPlayerHit(targetId: string, damage: number): void {
    if (!this.roomId) {
      return;
    }
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.PLAYER_HIT, {
      targetId,
      damage,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send power-up collection event to server
   * @param powerUpId The ID of the collected power-up
   */
  public sendPowerUpCollected(powerUpId: string): void {
    if (!this.roomId) {
      return;
    }
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.COLLECT_POWER_UP, {
      id: powerUpId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send chat message to all players in the room
   * @param message The message text
   */
  public sendChatMessage(message: string): void {
    if (!this.roomId) {
      return;
    }
    
    // For mock rooms, handle locally
    if (this.roomId.startsWith('mock-') || (this.serverUrl === 'http://localhost:3000' && (!this.socket || !this.socket.connected))) {
      // Simulate receiving the message back
      if (this.onChatMessageCallback) {
        this.onChatMessageCallback({
          sender: this.playerName,
          text: message
        });
      }
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit(MessageType.CHAT_MESSAGE, {
      text: message,
      timestamp: Date.now()
    });
  }
  
  /**
   * Update remote player states for interpolation
   * @param deltaTime Time since last update
   */
  public update(deltaTime: number): void {
    // Interpolate remote player positions and rotations
    this.remotePlayerStates.forEach((state, playerId) => {
      // Calculate interpolation factor based on time since last update
      const now = Date.now();
      const timeSinceUpdate = now - state.lastUpdateTime;
      const interpolationFactor = Math.min(timeSinceUpdate / 100, 1); // 100ms interpolation time
      
      // Interpolate position
      state.currentPosition = {
        x: state.currentPosition.x + (state.targetPosition.x - state.currentPosition.x) * interpolationFactor,
        y: state.currentPosition.y + (state.targetPosition.y - state.currentPosition.y) * interpolationFactor,
        z: state.currentPosition.z + (state.targetPosition.z - state.currentPosition.z) * interpolationFactor
      };
      
      // Interpolate rotation (handle wrapping around 2π)
      let rotationDiff = state.targetRotation - state.currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      state.currentRotation += rotationDiff * interpolationFactor;
      
      // Update the game with interpolated values
      this.game.updateRemotePlayerPosition(playerId, state.currentPosition, state.currentRotation);
    });
  }
  
  /**
   * Get the current latency to the server
   */
  public getLatency(): number {
    return this.latency;
  }
  
  /**
   * Get the player's unique ID
   */
  public getPlayerId(): string {
    return this.playerId;
  }
  
  /**
   * Check if connected to the server
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
  
  /**
   * Check if player is the host of the current room
   */
  public isRoomHost(): boolean {
    return this.isHost;
  }
  
  /**
   * Get the current room ID
   */
  public getCurrentRoomId(): string {
    return this.roomId;
  }
  
  /**
   * Get the list of available rooms
   */
  public getAvailableRooms(): RoomInfo[] {
    return this.rooms;
  }
  
  /**
   * Set callback for when a player joins
   */
  public onPlayerJoined(callback: (player: PlayerData) => void): void {
    this.onPlayerJoinedCallback = callback;
  }
  
  /**
   * Set callback for when a player leaves
   */
  public onPlayerLeft(callback: (playerId: string) => void): void {
    this.onPlayerLeftCallback = callback;
  }
  
  /**
   * Set callback for game state updates
   */
  public onGameStateUpdate(callback: (state: NetworkGameState) => void): void {
    this.onGameStateUpdateCallback = callback;
  }
  
  /**
   * Set callback for chat messages
   */
  public onChatMessage(callback: (message: { sender: string, text: string }) => void): void {
    this.onChatMessageCallback = callback;
  }
  
  /**
   * Set callback for errors
   */
  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Set callback for when a room is joined
   */
  public onRoomJoined(callback: (roomName: string) => void): void {
    this.onRoomJoinedCallback = callback;
  }
  
  /**
   * Clean up resources when the network manager is destroyed
   */
  public destroy(): void {
    this.stopPingInterval();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
