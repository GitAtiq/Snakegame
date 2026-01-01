/*
⚠️ IMPORTANT FOR AI:
- Keyboard-only controls
- No mouse input
- Grid-based movement
- Do NOT refactor movement or input logic
*/
// ============================================
// Game Constants
// ============================================

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 650;
const GRID_SIZE = 20;
const BASE_MOVES_PER_SECOND = 8;
const BASE_MOVE_INTERVAL = 1000 / BASE_MOVES_PER_SECOND;
const GRACE_PERIOD = 2000;
const SPEED_INCREASE_RATE = 0.1;
const MAX_SPEED_MULTIPLIER = 2.0;

// ============================================
// InputHandler Class - Keyboard input with direction queue
// ============================================

class InputHandler {
    constructor() {
        this.directionQueue = []; // Queue for buffered direction changes
        this.currentDirection = { x: 1, y: 0 };
        this.pauseKeyDown = false;
        this.pauseKeyWasDown = false;
        this.startKeyPressed = false;
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        let newDirection = null;

        // Arrow keys and WASD - capture immediately for responsiveness
        if (key === 'arrowup' || key === 'w') {
            newDirection = { x: 0, y: -1 };
        } else if (key === 'arrowdown' || key === 's') {
            newDirection = { x: 0, y: 1 };
        } else if (key === 'arrowleft' || key === 'a') {
            newDirection = { x: -1, y: 0 };
        } else if (key === 'arrowright' || key === 'd') {
            newDirection = { x: 1, y: 0 };
        } else if (key === ' ' || key === 'p') {
            // Pause key (also used for start when waiting)
            this.pauseKeyDown = true;
            this.startKeyPressed = true; // Space can also start the game
            return;
        } else if (key === 'enter') {
            // Start key
            this.startKeyPressed = true;
            return;
        }

        // Handle direction input immediately
        if (newDirection) {
            // Prevent reverse direction (illegal turn)
            if (newDirection.x === -this.currentDirection.x && 
                newDirection.y === -this.currentDirection.y) {
                return; // Ignore reverse moves
            }

            // Remove any duplicate direction from queue first
            this.directionQueue = this.directionQueue.filter(dir => 
                dir.x !== newDirection.x || dir.y !== newDirection.y
            );
            
            // Add to queue if different from current direction
            // This ensures immediate capture and buffering for next grid step
            if (newDirection.x !== this.currentDirection.x || 
                newDirection.y !== this.currentDirection.y) {
                this.directionQueue.push(newDirection);
            }
        }
    }

    // Get next direction from queue (called on each movement tick)
    getNextDirection() {
        // Process direction queue - take first valid direction
        if (this.directionQueue.length > 0) {
            const nextDir = this.directionQueue.shift();
            
            // Final check: prevent reverse direction
            if (!(nextDir.x === -this.currentDirection.x && 
                  nextDir.y === -this.currentDirection.y)) {
                this.currentDirection = nextDir;
            }
        }

        return this.currentDirection;
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === ' ' || key === 'p') {
            this.pauseKeyDown = false;
            this.pauseKeyWasDown = false;
        } else if (key === 'enter') {
            this.startKeyPressed = false;
        }
    }

    // Check if start key was pressed
    checkStartPressed() {
        if (this.startKeyPressed) {
            this.startKeyPressed = false;
            return true;
        }
        return false;
    }

    // Check if pause key was toggled (edge detection)
    checkPauseToggle() {
        if (this.pauseKeyDown && !this.pauseKeyWasDown) {
            this.pauseKeyWasDown = true;
            return true; // Key just pressed
        }
        return false;
    }
}

// ============================================
// Snake Class - Player snake with gradient and spacing
// ============================================

class Snake {
    constructor(x, y, color, isPlayer = false, initialLength = 1) {
        this.segments = [];
        this.color = color;
        this.isPlayer = isPlayer;
        this.segmentSize = GRID_SIZE * 0.85; // Smaller to show spacing
        this.eyeBlinkTimer = 0;
        this.eyesOpen = true;

        // Initialize snake with segments
        for (let i = 0; i < initialLength; i++) {
            this.segments.push({
                x: x - (i * GRID_SIZE),
                y: y
            });
        }
    }

    // Update snake position (grid-based)
    update(direction) {
        const head = this.segments[0];
        const newHead = {
            x: head.x + direction.x * GRID_SIZE,
            y: head.y + direction.y * GRID_SIZE
        };

        this.segments.unshift(newHead);
        this.segments.pop();
    }

    grow() {
        const tail = this.segments[this.segments.length - 1];
        this.segments.push({ ...tail });
    }

    checkWallCollision(canvasWidth, canvasHeight) {
        const head = this.segments[0];
        return head.x < GRID_SIZE / 2 || head.x >= canvasWidth - GRID_SIZE / 2 ||
               head.y < GRID_SIZE / 2 || head.y >= canvasHeight - GRID_SIZE / 2;
    }

    checkSelfCollision() {
        const head = this.segments[0];
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }
        return false;
    }

    checkCollisionWithSnake(otherSnake) {
        const head = this.segments[0];
        for (let segment of otherSnake.segments) {
            if (head.x === segment.x && head.y === segment.y) {
                return true;
            }
        }
        return false;
    }

    checkFoodCollision(food) {
        const head = this.segments[0];
        return head.x === food.x && head.y === food.y;
    }

    // Update eye blink animation (simple interval-based)
    updateEyes(deltaTime) {
        if (this.isPlayer) {
            this.eyeBlinkTimer += deltaTime;
            // Blink every 3 seconds, eyes closed for 150ms
            if (this.eyeBlinkTimer > 3000) {
                this.eyesOpen = false;
            }
            if (this.eyeBlinkTimer > 3150) {
                this.eyesOpen = true;
                this.eyeBlinkTimer = 0;
            }
        }
    }

    // Draw player snake with gradient and spacing
    draw(ctx, direction) {
        ctx.save();

        const segmentCount = this.segments.length;
        this.segments.forEach((segment, index) => {
            const isHead = index === 0;
            
            // Head-to-tail gradient: head brighter, tail darker
            const gradientPos = index / segmentCount;
            const brightness = 1.0 - (gradientPos * 0.3); // Head 100%, tail 70%
            const alpha = isHead ? 1 : 0.85;

            // Calculate color with gradient
            const r = Math.floor(parseInt(this.color.slice(1, 3), 16) * brightness);
            const g = Math.floor(parseInt(this.color.slice(3, 5), 16) * brightness);
            const b = Math.floor(parseInt(this.color.slice(5, 7), 16) * brightness);
            const gradientColor = `rgb(${r}, ${g}, ${b})`;

            ctx.shadowBlur = isHead ? 18 : 8;
            ctx.shadowColor = gradientColor;
            ctx.fillStyle = gradientColor;
            ctx.globalAlpha = alpha;

            // Draw rounded rectangle with spacing
            const segmentSize = this.segmentSize;
            const x = segment.x - segmentSize / 2;
            const y = segment.y - segmentSize / 2;
            const radius = segmentSize / 4;

            this.drawRoundedRect(ctx, x, y, segmentSize, segmentSize, radius);
            ctx.fill();

            // Draw eyes on head
            if (isHead && this.isPlayer) {
                this.drawEyes(ctx, segment.x, segment.y, direction);
            }
        });

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Draw blinking eyes on player snake head
    drawEyes(ctx, x, y, direction) {
        if (!this.eyesOpen) {
            // Draw closed eyes as lines
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 1;

            const eyeOffset = GRID_SIZE * 0.25;
            if (direction.x === 1) { // Right
                ctx.beginPath();
                ctx.moveTo(x + eyeOffset - 3, y - eyeOffset / 2);
                ctx.lineTo(x + eyeOffset + 3, y - eyeOffset / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + eyeOffset - 3, y + eyeOffset / 2);
                ctx.lineTo(x + eyeOffset + 3, y + eyeOffset / 2);
                ctx.stroke();
            } else if (direction.x === -1) { // Left
                ctx.beginPath();
                ctx.moveTo(x - eyeOffset - 3, y - eyeOffset / 2);
                ctx.lineTo(x - eyeOffset + 3, y - eyeOffset / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - eyeOffset - 3, y + eyeOffset / 2);
                ctx.lineTo(x - eyeOffset + 3, y + eyeOffset / 2);
                ctx.stroke();
            } else if (direction.y === 1) { // Down
                ctx.beginPath();
                ctx.moveTo(x - eyeOffset / 2, y + eyeOffset - 3);
                ctx.lineTo(x - eyeOffset / 2, y + eyeOffset + 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + eyeOffset / 2, y + eyeOffset - 3);
                ctx.lineTo(x + eyeOffset / 2, y + eyeOffset + 3);
                ctx.stroke();
            } else { // Up
                ctx.beginPath();
                ctx.moveTo(x - eyeOffset / 2, y - eyeOffset - 3);
                ctx.lineTo(x - eyeOffset / 2, y - eyeOffset + 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + eyeOffset / 2, y - eyeOffset - 3);
                ctx.lineTo(x + eyeOffset / 2, y - eyeOffset + 3);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // Draw open eyes
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1;

        const eyeSize = GRID_SIZE * 0.2;
        const eyeOffset = GRID_SIZE * 0.25;

        let eye1X, eye1Y, eye2X, eye2Y;

        if (direction.x === 1) { // Right
            eye1X = x + eyeOffset;
            eye1Y = y - eyeOffset / 2;
            eye2X = x + eyeOffset;
            eye2Y = y + eyeOffset / 2;
        } else if (direction.x === -1) { // Left
            eye1X = x - eyeOffset;
            eye1Y = y - eyeOffset / 2;
            eye2X = x - eyeOffset;
            eye2Y = y + eyeOffset / 2;
        } else if (direction.y === 1) { // Down
            eye1X = x - eyeOffset / 2;
            eye1Y = y + eyeOffset;
            eye2X = x + eyeOffset / 2;
            eye2Y = y + eyeOffset;
        } else { // Up
            eye1X = x - eyeOffset / 2;
            eye1Y = y - eyeOffset;
            eye2X = x + eyeOffset / 2;
            eye2Y = y - eyeOffset;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// AISnake Class - AI snakes with specific shapes
// ============================================

class AISnake extends Snake {
    constructor(x, y, color, initialLength, shapeType) {
        super(x, y, color, false, initialLength);
        this.shapeType = shapeType; // 'blocks', 'capsules', 'blob'
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.aiTimer = 0;
        this.aiChangeInterval = 4 + Math.floor(Math.random() * 4);
        this.eyeBlinkTimer = Math.random() * 4000;
        this.eyesOpen = true;
    }

    // AI movement logic
    updateAI(canvasWidth, canvasHeight) {
        this.aiTimer++;

        if (this.aiTimer >= this.aiChangeInterval) {
            this.aiTimer = 0;
            this.aiChangeInterval = 4 + Math.floor(Math.random() * 4);

            const head = this.segments[0];
            const nextX = head.x + this.direction.x * GRID_SIZE;
            const nextY = head.y + this.direction.y * GRID_SIZE;

            const margin = GRID_SIZE;
            const nearWall = nextX < margin || nextX >= canvasWidth - margin ||
                           nextY < margin || nextY >= canvasHeight - margin;

            if (nearWall || Math.random() < 0.25) {
                const directions = [
                    { x: 1, y: 0 }, { x: -1, y: 0 },
                    { x: 0, y: 1 }, { x: 0, y: -1 }
                ];

                const validDirections = directions.filter(dir =>
                    !(dir.x === -this.direction.x && dir.y === -this.direction.y)
                );

                this.nextDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
            }
        }
    }

    update() {
        // Apply direction change
        if (this.nextDirection.x !== -this.direction.x || this.nextDirection.y !== -this.direction.y) {
            this.direction = { ...this.nextDirection };
        }
        super.update(this.direction);
    }

    // Update AI eye blink (slower than player)
    updateEyes(deltaTime) {
        this.eyeBlinkTimer += deltaTime;
        if (this.eyeBlinkTimer > 4000) {
            this.eyesOpen = false;
        }
        if (this.eyeBlinkTimer > 4150) {
            this.eyesOpen = true;
            this.eyeBlinkTimer = 0;
        }
    }

    // Draw AI snake with specific shape
    draw(ctx) {
        ctx.save();

        this.segments.forEach((segment, index) => {
            const isHead = index === 0;
            const alpha = isHead ? 1 : 0.8;

            ctx.shadowBlur = isHead ? 15 : 8;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;

            const x = segment.x - GRID_SIZE / 2;
            const y = segment.y - GRID_SIZE / 2;

            if (this.shapeType === 'blocks') {
                // Classic Blocks: Square segments with sharp corners
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
            } else if (this.shapeType === 'capsules') {
                // Rounded Capsules: Rounded rectangles
                const radius = GRID_SIZE / 3;
                this.drawRoundedRect(ctx, x, y, GRID_SIZE, GRID_SIZE, radius);
            } else if (this.shapeType === 'blob') {
                // Blob Chain: Slightly overlapping circles
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, GRID_SIZE * 0.55, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw simple eyes on head
            if (isHead) {
                this.drawSimpleEyes(ctx, segment.x, segment.y);
            }
        });

        ctx.restore();
    }

    // Draw simple blinking eyes for AI
    drawSimpleEyes(ctx, x, y) {
        if (!this.eyesOpen) {
            return;
        }

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1;

        const eyeSize = GRID_SIZE * 0.15;
        const eyeOffset = GRID_SIZE * 0.2;

        const eye1X = x - eyeOffset / 2;
        const eye1Y = y - eyeOffset;
        const eye2X = x + eyeOffset / 2;
        const eye2Y = y - eyeOffset;

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// Food Class
// ============================================

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GRID_SIZE * 0.85;
        this.color = '#ff0066';
        this.pulse = 0;
    }

    draw(ctx) {
        ctx.save();

        this.pulse += 0.15;
        const pulseSize = this.size + Math.sin(this.pulse) * 4;

        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff6699';
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, pulseSize / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    respawn(canvasWidth, canvasHeight, snakes) {
        let validPosition = false;
        let attempts = 0;

        while (!validPosition && attempts < 100) {
            const gridX = Math.floor(Math.random() * Math.floor((canvasWidth - GRID_SIZE) / GRID_SIZE));
            const gridY = Math.floor(Math.random() * Math.floor((canvasHeight - GRID_SIZE) / GRID_SIZE));

            this.x = gridX * GRID_SIZE + GRID_SIZE / 2;
            this.y = gridY * GRID_SIZE + GRID_SIZE / 2;

            validPosition = true;
            for (let snake of snakes) {
                for (let segment of snake.segments) {
                    if (this.x === segment.x && this.y === segment.y) {
                        validPosition = false;
                        break;
                    }
                }
                if (!validPosition) break;
            }
            attempts++;
        }
    }
}

// ============================================
// Game Class
// ============================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        // Game state
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.isWaitingToStart = true;
        this.gameStartTime = Date.now();
        this.isGracePeriod = true;
        this.baseSpeed = 1.0; // Base speed (before user adjustment)
        this.currentSpeed = 1.0;
        this.userSpeedMultiplier = 1.0; // User-controlled speed multiplier
        this.minSpeed = 0.5;
        this.maxSpeed = 2.5;
        this.moveInterval = BASE_MOVE_INTERVAL;
        this.lastMoveTime = 0;
        this.lastFrameTime = 0;

        // Input
        this.inputHandler = new InputHandler();
        this.playerDirection = { x: 1, y: 0 };

        // Audio
        this.eatSound = null;
        this.initAudio();

        // Create player snake (6 segments)
        const playerStartX = Math.floor(CANVAS_WIDTH / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const playerStartY = Math.floor(CANVAS_HEIGHT / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

        this.playerSnake = new Snake(
            playerStartX,
            playerStartY,
            '#00ff88',
            true,
            6 // Initial length: 6 segments
        );

        // Create AI snakes with specific shapes
        const aiColor = '#ff0066';
        this.aiSnakes = [];
        const spawnPositions = [
            { x: 150, y: 150 },
            { x: CANVAS_WIDTH - 150, y: 150 },
            { x: 150, y: CANVAS_HEIGHT - 150 },
            { x: CANVAS_WIDTH - 150, y: CANVAS_HEIGHT - 150 }
        ];
        // Three specific shapes: blocks, capsules, blob
        const shapeTypes = ['blocks', 'capsules', 'blob', 'blocks'];

        for (let i = 0; i < 4; i++) {
            const aiInitialLength = 6 + Math.floor(Math.random() * 3); // 6-8 segments
            const spawnPos = spawnPositions[i];
            const startX = Math.floor(spawnPos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            const startY = Math.floor(spawnPos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 },
                { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];

            const aiSnake = new AISnake(startX, startY, aiColor, aiInitialLength, shapeTypes[i]);
            aiSnake.direction = randomDir;
            aiSnake.nextDirection = randomDir;

            this.aiSnakes.push(aiSnake);
        }

        // Create food
        this.food = new Food(0, 0);
        this.food.respawn(this.canvas.width, this.canvas.height, [this.playerSnake, ...this.aiSnakes]);

        // UI elements
        this.scoreElement = document.getElementById('scoreDisplay');
        this.lengthElement = document.getElementById('lengthDisplay');
        this.speedElement = document.getElementById('speedDisplay');
        this.statusElement = document.getElementById('statusDisplay');
        this.gameOverElement = document.getElementById('gameOver');
        this.startScreenElement = document.getElementById('startScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartBtn = document.getElementById('restartBtn');
        this.speedUpBtn = document.getElementById('speedUp');
        this.speedDownBtn = document.getElementById('speedDown');

        this.restartBtn.addEventListener('click', () => this.restart());
        this.speedUpBtn.addEventListener('click', () => this.adjustSpeed(0.1));
        this.speedDownBtn.addEventListener('click', () => this.adjustSpeed(-0.1));

        // Initialize UI
        this.updateUI();

        // Start game loop
        this.gameLoop(0);
    }

    initAudio() {
        try {
            this.eatSound = new Audio('eat.wav');
            this.eatSound.volume = 0.3;
            this.eatSound.load().catch(() => {});
        } catch (error) {}
    }

    playEatSound() {
        if (this.eatSound) {
            this.eatSound.currentTime = 0;
            this.eatSound.play().catch(() => {});
        }
    }

    // Adjust speed via user controls
    adjustSpeed(delta) {
        this.userSpeedMultiplier = Math.max(this.minSpeed, 
            Math.min(this.maxSpeed, this.userSpeedMultiplier + delta));
        this.updateSpeed();
        this.updateUI();
    }

    // Update speed based on base speed and user multiplier
    updateSpeed() {
        this.currentSpeed = this.baseSpeed * this.userSpeedMultiplier;
        this.moveInterval = BASE_MOVE_INTERVAL / this.currentSpeed;
    }

    update(deltaTime) {
        if (this.isGameOver) return;

        // Handle start key (Enter or Space when waiting)
        if (this.isWaitingToStart) {
            if (this.inputHandler.checkStartPressed() || this.inputHandler.checkPauseToggle()) {
                this.isWaitingToStart = false;
                this.gameStartTime = Date.now();
                this.isGracePeriod = true;
                this.startScreenElement.classList.add('hidden');
            }
            return;
        }

        // Handle pause toggle
        if (this.inputHandler.checkPauseToggle()) {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) {
                this.gameStartTime = Date.now() - (Date.now() - this.gameStartTime);
            }
        }

        if (this.isPaused) {
            return;
        }

        // Check grace period
        const currentTime = Date.now();
        this.isGracePeriod = (currentTime - this.gameStartTime) < GRACE_PERIOD;

        // Difficulty scaling: base speed increases with score
        const speedMultiplier = 1.0 + Math.floor(this.score / 50) * SPEED_INCREASE_RATE;
        this.baseSpeed = Math.min(speedMultiplier, MAX_SPEED_MULTIPLIER);
        this.updateSpeed();

        // Get player direction from input handler (direction queue)
        this.playerDirection = this.inputHandler.getNextDirection();

        // Update AI snakes
        this.aiSnakes.forEach(snake => {
            snake.updateAI(this.canvas.width, this.canvas.height);
            snake.update();
            snake.updateEyes(deltaTime);
        });

        // Update player snake
        this.playerSnake.update(this.playerDirection);
        this.playerSnake.updateEyes(deltaTime);

        // Check collisions (skip during grace period)
        if (!this.isGracePeriod) {
            if (this.playerSnake.checkWallCollision(this.canvas.width, this.canvas.height) ||
                this.playerSnake.checkSelfCollision()) {
                this.gameOver();
                return;
            }

            for (let aiSnake of this.aiSnakes) {
                if (this.playerSnake.checkCollisionWithSnake(aiSnake)) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Check food collision
        if (this.playerSnake.checkFoodCollision(this.food)) {
            this.playerSnake.grow();
            this.score += 10;
            this.updateUI();
            this.playEatSound();
            this.food.respawn(this.canvas.width, this.canvas.height, [this.playerSnake, ...this.aiSnakes]);
        }

        // Handle AI wall collisions
        this.aiSnakes.forEach(snake => {
            if (snake.checkWallCollision(this.canvas.width, this.canvas.height)) {
                snake.nextDirection = {
                    x: -snake.direction.x,
                    y: -snake.direction.y
                };
            }
        });
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Don't render game objects if waiting to start
        if (this.isWaitingToStart) {
            return;
        }

        // Draw subtle grid
        this.drawSoftGrid();

        // Draw food
        this.food.draw(this.ctx);

        // Draw AI snakes
        this.aiSnakes.forEach(snake => snake.draw(this.ctx));

        // Draw player snake
        this.playerSnake.draw(this.ctx, this.playerDirection);

        // Draw grace period indicator
        if (this.isGracePeriod) {
            this.drawGracePeriodIndicator();
        }

        // Draw pause indicator
        if (this.isPaused) {
            this.drawPauseIndicator();
        }
    }

    drawSoftGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x < this.canvas.width; x += GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawGracePeriodIndicator() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GRACE PERIOD', this.canvas.width / 2, 50);
        this.ctx.restore();
    }

    drawPauseIndicator() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 170, 0, 0.9)';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.restore();
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.lengthElement.textContent = this.playerSnake.segments.length;
        this.speedElement.textContent = this.currentSpeed.toFixed(1) + 'x';

        // Update speed button states
        this.speedUpBtn.disabled = this.userSpeedMultiplier >= this.maxSpeed;
        this.speedDownBtn.disabled = this.userSpeedMultiplier <= this.minSpeed;

        // Update status
        this.statusElement.className = 'dashboard-value status';
        if (this.isGameOver) {
            this.statusElement.textContent = 'GAME OVER';
            this.statusElement.classList.add('gameover');
        } else if (this.isWaitingToStart) {
            this.statusElement.textContent = 'READY';
            this.statusElement.classList.remove('running', 'paused', 'gameover');
        } else if (this.isPaused) {
            this.statusElement.textContent = 'PAUSED';
            this.statusElement.classList.add('paused');
        } else {
            this.statusElement.textContent = 'RUNNING';
            this.statusElement.classList.add('running');
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.classList.remove('hidden');
        this.updateUI();
    }

    restart() {
        this.isGameOver = false;
        this.isPaused = false;
        this.isWaitingToStart = true;
        this.score = 0;
        this.gameStartTime = Date.now();
        this.isGracePeriod = true;
        this.baseSpeed = 1.0;
        this.userSpeedMultiplier = 1.0;
        this.currentSpeed = 1.0;
        this.moveInterval = BASE_MOVE_INTERVAL;
        this.startScreenElement.classList.remove('hidden');

        // Reset input
        this.inputHandler = new InputHandler();
        this.playerDirection = { x: 1, y: 0 };

        // Reset player snake (6 segments)
        const playerStartX = Math.floor(CANVAS_WIDTH / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const playerStartY = Math.floor(CANVAS_HEIGHT / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

        this.playerSnake = new Snake(
            playerStartX,
            playerStartY,
            '#00ff88',
            true,
            6
        );

        // Reset AI snakes
        const aiColor = '#ff0066';
        this.aiSnakes = [];
        const spawnPositions = [
            { x: 150, y: 150 },
            { x: CANVAS_WIDTH - 150, y: 150 },
            { x: 150, y: CANVAS_HEIGHT - 150 },
            { x: CANVAS_WIDTH - 150, y: CANVAS_HEIGHT - 150 }
        ];
        const shapeTypes = ['blocks', 'capsules', 'blob', 'blocks'];

        for (let i = 0; i < 4; i++) {
            const aiInitialLength = 6 + Math.floor(Math.random() * 3);
            const spawnPos = spawnPositions[i];
            const startX = Math.floor(spawnPos.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
            const startY = Math.floor(spawnPos.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 },
                { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];

            const aiSnake = new AISnake(startX, startY, aiColor, aiInitialLength, shapeTypes[i]);
            aiSnake.direction = randomDir;
            aiSnake.nextDirection = randomDir;

            this.aiSnakes.push(aiSnake);
        }

        // Reset food
        this.food.respawn(this.canvas.width, this.canvas.height, [this.playerSnake, ...this.aiSnakes]);

        // Reset UI
        this.updateUI();
        this.gameOverElement.classList.add('hidden');
    }

    // Fixed timestep game loop
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Fixed timestep movement (independent of frame rate)
        if (currentTime - this.lastMoveTime >= this.moveInterval) {
            this.update(deltaTime);
            this.lastMoveTime = currentTime;
        }

        // Render every frame
        this.render();
        this.updateUI();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game
window.addEventListener('load', () => {
    new Game();
});
