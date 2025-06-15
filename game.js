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
const HEART_SPEED = 1.5;
const ORANGE_SPAWN_RATE = 0.02; // Probability of spawning an orange each frame
const BOMB_SPAWN_RATE = 0.005; // Much less frequent than oranges
const BONE_SPAWN_RATE = 0.01; // Less frequent than oranges but more than bombs
const HEART_SPAWN_RATE = 0.0008; // Very rare - only when missing lives

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
let hearts = []; // Array for falling hearts
let explosion = null;
let gameOver = false;
let gameOverTimer = 0;
let capyScared = false;
let capyScaredTimer = 0;
let capyHappy = false;
let capyHappyTimer = 0;

// Timer and game progression
let gameTimer = 3600; // 60 seconds at 60fps (60 * 60)
let currentScreen = 'game'; // 'game' or 'feeding'

// Feeding screen variables
let feedingOranges = []; // Oranges on the feeding screen
let draggedOrange = null; // Currently dragged orange
let mouseX = 0;
let mouseY = 0;
let capybaraFeeding = {
    x: 0,
    y: 0,
    width: 150,
    height: 150,
    mouthX: 0, // Will be calculated relative to capybara position
    mouthY: 0,
    mouthRadius: 40
};

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

// Mouse move tracking for feeding screen
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Update dragged orange position
    if (draggedOrange && currentScreen === 'feeding') {
        draggedOrange.x = mouseX - draggedOrange.width / 2;
        draggedOrange.y = mouseY - draggedOrange.height / 2;
    }
});

// Mouse down for feeding screen - start dragging
canvas.addEventListener('mousedown', function(e) {
    if (currentScreen === 'feeding' && e.button === 0) { // Left click only
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check if clicking on an orange
        for (let i = feedingOranges.length - 1; i >= 0; i--) {
            const orange = feedingOranges[i];
            if (clickX >= orange.x && clickX <= orange.x + orange.width &&
                clickY >= orange.y && clickY <= orange.y + orange.height) {
                draggedOrange = orange;
                break;
            }
        }
    }
});

// Mouse up for feeding screen - stop dragging and check feeding
canvas.addEventListener('mouseup', function(e) {
    if (currentScreen === 'feeding' && draggedOrange && e.button === 0) {
        // Check if orange is near capybara's mouth
        const distance = Math.sqrt(
            Math.pow(draggedOrange.x + draggedOrange.width/2 - capybaraFeeding.mouthX, 2) +
            Math.pow(draggedOrange.y + draggedOrange.height/2 - capybaraFeeding.mouthY, 2)
        );
        
        if (distance < capybaraFeeding.mouthRadius) {
            // Feed the capybara!
            feedingOranges = feedingOranges.filter(o => o !== draggedOrange);
            coins = Math.max(0, coins - 1); // Remove one orange from count
            
            // Make capybara happy
            capyHappy = true;
            capyHappyTimer = 60; // 1 second
            
            console.log('Capybara fed! Remaining oranges:', coins);
        }
        
        draggedOrange = null;
    }
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

// Create new heart
function createHeart() {
    return {
        x: Math.random() * (CANVAS_WIDTH - 40), // Random x position
        y: -40, // Start above canvas
        width: 40,
        height: 40,
        speed: HEART_SPEED
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

// Draw hearts
function drawHearts() {
    hearts.forEach(heart => {
        ctx.drawImage(heartImage, heart.x, heart.y, heart.width, heart.height);
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

// Draw timer
function drawTimer() {
    const minutes = Math.floor(gameTimer / 3600);
    const seconds = Math.floor((gameTimer % 3600) / 60);
    const timeText = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Center the timer text
    const textWidth = ctx.measureText(timeText).width;
    const textX = (CANVAS_WIDTH - textWidth) / 2;
    
    // Draw text outline
    ctx.strokeText(timeText, textX, 40);
    // Draw text fill
    ctx.fillText(timeText, textX, 40);
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
    hearts = [];
    explosion = null;
    gameOver = false;
    gameOverTimer = 0;
    capyScared = false;
    capyScaredTimer = 0;
    capyHappy = false;
    capyHappyTimer = 0;
    gameTimer = 3600; // Reset timer to 60 seconds
    currentScreen = 'game'; // Reset to game screen
    
    // Reset feeding screen variables
    feedingOranges = [];
    draggedOrange = null;
    
    // Reset UI elements
    resetGameScreenUI();
    
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

// Draw feeding screen
function drawFeedingScreen() {
    // Set cute cursor and hide UI elements
    setupFeedingScreenUI();
    
    // Clear canvas with a nice indoor background
    ctx.fillStyle = '#F5F5DC'; // Beige background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Initialize feeding oranges if not done
    if (feedingOranges.length === 0 && coins > 0) {
        initializeFeedingOranges();
    }
    
    // Draw simple table
    drawTable();
    
    // Draw basket on table with oranges
    drawBasketWithOranges();
    
    // Draw capybara
    drawCapybaraFeeding();
    
    // Draw success message
    drawSuccessMessage();
}

// Setup UI for feeding screen
function setupFeedingScreenUI() {
    // Set cute cursor
    canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'12\' fill=\'%23FFB6C1\' stroke=\'%23FF69B4\' stroke-width=\'2\'/><circle cx=\'12\' cy=\'12\' r=\'2\' fill=\'%23FF1493\'/><circle cx=\'20\' cy=\'12\' r=\'2\' fill=\'%23FF1493\'/><path d=\'M 12 20 Q 16 24 20 20\' stroke=\'%23FF1493\' stroke-width=\'2\' fill=\'none\'/></svg>") 16 16, auto';
    
    // Hide capybara UI elements
    const capyIcon = document.getElementById('capyIcon');
    if (capyIcon) {
        capyIcon.style.display = 'none';
    }
}

// Reset UI for game screen
function resetGameScreenUI() {
    // Reset cursor
    canvas.style.cursor = 'default';
    
    // Show capybara UI elements
    const capyIcon = document.getElementById('capyIcon');
    if (capyIcon) {
        capyIcon.style.display = 'block';
    }
}

// Draw table
function drawTable() {
    // Table top
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 + 50, 400, 20);
    
    // Table legs
    ctx.fillStyle = '#654321'; // Darker brown
    // Left legs
    ctx.fillRect(CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 + 70, 15, 100);
    ctx.fillRect(CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 + 70, 15, 100);
    // Right legs  
    ctx.fillRect(CANVAS_WIDTH / 2 + 165, CANVAS_HEIGHT / 2 + 70, 15, 100);
    ctx.fillRect(CANVAS_WIDTH / 2 + 165, CANVAS_HEIGHT / 2 + 70, 15, 100);
}

// Initialize feeding oranges when entering feeding screen
function initializeFeedingOranges() {
    feedingOranges = [];
    const tableY = CANVAS_HEIGHT / 2 + 50;
    const basketX = CANVAS_WIDTH / 2 - 75;
    const basketY = tableY - 90; // Fixed gap - basket sits properly on table
    
    // Create orange objects for dragging
    const numOranges = Math.min(coins, 12);
    for (let i = 0; i < numOranges; i++) {
        const angle = (i / numOranges) * Math.PI * 2;
        const radius = 30 + (i % 3) * 15;
        feedingOranges.push({
            x: basketX + 75 + Math.cos(angle) * radius - 20,
            y: basketY + 60 + Math.sin(angle) * radius * 0.5 - 20,
            width: 40,
            height: 40,
            originalX: basketX + 75 + Math.cos(angle) * radius - 20,
            originalY: basketY + 60 + Math.sin(angle) * radius * 0.5 - 20
        });
    }
    
    // Position capybara near the table
    capybaraFeeding.x = CANVAS_WIDTH / 2 + 200; // Right side of table
    capybaraFeeding.y = CANVAS_HEIGHT / 2 - 50; // Level with table
    capybaraFeeding.mouthX = capybaraFeeding.x + 40; // Approximate mouth position
    capybaraFeeding.mouthY = capybaraFeeding.y + 50;
}

// Draw basket with oranges on table
function drawBasketWithOranges() {
    const tableY = CANVAS_HEIGHT / 2 + 50;
    const basketX = CANVAS_WIDTH / 2 - 75; // Center the basket
    const basketY = tableY - 90; // Fixed gap - basket sits properly on table
    
    // Draw the basket
    ctx.drawImage(basket.image, basketX, basketY, 150, 90);
    
    // Draw oranges (from feedingOranges array for dragging)
    feedingOranges.forEach(orange => {
        // Highlight dragged orange
        if (orange === draggedOrange) {
            ctx.save();
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
        }
        
        ctx.drawImage(orangeImage, orange.x, orange.y, orange.width, orange.height);
        
        if (orange === draggedOrange) {
            ctx.restore();
        }
    });
}

// Draw capybara on feeding screen
function drawCapybaraFeeding() {
    // Always update capy image state
    updateCapyImage();
    
    // Get current capybara image
    const capyImage = document.getElementById('capyImage');
    if (capyImage && capyImage.complete) {
        ctx.drawImage(capyImage, capybaraFeeding.x, capybaraFeeding.y, capybaraFeeding.width, capybaraFeeding.height);
        
        // Draw mouth area indicator (invisible circle for debugging - can remove later)
        if (draggedOrange) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(capybaraFeeding.mouthX, capybaraFeeding.mouthY, capybaraFeeding.mouthRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// Draw success message
function drawSuccessMessage() {
    ctx.fillStyle = '#228B22'; // Forest green
    ctx.font = 'bold 48px Arial';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    
    const successText = 'Level Complete!';
    const textWidth = ctx.measureText(successText).width;
    const textX = (CANVAS_WIDTH - textWidth) / 2;
    const textY = 100;
    
    // Draw text outline
    ctx.strokeText(successText, textX, textY);
    // Draw text fill
    ctx.fillText(successText, textX, textY);
    
    // Draw coins collected
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px Arial';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    
    const coinsText = `Oranges Collected: ${coins}`;
    const coinsWidth = ctx.measureText(coinsText).width;
    const coinsX = (CANVAS_WIDTH - coinsWidth) / 2;
    const coinsY = 160;
    
    // Draw coins text outline
    ctx.strokeText(coinsText, coinsX, coinsY);
    // Draw coins text fill
    ctx.fillText(coinsText, coinsX, coinsY);
}

// Update hearts
function updateHearts() {
    // Spawn new hearts only if player is missing lives (less than 5)
    if (lives < 5 && Math.random() < HEART_SPAWN_RATE) {
        hearts.push(createHeart());
    }
    
    // Update heart positions and check for collisions
    for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        heart.y += heart.speed;
        
        // Check collision with basket
        if (checkCollision(heart, basket)) {
            if (lives < 5) { // Only gain life if not at maximum
                lives++;
                console.log('Heart caught! Lives:', lives);
                
                // Make capybara happy for half a second
                capyHappy = true;
                capyHappyTimer = 30; // 0.5 seconds at 60fps
            }
            hearts.splice(i, 1); // Remove caught heart
        }
        // Remove hearts that fell off screen
        else if (heart.y > CANVAS_HEIGHT) {
            hearts.splice(i, 1);
        }
    }
}

// Main game loop
function gameLoop() {
    if (currentScreen === 'game') {
        // Ensure game screen UI is set up
        resetGameScreenUI();
        
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
            // Update timer
            if (gameTimer > 0) {
                gameTimer--;
                
                // Check if time is up and player still has lives
                if (gameTimer <= 0 && lives > 0) {
                    currentScreen = 'feeding';
                    console.log('Time up! Moving to feeding screen with', coins, 'oranges');
                }
            }
            
            // Normal game update
            updateBasket();
            updateOranges();
            updateBones();
            updateBombs();
            updateExplosion();
            updateHearts();
            drawBasket();
            drawOranges(); // Draw oranges on top of basket
            drawBones(); // Draw bones on top of basket
            drawBombs(); // Draw bombs on top of basket
            drawExplosion(); // Draw explosion on top of everything
            drawCoins();
            drawLives();
            drawHearts();
            drawTimer(); // Draw the timer
        }
    } else if (currentScreen === 'feeding') {
        // Draw feeding screen
        drawFeedingScreen();
    }
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Initialize game when basket image is loaded
console.log('Game initialized. Use left mouse button to move left, right mouse button to move right.'); 