import './style.css';
import { Game } from './game/Game';
import { DifficultyLevel } from './game/core/GameState';

// Create game container
const gameContainer = document.createElement('div');
gameContainer.id = 'game-container';
document.body.appendChild(gameContainer);

// Create difficulty selector for initial game start
const createDifficultySelector = () => {
  const container = document.createElement('div');
  container.id = 'difficulty-selector';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.color = '#fff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.zIndex = '1000';
  
  const title = document.createElement('h1');
  title.textContent = 'Tank Mayhem';
  title.style.fontSize = '48px';
  title.style.marginBottom = '20px';
  title.style.color = '#3498db';
  title.style.textShadow = '0 0 10px rgba(52, 152, 219, 0.7)';
  container.appendChild(title);
  
  const subtitle = document.createElement('h2');
  subtitle.textContent = 'Select Difficulty';
  subtitle.style.fontSize = '24px';
  subtitle.style.marginBottom = '40px';
  container.appendChild(subtitle);
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '20px';
  
  const createDifficultyButton = (text: string, difficulty: DifficultyLevel, color: string, description: string) => {
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.display = 'flex';
    buttonWrapper.style.flexDirection = 'column';
    buttonWrapper.style.alignItems = 'center';
    buttonWrapper.style.width = '150px';
    
    const button = document.createElement('button');
    button.textContent = text;
    button.style.width = '100%';
    button.style.padding = '15px 0';
    button.style.fontSize = '18px';
    button.style.backgroundColor = color;
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.transition = 'transform 0.2s, opacity 0.2s';
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.05)';
      button.style.opacity = '0.9';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
      button.style.opacity = '1';
    });
    
    button.addEventListener('click', () => {
      document.body.removeChild(container);
      startGame(difficulty);
    });
    
    const desc = document.createElement('div');
    desc.textContent = description;
    desc.style.fontSize = '14px';
    desc.style.textAlign = 'center';
    desc.style.marginTop = '10px';
    desc.style.color = '#ccc';
    desc.style.height = '60px';
    
    buttonWrapper.appendChild(button);
    buttonWrapper.appendChild(desc);
    
    return buttonWrapper;
  };
  
  buttonsContainer.appendChild(createDifficultyButton(
    'Easy', 
    DifficultyLevel.EASY, 
    '#2ecc71',
    'Fewer enemies, slower tanks, and more health. Perfect for beginners.'
  ));
  
  buttonsContainer.appendChild(createDifficultyButton(
    'Medium', 
    DifficultyLevel.MEDIUM, 
    '#3498db',
    'Balanced gameplay with moderate challenge. The standard experience.'
  ));
  
  buttonsContainer.appendChild(createDifficultyButton(
    'Hard', 
    DifficultyLevel.HARD, 
    '#f39c12',
    'More enemies, faster tanks, and tougher obstacles. For experienced players.'
  ));
  
  buttonsContainer.appendChild(createDifficultyButton(
    'Insane', 
    DifficultyLevel.INSANE, 
    '#e74c3c',
    'Maximum enemies, deadly accurate AI, and minimal power-ups. Good luck!'
  ));
  
  container.appendChild(buttonsContainer);
  
  return container;
};

// Initialize the game
const game = new Game();
game.initialize();

// Show difficulty selector
document.body.appendChild(createDifficultySelector());

// Start the game with selected difficulty
function startGame(difficulty: DifficultyLevel) {
  game.setDifficulty(difficulty);
  game.start();
}
