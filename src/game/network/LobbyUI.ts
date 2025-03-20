import { PlayerData } from './NetworkManager';
import { DifficultyLevel } from '../core/GameState';
import { SpawnDistributionPattern } from '../utils/SpawnManager';

/**
 * LobbyUI handles the user interface for the multiplayer lobby.
 */
export class LobbyUI {
  private container: HTMLDivElement;
  private connectPanel: HTMLDivElement;
  private roomListPanel: HTMLDivElement;
  private roomPanel: HTMLDivElement;
  private chatPanel: HTMLDivElement;
  private messagePanel: HTMLDivElement;
  
  // Callbacks
  private onConnectCallback: ((serverUrl: string, playerName: string) => void) | null = null;
  private onCreateRoomCallback: ((roomName: string, maxPlayers: number) => void) | null = null;
  private onJoinRoomCallback: ((roomId: string) => void) | null = null;
  private onLeaveRoomCallback: (() => void) | null = null;
  private onStartGameCallback: (() => void) | null = null;
  private onSendChatMessageCallback: ((message: string) => void) | null = null;
  private onSetDifficultyCallback: ((difficulty: DifficultyLevel) => void) | null = null;
  private onSetSpawnPatternCallback: ((pattern: SpawnDistributionPattern) => void) | null = null;
  
  constructor() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'lobby-container';
    this.container.style.display = 'none';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.container.style.zIndex = '1000';
    this.container.style.fontFamily = 'Arial, sans-serif';
    this.container.style.color = '#fff';
    
    // Create panels
    this.connectPanel = this.createConnectPanel();
    this.roomListPanel = this.createRoomListPanel();
    this.roomPanel = this.createRoomPanel();
    this.chatPanel = this.createChatPanel();
    this.messagePanel = this.createMessagePanel();
    
    // Add panels to container
    this.container.appendChild(this.connectPanel);
    this.container.appendChild(this.roomListPanel);
    this.container.appendChild(this.roomPanel);
    this.container.appendChild(this.chatPanel);
    this.container.appendChild(this.messagePanel);
    
    // Add container to document
    document.body.appendChild(this.container);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initialize the lobby UI
   */
  public initialize(): void {
    // Show the connect panel by default
    this.showConnectPanel();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for room updates
    document.addEventListener('roomsUpdated', (e: CustomEvent) => {
      this.updateRoomsList(e.detail.rooms);
    });
    
    // Listen for latency updates
    document.addEventListener('latencyUpdate', (e: CustomEvent) => {
      this.updateLatency(e.detail.latency);
    });
  }
  
  /**
   * Create the connect panel
   */
  private createConnectPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'connect-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '400px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#2c3e50';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Connect to Server';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    
    // Create server URL input
    const serverUrlLabel = document.createElement('label');
    serverUrlLabel.textContent = 'Server URL:';
    serverUrlLabel.style.display = 'block';
    serverUrlLabel.style.marginBottom = '5px';
    
    const serverUrlInput = document.createElement('input');
    serverUrlInput.id = 'server-url-input';
    serverUrlInput.type = 'text';
    serverUrlInput.value = 'http://localhost:3000';
    serverUrlInput.style.width = '100%';
    serverUrlInput.style.padding = '8px';
    serverUrlInput.style.marginBottom = '15px';
    serverUrlInput.style.boxSizing = 'border-box';
    serverUrlInput.style.border = '1px solid #34495e';
    serverUrlInput.style.borderRadius = '3px';
    
    // Create player name input
    const playerNameLabel = document.createElement('label');
    playerNameLabel.textContent = 'Player Name:';
    playerNameLabel.style.display = 'block';
    playerNameLabel.style.marginBottom = '5px';
    
    const playerNameInput = document.createElement('input');
    playerNameInput.id = 'player-name-input';
    playerNameInput.type = 'text';
    playerNameInput.value = 'Player' + Math.floor(Math.random() * 1000);
    playerNameInput.style.width = '100%';
    playerNameInput.style.padding = '8px';
    playerNameInput.style.marginBottom = '20px';
    playerNameInput.style.boxSizing = 'border-box';
    playerNameInput.style.border = '1px solid #34495e';
    playerNameInput.style.borderRadius = '3px';
    
    // Create connect button
    const connectButton = document.createElement('button');
    connectButton.id = 'connect-button';
    connectButton.textContent = 'Connect';
    connectButton.style.width = '100%';
    connectButton.style.padding = '10px';
    connectButton.style.backgroundColor = '#3498db';
    connectButton.style.color = '#fff';
    connectButton.style.border = 'none';
    connectButton.style.borderRadius = '3px';
    connectButton.style.cursor = 'pointer';
    connectButton.style.fontSize = '16px';
    
    // Add hover effect
    connectButton.addEventListener('mouseover', () => {
      connectButton.style.backgroundColor = '#2980b9';
    });
    
    connectButton.addEventListener('mouseout', () => {
      connectButton.style.backgroundColor = '#3498db';
    });
    
    // Add click event
    connectButton.addEventListener('click', () => {
      const serverUrl = (document.getElementById('server-url-input') as HTMLInputElement).value;
      const playerName = (document.getElementById('player-name-input') as HTMLInputElement).value;
      
      if (serverUrl && playerName) {
        if (this.onConnectCallback) {
          this.onConnectCallback(serverUrl, playerName);
        }
      }
    });
    
    // Add back to game button
    const backButton = document.createElement('button');
    backButton.id = 'back-button';
    backButton.textContent = 'Back to Game';
    backButton.style.width = '100%';
    backButton.style.padding = '10px';
    backButton.style.backgroundColor = '#e74c3c';
    backButton.style.color = '#fff';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '3px';
    backButton.style.cursor = 'pointer';
    backButton.style.fontSize = '16px';
    backButton.style.marginTop = '10px';
    
    // Add hover effect
    backButton.addEventListener('mouseover', () => {
      backButton.style.backgroundColor = '#c0392b';
    });
    
    backButton.addEventListener('mouseout', () => {
      backButton.style.backgroundColor = '#e74c3c';
    });
    
    // Add click event
    backButton.addEventListener('click', () => {
      this.hide();
    });
    
    // Add elements to panel
    panel.appendChild(title);
    panel.appendChild(serverUrlLabel);
    panel.appendChild(serverUrlInput);
    panel.appendChild(playerNameLabel);
    panel.appendChild(playerNameInput);
    panel.appendChild(connectButton);
    panel.appendChild(backButton);
    
    return panel;
  }
  
  /**
   * Create the room list panel
   */
  private createRoomListPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'room-list-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '600px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#2c3e50';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Available Rooms';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    
    // Create room list
    const roomList = document.createElement('div');
    roomList.id = 'room-list';
    roomList.style.maxHeight = '300px';
    roomList.style.overflowY = 'auto';
    roomList.style.marginBottom = '20px';
    roomList.style.border = '1px solid #34495e';
    roomList.style.borderRadius = '3px';
    roomList.style.padding = '10px';
    
    // Create create room form
    const createRoomForm = document.createElement('div');
    createRoomForm.style.marginBottom = '20px';
    
    const createRoomTitle = document.createElement('h3');
    createRoomTitle.textContent = 'Create New Room';
    createRoomTitle.style.marginBottom = '10px';
    
    const roomNameLabel = document.createElement('label');
    roomNameLabel.textContent = 'Room Name:';
    roomNameLabel.style.display = 'block';
    roomNameLabel.style.marginBottom = '5px';
    
    const roomNameInput = document.createElement('input');
    roomNameInput.id = 'room-name-input';
    roomNameInput.type = 'text';
    roomNameInput.value = 'My Room';
    roomNameInput.style.width = '100%';
    roomNameInput.style.padding = '8px';
    roomNameInput.style.marginBottom = '10px';
    roomNameInput.style.boxSizing = 'border-box';
    roomNameInput.style.border = '1px solid #34495e';
    roomNameInput.style.borderRadius = '3px';
    
    const maxPlayersLabel = document.createElement('label');
    maxPlayersLabel.textContent = 'Max Players:';
    maxPlayersLabel.style.display = 'block';
    maxPlayersLabel.style.marginBottom = '5px';
    
    const maxPlayersInput = document.createElement('input');
    maxPlayersInput.id = 'max-players-input';
    maxPlayersInput.type = 'number';
    maxPlayersInput.min = '2';
    maxPlayersInput.max = '8';
    maxPlayersInput.value = '4';
    maxPlayersInput.style.width = '100%';
    maxPlayersInput.style.padding = '8px';
    maxPlayersInput.style.marginBottom = '10px';
    maxPlayersInput.style.boxSizing = 'border-box';
    maxPlayersInput.style.border = '1px solid #34495e';
    maxPlayersInput.style.borderRadius = '3px';
    
    const createRoomButton = document.createElement('button');
    createRoomButton.id = 'create-room-button';
    createRoomButton.textContent = 'Create Room';
    createRoomButton.style.width = '100%';
    createRoomButton.style.padding = '10px';
    createRoomButton.style.backgroundColor = '#3498db';
    createRoomButton.style.color = '#fff';
    createRoomButton.style.border = 'none';
    createRoomButton.style.borderRadius = '3px';
    createRoomButton.style.cursor = 'pointer';
    createRoomButton.style.fontSize = '16px';
    
    // Add hover effect
    createRoomButton.addEventListener('mouseover', () => {
      createRoomButton.style.backgroundColor = '#2980b9';
    });
    
    createRoomButton.addEventListener('mouseout', () => {
      createRoomButton.style.backgroundColor = '#3498db';
    });
    
    // Add click event
    createRoomButton.addEventListener('click', () => {
      const roomName = (document.getElementById('room-name-input') as HTMLInputElement).value;
      const maxPlayers = parseInt((document.getElementById('max-players-input') as HTMLInputElement).value);
      
      if (roomName && maxPlayers) {
        if (this.onCreateRoomCallback) {
          this.onCreateRoomCallback(roomName, maxPlayers);
        }
      }
    });
    
    // Add elements to create room form
    createRoomForm.appendChild(createRoomTitle);
    createRoomForm.appendChild(roomNameLabel);
    createRoomForm.appendChild(roomNameInput);
    createRoomForm.appendChild(maxPlayersLabel);
    createRoomForm.appendChild(maxPlayersInput);
    createRoomForm.appendChild(createRoomButton);
    
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-button';
    refreshButton.textContent = 'Refresh Rooms';
    refreshButton.style.width = '100%';
    refreshButton.style.padding = '10px';
    refreshButton.style.backgroundColor = '#2ecc71';
    refreshButton.style.color = '#fff';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '3px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontSize = '16px';
    refreshButton.style.marginBottom = '10px';
    
    // Add hover effect
    refreshButton.addEventListener('mouseover', () => {
      refreshButton.style.backgroundColor = '#27ae60';
    });
    
    refreshButton.addEventListener('mouseout', () => {
      refreshButton.style.backgroundColor = '#2ecc71';
    });
    
    // Add click event
    refreshButton.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('refreshRooms'));
    });
    
    // Create back button
    const backButton = document.createElement('button');
    backButton.id = 'back-to-connect-button';
    backButton.textContent = 'Back to Connect';
    backButton.style.width = '100%';
    backButton.style.padding = '10px';
    backButton.style.backgroundColor = '#e74c3c';
    backButton.style.color = '#fff';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '3px';
    backButton.style.cursor = 'pointer';
    backButton.style.fontSize = '16px';
    
    // Add hover effect
    backButton.addEventListener('mouseover', () => {
      backButton.style.backgroundColor = '#c0392b';
    });
    
    backButton.addEventListener('mouseout', () => {
      backButton.style.backgroundColor = '#e74c3c';
    });
    
    // Add click event
    backButton.addEventListener('click', () => {
      this.showConnectPanel();
    });
    
    // Add elements to panel
    panel.appendChild(title);
    panel.appendChild(roomList);
    panel.appendChild(refreshButton);
    panel.appendChild(createRoomForm);
    panel.appendChild(backButton);
    
    return panel;
  }
  
  /**
   * Create the room panel
   */
  private createRoomPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'room-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '600px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#2c3e50';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // Create title
    const title = document.createElement('h2');
    title.id = 'room-title';
    title.textContent = 'Room Name';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    
    // Create player list
    const playerListTitle = document.createElement('h3');
    playerListTitle.textContent = 'Players';
    playerListTitle.style.marginBottom = '10px';
    
    const playerList = document.createElement('div');
    playerList.id = 'player-list';
    playerList.style.maxHeight = '200px';
    playerList.style.overflowY = 'auto';
    playerList.style.marginBottom = '20px';
    playerList.style.border = '1px solid #34495e';
    playerList.style.borderRadius = '3px';
    playerList.style.padding = '10px';
    
    // Create game settings
    const settingsTitle = document.createElement('h3');
    settingsTitle.textContent = 'Game Settings';
    settingsTitle.style.marginBottom = '10px';
    
    const settingsContainer = document.createElement('div');
    settingsContainer.style.marginBottom = '20px';
    settingsContainer.style.display = 'flex';
    settingsContainer.style.flexDirection = 'column';
    settingsContainer.style.gap = '10px';
    
    // Create difficulty selector
    const difficultyLabel = document.createElement('label');
    difficultyLabel.textContent = 'Difficulty:';
    difficultyLabel.style.display = 'block';
    difficultyLabel.style.marginBottom = '5px';
    
    const difficultySelect = document.createElement('select');
    difficultySelect.id = 'difficulty-select';
    difficultySelect.style.width = '100%';
    difficultySelect.style.padding = '8px';
    difficultySelect.style.boxSizing = 'border-box';
    difficultySelect.style.border = '1px solid #34495e';
    difficultySelect.style.borderRadius = '3px';
    
    // Add difficulty options
    const difficulties = [
      { value: DifficultyLevel.EASY, text: 'Easy' },
      { value: DifficultyLevel.MEDIUM, text: 'Medium' },
      { value: DifficultyLevel.HARD, text: 'Hard' },
      { value: DifficultyLevel.INSANE, text: 'Insane' }
    ];
    
    difficulties.forEach(difficulty => {
      const option = document.createElement('option');
      option.value = difficulty.value.toString();
      option.textContent = difficulty.text;
      difficultySelect.appendChild(option);
    });
    
    // Set default difficulty
    difficultySelect.value = DifficultyLevel.MEDIUM.toString();
    
    // Add change event
    difficultySelect.addEventListener('change', () => {
      if (this.onSetDifficultyCallback) {
        this.onSetDifficultyCallback(parseInt(difficultySelect.value));
      }
    });
    
    // Create spawn pattern selector
    const spawnPatternLabel = document.createElement('label');
    spawnPatternLabel.textContent = 'Spawn Pattern:';
    spawnPatternLabel.style.display = 'block';
    spawnPatternLabel.style.marginBottom = '5px';
    
    const spawnPatternSelect = document.createElement('select');
    spawnPatternSelect.id = 'spawn-pattern-select';
    spawnPatternSelect.style.width = '100%';
    spawnPatternSelect.style.padding = '8px';
    spawnPatternSelect.style.boxSizing = 'border-box';
    spawnPatternSelect.style.border = '1px solid #34495e';
    spawnPatternSelect.style.borderRadius = '3px';
    
    // Add spawn pattern options
    const spawnPatterns = [
      { value: SpawnDistributionPattern.UNIFORM, text: 'Uniform' },
      { value: SpawnDistributionPattern.PERIMETER, text: 'Perimeter' },
      { value: SpawnDistributionPattern.QUADRANTS, text: 'Quadrants' },
      { value: SpawnDistributionPattern.CENTRAL, text: 'Central' }
    ];
    
    spawnPatterns.forEach(pattern => {
      const option = document.createElement('option');
      option.value = pattern.value.toString();
      option.textContent = pattern.text;
      spawnPatternSelect.appendChild(option);
    });
    
    // Set default spawn pattern
    spawnPatternSelect.value = SpawnDistributionPattern.UNIFORM.toString();
    
    // Add change event
    spawnPatternSelect.addEventListener('change', () => {
      if (this.onSetSpawnPatternCallback) {
        this.onSetSpawnPatternCallback(parseInt(spawnPatternSelect.value));
      }
    });
    
    // Add settings to container
    settingsContainer.appendChild(difficultyLabel);
    settingsContainer.appendChild(difficultySelect);
    settingsContainer.appendChild(spawnPatternLabel);
    settingsContainer.appendChild(spawnPatternSelect);
    
    // Create start game button
    const startGameButton = document.createElement('button');
    startGameButton.id = 'start-game-button';
    startGameButton.textContent = 'Start Game';
    startGameButton.style.width = '100%';
    startGameButton.style.padding = '10px';
    startGameButton.style.backgroundColor = '#2ecc71';
    startGameButton.style.color = '#fff';
    startGameButton.style.border = 'none';
    startGameButton.style.borderRadius = '3px';
    startGameButton.style.cursor = 'pointer';
    startGameButton.style.fontSize = '16px';
    startGameButton.style.marginBottom = '10px';
    
    // Add hover effect
    startGameButton.addEventListener('mouseover', () => {
      startGameButton.style.backgroundColor = '#27ae60';
    });
    
    startGameButton.addEventListener('mouseout', () => {
      startGameButton.style.backgroundColor = '#2ecc71';
    });
    
    // Add click event
    startGameButton.addEventListener('click', () => {
      if (this.onStartGameCallback) {
        this.onStartGameCallback();
      }
    });
    
    // Create leave room button
    const leaveRoomButton = document.createElement('button');
    leaveRoomButton.id = 'leave-room-button';
    leaveRoomButton.textContent = 'Leave Room';
    leaveRoomButton.style.width = '100%';
    leaveRoomButton.style.padding = '10px';
    leaveRoomButton.style.backgroundColor = '#e74c3c';
    leaveRoomButton.style.color = '#fff';
    leaveRoomButton.style.border = 'none';
    leaveRoomButton.style.borderRadius = '3px';
    leaveRoomButton.style.cursor = 'pointer';
    leaveRoomButton.style.fontSize = '16px';
    
    // Add hover effect
    leaveRoomButton.addEventListener('mouseover', () => {
      leaveRoomButton.style.backgroundColor = '#c0392b';
    });
    
    leaveRoomButton.addEventListener('mouseout', () => {
      leaveRoomButton.style.backgroundColor = '#e74c3c';
    });
    
    // Add click event
    leaveRoomButton.addEventListener('click', () => {
      if (this.onLeaveRoomCallback) {
        this.onLeaveRoomCallback();
      }
    });
    
    // Add elements to panel
    panel.appendChild(title);
    panel.appendChild(playerListTitle);
    panel.appendChild(playerList);
    panel.appendChild(settingsTitle);
    panel.appendChild(settingsContainer);
    panel.appendChild(startGameButton);
    panel.appendChild(leaveRoomButton);
    
    return panel;
  }
  
  /**
   * Create the chat panel
   */
  private createChatPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'chat-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.style.width = '300px';
    panel.style.height = '400px';
    panel.style.backgroundColor = '#2c3e50';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Chat';
    title.style.textAlign = 'center';
    title.style.margin = '10px 0';
    title.style.padding = '0 10px';
    
    // Create chat messages container
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chat-messages';
    chatMessages.style.flex = '1';
    chatMessages.style.overflowY = 'auto';
    chatMessages.style.padding = '10px';
    chatMessages.style.borderTop = '1px solid #34495e';
    chatMessages.style.borderBottom = '1px solid #34495e';
    
    // Create chat input container
    const chatInputContainer = document.createElement('div');
    chatInputContainer.style.padding = '10px';
    chatInputContainer.style.display = 'flex';
    
    // Create chat input
    const chatInput = document.createElement('input');
    chatInput.id = 'chat-input';
    chatInput.type = 'text';
    chatInput.placeholder = 'Type a message...';
    chatInput.style.flex = '1';
    chatInput.style.padding = '8px';
    chatInput.style.border = '1px solid #34495e';
    chatInput.style.borderRadius = '3px 0 0 3px';
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.id = 'send-button';
    sendButton.textContent = 'Send';
    sendButton.style.padding = '8px 15px';
    sendButton.style.backgroundColor = '#3498db';
    sendButton.style.color = '#fff';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '0 3px 3px 0';
    sendButton.style.cursor = 'pointer';
    
    // Add hover effect
    sendButton.addEventListener('mouseover', () => {
      sendButton.style.backgroundColor = '#2980b9';
    });
    
    sendButton.addEventListener('mouseout', () => {
      sendButton.style.backgroundColor = '#3498db';
    });
    
    // Add click event
    sendButton.addEventListener('click', () => {
      const message = (document.getElementById('chat-input') as HTMLInputElement).value;
      
      if (message) {
        if (this.onSendChatMessageCallback) {
          this.onSendChatMessageCallback(message);
        }
        
        // Clear input
        (document.getElementById('chat-input') as HTMLInputElement).value = '';
      }
    });
    
    // Add keypress event to input
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });
    
    // Add elements to chat input container
    chatInputContainer.appendChild(chatInput);
    chatInputContainer.appendChild(sendButton);
    
    // Add elements to panel
    panel.appendChild(title);
    panel.appendChild(chatMessages);
    panel.appendChild(chatInputContainer);
    
    return panel;
  }
  
  /**
   * Create the message panel
   */
  private createMessagePanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'message-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#2c3e50';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    panel.style.textAlign = 'center';
    
    // Create message
    const message = document.createElement('p');
    message.id = 'message-text';
    message.style.fontSize = '18px';
    message.style.margin = '0 0 20px 0';
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.id = 'message-spinner';
    spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
    spinner.style.borderTop = '4px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '30px';
    spinner.style.height = '30px';
    spinner.style.margin = '0 auto';
    spinner.style.animation = 'spin 1s linear infinite';
    
    // Add keyframes for spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Add elements to panel
    panel.appendChild(message);
    panel.appendChild(spinner);
    
    return panel;
  }
  
  /**
   * Show the connect panel
   */
  public showConnectPanel(): void {
    this.hideAllPanels();
    this.container.style.display = 'block';
    this.connectPanel.style.display = 'block';
  }
  
  /**
   * Show the room list panel
   */
  public showRoomList(): void {
    this.hideAllPanels();
    this.container.style.display = 'block';
    this.roomListPanel.style.display = 'block';
  }
  
  /**
   * Show the room panel
   * @param roomName The name of the room
   */
  public showRoom(roomName: string): void {
    this.hideAllPanels();
    this.container.style.display = 'block';
    this.roomPanel.style.display = 'block';
    this.chatPanel.style.display = 'flex';
    
    // Set room title
    const roomTitle = document.getElementById('room-title');
    if (roomTitle) {
      roomTitle.textContent = roomName;
    }
    
    // Clear player list
    this.clearPlayers();
    
    // Clear chat messages
    this.clearChatMessages();
  }
  
  /**
   * Show the connecting message
   */
  public showConnecting(): void {
    this.hideAllPanels();
    this.container.style.display = 'block';
    this.messagePanel.style.display = 'block';
    
    // Set message
    const messageText = document.getElementById('message-text');
    if (messageText) {
      messageText.textContent = 'Connecting to server...';
    }
    
    // Show spinner
    const spinner = document.getElementById('message-spinner');
    if (spinner) {
      spinner.style.display = 'block';
    }
  }
  
  /**
   * Show an error message
   * @param error The error message
   */
  public showError(error: string): void {
    this.hideAllPanels();
    this.container.style.display = 'block';
    this.messagePanel.style.display = 'block';
    
    // Set message
    const messageText = document.getElementById('message-text');
    if (messageText) {
      messageText.textContent = error;
      messageText.style.color = '#e74c3c';
    }
    
    // Hide spinner
    const spinner = document.getElementById('message-spinner');
    if (spinner) {
      spinner.style.display = 'none';
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
      this.showConnectPanel();
      
      // Reset message color
      if (messageText) {
        messageText.style.color = '#fff';
      }
    }, 3000);
  }
  
  /**
   * Show a message to the user
   * @param message The message to show
   * @param duration The duration to show the message (ms)
   */
  public showMessage(message: string, duration: number = 3000): void {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '20%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.padding = '10px 20px';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = '#fff';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontSize = '18px';
    messageElement.style.zIndex = '2000';
    messageElement.textContent = message;
    
    // Add to document
    document.body.appendChild(messageElement);
    
    // Remove after duration
    setTimeout(() => {
      document.body.removeChild(messageElement);
    }, duration);
  }
  
  /**
   * Hide all panels
   */
  private hideAllPanels(): void {
    this.connectPanel.style.display = 'none';
    this.roomListPanel.style.display = 'none';
    this.roomPanel.style.display = 'none';
    this.chatPanel.style.display = 'none';
    this.messagePanel.style.display = 'none';
  }
  
  /**
   * Hide the lobby UI
   */
  public hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * Show the lobby UI
   */
  public show(): void {
    this.container.style.display = 'block';
  }
  
  /**
   * Update the rooms list
   * @param rooms The list of available rooms
   */
  public updateRoomsList(rooms: any[]): void {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    // Clear room list
    roomList.innerHTML = '';
    
    // Add rooms to list
    if (rooms.length === 0) {
      const noRoomsMessage = document.createElement('p');
      noRoomsMessage.textContent = 'No rooms available. Create a new room to get started.';
      noRoomsMessage.style.textAlign = 'center';
      noRoomsMessage.style.color = '#bdc3c7';
      noRoomsMessage.style.padding = '20px';
      roomList.appendChild(noRoomsMessage);
    } else {
      rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.style.padding = '10px';
        roomItem.style.marginBottom = '5px';
        roomItem.style.backgroundColor = '#34495e';
        roomItem.style.borderRadius = '3px';
        roomItem.style.display = 'flex';
        roomItem.style.justifyContent = 'space-between';
        roomItem.style.alignItems = 'center';
        
        const roomInfo = document.createElement('div');
        
        const roomName = document.createElement('div');
        roomName.textContent = room.name;
        roomName.style.fontWeight = 'bold';
        roomName.style.marginBottom = '5px';
        
        const roomStatus = document.createElement('div');
        roomStatus.textContent = `Players: ${room.players}/${room.maxPlayers} | Status: ${room.inProgress ? 'In Progress' : 'Waiting'}`;
        roomStatus.style.fontSize = '12px';
        roomStatus.style.color = '#bdc3c7';
        
        roomInfo.appendChild(roomName);
        roomInfo.appendChild(roomStatus);
        
        const joinButton = document.createElement('button');
        joinButton.textContent = 'Join';
        joinButton.style.padding = '5px 10px';
        joinButton.style.backgroundColor = room.inProgress ? '#95a5a6' : '#3498db';
        joinButton.style.color = '#fff';
        joinButton.style.border = 'none';
        joinButton.style.borderRadius = '3px';
        joinButton.style.cursor = room.inProgress ? 'not-allowed' : 'pointer';
        joinButton.disabled = room.inProgress;
        
        // Add hover effect
        if (!room.inProgress) {
          joinButton.addEventListener('mouseover', () => {
            joinButton.style.backgroundColor = '#2980b9';
          });
          
          joinButton.addEventListener('mouseout', () => {
            joinButton.style.backgroundColor = '#3498db';
          });
        }
        
        // Add click event
        joinButton.addEventListener('click', () => {
          if (!room.inProgress && this.onJoinRoomCallback) {
            this.onJoinRoomCallback(room.id);
          }
        });
        
        roomItem.appendChild(roomInfo);
        roomItem.appendChild(joinButton);
        
        roomList.appendChild(roomItem);
      });
    }
  }
  
  /**
   * Add a player to the player list
   * @param player The player to add
   */
  public addPlayer(player: PlayerData): void {
    const playerList = document.getElementById('player-list');
    if (!playerList) return;
    
    // Check if player already exists
    const existingPlayer = document.getElementById(`player-${player.id}`);
    if (existingPlayer) return;
    
    // Create player item
    const playerItem = document.createElement('div');
    playerItem.id = `player-${player.id}`;
    playerItem.style.padding = '10px';
    playerItem.style.marginBottom = '5px';
    playerItem.style.backgroundColor = '#34495e';
    playerItem.style.borderRadius = '3px';
    playerItem.style.display = 'flex';
    playerItem.style.alignItems = 'center';
    
    // Create color indicator
    const colorIndicator = document.createElement('div');
    colorIndicator.style.width = '20px';
    colorIndicator.style.height = '20px';
    colorIndicator.style.borderRadius = '50%';
    colorIndicator.style.marginRight = '10px';
    colorIndicator.style.backgroundColor = `#${player.color.toString(16).padStart(6, '0')}`;
    
    // Create player name
    const playerName = document.createElement('div');
    playerName.textContent = player.name;
    
    // Add elements to player item
    playerItem.appendChild(colorIndicator);
    playerItem.appendChild(playerName);
    
    // Add player item to list
    playerList.appendChild(playerItem);
  }
  
  /**
   * Remove a player from the player list
   * @param playerId The ID of the player to remove
   */
  public removePlayer(playerId: string): void {
    const playerItem = document.getElementById(`player-${playerId}`);
    if (playerItem) {
      playerItem.remove();
    }
  }
  
  /**
   * Clear the player list
   */
  public clearPlayers(): void {
    const playerList = document.getElementById('player-list');
    if (playerList) {
      playerList.innerHTML = '';
    }
  }
  
  /**
   * Add a chat message
   * @param sender The sender of the message
   * @param text The message text
   */
  public addChatMessage(sender: string, text: string): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.marginBottom = '10px';
    
    // Create sender
    const senderElement = document.createElement('div');
    senderElement.textContent = sender;
    senderElement.style.fontWeight = 'bold';
    senderElement.style.color = '#3498db';
    
    // Create message text
    const textElement = document.createElement('div');
    textElement.textContent = text;
    textElement.style.wordBreak = 'break-word';
    
    // Add elements to message container
    messageContainer.appendChild(senderElement);
    messageContainer.appendChild(textElement);
    
    // Add message to chat
    chatMessages.appendChild(messageContainer);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  /**
   * Clear chat messages
   */
  public clearChatMessages(): void {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
  }
  
  /**
   * Update the latency display
   * @param latency The current latency in milliseconds
   */
  public updateLatency(latency: number): void {
    // TODO: Add latency display to UI
  }
  
  /**
   * Reset the lobby UI
   */
  public reset(): void {
    this.clearPlayers();
    this.clearChatMessages();
  }
  
  /**
   * Set callback for when the connect button is clicked
   * @param callback The callback function
   */
  public onConnect(callback: (serverUrl: string, playerName: string) => void): void {
    this.onConnectCallback = callback;
  }
  
  /**
   * Set callback for when the create room button is clicked
   * @param callback The callback function
   */
  public onCreateRoom(callback: (roomName: string, maxPlayers: number) => void): void {
    this.onCreateRoomCallback = callback;
  }
  
  /**
   * Set callback for when the join room button is clicked
   * @param callback The callback function
   */
  public onJoinRoom(callback: (roomId: string) => void): void {
    this.onJoinRoomCallback = callback;
  }
  
  /**
   * Set callback for when the leave room button is clicked
   * @param callback The callback function
   */
  public onLeaveRoom(callback: () => void): void {
    this.onLeaveRoomCallback = callback;
  }
  
  /**
   * Set callback for when the start game button is clicked
   * @param callback The callback function
   */
  public onStartGame(callback: () => void): void {
    this.onStartGameCallback = callback;
  }
  
  /**
   * Set callback for when a chat message is sent
   * @param callback The callback function
   */
  public onSendChatMessage(callback: (message: string) => void): void {
    this.onSendChatMessageCallback = callback;
  }
  
  /**
   * Set callback for when the difficulty is changed
   * @param callback The callback function
   */
  public onSetDifficulty(callback: (difficulty: DifficultyLevel) => void): void {
    this.onSetDifficultyCallback = callback;
  }
  
  /**
   * Set callback for when the spawn pattern is changed
   * @param callback The callback function
   */
  public onSetSpawnPattern(callback: (pattern: SpawnDistributionPattern) => void): void {
    this.onSetSpawnPatternCallback = callback;
  }
  
  /**
   * Clean up resources when the lobby UI is destroyed
   */
  public destroy(): void {
    document.body.removeChild(this.container);
  }
}
