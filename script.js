import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('canvas.webgl');
canvas.style.display = 'none';
const scene = new THREE.Scene();
const explosions = [];
let introMusic = null;


// Fullscreen button functionality
const fullscreenButton = document.getElementById('fullscreen-button');
fullscreenButton.style.top = '30px'; // Set your desired top value
fullscreenButton.style.right = '80px';

function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(); // Safari
        }
        fullscreenButton.textContent = 'Exit';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen(); // Safari
        }
        fullscreenButton.textContent = 'Full Screen';
    }
    // Remove focus from button and focus the canvas
    fullscreenButton.blur();
    canvas.focus();
}

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullscreen);

    // Prevent Enter and Space keys from triggering button click
    fullscreenButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // Update button text on fullscreen change
    document.addEventListener('fullscreenchange', () => {
        fullscreenButton.textContent = document.fullscreenElement ? 'Exit' : 'Full Screen';
        fullscreenButton.blur(); // Remove focus on fullscreen change
        canvas.focus(); // Focus the canvas
    });
    document.addEventListener('webkitfullscreenchange', () => {
        fullscreenButton.textContent = document.webkitFullscreenElement ? 'Exit' : 'Full Screen';
        fullscreenButton.blur(); // Remove focus on fullscreen change
        canvas.focus(); // Focus the canvas
    });

    // Ensure canvas is focusable
    canvas.tabIndex = 0; // Make canvas focusable

    // Inject fullscreen styles to ensure UI elements remain visible
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        :fullscreen #health-bar-container,
        :fullscreen #collectibles-container,
        :fullscreen #diamond-display {
            display: flex !important;
            visibility: visible !important;
        }

        :-webkit-full-screen #health-bar-container,
        :-webkit-full-screen #collectibles-container,
        :-webkit-full-screen #diamond-display {
            display: flex !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(styleElement);
}


const totalScoreDisplay = document.getElementById('total-score-display');
const scoreDisplay = document.getElementById('score-display');
if (totalScoreDisplay) totalScoreDisplay.style.display = 'none';
if (scoreDisplay) scoreDisplay.style.display = 'none';


// Initialize collectibles UI
const treasureDisplay = document.getElementById('treasure-display');
const potionDisplay = document.getElementById('potion-display');
if (treasureDisplay) treasureDisplay.style.display = 'none';
if (potionDisplay) potionDisplay.style.display = 'none';


const monsterHealthBarContainer = document.querySelector('.monster-health-bar-container');
if (monsterHealthBarContainer) monsterHealthBarContainer.style.display = 'none';


const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => {
    document.querySelector('.loader-background').style.display = 'block';
    document.querySelector('.loader').style.display = 'block';
};
loadingManager.onLoad = () => {
    document.querySelector('.loader-background').style.display = 'none';
    document.querySelector('.loader').style.display = 'none';
    showRuleScreen();
    window.addEventListener('keydown', handleRuleKey);
};

const textureLoader = new THREE.TextureLoader();
textureLoader.load('images/background4.png', (texture) => {
    texture.encoding = THREE.LinearEncoding;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    scene.background = texture;
}, undefined, (error) => {
    console.error('Error loading background texture:', error);
    scene.background = new THREE.Color(0x2F2F2F);
});



const ruleScreen = document.getElementById('rule-screen');
const ruleImage = document.getElementById('rule-image');
const ruleImages = ['images/level2-1.png', 'images/level2-2.png'];
let currentRuleIndex = 0;

function showRuleScreen() {
    if (ruleScreen) ruleScreen.style.display = 'flex';
    currentRuleIndex = 0;
    if (ruleImage) ruleImage.src = ruleImages[currentRuleIndex];
}

function handleRuleKey(event) {
    if (event.key === 'Enter') {
        currentRuleIndex++;
        if (currentRuleIndex < ruleImages.length) {
            if (ruleImage) ruleImage.src = ruleImages[currentRuleIndex];
        } else {
            if (ruleScreen) ruleScreen.style.display = 'none';
            window.removeEventListener('keydown', handleRuleKey);
            canvas.style.display = 'block';
            toggleFullscreen();
            introMusic = new Audio('music/intro.mp3');
            introMusic.loop = true;
            introMusic.volume = 0.5;
            introMusic.play();
            animation();
        }
    }
}



let downArrowTexture;
let downArrowSprites = [];

let sparkTexture;
textureLoader.load('images/spark.png', (texture) => {
    sparkTexture = texture;
    sparkTexture.encoding = THREE.LinearEncoding;
    sparkTexture.minFilter = THREE.LinearFilter;
    sparkTexture.magFilter = THREE.LinearFilter;
}, undefined, (error) => {
    console.error('Error loading spark texture:', error);
});
downArrowTexture = textureLoader.load('images/down.png', (texture) => {
    texture.encoding = THREE.LinearEncoding;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
});

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

const platformWidth = 5;
const platformDepth = 3;
const platformHeight = 0.5;
const platformColor = 0x8A360F;
const platformSpacing = 9;
const maxPlatforms = 50;
const platforms = [];

const platformTypes = [
    { width: 4, depth: 3, height: 0.4 },
    { width: 4, depth: 3.5, height: 0.4 },
    { width: 4, depth: 4, height: 0.35 },
    { width: 4, depth: 4.5, height: 0.35 },
    { width: 4, depth: 5, height: 0.3 },
    { width: 4, depth: 5.5, height: 0.3 },
    { width: 4, depth: 6, height: 0.25 },
    { width: 4, depth: 6.5, height: 0.25 },
    { width: 4, depth: 7, height: 0.2 },
    { width: 4, depth: 7.5, height: 0.2 }
];

let firstPlatformY = 0;
let finalPlatformZ = 0;

// Monster-related variables
const monsters = [];
let monsterModel;
const monsterHoverAmplitude = 1.1;
const monsterHoverSpeed = 2;
let playerHealth = 700;

let isGameOver = false

// Diamond-related variables
const diamonds = [];
let diamondModel;
let diamondCount = 0;
const diamondCollectDistance = 1.5;

// Giftbox-related variables
const giftboxes = [];
let giftboxModel;
const giftboxRotationSpeed = 0.02;
const giftBoxHeight = 3.0;
const boxSize = 1;
const characterHeight = 1.0;
const characterWidth = 0.5;

const bullets = [];
let bulletSpeed = 10;
const spawnDistance = 50;
let minSpawnInterval = 5;
let maxSpawnInterval = 9;
let lastSpawnTime = 0;
let nextSpawnTime = 0;
let bulletModel;

let shakeTime = 0;
let shakeDuration = 1.0; // 1 second shake
let shakeIntensity = 2; // Shake amplitude
let baseCameraPosition = new THREE.Vector3(-100, 1, 0); // Default camera position
let isShaking = false; // Flag to control shake

const pipeBodies = [];
let isEnteringPipe = false;

let timeOnPipe = 0;
let isOnPipe = false;
let pipeEntryTriggered = false;
let lastPipePos = null;


function showGameOver() {

    if (introMusic) {
    introMusic.pause();
    introMusic.currentTime = 0; // Reset to start
    }


    const gameOverSound = new Audio('music/gameover.wav');
    gameOverSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
    gameOverSound.play();

    console.log("Showing Game Over screen");
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) {
        console.error("Game over screen element not found");
        return;
    }
    const finalScoreElement = document.getElementById('final-score');
    const finalCoinsElement = document.getElementById('final-coins');
    const restartButtonWrapper = document.getElementById('restart-button-wrapper');
    const restartButton = document.getElementById('restart-button');
    if (!finalScoreElement || !finalCoinsElement || !restartButtonWrapper || !restartButton) {
        console.error("Game over screen elements missing:", {
            finalScore: !!finalScoreElement,
            finalCoins: !!finalCoinsElement,
            restartButtonWrapper: !!restartButtonWrapper,
            restartButton: !!restartButton
        });
    }

    // Create and insert diamond display
    const diamondDisplay = document.createElement('p');
    diamondDisplay.id = 'final-diamonds';
    diamondDisplay.textContent = `Diamonds: ${diamondCount}`;

    // Hide score and coins, insert diamonds
    if (finalScoreElement) finalScoreElement.style.display = 'none';
    if (finalCoinsElement) finalCoinsElement.style.display = 'none';
    if (restartButtonWrapper) {
        gameOverScreen.insertBefore(diamondDisplay, restartButtonWrapper);
        restartButtonWrapper.style.transform = 'translate(-5px, -70px)';
        restartButtonWrapper.style.marginTop = '20px';
        console.log("Applied styles to restartButtonWrapper:", {
            transform: restartButtonWrapper.style.transform,
            marginTop: restartButtonWrapper.style.marginTop
        });
    }

    // Show game over screen
    gameOverScreen.style.display = 'flex';

    // Pause game
    isGameOver = true;
    isJumping = false;
    isRightKeyPressed = false;
    isLeftKeyPressed = false;
    verticalVelocity = 0;
    setAction(idleAction);

    // Stop animations for all objects
    monsters.forEach(monster => {
        if (!monster.isDead) {
            gsap.killTweensOf(monster.mesh.position);
            gsap.killTweensOf(monster.mesh.rotation);
        }
    });
    bullets.forEach(bullet => {
        if (!bullet.isDead) {
            gsap.killTweensOf(bullet.mesh.position);
        }
    });
    items.forEach(item => {
        if (!item.collected) {
            gsap.killTweensOf(item.mesh.rotation);
        }
    });
    diamonds.forEach(diamond => {
        if (!diamond.collected) {
            gsap.killTweensOf(diamond.mesh.rotation);
            gsap.killTweensOf(diamond.mesh.position);
        }
    });
    giftboxes.forEach(giftbox => {
        if (!giftbox.isOpened) {
            gsap.killTweensOf(giftbox.mesh.rotation);
        }
    });
    downArrowSprites.forEach(arrow => {
        gsap.killTweensOf(arrow.sprite.position);
    });

    // Disable keyboard inputs
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);

    // Add restart button listener
    if (restartButton) {
        restartButton.addEventListener('click', () => restartGame('index.html'));
        console.log("Game over restart button listener added for index.html");
    } else {
        console.error("Game over restart button not found in DOM");
    }
}



function showPotionNotCollectedGameOver() {

    if (introMusic) {
    introMusic.pause();
    introMusic.currentTime = 0; // Reset to start
    }


    const gameOverSound = new Audio('music/gameover.wav');
    gameOverSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
    gameOverSound.play();

    console.log("Showing Potion Not Collected Game Over screen");
    const gameOverScreen = document.getElementById('potion-not-collected-game-over-screen');
    if (!gameOverScreen) {
        console.error("Potion not collected game over screen element not found");
        return;
    }
    const messageElement = document.getElementById('potion-not-collected-message');
    const finalDiamondsElement = document.getElementById('potion-not-collected-final-diamonds');
    const restartButtonWrapper = document.getElementById('potion-not-collected-restart-button-wrapper');
    const restartButton = document.getElementById('potion-not-collected-restart-button');
    if (!messageElement || !finalDiamondsElement || !restartButtonWrapper || !restartButton) {
        console.error("Potion not collected game over screen elements missing:", {
            message: !!messageElement,
            finalDiamonds: !!finalDiamondsElement,
            restartButtonWrapper: !!restartButtonWrapper,
            restartButton: !!restartButton
        });
    }

    // Set text content
    if (messageElement) messageElement.textContent = 'Potion not collected !';
    if (finalDiamondsElement) finalDiamondsElement.textContent = `Diamonds: ${diamondCount}`;

    // Show game over screen
    gameOverScreen.style.display = 'flex';

    // Pause game
    isGameOver = true;
    isJumping = false;
    isRightKeyPressed = false;
    isLeftKeyPressed = false;
    verticalVelocity = 0;
    setAction(idleAction);

    // Stop animations for all objects
    monsters.forEach(monster => {
        if (!monster.isDead) {
            gsap.killTweensOf(monster.mesh.position);
            gsap.killTweensOf(monster.mesh.rotation);
        }
    });
    bullets.forEach(bullet => {
        if (!bullet.isDead) {
            gsap.killTweensOf(bullet.mesh.position);
        }
    });
    items.forEach(item => {
        if (!item.collected) {
            gsap.killTweensOf(item.mesh.rotation);
        }
    });
    diamonds.forEach(diamond => {
        if (!diamond.collected) {
            gsap.killTweensOf(diamond.mesh.rotation);
            gsap.killTweensOf(diamond.mesh.position);
        }
    });
    giftboxes.forEach(giftbox => {
        if (!giftbox.isOpened) {
            gsap.killTweensOf(giftbox.mesh.rotation);
        }
    });
    downArrowSprites.forEach(arrow => {
        gsap.killTweensOf(arrow.sprite.position);
    });

    // Disable keyboard inputs
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);

    // Add restart button listener
    if (restartButton) {
        restartButton.addEventListener('click', () => restartGame('level2.html'));
        console.log("Potion not collected restart button listener added for level2.html");
    } else {
        console.error("Potion not collected restart button not found in DOM");
    }
}



function createExplosion(position) {
    // Spark particles (fiery effect)
    const sparkCount = 200;
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);
    const sparkLifetimes = new Float32Array(sparkCount);
    const sparkColors = new Float32Array(sparkCount * 3);
    const sparkSizes = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
        sparkPositions[i * 3] = position.x;
        sparkPositions[i * 3 + 1] = position.y;
        sparkPositions[i * 3 + 2] = position.z;

        sparkVelocities[i * 3] = (Math.random() - 0.5) * 25; // x
        sparkVelocities[i * 3 + 1] = (Math.random() - 0.5) * 25 + 12; // y
        sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 25; // z

        sparkLifetimes[i] = 0.8 + Math.random() * 0.8; // 0.8 to 1.6 seconds
        sparkColors[i * 3] = 1.0; // R
        sparkColors[i * 3 + 1] = Math.random() * 0.5 + 0.5; // G
        sparkColors[i * 3 + 2] = Math.random() * 0.2; // B
        sparkSizes[i] = 0.6 + Math.random() * 0.6; // 0.6 to 1.2
    }

    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute('velocity', new THREE.BufferAttribute(sparkVelocities, 3));
    sparkGeometry.setAttribute('lifetime', new THREE.BufferAttribute(sparkLifetimes, 1));
    sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    sparkGeometry.setAttribute('size', new THREE.BufferAttribute(sparkSizes, 1));

    const sparkMaterial = new THREE.PointsMaterial({
        size: 1.0,
        map: sparkTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const sparkSystem = new THREE.Points(sparkGeometry, sparkMaterial);
    scene.add(sparkSystem);

    // Add a flash light
    const flashLight = new THREE.PointLight(0xffaa33, 2, 10);
    flashLight.position.copy(position);
    scene.add(flashLight);

    // Fade out the light
    const fadeLight = () => {
        flashLight.intensity -= 0.1;
        if (flashLight.intensity <= 0) {
            scene.remove(flashLight);
        } else {
            requestAnimationFrame(fadeLight);
        }
    };
    fadeLight();

    explosions.push({
        system: sparkSystem,
        time: 0,
        maxLifetime: Math.max(...sparkLifetimes)
    });
}


// Item-related variables
const items = [];
const itemTypes = {
    health_potion: {
        model: null,
        file: 'models/health_potion.glb',
        scale: 0.2,
        message: "Health potion acquired!",
        maxCount: Infinity
    },
    treasure: {
        model: null,
        file: 'models/treasure1.glb',
        scale: 0.4,
        message: "Treasure acquired!",
        maxCount: 1
    },
    potion: {
        model: null,
        file: 'models/potion.glb',
        scale: 1,
        message: "Potion acquired!",
        maxCount: 1
    },
    monster4: {
        model: null,
        file: 'models/monster4.glb',
        scale: 0.006, // Adjust scale to match monster3.glb or as needed
        message: "Monster4 spawned!",
        maxCount: Infinity
    }
};
const itemHoverAmplitude = 1.0;
const itemHoverSpeed = 2;
const itemCollectDistance = 1.5;
const itemCounts = {
    health_potion: 0,
    treasure: 0,
    potion: 0,
    monster4: 0
};




// Update Health Bar Function
function updateHealthBar() {
    const healthBar = document.querySelector('.health-bar');
    const gameOverText = document.querySelector('.game-over-text');

    if (healthBar) {
        healthBar.style.width = `${playerHealth}%`; // Update width based on health
    }

    if (playerHealth <= 0) {
        if (!isGameOver) { // Prevent multiple calls
            showGameOver();
        }
        if (gameOverText) {
            gameOverText.style.display = 'none'; // Hide legacy text
        }
        // Reset collectibles UI
        const treasureDisplay = document.getElementById('treasure-display');
        const potionDisplay = document.getElementById('potion-display');
        if (treasureDisplay) treasureDisplay.style.display = 'none';
        if (potionDisplay) potionDisplay.style.display = 'none';
        itemCounts['treasure'] = 0;
        itemCounts['potion'] = 0;
    }
}

// Initialize health bar
updateHealthBar();


function createPlatforms() {
    const platformMaterial = new THREE.MeshPhysicalMaterial({ 
        color: platformColor,
        metalness: 0.3,
        roughness: 0.7
    });

    const minHeight = -3;
    const maxHeight = 2;

    for (let i = 0; i < maxPlatforms; i++) {
        const platformType = platformTypes[Math.floor(Math.random() * platformTypes.length)];
        
        const widthVariation = (Math.random() - 0.5) * 0.5;
        const depthVariation = (Math.random() - 0.5) * 0.5;
        const heightVariation = (Math.random() - 0.5) * 0.1;

        const platformWidth = platformType.width + widthVariation;
        const platformDepth = platformType.depth + depthVariation;
        const platformHeight = platformType.height + heightVariation;

        const platformGeometry = new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth);
        
        const zPos = i * platformSpacing + Math.random() * 2 - 1;
        const yPos = minHeight + Math.random() * (maxHeight - minHeight);

        const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
        platformMesh.position.set(0, yPos, zPos);
        scene.add(platformMesh);

        const platformShape = new CANNON.Box(
            new CANNON.Vec3(platformWidth / 2, platformHeight / 2, platformDepth / 2)
        );

        const platformBody = new CANNON.Body({
            mass: 0,
            shape: platformShape
        });
        platformBody.position.set(0, yPos + platformHeight / 2, zPos);
        world.addBody(platformBody);

        platforms.push({
            mesh: platformMesh,
            body: platformBody,
            position: new THREE.Vector3(0, yPos, zPos),
            width: platformWidth,
            depth: platformDepth,
            height: platformHeight
        });

        if (i === 0) {
            firstPlatformY = yPos + platformHeight / 2;
        }

        if (i === maxPlatforms - 1 && pipeModel) {
            const pipe = pipeModel.clone();
            const pipeScale = 0.01;
            pipe.scale.set(pipeScale, pipeScale, pipeScale);
            pipe.rotation.y = Math.PI / 2;
        
            const xOffset = (Math.random() - 0.5) * 0.1;
            const zOffset = (Math.random() - 0.5) * (platformDepth - 1);
            const pipeYPos = yPos + platformHeight / 2 + 0.5;
        
            pipe.position.set(
                xOffset,
                pipeYPos,
                zPos + zOffset
            );
            scene.add(pipe);
        
            // Physics body for pipe
            const pipeSize = new CANNON.Vec3(0.5, 2.25, 1.25); // width: 1.0, height: 4.5, depth: 2.5
            const pipeShape = new CANNON.Box(pipeSize);
            const pipeBody = new CANNON.Body({
                mass: 0,
                shape: pipeShape
            });
            pipeBody.position.set(
                xOffset,
                pipeYPos,
                zPos + zOffset
            );
            world.addBody(pipeBody);
            pipeBodies.push({
                body: pipeBody,
                position: new THREE.Vector3(xOffset, pipeYPos, zPos + zOffset),
                width: 1.0,
                height: 4.5,
                depth: 2.0
            });
        
            console.log(`Pipe placed on final platform at (${xOffset}, ${pipeYPos}, ${zPos + zOffset}) with scale ${pipeScale}`);
        
            // Down arrow sprite
            const material = new THREE.SpriteMaterial({ map: downArrowTexture, transparent: true });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(2, 2, 2); // Adjusted scale
            sprite.position.set(xOffset, pipeYPos + 6.5, zPos + zOffset); // Position above pipe
            scene.add(sprite);
            downArrowSprites.push({
                sprite,
                baseY: pipeYPos + 6.5,
                platformZ: zPos + zOffset,
                timeOffset: Math.random() * Math.PI * 2
            });
        }

        if (i === maxPlatforms - 1) {
            finalPlatformZ = zPos;
        }

        if (Math.random() < 0.4 && i > 0 && i < maxPlatforms - 1 && monsterModel) {
            spawnMonsterOnPlatform({
                position: new THREE.Vector3(0, yPos + platformHeight / 2, zPos),
                width: platformWidth,
                depth: platformDepth
            });
        }

        if (Math.random() < 0.5 && i > 0 && i < maxPlatforms - 1 && diamondModel) {
            spawnDiamondOnPlatform({
                position: new THREE.Vector3(0, yPos + platformHeight / 2, zPos),
                width: platformWidth,
                depth: platformDepth
            });
        }
    }

    console.log("Final platform Z position:", finalPlatformZ);

    if (giftboxModel) {
        spawnGiftboxes();
    }

    if (characterModel) {
        characterModel.position.set(0, firstPlatformY + 0.1, 0);
    }
}

const gltfLoader = new GLTFLoader(loadingManager);

function loadMonsterModel() {
    gltfLoader.load('models/monster3.glb', (gltf) => {
        monsterModel = gltf.scene;
        monsterModel.scale.set(0.02, 0.02, 0.02);
        monsterModel.rotation.y = Math.PI;
        console.log("Monster model loaded successfully");
        loadDiamondModel();
    }, undefined, (error) => {
        console.error('Error loading monster3.glb:', error);
        loadDiamondModel();
    });
}

function loadDiamondModel() {
    gltfLoader.load('models/diamond.glb', (gltf) => {
        diamondModel = gltf.scene;
        diamondModel.scale.set(0.008, 0.008, 0.008);
        console.log("Diamond model loaded successfully");
        loadGiftboxModel();
    }, undefined, (error) => {
        console.error('Error loading diamond.glb:', error);
        loadGiftboxModel();
    });
}

function loadGiftboxModel() {
    gltfLoader.load('models/giftbox.glb', (gltf) => {
        giftboxModel = gltf.scene;
        giftboxModel.scale.set(0.5, 0.5, 0.5);
        giftboxModel.rotation.y = Math.PI;
        console.log("Giftbox model loaded successfully with scale 0.5");
        loadItemModels();
    }, undefined, (error) => {
        console.error('Error loading giftbox.glb:', error);
        loadItemModels();
    });
}

function loadItemModels() {
    const loadNext = (index) => {
        const itemKeys = Object.keys(itemTypes);
        if (index >= itemKeys.length) {
            console.log("All item models loaded successfully");
            createPlatforms();
            return;
        }
        const key = itemKeys[index];
        gltfLoader.load(itemTypes[key].file, (gltf) => {
            itemTypes[key].model = gltf.scene;
            itemTypes[key].model.scale.set(itemTypes[key].scale, itemTypes[key].scale, itemTypes[key].scale);
            console.log(`${key} model loaded successfully`);
            loadNext(index + 1);
        }, undefined, (error) => {
            console.error(`Error loading ${itemTypes[key].file}:`, error);
            loadNext(index + 1);
        });
    };
    loadNext(0);
}

function spawnMonsterOnPlatform(platform) {
    if (!monsterModel) return;

    const monster = monsterModel.clone();

    const xOffset = (Math.random() - 0.5) * 1;
    const zOffset = (Math.random() - 0.5) * (platform.depth - 1);

    monster.position.set(
        platform.position.x + xOffset,
        platform.position.y + 1.2,
        platform.position.z + zOffset
    );

    scene.add(monster);

    monsters.push({
        mesh: monster,
        baseY: monster.position.y,
        platformZ: platform.position.z,
        timeOffset: Math.random() * Math.PI * 2,
        lastHitTime: 0, // Initialize to 0
        type: 'default' // Add type for clarity
    });
}

function spawnDiamondOnPlatform(platform) {
    if (!diamondModel) return;

    const numDiamonds = Math.floor(Math.random() * 4) + 3;
    const platformDepth = platform.depth;
    const diamondSize = 0.3;
    const baseSpacing = diamondSize * 3.0;
    const totalDepth = Math.min((numDiamonds - 1) * baseSpacing, platformDepth - 2 * diamondSize);
    const startZ = -totalDepth / 2;

    for (let i = 0; i < numDiamonds; i++) {
        const diamond = diamondModel.clone();

        const xOffset = (Math.random() - 0.5) * 0.1;
        const zOffset = startZ + i * baseSpacing + (Math.random() - 0.5) * 0.2;

        const clampedZ = Math.max(-platformDepth / 2 + diamondSize, Math.min(platformDepth / 2 - diamondSize, zOffset));

        diamond.position.set(
            platform.position.x + xOffset,
            platform.position.y + 1.0,
            platform.position.z + clampedZ
        );

        scene.add(diamond);

        diamonds.push({
            mesh: diamond,
            baseY: diamond.position.y,
            platformZ: platform.position.z,
            timeOffset: Math.random() * Math.PI * 2
        });
    }
}

function spawnGiftboxes() {
    if (!giftboxModel) return;

    const availablePlatforms = platforms.slice(1, maxPlatforms - 1); // Exclude final platform
    const selectedPlatforms = [];
    for (let i = 0; i < 8 && availablePlatforms.length > 0; i++) {
        const index = Math.floor(Math.random() * availablePlatforms.length);
        selectedPlatforms.push(availablePlatforms.splice(index, 1)[0]);
    }

    // Assign exactly 5 health_potion, 1 monster4, 1 treasure, 1 potion
    const itemAssignments = [
        'health_potion', 'health_potion', 'health_potion', 'health_potion', 'health_potion',
        'monster4',
        'treasure',
        'potion'
    ].sort(() => Math.random() - 0.5); // Randomize assignments

    selectedPlatforms.forEach((platform, index) => {
        const giftbox = giftboxModel.clone();

        const xOffset = (Math.random() - 0.5) * 0.1;
        const zOffset = (Math.random() - 0.5) * (platform.depth - 1);
        const yPos = platform.position.y + giftBoxHeight;

        giftbox.position.set(
            platform.position.x + xOffset,
            yPos,
            platform.position.z + zOffset
        );

        scene.add(giftbox);

        const giftBoxShape = new CANNON.Box(new CANNON.Vec3(boxSize / 2, boxSize / 2, boxSize / 2));
        const giftBoxBody = new CANNON.Body({
            mass: 0,
            shape: giftBoxShape
        });
        const bodyYPos = yPos;
        giftBoxBody.position.set(
            platform.position.x + xOffset,
            bodyYPos,
            platform.position.z + zOffset
        );
        world.addBody(giftBoxBody);

        console.log(`Giftbox spawned at (${xOffset}, ${yPos}, ${zOffset}) with item: ${itemAssignments[index]}`);

        giftboxes.push({
            mesh: giftbox,
            body: giftBoxBody,
            position: new THREE.Vector3(
                platform.position.x + xOffset,
                yPos,
                platform.position.z + zOffset
            ),
            isOpened: false,
            initialBodyY: bodyYPos,
            itemType: itemAssignments[index]
        });
    });
}

function spawnItem(giftbox) {
    const itemType = giftbox.itemType;
    if (!itemTypes[itemType] || !itemTypes[itemType].model || itemCounts[itemType] >= itemTypes[itemType].maxCount) return;

    const item = itemTypes[itemType].model.clone();
    let startY, targetY;

    if (itemType === 'monster4') {
        // Position monster at the bottom of the giftbox
        startY = giftbox.position.y - boxSize / 2;
        targetY = startY - 1.8; // Move downward
    } else {
        // Other items (health_potion, treasure, potion)
        startY = giftbox.position.y + boxSize / 2;
        targetY = giftbox.position.y + boxSize / 2 + 2.0;
    }

    item.position.set(
        giftbox.position.x,
        startY,
        giftbox.position.z
    );

    if (itemType === 'treasure') {
        item.rotation.y = -Math.PI / 2;
    }
    if (itemType === 'monster4') {
        item.rotation.y = Math.PI / 2;
    }

    scene.add(item);

    gsap.to(item.position, {
        y: targetY,
        duration: 0.8,
        ease: itemType === 'monster4' ? "power2.out" : "elastic.out(1, 0.5)"
    });

    if (itemType === 'monster4') {
        // Add to monsters array instead of items
        monsters.push({
            mesh: item,
            baseY: targetY,
            platformZ: giftbox.position.z,
            timeOffset: Math.random() * Math.PI * 2,
            lastHitTime: 0, // Initialize to 0
            type: 'monster4'
        });
    } else {
        // Add to items array for collectibles
        items.push({
            mesh: item,
            baseY: targetY,
            platformZ: giftbox.position.z,
            timeOffset: Math.random() * Math.PI * 2,
            type: itemType
        });
    }

    itemCounts[itemType]++;
    console.log(`${itemType} spawned at (${item.position.x}, ${startY} -> ${targetY}, ${item.position.z})`);
}

function updateMonsters(delta, characterZ) {
    const cleanupDistance = 20;
    const hitCooldown = 1;

    for (let i = monsters.length - 1; i >= 0; i--) {
        const monster = monsters[i];

        const hoverAmplitude = monster.type === 'monster4' ? 0.5 : monsterHoverAmplitude;
        const progress = Math.min(characterZ / finalPlatformZ, 1);
        const dynamicHoverSpeed = monsterHoverSpeed + progress * 1; // Speed from 2 to 3
        monster.mesh.position.y = monster.baseY + Math.sin((clock.getElapsedTime() + monster.timeOffset) * dynamicHoverSpeed) * hoverAmplitude;

        if (characterModel) {
            const characterBox = new THREE.Box3().setFromCenterAndSize(
                characterModel.position,
                new THREE.Vector3(0.5, 1, 0.5)
            );
            const monsterBox = new THREE.Box3().setFromObject(monster.mesh);

            if (characterBox.intersectsBox(monsterBox)) {
                const currentTime = clock.getElapsedTime();
                if (monster.lastHitTime === 0 || currentTime - monster.lastHitTime >= hitCooldown) {
                    playerHealth = Math.max(playerHealth - 10, 0); // Lose 20% health
                    const turtleSound = new Audio('music/turtle.wav');
                    turtleSound.volume = 0.5;
                    turtleSound.play();
                    updateHealthBar();
                    console.log(`Health lost! Remaining health: ${playerHealth}%`);
                    monster.lastHitTime = currentTime;
                    if (playerHealth <= 0) {
                        console.log("Game Over! All health lost!");
                        // Reset collectibles UI
                        const treasureDisplay = document.getElementById('treasure-display');
                        const potionDisplay = document.getElementById('potion-display');
                        if (treasureDisplay) treasureDisplay.style.display = 'none';
                        if (potionDisplay) potionDisplay.style.display = 'none';
                        itemCounts['treasure'] = 0;
                        itemCounts['potion'] = 0;
                        // Optionally pause game or trigger game over screen
                    }
                }
            }
        }

        if (characterZ - monster.platformZ > cleanupDistance) {
            scene.remove(monster.mesh);
            monsters.splice(i, 1);
        }
    }
}

function updateDiamonds(delta, characterZ) {
    const cleanupDistance = 20;

    for (let i = diamonds.length - 1; i >= 0; i--) {
        const diamond = diamonds[i];

        if (characterModel) {
            const characterPos = characterModel.position;
            const diamondPos = diamond.mesh.position;
            const distance = characterPos.distanceTo(diamondPos);

            if (distance < diamondCollectDistance) {
                scene.remove(diamond.mesh);
                diamonds.splice(i, 1);
                diamondCount++;
                const coinSound = new Audio('music/coin.wav');
                coinSound.volume = 1.0;
                coinSound.play();
                console.log(`Diamond collected! Total: ${diamondCount}`);
                document.getElementById('diamond-count').textContent = diamondCount;
                continue;
            }
        }

        if (characterZ - diamond.platformZ > cleanupDistance) {
            scene.remove(diamond.mesh);
            diamonds.splice(i, 1);
        }
    }
}

function updateGiftboxes(delta, characterZ) {
    const cleanupDistance = 20;
    let canMove = true;

    for (let i = giftboxes.length - 1; i >= 0; i--) {
        const giftbox = giftboxes[i];
        const boxPosition = giftbox.position;

        if (!giftbox.isOpened) {
            giftbox.mesh.rotation.y += giftboxRotationSpeed;
        }

        giftbox.body.position.set(
            giftbox.mesh.position.x,
            giftbox.mesh.position.y,
            giftbox.mesh.position.z
        );

        if (characterModel) {
            const characterPosition = characterModel.position;

            const isWithinX = Math.abs(characterPosition.x - boxPosition.x) < (boxSize / 2 + characterWidth / 2);
            const isWithinZ = Math.abs(characterPosition.z - boxPosition.z) < (boxSize / 2 + characterWidth / 2);
            const isWithinY = Math.abs(characterPosition.y - boxPosition.y) < (boxSize / 2 + characterHeight / 2);

            if (isWithinX && isWithinZ && isWithinY) {
                // console.log(`Side collision with giftbox ${i} at (${boxPosition.x}, ${boxPosition.y}, ${boxPosition.z})`);
                if (isRightKeyPressed) {
                    characterModel.position.z = boxPosition.z - (boxSize / 2 + characterWidth / 2);
                    canMove = false;
                } else if (isLeftKeyPressed) {
                    characterModel.position.z = boxPosition.z + (boxSize / 2 + characterWidth / 2);
                    canMove = false;
                }
            }

            const isAboveBox = characterPosition.y <= boxPosition.y + boxSize / 2 + characterHeight / 2;
            const isBelowBoxTop = characterPosition.y >= boxPosition.y - characterHeight / 2;
            if (isWithinX && isWithinZ && isAboveBox && isBelowBoxTop && verticalVelocity <= 0) {
                console.log(`Top collision with giftbox ${i} at (${boxPosition.x}, ${boxPosition.y}, ${boxPosition.z})`);
                characterModel.position.y = boxPosition.y + boxSize / 2 + characterHeight / 2;
                verticalVelocity = 0;
                isJumping = false;
                if (isRightKeyPressed) {
                    setAction(runAction, 1.5);
                    characterModel.rotation.y = 0;
                } else if (isLeftKeyPressed) {
                    setAction(runAction, 1.3);
                    characterModel.rotation.y = Math.PI;
                } else {
                    setAction(idleAction);
                }
            }

            if (isJumping && verticalVelocity > 0) {
                const characterTop = characterPosition.y + characterHeight / 2;
                const boxBottom = boxPosition.y - boxSize / 2;
                const isHittingBottom = characterTop >= boxBottom - 0.2 && characterTop <= boxBottom + 0.2;
                if (isWithinX && isWithinZ && isHittingBottom) {
                    console.log(`Bottom collision with giftbox ${i} at (${boxPosition.x}, ${boxPosition.y}, ${boxPosition.z})`);
                    characterModel.position.y = boxPosition.y - boxSize / 2 - characterHeight / 2;
                    verticalVelocity = -verticalVelocity * 0.5;

                    if (!giftbox.isOpened) {
                        giftbox.isOpened = true;
                        console.log(`Giftbox ${i} opened! Spawning ${giftbox.itemType}`);
                        const coinSound = new Audio('music/coin1.wav');
                        coinSound.volume = 0.5;
                        coinSound.play();
                        spawnItem(giftbox);

                        gsap.to(giftbox.mesh.position, {
                            y: boxPosition.y + 0.3,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            onUpdate: () => {
                                giftbox.body.position.y = giftbox.mesh.position.y;
                            },
                            onComplete: () => {
                                giftbox.body.position.y = giftbox.initialBodyY;
                                giftbox.mesh.position.y = giftbox.initialBodyY;
                            }
                        });
                    }
                } else if (isWithinX && isWithinZ && characterTop > boxBottom && characterTop < boxPosition.y + boxSize / 2) {
                    console.log(`Preventing penetration in giftbox ${i}`);
                    characterModel.position.y = boxPosition.y - boxSize / 2 - characterHeight / 2;
                    verticalVelocity = -verticalVelocity * 0.5;
                }
            }
        }

        const platformZ = boxPosition.z;
        if (characterZ - platformZ > cleanupDistance) {
            console.log(`Removing giftbox ${i} behind character`);
            scene.remove(giftbox.mesh);
            world.removeBody(giftbox.body);
            giftboxes.splice(i, 1);
        }
    }

    return canMove;
}


function updatePipes(delta, characterZ) {
    const cleanupDistance = 20;
    let canMove = true;

    for (let i = pipeBodies.length - 1; i >= 0; i--) {
        const pipe = pipeBodies[i];
        const pipePosition = pipe.position;
        const pipeWidth = pipe.width;
        const pipeHeight = pipe.height;
        const pipeDepth = pipe.depth;

        if (characterModel) {
            const characterPosition = characterModel.position;

            // Side collision
            const isWithinX = Math.abs(characterPosition.x - pipePosition.x) < (pipeWidth / 2 + characterWidth / 2);
            const isWithinZ = Math.abs(characterPosition.z - pipePosition.z) < (pipeDepth / 2 + characterWidth / 2);
            const isWithinY = Math.abs(characterPosition.y - pipePosition.y) < (pipeHeight / 2 + characterHeight / 2);

            if (isWithinX && isWithinZ && isWithinY) {
                // console.log(`Side collision with pipe at (${pipePosition.x}, ${pipePosition.y}, ${pipePosition.z})`);
                if (isRightKeyPressed) {
                    characterModel.position.z = pipePosition.z - (pipeDepth / 2 + characterWidth / 2);
                    canMove = false;
                } else if (isLeftKeyPressed) {
                    characterModel.position.z = pipePosition.z + (pipeDepth / 2 + characterWidth / 2);
                    canMove = false;
                }
            }
        }

        // Cleanup pipes behind character
        const platformZ = pipePosition.z;
        if (characterZ - platformZ > cleanupDistance) {
            console.log(`Removing pipe ${i} behind character`);
            const arrowIndex = downArrowSprites.findIndex(arrow => Math.abs(arrow.platformZ - platformZ) < 0.01);
            if (arrowIndex !== -1) {
                scene.remove(downArrowSprites[arrowIndex].sprite);
                downArrowSprites.splice(arrowIndex, 1);
            }
            world.removeBody(pipe.body);
            pipeBodies.splice(i, 1);
        }
    }

    return { canMove };
}

function updateItems(delta, characterZ) {
    const cleanupDistance = 20;

    // References to DOM elements for treasure and potion UI
    const treasureDisplay = document.getElementById('treasure-display');
    const potionDisplay = document.getElementById('potion-display');

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];

        // Update item hover animation
        item.mesh.position.y = item.baseY + Math.sin((clock.getElapsedTime() + item.timeOffset) * itemHoverSpeed) * itemHoverAmplitude;

        if (characterModel) {
            const characterPos = characterModel.position;
            const itemPos = item.mesh.position;
            const distance = characterPos.distanceTo(itemPos);

            if (distance < itemCollectDistance) {
                console.log(itemTypes[item.type].message);
                if (item.type === 'health_potion' && playerHealth < 100) {
                    playerHealth = Math.min(playerHealth + 20, 100); // Restore 20% health
                    updateHealthBar();
                    console.log(`Health restored! Health: ${playerHealth}%`);
                } else if (item.type === 'treasure') {
                    // Show treasure UI
                    if (treasureDisplay) {
                        treasureDisplay.style.display = 'flex';
                    }
                    console.log(`Treasure collected! Total: ${itemCounts['treasure']}`);

                    const collectSound = new Audio('music/collect.wav');
                    collectSound.volume = 0.5;
                    collectSound.play();
                } else if (item.type === 'potion') {
                    // Show potion UI
                    if (potionDisplay) {
                        potionDisplay.style.display = 'flex';
                    }
                    console.log(`Potion collected! Total: ${itemCounts['potion']}`);
                    const collectSound = new Audio('music/collect.wav');
                    collectSound.volume = 0.5;
                    collectSound.play();
                }
                scene.remove(item.mesh);
                items.splice(i, 1);
                continue;
            }
        }

        if (characterZ - item.platformZ > cleanupDistance) {
            scene.remove(item.mesh);
            items.splice(i, 1);
        }
    }
}

function createSpikeBorders() {
    gltfLoader.load('models/spikes.glb', (gltf) => {
        const bottomSpikeContainer = new THREE.Group();
        scene.add(bottomSpikeContainer);
        
        const originalSpike = gltf.scene;
        
        const spikeScale = 2;
        
        const tempSpike = originalSpike.clone();
        tempSpike.scale.set(spikeScale, spikeScale, spikeScale);
        
        const spikeBoundingBox = new THREE.Box3().setFromObject(tempSpike);
        const spikeSize = new THREE.Vector3();
        spikeBoundingBox.getSize(spikeSize);
        
        console.log("Spike dimensions:", spikeSize);
        
        const totalSpikes = 15;
        const overlapFactor = 0.57;
        const spikeLength = spikeSize.z;
        const effectiveLength = spikeLength * (1 - overlapFactor);
        
        const bottomSpikeY = -4.7;
        const bottomLeftOffset = -37.6;
        
        console.log(`Creating bottom border with ${totalSpikes} spikes`);
        
        for (let i = 0; i < totalSpikes; i++) {
            const spike = originalSpike.clone();
            spike.scale.set(spikeScale, spikeScale, spikeScale);
            
            const zPos = (i * effectiveLength * spikeScale) - (2 * spikeLength * spikeScale);
            
            spike.position.set(bottomLeftOffset, bottomSpikeY, zPos);
            
            bottomSpikeContainer.add(spike);
        }

        const spikeLight = new THREE.DirectionalLight(0xffffff, 1.0);
        spikeLight.position.set(bottomLeftOffset, bottomSpikeY + 5, 0);
        spikeLight.target = bottomSpikeContainer;
        bottomSpikeContainer.add(spikeLight);

        window.bottomSpikeContainer = bottomSpikeContainer;
        
        console.log("Bottom spike border created successfully with " + totalSpikes + " spikes");
    }, undefined, (error) => {
        console.error('Error loading spikes.glb:', error);
    });
}

createSpikeBorders();

function updateSpikePositions() {
    if (window.bottomSpikeContainer && characterModel) {
        window.bottomSpikeContainer.position.z = characterModel.position.z;
    }
}


function loadBulletModel() {
    gltfLoader.load('models/bullet.glb', (gltf) => {
        bulletModel = gltf.scene;
        bulletModel.scale.set(0.001, 0.001, 0.001);
        bulletModel.rotation.y = -Math.PI / 2;
        console.log("Bullet model loaded successfully");
    }, undefined, (error) => {
        console.error('Error loading bullet.glb:', error);
    });
}

loadBulletModel();

function spawnBullet(characterZ) {
    if (!bulletModel || !characterModel) return;

    const progress = Math.min(characterZ / finalPlatformZ, 1);
    const maxBullets = Math.floor(1 + progress * 2);
    const numBullets = Math.floor(Math.random() * maxBullets) + 1;

    for (let i = 0; i < numBullets; i++) {
        const bullet = bulletModel.clone();
        const spawnZ = characterModel.position.z + spawnDistance;
        const spawnY = -3 + Math.random() * 7.5;
        const xOffset = (Math.random() - 0.5) * 2;
        bullet.position.set(xOffset, spawnY, spawnZ);
        scene.add(bullet);

        const dynamicBulletSpeed = bulletSpeed + progress * 10;
        bullets.push({
            mesh: bullet,
            velocity: new THREE.Vector3(0, 0, -dynamicBulletSpeed)
        });
    }
}


let pipeModel;

function loadPipeModel() {
    gltfLoader.load('models/pipe.glb', (gltf) => {
        pipeModel = gltf.scene;
        pipeModel.scale.set(0.007, 0.007, 0.007); // Initial scale for testing
        pipeModel.rotation.y = Math.PI / 2; // Adjust orientation if needed
        console.log("Pipe model loaded successfully");
    }, undefined, (error) => {
        console.error('Error loading pipe.glb:', error);
    });
}

loadPipeModel();


function restartGame(levelFile) {
    console.log(`Restarting game, redirecting to ${levelFile}`);
    window.location.href = levelFile;
}

let sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};
let aspectRatio = sizes.width / sizes.height;

let characterModel;
let mixer;
let idleAction;
let runAction;
let jumpAction;
let activeAction;
const jumpVelocity = 15;
let verticalVelocity = 0;
let isJumping = false;
let isRightKeyPressed = false;
let isLeftKeyPressed = false;
let runningSpeed = 7;
let backwardSpeed = 5;
const gravity = 25.82;

const fbxLoader = new FBXLoader(loadingManager);

Promise.all([
    new Promise(resolve => fbxLoader.load('models/Idle.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/Running.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/jumping.fbx', resolve))
]).then(([idleObject, runObject, jumpObject]) => {
    characterModel = idleObject;
    characterModel.scale.set(0.02, 0.02, 0.02);
    characterModel.rotation.y = 0;
    scene.add(characterModel);

    mixer = new THREE.AnimationMixer(characterModel);

    const idleClip = idleObject.animations[0];
    if (idleClip) {
        idleAction = mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat);
        idleAction.play();
        activeAction = idleAction;
    }

    const runClip = runObject.animations[0];
    if (runClip) {
        runClip.tracks = runClip.tracks.filter(track => !track.name.includes('.position'));
        runAction = mixer.clipAction(runClip);
        runAction.setLoop(THREE.LoopRepeat);
        runAction.timeScale = 1.2;
    }

    const jumpClip = jumpObject.animations[0];
    if (jumpClip) {
        jumpClip.tracks = jumpClip.tracks.filter(track => !track.name.includes('.position'));
        jumpAction = mixer.clipAction(jumpClip);
        jumpAction.setLoop(THREE.LoopOnce);
        jumpAction.clampWhenFinished = true;
    }

    console.log("Level 2 character and animations loaded successfully");
}).catch(error => {
    console.error('Error loading character animations:', error);
});

let ambientLight = new THREE.AmbientLight('white', 1.5);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight('white', 2);
directionalLight.position.set(3, 2, 10);
scene.add(directionalLight);

let camera = new THREE.PerspectiveCamera(10, aspectRatio, 0.1, 2000);
camera.position.set(-100, 5, 0);
camera.lookAt(new THREE.Vector3(0, 1, 5));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;

window.addEventListener('resize', () => {
    sizes.height = window.innerHeight;
    sizes.width = window.innerWidth;
    renderer.setSize(sizes.width, sizes.height);
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
});

function setAction(toAction, timeScale = 1.2) {
    if (toAction && toAction !== activeAction) {
        activeAction.fadeOut(0.2);
        toAction.reset().fadeIn(0.2).play();
        activeAction = toAction;
    }
    if (toAction) toAction.timeScale = timeScale;
}

function handleKeyDown(event) {
    if ((event.key === 'ArrowUp' || event.key === 'Space') && !isJumping && !isEnteringPipe) {
        const jumpSound = new Audio('music/jump.wav');
        jumpSound.volume = 0.3; // Adjust volume (0.0 to 1.0)
        jumpSound.play();
        isJumping = true;
        verticalVelocity = jumpVelocity;
        setAction(jumpAction, 1.5);
    } else if (event.key === 'ArrowRight' && runAction && idleAction && !isEnteringPipe) {
        isRightKeyPressed = true;
        if (!isJumping) {
            setAction(runAction, 1.5);
            characterModel.rotation.y = 0;
        }
    } else if (event.key === 'ArrowLeft' && runAction && idleAction && !isEnteringPipe) {
        isLeftKeyPressed = true;
        if (!isJumping) {
            setAction(runAction, 1.3);
            characterModel.rotation.y = Math.PI;
        }
    }
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

function handleKeyUp(event) {
    if (event.key === 'ArrowRight') {
        isRightKeyPressed = false;
        if (!isJumping && !isLeftKeyPressed) {
            setAction(idleAction);
        }
    } else if (event.key === 'ArrowLeft') {
        isLeftKeyPressed = false;
        if (!isJumping && !isRightKeyPressed) {
            setAction(idleAction);
            characterModel.rotation.y = 0;
        }
    }
}

function checkPlatformCollisions() {
    if (!characterModel) return { onPlatform: false, platformHeight: 0, onPipe: false, pipePos: null };

    const characterPosition = characterModel.position.clone();
    const characterHeight = 1;
    const characterWidth = 0.5;

    // Check platforms
    for (const platform of platforms) {
        const platformPos = platform.body.position;
        const platformTop = platformPos.y + platform.height / 2;
        const platformWidth = platform.mesh.geometry.parameters.width;
        const platformDepth = platform.mesh.geometry.parameters.depth;

        const isWithinX = Math.abs(characterPosition.x - platformPos.x) < (platformWidth / 2 + characterWidth / 2);
        const isWithinZ = Math.abs(characterPosition.z - platformPos.z) < (platformDepth / 2 + characterWidth / 2);
        const isAbovePlatform = characterPosition.y <= platformTop + characterHeight;
        const isBelowTop = characterPosition.y >= platformTop - characterHeight / 2;

        if (isWithinX && isWithinZ && isAbovePlatform && isBelowTop) {
            return { onPlatform: true, platformHeight: platformTop, onPipe: false, pipePos: null };
        }
    }

    // Check pipes
    for (const pipe of pipeBodies) {
        const pipePos = pipe.body.position;
        const pipeTop = pipePos.y + pipe.height / 2;
        const pipeWidth = pipe.width;
        const pipeDepth = pipe.depth;

        const isWithinX = Math.abs(characterPosition.x - pipePos.x) < (pipeWidth / 2 + characterWidth / 2);
        const isWithinZ = Math.abs(characterPosition.z - pipePos.z) < (pipeDepth / 2 + characterWidth / 2);
        const isAbovePipe = characterPosition.y <= pipeTop + characterHeight;
        const isBelowTop = characterPosition.y >= pipeTop - characterHeight / 2;

        if (isWithinX && isWithinZ && isAbovePipe && isBelowTop) {
            // console.log('On pipe top at:', pipePos);
            return { onPlatform: true, platformHeight: pipeTop, onPipe: true, pipePos: pipePos };
        }
    }

    return { onPlatform: false, platformHeight: 0, onPipe: false, pipePos: null };
}

function updateExplosions(delta) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.time += delta;

        const positions = explosion.system.geometry.attributes.position.array;
        const velocities = explosion.system.geometry.attributes.velocity.array;
        const lifetimes = explosion.system.geometry.attributes.lifetime.array;
        const sizes = explosion.system.geometry.attributes.size.array;

        let activeParticles = 0;
        for (let j = 0; j < lifetimes.length; j++) {
            if (lifetimes[j] > 0) {
                positions[j * 3] += velocities[j * 3] * delta;
                positions[j * 3 + 1] += velocities[j * 3 + 1] * delta;
                positions[j * 3 + 2] += velocities[j * 3 + 2] * delta;

                // Apply gravity (less for smoke)
                const gravityFactor = explosion.system.material.blending === THREE.AdditiveBlending ? 9.82 : 2.0;
                velocities[j * 3 + 1] -= gravityFactor * delta;

                lifetimes[j] -= delta;
                sizes[j] = explosion.system.geometry.attributes.size.array[j] * (lifetimes[j] / (lifetimes[j] + delta));

                activeParticles++;
            }
        }

        explosion.system.geometry.attributes.position.needsUpdate = true;
        explosion.system.geometry.attributes.lifetime.needsUpdate = true;
        explosion.system.geometry.attributes.size.needsUpdate = true;

        if (explosion.time > explosion.maxLifetime || activeParticles === 0) {
            scene.remove(explosion.system);
            explosion.system.geometry.dispose();
            explosion.system.material.dispose();
            explosions.splice(i, 1);
        }
    }
}



function shakeCamera(delta) {
    if (!isShaking) {
        // No shake active; set camera to base position
        camera.position.copy(baseCameraPosition);
        return;
    }

    if (shakeTime < shakeDuration) {
        // Apply shake effect
        const t = shakeTime / shakeDuration;
        const amplitude = shakeIntensity * (1 - t); // Decrease amplitude over time
        const offsetX = amplitude * Math.sin(20 * shakeTime) * (Math.random() - 0.5);
        const offsetY = amplitude * Math.cos(20 * shakeTime) * (Math.random() - 0.5);
        const offsetZ = amplitude * Math.sin(20 * shakeTime) * (Math.random() - 0.5);

        camera.position.set(
            baseCameraPosition.x + offsetX,
            baseCameraPosition.y + offsetY,
            baseCameraPosition.z + offsetZ
        );

        shakeTime += delta;
    } else {
        // End shake
        isShaking = false;
        shakeTime = 0;
        camera.position.copy(baseCameraPosition);
    }
}


let clock = new THREE.Clock();
function animation() {
    if (isGameOver) return;
    const delta = clock.getDelta();
    world.step(1 / 60, delta);

    if (mixer) {
        mixer.update(delta);
    }

    if (characterModel) {
        const { onPlatform, platformHeight, onPipe, pipePos } = checkPlatformCollisions();
        const baseY = onPlatform ? platformHeight : -10;

        // Handle pipe standing logic
        if (onPipe && !isEnteringPipe && !pipeEntryTriggered) {
            if (!isOnPipe || (lastPipePos && !lastPipePos.almostEquals(pipePos, 0.001))) {
                // Reset timer if just landed on pipe or moved to a new pipe
                timeOnPipe = 0;
                isOnPipe = true;
                lastPipePos = pipePos.clone();
            }
            timeOnPipe += delta;
            console.log(`Time on pipe: ${timeOnPipe.toFixed(2)} seconds`);
        
            if (timeOnPipe >= 1.0) {
                // Check potion collection
                if (itemCounts['potion'] === 0) {
                    console.log("Potion not collected! Showing game over screen.");
                    showPotionNotCollectedGameOver();
                } else {
                    // Trigger pipe entry for Level 3
                    isEnteringPipe = true;
                    pipeEntryTriggered = true;
                    setAction(idleAction);
                    console.log('Automatically entering pipe at:', pipePos);
                    const finishSound = new Audio('music/finish.wav');
                    finishSound.volume = 0.5;
                    finishSound.play();
                    if (typeof gsap !== 'undefined') {
                        gsap.to(characterModel.position, {
                            y: pipePos.y - 0.25 - characterHeight / 2,
                            duration: 1.0,
                            ease: 'power2.in',
                            onComplete: () => {
                                console.log('Pipe entry complete! Level 2 completed!');
                                isEnteringPipe = false;
                                pipeEntryTriggered = false;
                                timeOnPipe = 0;
                                isOnPipe = false;
        
                                // Stop game and show loading screen
                                isGameOver = true;
                                setAction(idleAction);

                                
                                document.querySelector('.loader-background').style.display = 'block';
                                document.querySelector('.loader').style.display = 'block';
                                const style = document.createElement('style');
                                style.id = 'level3-loader-style';
                                style.textContent = `.loader::before { content: "Level 2 Complete!"; }`;
                                document.head.appendChild(style);
                                setTimeout(() => {
                                    document.querySelector('.loader-background').style.display = 'none';
                                    document.querySelector('.loader').style.display = 'none';
                                    document.head.removeChild(style);
                                    window.location.href = 'level3.html';
                                }, 1000);
                            }
                        });
                    } else {
                        console.error('GSAP not loaded; cannot animate pipe entry');
                        isEnteringPipe = false;
                        pipeEntryTriggered = false;
                        timeOnPipe = 0;
                        isOnPipe = false;
                    }
                }
            }
        } else if (!onPipe) {
            // Reset pipe timer and flags if not on pipe
            timeOnPipe = 0;
            isOnPipe = false;
            pipeEntryTriggered = false;
            lastPipePos = null;
        }

        if (!isEnteringPipe) {
            const canMoveGiftboxes = updateGiftboxes(delta, characterModel.position.z);
            const { canMove: canMovePipes } = updatePipes(delta, characterModel.position.z);
            const canMove = canMoveGiftboxes && canMovePipes;
        
            if (isRightKeyPressed && canMove) {
                characterModel.position.z += runningSpeed * delta;
            } else if (isLeftKeyPressed && canMove && characterModel.position.z > 0) {
                characterModel.position.z -= backwardSpeed * delta;
            }
        
            // Apply gravity and update vertical position
            if (isJumping || characterModel.position.y > baseY + 0.01) {
                verticalVelocity -= gravity * delta;
                characterModel.position.y += verticalVelocity * delta;
            }
        
            // Check for fall (before clamping to baseY)
            if (characterModel.position.y < -5) { // Threshold above spikes (-4.7)
                // console.log("Character fell off! All lives lost!");
                playerHealth = 0;
                updateHealthBar();
                // Reset collectibles UI
                const treasureDisplay = document.getElementById('treasure-display');
                const potionDisplay = document.getElementById('potion-display');
                if (treasureDisplay) treasureDisplay.style.display = 'none';
                if (potionDisplay) potionDisplay.style.display = 'none';
                itemCounts['treasure'] = 0;
                itemCounts['potion'] = 0;
                characterModel.position.y = baseY; // Snap back to prevent further falling
                verticalVelocity = 0;
                isJumping = false;
                setAction(idleAction);
            } else if (characterModel.position.y <= baseY) {
                // Land on platform or ground
                characterModel.position.y = baseY;
                verticalVelocity = 0;
                isJumping = false;
                if (isRightKeyPressed) {
                    setAction(runAction, 1.5);
                    characterModel.rotation.y = 0;
                } else if (isLeftKeyPressed) {
                    setAction(runAction, 1.3);
                    characterModel.rotation.y = Math.PI;
                } else {
                    setAction(idleAction);
                }
            }
        }

        // Update base camera position
        baseCameraPosition.set(
            characterModel.position.x - 100,
            1,
            characterModel.position.z
        );

        // Apply camera shake
        shakeCamera(delta);

        // Update camera lookAt
        camera.lookAt(new THREE.Vector3(characterModel.position.x, 1, characterModel.position.z + 5));

        const cleanupDistance = 20;
        const characterZ = characterModel.position.z;

        for (let i = platforms.length - 1; i >= 0; i--) {
            const platform = platforms[i];
            const platformZ = platform.body.position.z;

            if (characterZ - platformZ > cleanupDistance) {
                scene.remove(platform.mesh);
                platform.mesh.geometry.dispose();
                platform.mesh.material.dispose();
                world.removeBody(platform.body);
                platforms.splice(i, 1);
            }
        }

        const currentTime = clock.getElapsedTime();
        const progress = Math.min(characterZ / finalPlatformZ, 1);
        const dynamicMinSpawnInterval = minSpawnInterval * (1 - progress * 0.7);
        const dynamicMaxSpawnInterval = maxSpawnInterval * (1 - progress * 0.7);
        if (currentTime > nextSpawnTime && characterZ < finalPlatformZ - 10 && !isEnteringPipe) {
            spawnBullet(characterZ);
            lastSpawnTime = currentTime;
            nextSpawnTime = currentTime + dynamicMinSpawnInterval + Math.random() * (dynamicMaxSpawnInterval - dynamicMinSpawnInterval);
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.mesh.position.addScaledVector(bullet.velocity, delta);

            const characterBox = new THREE.Box3().setFromCenterAndSize(
                characterModel.position,
                new THREE.Vector3(0.5, 1, 0.5)
            );
            const bulletBox = new THREE.Box3().setFromObject(bullet.mesh);

            if (characterBox.intersectsBox(bulletBox)) {
                console.log("Character hit by bullet!");
                createExplosion(bullet.mesh.position.clone());
                isShaking = true;
                shakeTime = 0;
                playerHealth = Math.max(playerHealth - 10, 0); // Lose 20% health
                const bulletSound = new Audio('music/bullet.wav');
                bulletSound.volume = 1.0;
                bulletSound.play();
                updateHealthBar();
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
                if (playerHealth <= 0) {
                    console.log("Game Over! All health lost!");
                    const treasureDisplay = document.getElementById('treasure-display');
                    const potionDisplay = document.getElementById('potion-display');
                    if (treasureDisplay) treasureDisplay.style.display = 'none';
                    if (potionDisplay) potionDisplay.style.display = 'none';
                    itemCounts['treasure'] = 0;
                    itemCounts['potion'] = 0;
                }
                continue;
            }

            if (bullet.mesh.position.z < characterZ - cleanupDistance) {
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
            }
        }

        updateMonsters(delta, characterZ);
        updateDiamonds(delta, characterZ);
        updateItems(delta, characterZ);
    }


    downArrowSprites.forEach(arrow => {
        arrow.sprite.position.y = arrow.baseY + Math.sin((clock.getElapsedTime() + arrow.timeOffset) * 2) * 0.5; // Hover with speed 2, amplitude 0.5
    });

    updateSpikePositions();
    updateExplosions(delta);
    renderer.render(scene, camera);
    requestAnimationFrame(animation);
}

loadMonsterModel();
