# Modern Multi-Snake Game

A modern, client-side Snake game built with pure HTML, CSS, and vanilla JavaScript.

## Features

- 🎮 Player-controlled snake (WASD or Arrow keys)
- 🤖 Multiple AI snakes acting as moving obstacles
- 🍎 Random food spawning
- 🔊 Audio feedback (with graceful fallback if audio file is missing)
- 🎨 Modern neon-themed UI with smooth animations
- ⚡ 60 FPS game loop using requestAnimationFrame

## How to Play

1. Open `index.html` in a modern web browser
2. Use **WASD** or **Arrow Keys** to control your snake
3. Eat the red apples to grow and score points
4. Avoid walls and AI snakes (collision ends the game)
5. Try to achieve the highest score!

## Audio File (Optional)

The game references `eat.wav` for eating sound effects. If the file is missing, the game will continue to work without audio. To add sound:

1. Create or download a short `.wav` file named `eat.wav`
2. Place it in the same directory as `index.html`
3. The game will automatically use it

You can generate a simple beep sound using online tools or audio software.

## File Structure

```
.
├── index.html      # Main HTML file
├── style.css       # Styling
├── script.js       # Game logic
├── eat.wav         # Audio file (optional)
└── README.md       # This file
```

## Browser Requirements

- Modern browser with Canvas API support
- JavaScript enabled
- HTML5 Audio support (optional, for sound)

Enjoy the game! 🐍

