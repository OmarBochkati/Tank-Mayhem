# Tank Mayhem

A 3D tank combat game built with TypeScript and Three.js where you battle against AI-controlled enemy tanks in an arena.

![Tank Mayhem Game](https://i.imgur.com/placeholder.jpg)

## 🎮 Game Overview

Tank Mayhem is a fast-paced 3D tank combat game where you control a blue tank and battle against red enemy tanks in an arena. Destroy enemy tanks, avoid their projectiles, collect power-ups, and aim for the highest score!

## 🕹️ Controls

- **W** or **↑**: Move forward
- **S** or **↓**: Move backward
- **A** or **←**: Turn left
- **D** or **→**: Turn right
- **Space** or **Left Mouse Button**: Fire projectile

## ✨ Features

### Core Gameplay
- **Tank Combat**: Control your tank to battle against AI-controlled enemy tanks
- **Health System**: Monitor your tank's health and avoid enemy fire
- **Ammo Management**: Limited ammo with automatic reload system
- **Scoring System**: Earn points by destroying enemy tanks and obstacles
- **High Score Tracking**: Your best scores are saved locally

### Environment
- **3D Arena**: Battle in a 3D environment with walls and obstacles
- **Destructible Obstacles**: Shoot obstacles to clear paths or earn points
- **Dynamic Lighting**: Realistic shadows and lighting effects

### AI Opponents
- **Intelligent Enemy Tanks**: AI-controlled tanks with different behaviors:
  - **Chase Mode**: Enemies pursue your tank when detected
  - **Attack Mode**: Enemies position themselves and fire at you
  - **Retreat Mode**: Damaged enemies retreat to recover
  - **Idle Mode**: Enemies patrol the arena when not engaged

### Visual Effects
- **Explosions**: Visual explosion effects when tanks or obstacles are destroyed
- **Muzzle Flash**: Flash effects when tanks fire
- **Health Bars**: Visual health indicators above tanks
- **Score Popups**: Dynamic score indicators when points are earned

### Power-ups
- **Health Restoration**: Repair your tank's damage
- **Ammo Replenishment**: Refill your ammunition
- **Speed Boost**: Temporarily increase your tank's speed

## 🔧 Technical Implementation

### Core Technologies
- **TypeScript**: Strongly-typed JavaScript for robust code
- **Three.js**: 3D rendering library for WebGL
- **Vite**: Modern frontend build tool

### Architecture
The game is built with a modular, component-based architecture:

#### Core Systems
- **Game**: Main game loop and state management
- **PhysicsEngine**: Collision detection and physics calculations
- **InputManager**: Keyboard and mouse input handling
- **GameState**: Game state tracking and scoring

#### Entities
- **Tank**: Player and enemy tank implementation
- **Projectile**: Projectiles fired by tanks
- **PowerUp**: Collectible items that provide benefits
- **AIController**: Enemy tank behavior and decision making

#### Environment
- **Arena**: Game world and boundaries
- **Obstacle**: Destructible objects in the arena

#### UI
- **UIManager**: Heads-up display and user interface
- **ExplosionEffect**: Visual effects for explosions

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tank-mayhem.git
cd tank-mayhem
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🎯 Game Objectives

1. Survive as long as possible
2. Destroy enemy tanks to earn points
3. Collect power-ups to maintain your advantage
4. Achieve the highest score possible

## 💡 Tips & Strategies

- Keep moving to avoid enemy fire
- Use obstacles as cover
- Prioritize collecting ammo power-ups when low on ammunition
- Target damaged enemy tanks first
- Keep track of your health and retreat when necessary
- Enemy tanks are more dangerous in attack mode - take them out quickly

## 🔮 Future Enhancements

- Multiplayer mode
- Additional tank types with unique abilities
- More power-ups and weapons
- Different arena layouts and environments
- Sound effects and music
- Mobile touch controls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Three.js community for the excellent 3D library
- TypeScript team for the robust type system
- Vite team for the fast development environment
