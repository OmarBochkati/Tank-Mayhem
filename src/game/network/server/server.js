// Simple WebSocket server for multiplayer functionality
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Create HTTP server
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game state
const rooms = new Map();
const players = new Map();

// Message types
const MessageType = {
  JOIN_GAME: 'join_game',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STATE: 'game_state',
  PLAYER_POSITION: 'player_position',
  PLAYER_ROTATION: 'player_rotation',
  PLAYER_FIRE: 'player_fire',
  PLAYER_HIT: 'player_hit',
  SPAWN_POWER_UP: 'spawn_power_up',
  COLLECT_POWER_UP: 'collect_power_up',
  GAME_OVER: 'game_over',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
  CHAT_MESSAGE: 'chat_message'
};

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // Get player info from query parameters
  const playerId = socket.handshake.query.playerId || uuidv4();
  const playerName = socket.handshake.query.playerName || `Player${Math.floor(Math.random() * 1000)}`;
  
  // Store player info
  players.set(playerId, {
    id: playerId,
    name: playerName,
    socketId: socket.id,
    roomId: null,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    health: 100,
    score: 0,
    color: Math.random() * 0xffffff
  });
  
  // Send rooms list
  socket.emit('rooms_list', getRoomsList());
  
  // Handle get rooms request
  socket.on('get_rooms', () => {
    socket.emit('rooms_list', getRoomsList());
  });
  
  // Handle create room request
  socket.on('create_room', (data, callback) => {
    try {
      const { name, maxPlayers } = data;
      
      if (!name) {
        return callback({ success: false, error: 'Room name is required' });
      }
      
      const roomId = uuidv4();
      const room = {
        id: roomId,
        name,
        hostId: playerId,
        players: new Map(),
        maxPlayers: maxPlayers || 4,
        inProgress: false,
        powerUps: [],
        projectiles: []
      };
      
      rooms.set(roomId, room);
      
      console.log(`Room created: ${name} (${roomId})`);
      
      // Broadcast updated rooms list
      io.emit('rooms_list', getRoomsList());
      
      callback({ success: true, roomId });
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, error: 'Failed to create room' });
    }
  });
  
  // Handle join room request
  socket.on('join_room', (data, callback) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }
      
      if (room.inProgress) {
        return callback({ success: false, error: 'Game already in progress' });
      }
      
      if (room.players.size >= room.maxPlayers) {
        return callback({ success: false, error: 'Room is full' });
      }
      
      // Leave current room if in one
      const player = players.get(playerId);
      if (player.roomId) {
        leaveRoom(player.roomId, playerId);
      }
      
      // Join the room
      socket.join(roomId);
      room.players.set(playerId, players.get(playerId));
      players.get(playerId).roomId = roomId;
      
      console.log(`Player ${playerName} (${playerId}) joined room ${room.name} (${roomId})`);
      
      // Notify client that they've joined the room
      socket.emit('room_joined', { roomId, roomName: room.name });
      
      // Notify other players in the room
      socket.to(roomId).emit(MessageType.PLAYER_JOINED, {
        id: playerId,
        name: playerName,
        position: players.get(playerId).position,
        rotation: players.get(playerId).rotation,
        health: players.get(playerId).health,
        score: players.get(playerId).score,
        color: players.get(playerId).color
      });
      
      // Send existing players to the new player
      room.players.forEach((p, pid) => {
        if (pid !== playerId) {
          socket.emit(MessageType.PLAYER_JOINED, {
            id: pid,
            name: p.name,
            position: p.position,
            rotation: p.rotation,
            health: p.health,
            score: p.score,
            color: p.color
          });
        }
      });
      
      // Broadcast updated rooms list
      io.emit('rooms_list', getRoomsList());
      
      callback({ success: true, roomName: room.name });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });
  
  // Handle leave room request
  socket.on('leave_room', (data, callback) => {
    try {
      const { roomId } = data;
      
      if (leaveRoom(roomId, playerId)) {
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      callback({ success: false });
    }
  });
  
  // Handle start game request
  socket.on('start_game', (data, callback) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }
      
      if (room.hostId !== playerId) {
        return callback({ success: false, error: 'Only the host can start the game' });
      }
      
      if (room.players.size < 1) {
        return callback({ success: false, error: 'Need at least 1 player to start' });
      }
      
      // Start the game
      room.inProgress = true;
      
      // Broadcast game state to all players in the room
      io.to(roomId).emit(MessageType.GAME_STATE, {
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          rotation: p.rotation,
          health: p.health,
          score: p.score,
          color: p.color
        })),
        powerUps: room.powerUps,
        projectiles: [],
        gameMode: 1, // Multiplayer mode
        timeRemaining: 300, // 5 minutes
        inProgress: true
      });
      
      // Broadcast updated rooms list
      io.emit('rooms_list', getRoomsList());
      
      callback({ success: true });
    } catch (error) {
      console.error('Error starting game:', error);
      callback({ success: false, error: 'Failed to start game' });
    }
  });
  
  // Handle player position updates
  socket.on(MessageType.PLAYER_POSITION, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    // Update player position
    player.position = data.position;
    
    // Broadcast to other players in the room
    socket.to(player.roomId).emit(MessageType.PLAYER_POSITION, {
      id: playerId,
      position: data.position,
      timestamp: data.timestamp
    });
  });
  
  // Handle player rotation updates
  socket.on(MessageType.PLAYER_ROTATION, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    // Update player rotation
    player.rotation = data.rotation;
    
    // Broadcast to other players in the room
    socket.to(player.roomId).emit(MessageType.PLAYER_ROTATION, {
      id: playerId,
      rotation: data.rotation,
      timestamp: data.timestamp
    });
  });
  
  // Handle player fire events
  socket.on(MessageType.PLAYER_FIRE, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    // Broadcast to other players in the room
    socket.to(player.roomId).emit(MessageType.PLAYER_FIRE, {
      id: playerId,
      position: data.position,
      direction: data.direction
    });
  });
  
  // Handle player hit events
  socket.on(MessageType.PLAYER_HIT, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    const targetPlayer = players.get(data.targetId);
    if (!targetPlayer) return;
    
    // Update target player health
    targetPlayer.health = Math.max(0, targetPlayer.health - data.damage);
    
    // Broadcast to all players in the room
    io.to(player.roomId).emit(MessageType.PLAYER_HIT, {
      targetId: data.targetId,
      sourceId: playerId,
      damage: data.damage,
      health: targetPlayer.health
    });
    
    // Check if player is defeated
    if (targetPlayer.health <= 0) {
      // Award points to the player who got the kill
      player.score += 100;
      
      // Check if game is over (only one player left)
      const room = rooms.get(player.roomId);
      if (room) {
        const alivePlayers = Array.from(room.players.values()).filter(p => p.health > 0);
        
        if (alivePlayers.length <= 1) {
          // Game over
          const winner = alivePlayers[0];
          
          io.to(player.roomId).emit(MessageType.GAME_OVER, {
            winnerId: winner ? winner.id : null,
            scores: Array.from(room.players.values()).map(p => ({
              id: p.id,
              name: p.name,
              score: p.score
            }))
          });
          
          // Reset the room
          room.inProgress = false;
          room.players.forEach(p => {
            p.health = 100;
            p.score = 0;
          });
          
          // Broadcast updated rooms list
          io.emit('rooms_list', getRoomsList());
        }
      }
    }
  });
  
  // Handle power-up collection events
  socket.on(MessageType.COLLECT_POWER_UP, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    // Find and remove the power-up
    const powerUpIndex = room.powerUps.findIndex(pu => pu.id === data.id);
    if (powerUpIndex !== -1) {
      room.powerUps.splice(powerUpIndex, 1);
      
      // Broadcast to all players in the room
      io.to(player.roomId).emit(MessageType.COLLECT_POWER_UP, {
        id: data.id,
        playerId: playerId
      });
    }
  });
  
  // Handle chat messages
  socket.on(MessageType.CHAT_MESSAGE, (data) => {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    
    // Broadcast to all players in the room
    io.to(player.roomId).emit(MessageType.CHAT_MESSAGE, {
      sender: player.name,
      text: data.text
    });
  });
  
  // Handle ping messages for latency measurement
  socket.on(MessageType.PING, (timestamp) => {
    socket.emit(MessageType.PONG, timestamp);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const player = players.get(playerId);
    if (player && player.roomId) {
      leaveRoom(player.roomId, playerId);
    }
    
    players.delete(playerId);
  });
  
  // Helper function to leave a room
  function leaveRoom(roomId, pid) {
    const room = rooms.get(roomId);
    if (!room) return false;
    
    const player = players.get(pid);
    if (!player) return false;
    
    // Remove player from room
    room.players.delete(pid);
    player.roomId = null;
    
    // Leave the socket.io room
    socket.leave(roomId);
    
    console.log(`Player ${player.name} (${pid}) left room ${room.name} (${roomId})`);
    
    // Notify other players
    socket.to(roomId).emit(MessageType.PLAYER_LEFT, pid);
    
    // If room is empty, delete it
    if (room.players.size === 0) {
      rooms.delete(roomId);
      console.log(`Room deleted: ${room.name} (${roomId})`);
    } else if (room.hostId === pid) {
      // If host left, assign a new host
      const newHost = room.players.keys().next().value;
      room.hostId = newHost;
      console.log(`New host assigned: ${players.get(newHost).name} (${newHost})`);
    }
    
    // Broadcast updated rooms list
    io.emit('rooms_list', getRoomsList());
    
    return true;
  }
});

// Helper function to get rooms list for clients
function getRoomsList() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.size,
    maxPlayers: room.maxPlayers,
    inProgress: room.inProgress
  }));
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
