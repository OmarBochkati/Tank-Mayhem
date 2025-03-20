import { DifficultyLevel } from '../core/GameState';

/**
 * LobbyUI handles the user interface for the multiplayer lobby,
 * including room creation, joining, and chat functionality.
 */
export class LobbyUI {
  private container: HTMLDivElement;
  private connectPanel: HTMLDivElement;
  private roomListPanel: HTMLDivElement;
  private roomPanel: HTMLDivElement;
  private chatPanel: HTMLDivElement;
  private errorPanel: HTMLDivElement;
  
  // Callbacks
  private onConnectCallback: ((serverUrl: string, playerName: string) => void) | null = null;
  private onCreateRoomCallback: ((roomName: string, maxPlayers: number) => void) | null = null;
  private onJoinRoomCallback: ((roomId: string) => void) | null = null;
  private onLeaveRoomCallback: (() => void) | null = null;
  private onStartGameCallback: (() => void) | null = null;
  private onSendChatMessageCallback: ((message: string) => void) | null = null;
  private onSetDifficultyCallback: ((difficulty: DifficultyLevel) => void) | null = null;
  
  constructor() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'multiplayer-lobby';
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
    this.errorPanel = this.createErrorPanel();
    
    // Add panels to container
    this.container.appendChild(this.connectPanel);
    this.container.appendChild(this.roomListPanel);
    this.container.appendChild(this.roomPanel);
    this.container.appendChild(this.chatPanel);
    this.container.appendChild(this.errorPanel);
    
    // Add event listeners for room updates
    document.addEventListener('roomsUpdated', (e: CustomEvent) => {
      this.updateRoomsList(e.detail.rooms);
    });
    
    document.addEventListener('latencyUpdate', (e: CustomEvent) => {
      this.updateLatency(e.detail.latency);
    });
  }
  
  /**
   * Initialize the lobby UI
   */
  public initialize(): void {
    document.body.appendChild(this.container);
    
    // Initially show connect panel
    this.showConnectPanel();
  }
  
  /**
   * Create the connect panel
   */
  private createConnectPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lobby-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '400px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#333';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.textContent = 'Connect to Server';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    panel.appendChild(title);
    
    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '15px';
    
    // Server URL input
    const serverUrlLabel = document.createElement('label');
    serverUrlLabel.textContent = 'Server URL:';
    serverUrlLabel.style.fontWeight = 'bold';
    form.appendChild(serverUrlLabel);
    
    const serverUrlInput = document.createElement('input');
    serverUrlInput.type = 'text';
    serverUrlInput.id = 'server-url-input';
    serverUrlInput.value = 'http://localhost:3000';
    serverUrlInput.style.padding = '8px';
    serverUrlInput.style.borderRadius = '3px';
    serverUrlInput.style.border = '1px solid #555';
    form.appendChild(serverUrlInput);
    
    // Player name input
    const playerNameLabel = document.createElement('label');
    playerNameLabel.textContent = 'Player Name:';
    playerNameLabel.style.fontWeight = 'bold';
    form.appendChild(playerNameLabel);
    
    const playerNameInput = document.createElement('input');
    playerNameInput.type = 'text';
    playerNameInput.id = 'player-name-input';
    playerNameInput.value = `Player${Math.floor(Math.random() * 1000)}`;
    playerNameInput.style.padding = '8px';
    playerNameInput.style.borderRadius = '3px';
    playerNameInput.style.border = '1px solid #555';
    form.appendChild(playerNameInput);
    
    // Connect button
    const connectButton = document.createElement('button');
    connectButton.type = 'submit';
    connectButton.textContent = 'Connect';
    connectButton.style.padding = '10px';
    connectButton.style.backgroundColor = '#3498db';
    connectButton.style.color = '#fff';
    connectButton.style.border = 'none';
    connectButton.style.borderRadius = '3px';
    connectButton.style.cursor = 'pointer';
    connectButton.style.fontWeight = 'bold';
    connectButton.style.marginTop = '10px';
    form.appendChild(connectButton);
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '10px';
    cancelButton.style.backgroundColor = '#e74c3c';
    cancelButton.style.color = '#fff';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontWeight = 'bold';
    form.appendChild(cancelButton);
    
    // Form submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const serverUrl = serverUrlInput.value.trim();
      const playerName = playerNameInput.value.trim();
      
      if (serverUrl && playerName) {
        if (this.onConnectCallback) {
          this.onConnectCallback(serverUrl, playerName);
        }
      }
    });
    
    // Cancel button handler
    cancelButton.addEventListener('click', () => {
      this.hide();
    });
    
    panel.appendChild(form);
    
    return panel;
  }
  
  /**
   * Create the room list panel
   */
  private createRoomListPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lobby-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '600px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#333';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.textContent = 'Game Rooms';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    panel.appendChild(title);
    
    // Latency display
    const latencyDisplay = document.createElement('div');
    latencyDisplay.id = 'latency-display';
    latencyDisplay.textContent = 'Latency: -- ms';
    latencyDisplay.style.textAlign = 'right';
    latencyDisplay.style.fontSize = '12px';
    latencyDisplay.style.marginBottom = '10px';
    panel.appendChild(latencyDisplay);
    
    // Rooms list
    const roomsList = document.createElement('div');
    roomsList.id = 'rooms-list';
    roomsList.style.maxHeight = '300px';
    roomsList.style.overflowY = 'auto';
    roomsList.style.marginBottom = '20px';
    roomsList.style.border = '1px solid #555';
    roomsList.style.borderRadius = '3px';
    roomsList.style.padding = '10px';
    panel.appendChild(roomsList);
    
    // Create room form
    const createRoomForm = document.createElement('form');
    createRoomForm.id = 'create-room-form';
    createRoomForm.style.display = 'flex';
    createRoomForm.style.flexDirection = 'column';
    createRoomForm.style.gap = '10px';
    createRoomForm.style.marginBottom = '20px';
    
    const createRoomTitle = document.createElement('h3');
    createRoomTitle.textContent = 'Create New Room';
    createRoomTitle.style.marginBottom = '10px';
    createRoomForm.appendChild(createRoomTitle);
    
    // Room name input
    const roomNameLabel = document.createElement('label');
    roomNameLabel.textContent = 'Room Name:';
    roomNameLabel.style.fontWeight = 'bold';
    createRoomForm.appendChild(roomNameLabel);
    
    const roomNameInput = document.createElement('input');
    roomNameInput.type = 'text';
    roomNameInput.id = 'room-name-input';
    roomNameInput.placeholder = 'Enter room name';
    roomNameInput.style.padding = '8px';
    roomNameInput.style.borderRadius = '3px';
    roomNameInput.style.border = '1px solid #555';
    createRoomForm.appendChild(roomNameInput);
    
    // Max players input
    const maxPlayersLabel = document.createElement('label');
    maxPlayersLabel.textContent = 'Max Players:';
    maxPlayersLabel.style.fontWeight = 'bold';
    createRoomForm.appendChild(maxPlayersLabel);
    
    const maxPlayersInput = document.createElement('input');
    maxPlayersInput.type = 'number';
    maxPlayersInput.id = 'max-players-input';
    maxPlayersInput.min = '2';
    maxPlayersInput.max = '8';
    maxPlayersInput.value = '4';
    maxPlayersInput.style.padding = '8px';
    maxPlayersInput.style.borderRadius = '3px';
    maxPlayersInput.style.border = '1px solid #555';
    createRoomForm.appendChild(maxPlayersInput);
    
    // Create room button
    const createRoomButton = document.createElement('button');
    createRoomButton.type = 'submit';
    createRoomButton.textContent = 'Create Room';
    createRoomButton.style.padding = '10px';
    createRoomButton.style.backgroundColor = '#2ecc71';
    createRoomButton.style.color = '#fff';
    createRoomButton.style.border = 'none';
    createRoomButton.style.borderRadius = '3px';
    createRoomButton.style.cursor = 'pointer';
    createRoomButton.style.fontWeight = 'bold';
    createRoomForm.appendChild(createRoomButton);
    
    // Form submit handler
    createRoomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const roomName = roomNameInput.value.trim();
      const maxPlayers = parseInt(maxPlayersInput.value);
      
      if (roomName && maxPlayers >= 2) {
        if (this.onCreateRoomCallback) {
          this.onCreateRoomCallback(roomName, maxPlayers);
        }
      }
    });
    
    panel.appendChild(createRoomForm);
    
    // Refresh and disconnect buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Rooms';
    refreshButton.style.padding = '10px';
    refreshButton.style.backgroundColor = '#3498db';
    refreshButton.style.color = '#fff';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '3px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontWeight = 'bold';
    refreshButton.style.flex = '1';
    refreshButton.style.marginRight = '10px';
    buttonContainer.appendChild(refreshButton);
    
    const disconnectButton = document.createElement('button');
    disconnectButton.textContent = 'Disconnect';
    disconnectButton.style.padding = '10px';
    disconnectButton.style.backgroundColor = '#e74c3c';
    disconnectButton.style.color = '#fff';
    disconnectButton.style.border = 'none';
    disconnectButton.style.borderRadius = '3px';
    disconnectButton.style.cursor = 'pointer';
    disconnectButton.style.fontWeight = 'bold';
    disconnectButton.style.flex = '1';
    buttonContainer.appendChild(disconnectButton);
    
    // Refresh button handler
    refreshButton.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('refreshRooms'));
    });
    
    // Disconnect button handler
    disconnectButton.addEventListener('click', () => {
      this.hide();
    });
    
    panel.appendChild(buttonContainer);
    
    return panel;
  }
  
  /**
   * Create the room panel
   */
  private createRoomPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lobby-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '600px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#333';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.id = 'room-title';
    title.textContent = 'Game Room';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    panel.appendChild(title);
    
    // Players list
    const playersTitle = document.createElement('h3');
    playersTitle.textContent = 'Players';
    playersTitle.style.marginBottom = '10px';
    panel.appendChild(playersTitle);
    
    const playersList = document.createElement('div');
    playersList.id = 'players-list';
    playersList.style.maxHeight = '200px';
    playersList.style.overflowY = 'auto';
    playersList.style.marginBottom = '20px';
    playersList.style.border = '1px solid #555';
    playersList.style.borderRadius = '3px';
    playersList.style.padding = '10px';
    panel.appendChild(playersList);
    
    // Game settings
    const settingsTitle = document.createElement('h3');
    settingsTitle.textContent = 'Game Settings';
    settingsTitle.style.marginBottom = '10px';
    panel.appendChild(settingsTitle);
    
    const settingsContainer = document.createElement('div');
    settingsContainer.style.marginBottom = '20px';
    settingsContainer.style.border = '1px solid #555';
    settingsContainer.style.borderRadius = '3px';
    settingsContainer.style.padding = '10px';
    
    // Difficulty selector
    const difficultyLabel = document.createElement('label');
    difficultyLabel.textContent = 'Difficulty:';
    difficultyLabel.style.fontWeight = 'bold';
    difficultyLabel.style.marginRight = '10px';
    settingsContainer.appendChild(difficultyLabel);
    
    const difficultySelect = document.createElement('select');
    difficultySelect.id = 'difficulty-select';
    difficultySelect.style.padding = '5px';
    difficultySelect.style.borderRadius = '3px';
    difficultySelect.style.border = '1px solid #555';
    
    const difficulties = [
      { value: DifficultyLevel.EASY, label: 'Easy' },
      { value: DifficultyLevel.MEDIUM, label: 'Medium' },
      { value: DifficultyLevel.HARD, label: 'Hard' },
      { value: DifficultyLevel.INSANE, label: 'Insane' }
    ];
    
    difficulties.forEach(difficulty => {
      const option = document.createElement('option');
      option.value = difficulty.value.toString();
      option.textContent = difficulty.label;
      difficultySelect.appendChild(option);
    });
    
    difficultySelect.addEventListener('change', () => {
      if (this.onSetDifficultyCallback) {
        this.onSetDifficultyCallback(parseInt(difficultySelect.value) as DifficultyLevel);
      }
    });
    
    settingsContainer.appendChild(difficultySelect);
    panel.appendChild(settingsContainer);
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    
    const startGameButton = document.createElement('button');
    startGameButton.id = 'start-game-button';
    startGameButton.textContent = 'Start Game';
    startGameButton.style.padding = '10px';
    startGameButton.style.backgroundColor = '#2ecc71';
    startGameButton.style.color = '#fff';
    startGameButton.style.border = 'none';
    startGameButton.style.borderRadius = '3px';
    startGameButton.style.cursor = 'pointer';
    startGameButton.style.fontWeight = 'bold';
    startGameButton.style.flex = '1';
    startGameButton.style.marginRight = '10px';
    buttonContainer.appendChild(startGameButton);
    
    const leaveRoomButton = document.createElement('button');
    leaveRoomButton.textContent = 'Leave Room';
    leaveRoomButton.style.padding = '10px';
    leaveRoomButton.style.backgroundColor = '#e74c3c';
    leaveRoomButton.style.color = '#fff';
    leaveRoomButton.style.border = 'none';
    leaveRoomButton.style.borderRadius = '3px';
    leaveRoomButton.style.cursor = 'pointer';
    leaveRoomButton.style.fontWeight = 'bold';
    leaveRoomButton.style.flex = '1';
    buttonContainer.appendChild(leaveRoomButton);
    
    // Start game button handler
    startGameButton.addEventListener('click', () => {
      if (this.onStartGameCallback) {
        this.onStartGameCallback();
      }
    });
    
    // Leave room button handler
    leaveRoomButton.addEventListener('click', () => {
      if (this.onLeaveRoomCallback) {
        this.onLeaveRoomCallback();
      }
    });
    
    panel.appendChild(buttonContainer);
    
    return panel;
  }
  
  /**
   * Create the chat panel
   */
  private createChatPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lobby-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.bottom = '0%';
    panel.style.right = '0%';
    panel.style.transform = 'translate(-10%, -20%)';
    panel.style.width = '300px';
    panel.style.height = '400px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#333';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.textContent = 'Chat';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    panel.appendChild(title);
    
    // Chat messages
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chat-messages';
    chatMessages.style.height = '250px';
    chatMessages.style.overflowY = 'auto';
    chatMessages.style.marginBottom = '20px';
    chatMessages.style.border = '1px solid #555';
    chatMessages.style.borderRadius = '3px';
    chatMessages.style.padding = '10px';
    panel.appendChild(chatMessages);
    
    // Chat input
    const chatForm = document.createElement('form');
    chatForm.id = 'chat-form';
    chatForm.style.display = 'flex';
    chatForm.style.gap = '10px';
    
    const chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.id = 'chat-input';
    chatInput.placeholder = 'Type your message...';
    chatInput.style.padding = '8px';
    chatInput.style.borderRadius = '3px';
    chatInput.style.border = '1px solid #555';
    chatForm.appendChild(chatInput);
    
    const sendButton = document.createElement('button');
    sendButton.type = 'submit';
    sendButton.textContent = 'Send';
    sendButton.style.padding = '10px';
    sendButton.style.backgroundColor = '#3498db';
    sendButton.style.color = '#fff';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '3px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.fontWeight = 'bold';
    chatForm.appendChild(sendButton);
    
    // Form submit handler
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const message = chatInput.value.trim();
      
      if (message) {
        if (this.onSendChatMessageCallback) {
          this.onSendChatMessageCallback(message);
        }
        
        chatInput.value = '';
      }
    });
    
    panel.appendChild(chatForm);
    
    return panel;
  }
  
  /**
   * Create the error panel
   */
  private createErrorPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lobby-panel';
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = '400px';
    panel.style.padding = '20px';
    panel.style.backgroundColor = '#333';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.textContent = 'Error';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    title.style.color = '#e74c3c';
    panel.appendChild(title);
    
    const errorMessage = document.createElement('p');
    errorMessage.id = 'error-message';
    errorMessage.style.textAlign = 'center';
    errorMessage.style.marginBottom = '20px';
    panel.appendChild(errorMessage);
    
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.padding = '10px';
    okButton.style.backgroundColor = '#3498db';
    okButton.style.color = '#fff';
    okButton.style.border = 'none';
    okButton.style.borderRadius = '3px';
    okButton.style.cursor = 'pointer';
    okButton.style.fontWeight = 'bold';
    okButton.style.width = '100%';
    
    okButton.addEventListener('click', () => {
      this.hideErrorPanel();
    });
    
    panel.appendChild(okButton);
    
    return panel;
  }
  
  /**
   * Update the rooms list
   */
  private updateRoomsList(rooms: any[]): void {
    const roomsList = document.getElementById('rooms-list');
    
    if (roomsList) {
      roomsList.innerHTML = '';
      
      if (rooms.length === 0) {
        const noRoomsMessage = document.createElement('p');
        noRoomsMessage.textContent = 'No rooms available. Create a new room to start playing.';
        noRoomsMessage.style.textAlign = 'center';
        noRoomsMessage.style.fontStyle = 'italic';
        roomsList.appendChild(noRoomsMessage);
      } else {
        rooms.forEach(room => {
          const roomItem = document.createElement('div');
          roomItem.className = 'room-item';
          roomItem.style.padding = '10px';
          roomItem.style.marginBottom = '10px';
          roomItem.style.backgroundColor = '#444';
          roomItem.style.borderRadius = '3px';
          roomItem.style.display = 'flex';
          roomItem.style.justifyContent = 'space-between';
          roomItem.style.alignItems = 'center';
          
          const roomInfo = document.createElement('div');
          
          const roomName = document.createElement('h4');
          roomName.textContent = room.name;
          roomName.style.margin = '0 0 5px 0';
          roomInfo.appendChild(roomName);
          
          const roomDetails = document.createElement('p');
          roomDetails.textContent = `Players: ${room.players}/${room.maxPlayers} | Status: ${room.inProgress ? 'In Progress' : 'Waiting'}`;
          roomDetails.style.margin = '0';
          roomDetails.style.fontSize = '12px';
          roomInfo.appendChild(roomDetails);
          
          roomItem.appendChild(roomInfo);
          
          if (!room.inProgress && room.players < room.maxPlayers) {
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.style.padding = '5px 10px';
            joinButton.style.backgroundColor = '#3498db';
            joinButton.style.color = '#fff';
            joinButton.style.border = 'none';
            joinButton.style.borderRadius = '3px';
            joinButton.style.cursor = 'pointer';
            
            joinButton.addEventListener('click', () => {
              if (this.onJoinRoomCallback) {
                this.onJoinRoomCallback(room.id);
              }
            });
            
            roomItem.appendChild(joinButton);
          } else {
            const statusBadge = document.createElement('span');
            statusBadge.textContent = room.inProgress ? 'In Progress' : 'Full';
            statusBadge.style.padding = '5px 10px';
            statusBadge.style.backgroundColor = '#e74c3c';
            statusBadge.style.color = '#fff';
            statusBadge.style.borderRadius = '3px';
            statusBadge.style.fontSize = '12px';
            
            roomItem.appendChild(statusBadge);
          }
          
          roomsList.appendChild(roomItem);
        });
      }
    }
  }
  
  /**
   * Update the latency display
   */
  private updateLatency(latency: number): void {
    const latencyDisplay = document.getElementById('latency-display');
    
    if (latencyDisplay) {
      latencyDisplay.textContent = `Latency: ${latency} ms`;
      
      // Color code based on latency
      if (latency < 50) {
        latencyDisplay.style.color = '#2ecc71'; // Green
      } else if (latency < 100) {
        latencyDisplay.style.color = '#f39c12'; // Orange
      } else {
        latencyDisplay.style.color = '#e74c3c'; // Red
      }
    }
  }
  
  /**
   * Add a player to the players list
   */
  public addPlayer(player: { id: string, name: string }): void {
    const playersList = document.getElementById('players-list');
    
    if (playersList) {
      const playerItem = document.createElement('div');
      playerItem.id = `player-${player.id}`;
      playerItem.className = 'player-item';
      playerItem.style.padding = '10px';
      playerItem.style.marginBottom = '5px';
      playerItem.style.backgroundColor = '#444';
      playerItem.style.borderRadius = '3px';
      
      const playerName = document.createElement('span');
      playerName.textContent = player.name;
      playerItem.appendChild(playerName);
      
      playersList.appendChild(playerItem);
    }
  }
  
  /**
   * Remove a player from the players list
   */
  public removePlayer(playerId: string): void {
    const playerItem = document.getElementById(`player-${playerId}`);
    
    if (playerItem) {
      playerItem.remove();
    }
  }
  /**
   * Clear all players from the players list
   */
  public clearPlayers(): void {
    const playersList = document.getElementById('players-list');
    
    if (playersList) {
      playersList.innerHTML = '';
    }
  }
  
  /**
   * Add a chat message
   */
  public addChatMessage(sender: string, text: string): void {
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatMessages) {
      const messageItem = document.createElement('div');
      messageItem.className = 'chat-message';
      messageItem.style.marginBottom = '10px';
      
      const senderSpan = document.createElement('span');
      senderSpan.textContent = `${sender}: `;
      senderSpan.style.fontWeight = 'bold';
      senderSpan.style.color = '#3498db';
      messageItem.appendChild(senderSpan);
      
      const textSpan = document.createElement('span');
      textSpan.textContent = text;
      messageItem.appendChild(textSpan);
      
      chatMessages.appendChild(messageItem);
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  
  /**
   * Show an error message
   */
  public showError(message: string): void {
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) {
      errorMessage.textContent = message;
      this.showErrorPanel();
    }
  }
  
  /**
   * Show the connecting message
   */
  public showConnecting(): void {
    this.hideAllPanels();
    
    const connectingPanel = document.createElement('div');
    connectingPanel.id = 'connecting-panel';
    connectingPanel.className = 'lobby-panel';
    connectingPanel.style.display = 'flex';
    connectingPanel.style.flexDirection = 'column';
    connectingPanel.style.justifyContent = 'center';
    connectingPanel.style.alignItems = 'center';
    connectingPanel.style.position = 'absolute';
    connectingPanel.style.top = '50%';
    connectingPanel.style.left = '50%';
    connectingPanel.style.transform = 'translate(-50%, -50%)';
    connectingPanel.style.width = '400px';
    connectingPanel.style.padding = '20px';
    connectingPanel.style.backgroundColor = '#333';
    connectingPanel.style.borderRadius = '5px';
    connectingPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const title = document.createElement('h2');
    title.textContent = 'Connecting to Server...';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    connectingPanel.appendChild(title);
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.border = '5px solid #f3f3f3';
    spinner.style.borderTop = '5px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 2s linear infinite';
    connectingPanel.appendChild(spinner);
    
    // Add keyframes for spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    this.container.appendChild(connectingPanel);
    this.container.style.display = 'block';
  }
  
  /**
   * Show the connect panel
   */
  public showConnectPanel(): void {
    this.hideAllPanels();
    this.connectPanel.style.display = 'block';
    this.container.style.display = 'block';
  }
  
  /**
   * Show the room list panel
   */
  public showRoomList(): void {
    this.hideAllPanels();
    this.roomListPanel.style.display = 'block';
    this.container.style.display = 'block';
    
    // Remove connecting panel if it exists
    const connectingPanel = document.getElementById('connecting-panel');
    if (connectingPanel) {
      connectingPanel.remove();
    }
  }
  
  /**
   * Show the room panel
   */
  public showRoom(roomName: string): void {
    this.hideAllPanels();
    
    // Update room title
    const roomTitle = document.getElementById('room-title');
    if (roomTitle) {
      roomTitle.textContent = roomName;
    }
    
    this.roomPanel.style.display = 'block';
    this.chatPanel.style.display = 'block';
    this.container.style.display = 'block';
  }
  
  /**
   * Show the error panel
   */
  private showErrorPanel(): void {
    this.errorPanel.style.display = 'block';
  }
  
  /**
   * Hide the error panel
   */
  private hideErrorPanel(): void {
    this.errorPanel.style.display = 'none';
  }
  
  /**
   * Hide all panels
   */
  private hideAllPanels(): void {
    this.connectPanel.style.display = 'none';
    this.roomListPanel.style.display = 'none';
    this.roomPanel.style.display = 'none';
    this.chatPanel.style.display = 'none';
    this.errorPanel.style.display = 'none';
  }
  
  /**
   * Show the lobby UI
   */
  public show(): void {
    this.container.style.display = 'block';
    this.showConnectPanel();
  }
  
  /**
   * Hide the lobby UI
   */
  public hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * Set the callback for when the player connects to the server
   */
  public onConnect(callback: (serverUrl: string, playerName: string) => void): void {
    this.onConnectCallback = callback;
  }
  
  /**
   * Set the callback for when the player creates a room
   */
  public onCreateRoom(callback: (roomName: string, maxPlayers: number) => void): void {
    this.onCreateRoomCallback = callback;
  }
  
  /**
   * Set the callback for when the player joins a room
   */
  public onJoinRoom(callback: (roomId: string) => void): void {
    this.onJoinRoomCallback = callback;
  }
  
  /**
   * Set the callback for when the player leaves a room
   */
  public onLeaveRoom(callback: () => void): void {
    this.onLeaveRoomCallback = callback;
  }
  
  /**
   * Set the callback for when the player starts a game
   */
  public onStartGame(callback: () => void): void {
    this.onStartGameCallback = callback;
  }
  
  /**
   * Set the callback for when the player sends a chat message
   */
  public onSendChatMessage(callback: (message: string) => void): void {
    this.onSendChatMessageCallback = callback;
  }
  
  /**
   * Set the callback for when the player sets the difficulty
   */
  public onSetDifficulty(callback: (difficulty: DifficultyLevel) => void): void {
    this.onSetDifficultyCallback = callback;
  }
  
  /**
   * Clean up resources when the lobby UI is destroyed
   */
  public destroy(): void {
    document.removeEventListener('roomsUpdated', (e: CustomEvent) => {
      this.updateRoomsList(e.detail.rooms);
    });
    
    document.removeEventListener('latencyUpdate', (e: CustomEvent) => {
      this.updateLatency(e.detail.latency);
    });
    
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
