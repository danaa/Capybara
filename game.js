// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const BASKET_SPEED = 5;
const ORANGE_SPEED = 2;
const BOMB_SPEED = 2.5;
const BONE_SPEED = 2;
const ORANGE_SPAWN_RATE = 0.02; // Probability of spawning an orange each frame
const BOMB_SPAWN_RATE = 0.005; // Much less frequent than oranges
const BONE_SPAWN_RATE = 0.01; // Less frequent than oranges but more than bombs

// Basket object
const basket = {
    x: CANVAS_WIDTH / 2 - 75, // Center horizontally (assuming basket width ~150px)
    y: CANVAS_HEIGHT - 140,    // Near bottom of canvas
    width: 150,
    height: 120,
    speed: BASKET_SPEED,
    image: new Image()
};

// Mouse button states
let leftMousePressed = false;
let rightMousePressed = false;

// Game state
let coins = 0;
let lives = 5;
let oranges = [];
let bombs = [];
let bones = [];
let explosion = null;
let gameOver = false;
let gameOverTimer = 0;
let capyScared = false;
let capyScaredTimer = 0;
let capyHappy = false;
let capyHappyTimer = 0;

// Images
const orangeImage = new Image();
orangeImage.src = 'assets/orange.png';

const bombImage1 = new Image();
bombImage1.src = 'assets/bomb.png';

const bombImage2 = new Image();
bombImage2.src = 'assets/bomb_small.png';

const boneImage = new Image();
boneImage.src = 'assets/bone.png';

const heartImage = new Image();
heartImage.src = 'assets/heart.png';

// Load basket image
basket.image.src = 'assets/basket.png';
basket.image.onload = function() {
    console.log('Basket image loaded successfully');
    gameLoop();
};

// Mouse event handlers
canvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    
    if (e.button === 0) { // Left mouse button
        leftMousePressed = true;
    } else if (e.button === 2) { // Right mouse button  
        rightMousePressed = true;
    }
});

canvas.addEventListener('mouseup', function(e) {
    e.preventDefault();
    
    if (e.button === 0) { // Left mouse button
        leftMousePressed = false;
    } else if (e.button === 2) { // Right mouse button
        rightMousePressed = false;
    }
});

// Disable context menu on right click
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Prevent mouse buttons from being "stuck" when mouse leaves canvas
canvas.addEventListener('mouseleave', function() {
    leftMousePressed = false;
    rightMousePressed = false;
});

// Create new orange
function createOrange() {
    return {
        x: Math.random() * (CANVAS_WIDTH - 40), // Random x position
        y: -40, // Start above canvas
        width: 40,
        height: 40,
        speed: ORANGE_SPEED
    };
}

// Create new bomb
function createBomb() {
    return {
        x: Math.random() * (CANVAS_WIDTH - 50), // Random x position
        y: -50, // Start above canvas
        width: 50,
        height: 50,
        speed: BOMB_SPEED,
        animationFrame: 0 // For switching between bomb images
    };
}

// Create new bone
function createBone() {
    return {
        x: Math.random() * (CANVAS_WIDTH - 45), // Random x position
        y: -45, // Start above canvas
        width: 45,
        height: 45,
        speed: BONE_SPEED
    };
}

// Update oranges
function updateOranges() {
    // Spawn new oranges randomly
    if (Math.random() < ORANGE_SPAWN_RATE) {
        oranges.push(createOrange());
    }
    
    // Update orange positions and check for collisions
    for (let i = oranges.length - 1; i >= 0; i--) {
        const orange = oranges[i];
        orange.y += orange.speed;
        
        // Check collision with basket
        if (checkCollision(orange, basket)) {
            coins++;
            oranges.splice(i, 1); // Remove caught orange
            
            // Make capybara happy for half a second
            capyHappy = true;
            capyHappyTimer = 30; // 0.5 seconds at 60fps
            
            console.log('Orange caught! Coins:', coins);
        }
        // Remove oranges that fell off screen
        else if (orange.y > CANVAS_HEIGHT) {
            oranges.splice(i, 1);
        }
    }
}

// Update bones
function updateBones() {
    // Spawn new bones randomly (less frequent than oranges)
    if (Math.random() < BONE_SPAWN_RATE) {
        bones.push(createBone());
    }
    
    // Update bone positions and check for collisions
    for (let i = bones.length - 1; i >= 0; i--) {
        const bone = bones[i];
        bone.y += bone.speed;
        
        // Check collision with basket center (same as oranges)
        if (checkCollision(bone, basket)) {
            coins = Math.max(0, coins - 1); // Lose a coin, but don't go below 0
            bones.splice(i, 1); // Remove caught bone
            console.log('Bone caught! Lost a coin. Coins:', coins);
        }
        // Remove bones that fell off screen
        else if (bone.y > CANVAS_HEIGHT) {
            bones.splice(i, 1);
        }
    }
}

// Update bombs
function updateBombs() {
    // Spawn new bombs randomly (less frequent than oranges)
    if (Math.random() < BOMB_SPAWN_RATE) {
        bombs.push(createBomb());
    }
    
    // Update bomb positions and animation
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        bomb.y += bomb.speed;
        bomb.animationFrame++; // Increment animation frame for switching images
        
        // Check collision with basket
        if (checkBombCollision(bomb, basket)) {
            createExplosion(bomb.x + bomb.width/2, bomb.y + bomb.height/2);
            lives = Math.max(0, lives - 1); // Lose a life, but don't go below 0
            bombs.splice(i, 1); // Remove bomb that hit basket
            
            // Make capybara scared for 1 second
            capyScared = true;
            capyScaredTimer = 60; // 1 second at 60fps
            
            console.log('Bomb hit basket! EXPLOSION! Lives remaining:', lives);
            
            // Check if game over
            if (lives <= 0) {
                gameOver = true;
                gameOverTimer = 180; // 3 seconds at 60fps
                console.log('GAME OVER!');
            }
        }
        // Remove bombs that fell off screen
        else if (bomb.y > CANVAS_HEIGHT) {
            bombs.splice(i, 1);
        }
    }
}

// Check if bomb hits the basket (different from orange collision)
function checkBombCollision(bomb, basket) {
    return bomb.x < basket.x + basket.width &&
           bomb.x + bomb.width > basket.x &&
           bomb.y < basket.y + basket.height &&
           bomb.y + bomb.height > basket.y;
}

// Create explosion effect
function createExplosion(x, y) {
    explosion = {
        x: x,
        y: y,
        radius: 10,
        maxRadius: 80,
        opacity: 1.0,
        duration: 30 // frames
    };
}

// Update explosion
function updateExplosion() {
    if (explosion) {
        explosion.radius += 3;
        explosion.opacity -= 0.033; // Fade out over 30 frames
        
        if (explosion.radius >= explosion.maxRadius || explosion.opacity <= 0) {
            explosion = null; // Remove explosion when done
        }
    }
}

// Check if orange is in the center of the basket
function checkCollision(orange, basket) {
    // Calculate center areas
    const orangeCenterX = orange.x + orange.width / 2;
    const orangeCenterY = orange.y + orange.height / 2;
    
    // Define the center area of the basket (smaller area for more precise catching)
    const basketCenterX = basket.x + basket.width / 2;
    const basketCenterY = basket.y + basket.height / 2;
    const basketCenterWidth = basket.width * 0.6; // 60% of basket width
    const basketCenterHeight = basket.height * 0.4; // 40% of basket height
    
    // Check if orange center is within the center area of the basket
    return orangeCenterX >= basketCenterX - basketCenterWidth / 2 &&
           orangeCenterX <= basketCenterX + basketCenterWidth / 2 &&
           orangeCenterY >= basketCenterY - basketCenterHeight / 2 &&
           orangeCenterY <= basketCenterY + basketCenterHeight / 2;
}

// Update basket position
function updateBasket() {
    // Move left with left mouse button
    if (leftMousePressed && basket.x > 0) {
        basket.x -= basket.speed;
    }
    
    // Move right with right mouse button
    if (rightMousePressed && basket.x < CANVAS_WIDTH - basket.width) {
        basket.x += basket.speed;
    }
    
    // Keep basket within canvas bounds
    if (basket.x < 0) {
        basket.x = 0;
    }
    if (basket.x > CANVAS_WIDTH - basket.width) {
        basket.x = CANVAS_WIDTH - basket.width;
    }
}

// Draw oranges
function drawOranges() {
    oranges.forEach(orange => {
        ctx.drawImage(orangeImage, orange.x, orange.y, orange.width, orange.height);
    });
}

// Draw bones
function drawBones() {
    bones.forEach(bone => {
        ctx.drawImage(boneImage, bone.x, bone.y, bone.width, bone.height);
    });
}

// Draw bombs with animation
function drawBombs() {
    bombs.forEach(bomb => {
        // Switch between bomb images every 10 frames for animation
        const currentBombImage = Math.floor(bomb.animationFrame / 10) % 2 === 0 ? bombImage1 : bombImage2;
        ctx.drawImage(currentBombImage, bomb.x, bomb.y, bomb.width, bomb.height);
    });
}

// Draw explosion effect
function drawExplosion() {
    if (explosion) {
        ctx.save();
        ctx.globalAlpha = explosion.opacity;
        
        // Create gradient for explosion
        const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.radius);
        gradient.addColorStop(0, '#FFD700'); // Gold center
        gradient.addColorStop(0.3, '#FF4500'); // Orange-red
        gradient.addColorStop(0.6, '#FF0000'); // Red
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some spark effects
        ctx.fillStyle = '#FFFF00'; // Yellow sparks
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const sparkX = explosion.x + Math.cos(angle) * explosion.radius * 0.8;
            const sparkY = explosion.y + Math.sin(angle) * explosion.radius * 0.8;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Draw basket
function drawBasket() {
    ctx.drawImage(basket.image, basket.x, basket.y, basket.width, basket.height);
}

// Draw coin counter
function drawCoins() {
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.font = 'bold 24px Arial';
    ctx.strokeStyle = '#8B4513'; // Brown outline
    ctx.lineWidth = 2;
    
    const coinText = `Coins: ${coins}`;
    const textWidth = ctx.measureText(coinText).width;
    
    // Draw text outline
    ctx.strokeText(coinText, CANVAS_WIDTH - textWidth - 20, 40);
    // Draw text fill
    ctx.fillText(coinText, CANVAS_WIDTH - textWidth - 20, 40);
}

// Create floating hearts around capybara
function createFloatingHearts() {
    const capyIcon = document.getElementById('capyIcon');
    const capyRect = capyIcon.getBoundingClientRect();
    
    // Create 3 hearts in a half circle around the top of capy
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('img');
        heart.src = 'assets/heart.png';
        heart.className = 'floating-heart';
        
        // Position hearts in half circle
        const angle = (Math.PI / 4) + (i * Math.PI / 6); // 45° to 135° arc
        const radius = 60;
        const x = capyRect.left + capyRect.width/2 + Math.cos(angle) * radius - 12.5;
        const y = capyRect.top + capyRect.height/2 - Math.sin(angle) * radius - 12.5;
        
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        
        document.body.appendChild(heart);
        
        // Remove heart after animation
        setTimeout(() => {
            if (heart.parentNode) {
                heart.parentNode.removeChild(heart);
            }
        }, 500);
    }
}

// Update capybara image based on state
function updateCapyImage() {
    const capyImage = document.getElementById('capyImage');
    const capyIcon = document.getElementById('capyIcon');
    
    // Handle scared state (priority over happy)
    if (capyScared && capyScaredTimer > 0) {
        capyImage.src = 'assets/capy_scared.png';
        capyIcon.classList.add('scared');
        capyIcon.classList.remove('happy');
        capyScaredTimer--;
    }
    // Handle happy state
    else if (capyHappy && capyHappyTimer > 0) {
        capyImage.src = 'assets/capy_happy.png';
        capyIcon.classList.add('happy');
        capyIcon.classList.remove('scared');
        capyHappyTimer--;
        
        // Create hearts only once at the beginning
        if (capyHappyTimer === 29) { // First frame of happy state
            createFloatingHearts();
        }
    }
    // Normal state
    else {
        capyImage.src = 'assets/capy.png';
        capyIcon.classList.remove('scared');
        capyIcon.classList.remove('happy');
        capyScared = false;
        capyHappy = false;
    }
}

// Reset game to initial state
function resetGame() {
    coins = 0;
    lives = 5;
    oranges = [];
    bombs = [];
    bones = [];
    explosion = null;
    gameOver = false;
    gameOverTimer = 0;
    capyScared = false;
    capyScaredTimer = 0;
    capyHappy = false;
    capyHappyTimer = 0;
    
    // Reset capy image and effects
    const capyImage = document.getElementById('capyImage');
    const capyIcon = document.getElementById('capyIcon');
    if (capyImage) {
        capyImage.src = 'assets/capy.png';
    }
    if (capyIcon) {
        capyIcon.classList.remove('scared');
        capyIcon.classList.remove('happy');
    }
    
    // Remove any floating hearts
    const floatingHearts = document.querySelectorAll('.floating-heart');
    floatingHearts.forEach(heart => {
        if (heart.parentNode) {
            heart.parentNode.removeChild(heart);
        }
    });
    
    console.log('Game Reset!');
}

// Draw game over screen
function drawGameOver() {
    if (gameOver) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // "GAME OVER" text
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 80px Arial';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        
        const gameOverText = 'GAME OVER';
        const textWidth = ctx.measureText(gameOverText).width;
        const textX = (CANVAS_WIDTH - textWidth) / 2;
        const textY = CANVAS_HEIGHT / 2 - 40;
        
        // Draw text outline
        ctx.strokeText(gameOverText, textX, textY);
        // Draw text fill
        ctx.fillText(gameOverText, textX, textY);
        
        // Final score
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 40px Arial';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const scoreText = `Final Score: ${coins} coins`;
        const scoreWidth = ctx.measureText(scoreText).width;
        const scoreX = (CANVAS_WIDTH - scoreWidth) / 2;
        const scoreY = CANVAS_HEIGHT / 2 + 40;
        
        // Draw score outline
        ctx.strokeText(scoreText, scoreX, scoreY);
        // Draw score fill
        ctx.fillText(scoreText, scoreX, scoreY);
        
        // Restart message
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        const restartText = 'Restarting in ' + Math.ceil(gameOverTimer / 60) + ' seconds...';
        const restartWidth = ctx.measureText(restartText).width;
        const restartX = (CANVAS_WIDTH - restartWidth) / 2;
        const restartY = CANVAS_HEIGHT / 2 + 100;
        
        // Draw restart text outline
        ctx.strokeText(restartText, restartX, restartY);
        // Draw restart text fill
        ctx.fillText(restartText, restartX, restartY);
    }
}

// Draw lives (hearts)
function drawLives() {
    const heartSize = 25;
    const heartSpacing = 30;
    const totalHeartsWidth = (5 * heartSpacing) - (heartSpacing - heartSize); // Calculate total width needed
    const startX = CANVAS_WIDTH - totalHeartsWidth - 20; // Position near right edge, same as coins
    const startY = 70; // Below the coin counter
    
    for (let i = 0; i < 5; i++) {
        const heartX = startX + (i * heartSpacing);
        const heartY = startY;
        
        if (i < lives) {
            // Draw full heart for remaining lives
            ctx.drawImage(heartImage, heartX, heartY, heartSize, heartSize);
        } else {
            // Draw grayed out heart for lost lives
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.filter = 'grayscale(100%)';
            ctx.drawImage(heartImage, heartX, heartY, heartSize, heartSize);
            ctx.restore();
        }
    }
}

// Clear canvas
function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Draw background
function drawBackground() {
    // Blue sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - 100);
    skyGradient.addColorStop(0, '#87CEEB'); // Sky blue at top
    skyGradient.addColorStop(1, '#B0E0E6'); // Powder blue at bottom
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - 100);
    
    // Draw scattered white clouds
    drawClouds();
    
    // Soft brown ground
    const groundGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 100, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#DEB887'); // Burlywood
    groundGradient.addColorStop(1, '#D2B48C'); // Tan - softer brown
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, CANVAS_HEIGHT - 100, CANVAS_WIDTH, 100);
}

// Draw scattered clouds in the sky
function drawClouds() {
    // Cloud positions - positioned away from capybara square (top-left area)
    const clouds = [
        { x: 400, y: 70, size: 0.8, type: 'medium' },
        { x: 600, y: 50, size: 1.0, type: 'large' },
        { x: 750, y: 90, size: 0.7, type: 'small' },
        { x: 500, y: 130, size: 0.9, type: 'medium' },
        { x: 300, y: 45, size: 0.6, type: 'small' }
    ];
    
    clouds.forEach(cloud => {
        drawSingleCloud(cloud.x, cloud.y, cloud.size, cloud.type);
    });
}

// Draw a single fluffy cloud with improved appearance
function drawSingleCloud(x, y, scale = 1, type = 'medium') {
    ctx.save();
    
    // Set cloud color - solid white to avoid artifacts
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    
    // Draw each circle individually to avoid triangle artifacts
    if (type === 'large') {
        // Large fluffy cloud - draw each circle separately
        drawCloudCircle(x, y, 30 * scale);
        drawCloudCircle(x + 35 * scale, y, 25 * scale);
        drawCloudCircle(x + 60 * scale, y, 28 * scale);
        drawCloudCircle(x + 85 * scale, y, 22 * scale);
        drawCloudCircle(x + 20 * scale, y - 20 * scale, 25 * scale);
        drawCloudCircle(x + 45 * scale, y - 25 * scale, 30 * scale);
        drawCloudCircle(x + 70 * scale, y - 20 * scale, 24 * scale);
    } else if (type === 'medium') {
        // Medium cloud
        drawCloudCircle(x, y, 25 * scale);
        drawCloudCircle(x + 30 * scale, y, 20 * scale);
        drawCloudCircle(x + 50 * scale, y, 23 * scale);
        drawCloudCircle(x + 15 * scale, y - 18 * scale, 20 * scale);
        drawCloudCircle(x + 35 * scale, y - 20 * scale, 25 * scale);
    } else {
        // Small cloud
        drawCloudCircle(x, y, 20 * scale);
        drawCloudCircle(x + 25 * scale, y, 18 * scale);
        drawCloudCircle(x + 12 * scale, y - 15 * scale, 18 * scale);
        drawCloudCircle(x + 30 * scale, y - 12 * scale, 15 * scale);
    }
    
    ctx.restore();
}

// Helper function to draw individual cloud circles
function drawCloudCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Main game loop
function gameLoop() {
    clearCanvas();
    drawBackground();
    
    // Always update capy image (even during game over)
    updateCapyImage();
    
    if (gameOver) {
        // Handle game over state
        gameOverTimer--;
        drawGameOver();
        
        // Reset game after timer expires
        if (gameOverTimer <= 0) {
            resetGame();
        }
    } else {
        // Normal game update
        updateBasket();
        updateOranges();
        updateBones();
        updateBombs();
        updateExplosion();
        drawBasket();
        drawOranges(); // Draw oranges on top of basket
        drawBones(); // Draw bones on top of basket
        drawBombs(); // Draw bombs on top of basket
        drawExplosion(); // Draw explosion on top of everything
        drawCoins();
        drawLives();
    }
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Initialize game when basket image is loaded
console.log('Game initialized. Use left mouse button to move left, right mouse button to move right.'); 