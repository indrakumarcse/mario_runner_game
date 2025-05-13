import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};
let aspectRatio = sizes.width / sizes.height;
const canvas = document.querySelector('canvas.webgl');
canvas.style.display = 'none';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
let introMusic = null;



const ruleScreen = document.getElementById('rule-screen');
const ruleImage = document.getElementById('rule-image');
const ruleImages = ['images/level1-1.png', 'images/level1-2.png', 'images/level1-3.png'];
let currentRuleIndex = 0;

function showRuleScreen() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
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
            introMusic = new Audio('music/intro.mp3');
            introMusic.loop = true;
            introMusic.volume = 0.3;
            introMusic.play();
            startGame();
        }
    }
}



// Fullscreen button functionality
const fullscreenButton = document.getElementById('fullscreen-button');
fullscreenButton.style.top = '75px'; // Set your desired top value
fullscreenButton.style.right = '1325px';

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
        :fullscreen #score-display,
        :fullscreen #top-right-container,
        :fullscreen #lives-display {
            display: flex !important;
            visibility: visible !important;
        }

        :-webkit-full-screen #score-display,
        :-webkit-full-screen #top-right-container,
        :-webkit-full-screen #lives-display {
            display: flex !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(styleElement);
}



// document.getElementById('diamond-display')?.style.setProperty('display', 'none');
// document.getElementById('health-bar-container').style.display = 'none';
// document.querySelector('.monster-health-bar-container').style.display = 'none';

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// Green grass plane
let planeGeometry = new THREE.PlaneGeometry(40, 20000);
let planeMaterial = new THREE.MeshPhysicalMaterial({ 
    color: 0x00FF00,
    side: THREE.DoubleSide 
});
let planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.rotation.x = Math.PI / 2;
planeMesh.position.y = -0.2; // Explicitly set to y = 0 for clarity
scene.add(planeMesh);

// Brown soil plane
let soilGeometry = new THREE.PlaneGeometry(165, 20000); // Same dimensions
let soilMaterial = new THREE.MeshPhysicalMaterial({ 
    color: 0x8B4513, // Brown color
    side: THREE.DoubleSide 
});
let soilMesh = new THREE.Mesh(soilGeometry, soilMaterial);
soilMesh.rotation.x = Math.PI / 2;
soilMesh.position.y = -1.2; // Slightly below green plane to avoid z-fighting
scene.add(soilMesh);

// Physics body for ground (shared for both planes)
const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane()
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
groundBody.position.y = 0; // Align with green plane for collisions
world.addBody(groundBody);

let characterModel;
let mixer;
let idleAction;
let runAction;
let jumpAction;
let activeAction;
const startPosition = new THREE.Vector3(0, 0.1, 0);
const jumpVelocity = 17;
let originalRunningSpeed = 7;    // Original forward speed
let originalBackwardSpeed = 5;   // Original backward speed
let runningSpeed = originalRunningSpeed;    // Current forward speed
let backwardSpeed = originalBackwardSpeed;  // Current backward speed
const gravity = 25.82;
let verticalVelocity = 0;
let isJumping = false;
let isRightKeyPressed = false;
let isLeftKeyPressed = false;
let isUpKeyPressed = false;
let isRunningForward = false;
let isRunningBackward = false;
let maxZReached = startPosition.z;
let speedStage = 1; // 1: Normal, 2: Medium, 3: Fast
let speedStageDistance; // Speed increases after half the distance
let originalGoombaSpeed = 2;
let originalMonsterSpeed = 2;
let speedStageDistance1; // At maxWorldZ / 6 (~200)
let speedStageDistance2; // At maxWorldZ / 3 (~400)
let speedStageDistance3; // At maxWorldZ / 2 (~600)
let lastSpeedStage = 0;
let isSlowed = false; // Tracks if the slow effect is active
let slowEndTime = 0;  // Time (in seconds) when the slow effect should end

let originalBrickGoombaSpeed = 2;
let brickGoombaSpeed = originalBrickGoombaSpeed;

const monsters = [];
let monsterModel;
let monsterSpeed = originalMonsterSpeed;; // Same speed as Goombas for consistency
const monsterSpawnDistance = 15; // Distance between monster spawns
let lastMonsterZ = 0; // Track the last spawned monster's Z position
const maxMonsters = 20; // Maximum number of monsters in the scene

const swordProjectiles = [];

let isPoweredUp = false; // Add this near your other global variables (e.g., after `let lives = 3;`)

const hearts = [];
let heartModel;

const clouds = [];
let cloudModel;
const cloudSpawnDistance = 20;
let lastCloudZ = 0;

const coins = [];
let coinCount = 0;
const coinDistance = 3;
let coinModel;

const bricks = [];
let brickModel;

const giftBoxes = [];
let giftBoxModel;
const mushrooms = [];
let mushroomModel;

const pipes = [];
let pipeModel;
const pipeSpawnDistance = 30;
let lastPipeZ = 0;

const plants = [];
let plantModel;

let lives = 3;
let isInvulnerable = false;
const invulnerabilityDuration = 2;

const swords = [];
let swordModel;
let hasSwordSkill = false;
let swordThrowsRemaining = 0; // Add this near other global variables like `let lives = 3;`

const goombas = [];
let goombaModel;
let goombaSpeed = originalGoombaSpeed; // Speed at which Goombas move toward the character
const goombaSpawnDistance = 10; // Distance between Goomba spawns
let maxGoombas = 20;
let lastGoombaZ = 0; // Track the last spawned Goomba's Z position

let maxWorldZ = 0;
let castleModel;
let totalScore = 0; // Total score for defeating enemies
let isGameOver = false;

let chainModel;
let chains = [];
let chainSpawnTimeout = null; // To manage single chain spawning


// Display Game Over screen with final score and coins
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
    const finalScoreElement = document.getElementById('final-score');
    const finalCoinsElement = document.getElementById('final-coins');

    // Update score and coins
    finalScoreElement.textContent = `Score: ${totalScore}`;
    finalCoinsElement.textContent = `Coins: ${coinCount}`;

    // Show Game Over screen
    gameOverScreen.style.display = 'flex';

    // Pause game
    isGameOver = true;
    isRunningForward = false;
    isRunningBackward = false;
    isJumping = false;
    verticalVelocity = 0;
    setAction(idleAction);

    // Stop animations for all objects
    goombas.forEach(goomba => {
        if (!goomba.defeated) {
            gsap.killTweensOf(goomba.mesh.position);
            gsap.killTweensOf(goomba.mesh.scale);
        }
    });
    monsters.forEach(monster => {
        gsap.killTweensOf(monster.mesh.position);
        gsap.killTweensOf(monster.mesh.scale);
    });
    plants.forEach(plant => {
        gsap.killTweensOf(plant.mesh.position);
    });
    coins.forEach(coin => {
        if (!coin.collected) {
            gsap.killTweensOf(coin.mesh.rotation);
        }
    });
    giftBoxes.forEach(box => {
        if (box.hasMushroom || box.hasHeart || box.hasSword) {
            gsap.killTweensOf(box.mesh.rotation);
        }
    });
    mushrooms.forEach(mushroom => {
        if (!mushroom.collected) {
            gsap.killTweensOf(mushroom.mesh.position);
        }
    });
    hearts.forEach(heart => {
        if (!heart.collected) {
            gsap.killTweensOf(heart.mesh.position);
        }
    });
    swords.forEach(sword => {
        if (!sword.collected) {
            gsap.killTweensOf(sword.mesh.position);
            gsap.killTweensOf(sword.mesh.rotation);
        }
    });
    swordProjectiles.forEach(projectile => {
        if (projectile.active) {
            gsap.killTweensOf(projectile.mesh.position);
        }
    });
    chains.forEach(chain => {
        gsap.killTweensOf(chain.mesh.position);
    });

    // Disable keyboard inputs
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}

// New function to display Game Over screen for low score/coins at castle
function showLowScoreGameOver() {

    if (introMusic) {
    introMusic.pause();
    introMusic.currentTime = 0; // Reset to start
    }


    const gameOverSound = new Audio('music/gameover.wav');
    gameOverSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
    gameOverSound.play();
    
    console.log("Showing Low Score Game Over screen");
    const lowScoreGameOverScreen = document.getElementById('low-score-game-over-screen');
    const lowScoreMessageElement = document.getElementById('low-score-message');
    const finalScoreElement = document.getElementById('low-score-final-score');
    const finalCoinsElement = document.getElementById('low-score-final-coins');

    // Update message, score, and coins
    lowScoreMessageElement.textContent = 'Low score and coins';
    finalScoreElement.textContent = `Score: ${totalScore}`;
    finalCoinsElement.textContent = `Coins: ${coinCount}`;

    // Show Low Score Game Over screen
    lowScoreGameOverScreen.style.display = 'flex';

    // Pause game
    isGameOver = true;
    isRunningForward = false;
    isRunningBackward = false;
    isJumping = false;
    verticalVelocity = 0;
    setAction(idleAction);

    // Stop animations for all objects
    goombas.forEach(goomba => {
        if (!goomba.defeated) {
            gsap.killTweensOf(goomba.mesh.position);
            gsap.killTweensOf(goomba.mesh.scale);
        }
    });
    monsters.forEach(monster => {
        gsap.killTweensOf(monster.mesh.position);
        gsap.killTweensOf(monster.mesh.scale);
    });
    plants.forEach(plant => {
        gsap.killTweensOf(plant.mesh.position);
    });
    coins.forEach(coin => {
        if (!coin.collected) {
            gsap.killTweensOf(coin.mesh.rotation);
        }
    });
    giftBoxes.forEach(box => {
        if (box.hasMushroom || box.hasHeart || box.hasSword) {
            gsap.killTweensOf(box.mesh.rotation);
        }
    });
    mushrooms.forEach(mushroom => {
        if (!mushroom.collected) {
            gsap.killTweensOf(mushroom.mesh.position);
        }
    });
    hearts.forEach(heart => {
        if (!heart.collected) {
            gsap.killTweensOf(heart.mesh.position);
        }
    });
    swords.forEach(sword => {
        if (!sword.collected) {
            gsap.killTweensOf(sword.mesh.position);
            gsap.killTweensOf(sword.mesh.rotation);
        }
    });
    swordProjectiles.forEach(projectile => {
        if (projectile.active) {
            gsap.killTweensOf(projectile.mesh.position);
        }
    });
    chains.forEach(chain => {
        gsap.killTweensOf(chain.mesh.position);
    });

    // Disable keyboard inputs
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}

// Restart the game by reloading the page
function restartGame() {
    console.log("Restarting game...");
    window.location.reload();
}

const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => {
    document.querySelector('.loader').style.display = 'block';
    document.querySelector('.loader-background').style.display = 'block';
};
loadingManager.onLoad = () => {
    document.querySelector('.loader').style.display = 'none';
    document.querySelector('.loader-background').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
};

const gltfLoader = new GLTFLoader(loadingManager);
const fbxLoader = new FBXLoader(loadingManager);

function createScoreDisplay() {
    const scoreElement = document.getElementById('score-display');
    scoreElement.innerHTML = 'Coins: 0';
    const totalScoreElement = document.getElementById('total-score-display');
    totalScoreElement.innerHTML = `Score: ${totalScore}`;
}

function showScorePopup(x, y, z, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.innerHTML = `+${points}`;
    document.getElementById('score-popups').appendChild(popup);

    const vector = new THREE.Vector3(x, y + 1.5, z);
    vector.project(camera);
    const x2d = (vector.x * 0.5 + 0.5) * window.innerWidth;
    let y2d = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    y2d = Math.max(20, Math.min(y2d, window.innerHeight - 20));

    popup.style.left = `${x2d}px`;
    popup.style.top = `${y2d}px`;

    gsap.to(popup, {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
            popup.remove();
        }
    });

    totalScore += points;
    document.getElementById('total-score-display').innerHTML = `Score: ${totalScore}`;
}

function createLivesDisplay() {
    const livesContainer = document.getElementById('lives-display');
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const heartImg = document.createElement('img');
        heartImg.src = 'images/heart.png';
        heartImg.className = 'heart-icon';
        livesContainer.appendChild(heartImg);
    }
}

function playDefeatAnimation() {
    if (!characterModel || !mixer) return;

    // Stop any current animation to ensure clean transition
    if (activeAction) {
        activeAction.stop();
    }

    // Custom defeat animation using GSAP
    const defeatTimeline = gsap.timeline({
        onComplete: () => {
            // Reset to idle after defeat animation if lives remain
            if (lives > 0) {
                setAction(idleAction, 1.2);
                characterModel.scale.set(0.02, 0.02, 0.02); // Reset scale
            }
        }
    });

    // Scale to 0, wait 2 seconds, then scale back to original size
    defeatTimeline
        .to(characterModel.scale, {
            x: 0, // Scale down to 0
            y: 0,
            z: 0,
            duration: 0.3,
            ease: "power2.in"
        })
        .to(characterModel.scale, {
            x: 0, // Hold at 0 scale (no change)
            y: 0,
            z: 0,
            duration: 0.4, // 2-second gap
            ease: "none" // No easing, just a delay
        })
        .to(characterModel.scale, {
            x: 0.02, // Return to original size
            y: 0.02,
            z: 0.02,
            duration: 0.3,
            ease: "bounce.out"
        });

    // Optional: Add a slight bounce at the end
    defeatTimeline.to(characterModel.position, {
        y: characterModel.position.y + 0.5,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut"
    });
}

// Modify the existing loseLife function
function loseLife() {

    if (lives > 1) { // Play sound only if not losing the last life
        const lifeLostSound = new Audio('music/lifelost.wav');
        lifeLostSound.volume = 0.3; // Adjust volume (0.0 to 1.0)
        lifeLostSound.play();
    }

    if (isInvulnerable || lives <= 0) return;

    lives--;
    isInvulnerable = true;
    updateCharacterOpacity(0.5);

    // Play defeat animation only if lives remain after this loss
    if (lives > 0) {
        playDefeatAnimation();
    }

    const fadeDuration = 0.5;
    gsap.to(characterModel, {
        duration: fadeDuration,
        onUpdate: function() {
            const progress = this.progress();
            updateCharacterOpacity(0.5 - 0.5 * progress);
        },
        onComplete: () => {
            gsap.to(characterModel, {
                duration: fadeDuration,
                onUpdate: function() {
                    const progress = this.progress();
                    updateCharacterOpacity(progress * 0.5);
                },
                onComplete: () => {
                    updateCharacterOpacity(1);
                    setTimeout(() => {
                        isInvulnerable = false;
                    }, (invulnerabilityDuration - fadeDuration * 2) * 1000);
                }
            });
        }
    });

    createLivesDisplay();

    // Check for Game Over
    if (lives === 0) {
        console.log("Game Over: No lives remaining");
        showGameOver();
    }
}

function updateCharacterOpacity(opacity) {
    characterModel.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.opacity = opacity;
                    mat.transparent = true;
                });
            } else {
                child.material.opacity = opacity;
                child.material.transparent = true;
            }
        }
    });
}

function createCoins() {
    return new Promise((resolve) => {
        const totalCoins = 267; // Reduced from 400 to achieve maxWorldZ ≈ 800
        const startZ = 10;
        const coinsOnBricksPercentage = 0.7;

        gltfLoader.load(
            'models/coin.glb',
            (gltf) => {
                coinModel = gltf.scene;
                coinModel.scale.set(0.7, 0.7, 0.7);

                const brickPositions = bricks.map(b => ({
                    x: b.position.x,
                    y: b.position.y,
                    z: b.position.z
                }));
                const maxBrickZ = brickPositions.length > 0 
                    ? Math.max(...brickPositions.map(b => b.z)) 
                    : startZ + (totalCoins - 1) * coinDistance;
                const groundEndZ = startZ + (totalCoins - 1) * coinDistance;
                maxWorldZ = Math.max(groundEndZ, maxBrickZ); // Will be ≈ 800

                const coinsOnBricks = Math.floor(totalCoins * coinsOnBricksPercentage);
                const coinsOnGround = totalCoins - coinsOnBricks;

                let placedOnBricks = 0;
                const usedBrickIndices = new Set();
                
                while (placedOnBricks < coinsOnBricks && brickPositions.length > 0) {
                    const brickIndex = Math.floor(Math.random() * brickPositions.length);
                    if (!usedBrickIndices.has(brickIndex)) {
                        const brick = brickPositions[brickIndex];
                        const coin = coinModel.clone();
                        const yPos = brick.y + 1;
                        coin.position.set(brick.x, yPos, brick.z);
                        scene.add(coin);
                        coins.push({
                            mesh: coin,
                            collected: false,
                            position: new THREE.Vector3(brick.x, yPos, brick.z)
                        });
                        usedBrickIndices.add(brickIndex);
                        placedOnBricks++;
                    }
                    
                    if (usedBrickIndices.size === brickPositions.length && placedOnBricks < coinsOnBricks) {
                        const brick = brickPositions[Math.floor(Math.random() * brickPositions.length)];
                        const coin = coinModel.clone();
                        const yPos = brick.y + 1 + (Math.random() * 0.5);
                        coin.position.set(brick.x, yPos, brick.z);
                        scene.add(coin);
                        coins.push({
                            mesh: coin,
                            collected: false,
                            position: new THREE.Vector3(brick.x, yPos, brick.z)
                        });
                        placedOnBricks++;
                    }
                }

                const groundZStep = (maxWorldZ - startZ) / (coinsOnGround > 0 ? coinsOnGround - 1 : 1);
                for (let i = 0; i < coinsOnGround; i++) {
                    const zPos = startZ + i * groundZStep;
                    const coin = coinModel.clone();
                    let yPos = 1;
                    const nearbyBricks = brickPositions.filter(b => Math.abs(b.z - zPos) < 1);
                    if (nearbyBricks.length === 0) {
                        if (i % 5 === 0 && i !== 0) {
                            yPos = 2.5;
                        }
                        coin.position.set(0, yPos, zPos);
                        scene.add(coin);
                        coins.push({
                            mesh: coin,
                            collected: false,
                            position: new THREE.Vector3(0, yPos, zPos)
                        });
                    }
                }

                console.log(`Coins created, maxWorldZ set to: ${maxWorldZ}`);
                resolve();
            },
            undefined,
            (error) => {
                console.error('Error loading coin.glb:', error);
                resolve();
            }
        );
    });
}

function createGiftBoxes() {
    return new Promise((resolve) => {
        gltfLoader.load(
            'models/giftbox.glb',
            (gltf) => {
                giftBoxModel = gltf.scene;
                giftBoxModel.scale.set(0.4, 0.4, 0.4);
                giftBoxModel.rotation.y = Math.PI;

                Promise.all([
                    gltfLoader.loadAsync('models/mushroom.glb'),
                    gltfLoader.loadAsync('models/heart3.glb'),
                    gltfLoader.loadAsync('models/sword2.glb')
                ]).then(([mushroomGltf, heartGltf, swordGltf]) => {
                    mushroomModel = mushroomGltf.scene;
                    mushroomModel.scale.set(1, 1, 1);
                    
                    heartModel = heartGltf.scene;
                    heartModel.scale.set(0.003, 0.003, 0.003);

                    swordModel = swordGltf.scene;
                    swordModel.scale.set(0.4, 0.4, 0.4);

                    const brickStartZ = 15;
                    const platformSpacing = 10;
                    const totalPlatforms = 60;
                    const giftBoxCount = 14;
                    const giftBoxHeight = 4.5;
                    const brickWidth = 0.57 * 5;
                    const minGap = brickWidth + 2;
                    const pipeWidth = 2;

                    const brickZPositions = [];
                    for (let i = 0; i < totalPlatforms; i++) {
                        const zPosition = brickStartZ + i * platformSpacing;
                        brickZPositions.push(zPosition);
                    }

                    const pipeZPositions = pipes.map(pipe => pipe.position.z);

                    let placedGiftBoxes = 0;
                    let swordsPlaced = 0;
                    let attempts = 0;
                    const maxAttempts = 100;

                    while (placedGiftBoxes < giftBoxCount && attempts < maxAttempts) {
                        const gapIndex = Math.floor(Math.random() * (brickZPositions.length - 1));
                        const zPos = (brickZPositions[gapIndex] + brickZPositions[gapIndex + 1]) / 2;

                        const isTooCloseToBrick = brickZPositions.some(z => Math.abs(z - zPos) < minGap / 2);
                        const isTooCloseToPipe = pipeZPositions.some(z => Math.abs(z - zPos) < pipeWidth / 2 + 1);
                        const isOverlappingExisting = giftBoxes.some(box => Math.abs(box.position.z - zPos) < minGap);

                        if (!isTooCloseToBrick && !isTooCloseToPipe && !isOverlappingExisting) {
                            const giftBox = giftBoxModel.clone();
                            giftBox.position.set(0, giftBoxHeight, zPos);
                            scene.add(giftBox);

                            const giftBoxBody = new CANNON.Body({
                                mass: 0,
                                shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
                            });
                            giftBoxBody.position.set(0, giftBoxHeight + 0.5, zPos);
                            world.addBody(giftBoxBody);

                            let hasMushroom, hasHeart, hasSword;
                            if (swordsPlaced < 2) {
                                hasSword = true;
                                hasMushroom = false;
                                hasHeart = false;
                                swordsPlaced++;
                            } else {
                                hasSword = false;
                                hasMushroom = Math.random() < 0.5;
                                hasHeart = !hasMushroom;
                            }

                            giftBoxes.push({
                                mesh: giftBox,
                                body: giftBoxBody,
                                position: new THREE.Vector3(0, giftBoxHeight, zPos),
                                hasMushroom: hasMushroom,
                                hasHeart: hasHeart,
                                hasSword: hasSword,
                                hit: false // Add this
                            });

                            placedGiftBoxes++;
                        }
                        attempts++;
                    }

                    resolve();
                });
            }
        );
    });
}

function updateSwordCountDisplay() {
    const swordCountElement = document.getElementById('sword-count');
    swordCountElement.innerHTML = `${swordThrowsRemaining}`;
    const swordIcon = document.getElementById('sword-icon');
    if (swordThrowsRemaining <= 0) {
        swordIcon.style.display = 'none';
        swordCountElement.style.display = 'none';
        hasSwordSkill = false;
    } else {
        swordIcon.style.display = 'block';
        swordCountElement.style.display = 'block';
    }
}

function spawnSword(box) {
    if (!swordModel || !box.hasSword) return;

    const sword = swordModel.clone();
    const spawnHeight = box.position.y + 1;
    const initialHeight = box.position.y;

    sword.position.set(box.position.x, initialHeight, box.position.z);
    scene.add(sword);

    const swordBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
    });
    swordBody.position.set(box.position.x, initialHeight, box.position.z);
    world.addBody(swordBody);

    const swordObj = {
        mesh: sword,
        body: swordBody,
        collected: false,
        position: new THREE.Vector3(box.position.x, spawnHeight, box.position.z)
    };
    swords.push(swordObj);

    box.hasSword = false;

    gsap.to(box.mesh.position, {
        y: box.position.y + 0.3,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
            gsap.to(sword.position, {
                y: spawnHeight,
                duration: 0.3,
                ease: "power2.out",
                onUpdate: () => {
                    swordBody.position.y = sword.position.y;
                },
                onComplete: () => {
                    gsap.to(sword.position, {
                        y: spawnHeight + 0.5,
                        duration: 1,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                        onUpdate: () => {
                            swordBody.position.y = sword.position.y;
                        }
                    });
                }
            });
        }
    });
}

function spawnHeart(box) {
    if (!heartModel || !box.hasHeart) return;

    const heart = heartModel.clone();
    const spawnHeight = box.position.y + 1;
    const initialHeight = box.position.y;

    heart.position.set(box.position.x, initialHeight, box.position.z);
    scene.add(heart);

    const heartBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
    });
    heartBody.position.set(box.position.x, initialHeight, box.position.z);
    world.addBody(heartBody);

    const heartObj = {
        mesh: heart,
        body: heartBody,
        collected: false,
        position: new THREE.Vector3(box.position.x, spawnHeight, box.position.z)
    };
    hearts.push(heartObj);

    box.hasHeart = false;

    gsap.to(box.mesh.position, {
        y: box.position.y + 0.3,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
            gsap.to(heart.position, {
                y: spawnHeight,
                duration: 0.3,
                ease: "power2.out",
                onUpdate: () => {
                    heartBody.position.y = heart.position.y;
                },
                onComplete: () => {
                    gsap.to(heart.position, {
                        y: spawnHeight + 0.5,
                        duration: 1,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                        onUpdate: () => {
                            heartBody.position.y = heart.position.y;
                        }
                    });
                }
            });
        }
    });
}

function spawnMushroom(box) {
    if (!mushroomModel || !box.hasMushroom) return;

    const mushroom = mushroomModel.clone();
    const spawnHeight = box.position.y + 1;
    const initialHeight = box.position.y;

    mushroom.position.set(box.position.x, initialHeight, box.position.z);
    scene.add(mushroom);

    const mushroomBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
    });
    mushroomBody.position.set(box.position.x, initialHeight, box.position.z);
    world.addBody(mushroomBody);

    const mushroomObj = {
        mesh: mushroom,
        body: mushroomBody,
        collected: false,
        position: new THREE.Vector3(box.position.x, spawnHeight, box.position.z)
    };
    mushrooms.push(mushroomObj);

    box.hasMushroom = false;

    gsap.to(box.mesh.position, {
        y: box.position.y + 0.3,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
            gsap.to(mushroom.position, {
                y: spawnHeight,
                duration: 0.3,
                ease: "power2.out",
                onUpdate: () => {
                    mushroomBody.position.y = mushroom.position.y;
                },
                onComplete: () => {
                    gsap.to(mushroom.position, {
                        y: spawnHeight + 0.5,
                        duration: 1,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                        onUpdate: () => {
                            mushroomBody.position.y = mushroom.position.y;
                        }
                    });
                }
            });
        }
    });
}

function spawnSwordProjectile() {
    if (!hasSwordSkill || !swordModel || !characterModel || swordThrowsRemaining <= 0) return;

    const sword = swordModel.clone();
    const spawnPosition = characterModel.position.clone();
    spawnPosition.y += 0.5;
    sword.position.copy(spawnPosition);
    sword.rotation.y = Math.PI / 2;
    sword.rotation.x = Math.PI / 2;
    scene.add(sword);

    const swordBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
    });
    swordBody.position.copy(spawnPosition);
    world.addBody(swordBody);

    const projectileSpeed = 20;
    const travelDistance = 30;
    const direction = new THREE.Vector3(0, 0, characterModel.rotation.y === 0 ? 1 : -1); // Forward or backward
    const targetZ = spawnPosition.z + direction.z * travelDistance;

    const swordProjectile = {
        mesh: sword,
        body: swordBody,
        position: spawnPosition.clone(),
        targetZ: targetZ,
        speed: projectileSpeed,
        active: true
    };
    swordProjectiles.push(swordProjectile);

    gsap.to(sword.position, {
        z: targetZ,
        duration: travelDistance / projectileSpeed,
        ease: "linear",
        onUpdate: () => {
            swordBody.position.z = sword.position.z;
        },
        onComplete: () => {
            swordProjectile.active = false;
            console.log("Sword projectile reached target, marked inactive");
        }
    });

    swordThrowsRemaining--;
    updateSwordCountDisplay();
}

function createBricks() {
    return new Promise((resolve) => {
        gltfLoader.load(
            'models/brick.glb',
            (gltf) => {
                brickModel = gltf.scene;
                brickModel.scale.set(1, 1, 1);
                createBrickPlatforms();
                resolve();
            }
        );
    });
}

function createBrickPlatforms() {
    const startZ = 15;
    const platformSpacing = 10;
    const totalPlatforms = 80; // Reduced from 120 to fit maxWorldZ ≈ 800
    
    for (let i = 0; i < totalPlatforms; i++) {
        const zPosition = startZ + i * platformSpacing;
        const brickCount = Math.random() < 0.5 ? 3 : 5;
        const yPosition = 2.5 + Math.random() * 2;
        
        createBrickRow(brickCount, 0, yPosition, zPosition);
        
        if (Math.random() < 0.3) {
            const stackLength = Math.random() < 0.5 ? 3 : 5;
            createBrickStack(stackLength, 0, yPosition, zPosition + brickCount * 0.6);
        }
    }
}

function createBrickRow(count, xPos, yPos, zStart) {
    const brickSize = 0.57;
    
    for (let i = 0; i < count; i++) {
        if (brickModel) {
            const brick = brickModel.clone();
            const zPosition = zStart + i * brickSize;
            brick.position.set(xPos, yPos, zPosition);
            brick.rotation.x = 0;
            brick.rotation.y = 0;
            brick.rotation.z = 0;
            scene.add(brick);
            
            const brickBody = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
            });
            brickBody.position.set(xPos, yPos, zPosition);
            world.addBody(brickBody);
            
            bricks.push({
                mesh: brick,
                body: brickBody,
                position: new THREE.Vector3(xPos, yPos, zPosition)
            });
        }
    }
}

function createBrickStack(length, xPos, yPos, zStart) {
    const brickSize = 0.57;
    
    for (let i = 0; i < length; i++) {
        if (brickModel) {
            const brick = brickModel.clone();
            const zPosition = zStart + i * brickSize;
            brick.position.set(xPos, yPos, zPosition);
            brick.rotation.x = 0;
            brick.rotation.y = 0;
            brick.rotation.z = 0;
            scene.add(brick);
            
            const brickBody = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
            });
            brickBody.position.set(xPos, yPos, zPosition);
            world.addBody(brickBody);
            
            bricks.push({
                mesh: brick,
                body: brickBody,
                position: new THREE.Vector3(xPos, yPos, zPosition)
            });
        }
    }
}

function createClouds() {
    gltfLoader.load(
        'models/cloud.glb',
        (gltf) => {
            cloudModel = gltf.scene;
            cloudModel.scale.set(0.1, 0.1, 0.1);
            cloudModel.rotation.y = Math.PI / 2;
            spawnClouds(0);
        }
    );
}

function spawnClouds(characterZ) {
    if (!cloudModel) return;

    const cloudHeightRange = 20;
    const cloudXMin = 20;
    const cloudXMax = 40;
    const minZ = characterZ - 20;
    const maxZ = Math.min(characterZ + 200, maxWorldZ);
    const maxClouds = 120;

    if (lastCloudZ === 0) lastCloudZ = minZ;

    while (lastCloudZ < maxZ && clouds.length < maxClouds) {
        const zPos = lastCloudZ + cloudSpawnDistance + (Math.random() * 5 - 2.5);
        if (zPos > maxWorldZ) break;
        const xPos = cloudXMin + Math.random() * (cloudXMax - cloudXMin);
        const yPos = 2 + Math.random() * cloudHeightRange;
        const cloud = cloudModel.clone();
        cloud.position.set(xPos, yPos, zPos);
        scene.add(cloud);
        clouds.push({
            mesh: cloud,
            position: new THREE.Vector3(xPos, yPos, zPos)
        });
        lastCloudZ = zPos;
    }
}

function createPipesAndPlants() {
    gltfLoader.load(
        'models/pipe.glb',
        (gltf) => {
            pipeModel = gltf.scene;
            pipeModel.scale.set(0.006, 0.007, 0.006);
            gltfLoader.load(
                'models/plant.glb',
                (plantGltf) => {
                    plantModel = plantGltf.scene;
                    plantModel.scale.set(0.3, 0.3, 0.3);
                    plantModel.rotation.y = Math.PI;
                    spawnPipesAndPlants(startPosition.z);
                }
            );
        }
    );
}

function createGoombas() {
    gltfLoader.load(
        'models/goomba.glb',
        (gltf) => {
            goombaModel = gltf.scene;
            goombaModel.scale.set(0.14, 0.14, 0.14); // Revert to 0.1 for perfect size
            goombaModel.rotation.y = -Math.PI / 2;
            spawnGoombas(characterModel.position.z);
        }
    );
}

function spawnGoombas(characterZ) {
    if (!goombaModel || !characterModel) return;

    const minZ = Math.max(characterZ + 10, lastGoombaZ); // Start spawning closer to character
    const maxZ = Math.min(characterZ + 200, maxWorldZ); // Look ahead range
    const maxGoombas = 300; // Increased from 20 to 30 for more Goombas
    const goombaSpawnDistance = 20; // Reduced from 15 to 10 for denser spawning

    if (lastGoombaZ === 0) lastGoombaZ = characterZ + goombaSpawnDistance;

    // Filter brick platforms within spawn range
    const availableBricks = bricks.filter(brick => 
        brick.position.z >= minZ && brick.position.z <= maxZ
    );

    // Split Goombas: 50% ground, 50% bricks (or adjust to 40% ground, 60% bricks)
    const totalSpawnable = Math.min(maxGoombas - goombas.length, Math.floor((maxZ - minZ) / goombaSpawnDistance));
    const groundGoombasCount = Math.floor(totalSpawnable * 0.5); // 50% on ground
    const brickGoombasCount = Math.floor(totalSpawnable * 0.5); // 50% on bricks
    // Alternative: const groundGoombasCount = Math.floor(totalSpawnable * 0.4); // 40% ground
    //              const brickGoombasCount = Math.floor(totalSpawnable * 0.6); // 60% bricks

    // Spawn Ground Goombas
    let groundSpawned = 0;
    while (groundSpawned < groundGoombasCount && lastGoombaZ < maxZ && goombas.length < maxGoombas) {
        const zPos = lastGoombaZ + goombaSpawnDistance + (Math.random() * 3 - 1.5); // Tighter randomization
        if (zPos > maxZ) break;

        const goomba = goombaModel.clone();
        goomba.position.set(0, 0.1, zPos); // Ground level
        scene.add(goomba);

        const goombaBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        });
        goombaBody.position.set(0, 0.6, zPos);
        world.addBody(goombaBody);

        const goombaObj = {
            mesh: goomba,
            body: goombaBody,
            position: new THREE.Vector3(0, 0.1, zPos),
            defeated: false,
            moving: true,
            isOnBrick: false // Ground Goomba
        };
        goombas.push(goombaObj);

        // Movement toward character (ground Goombas only)
        const distanceToTravel = zPos - (characterZ - 50);
        const moveDuration = distanceToTravel / goombaSpeed;
        gsap.to(goomba.position, {
            z: characterZ - 50,
            duration: moveDuration,
            ease: "linear",
            onUpdate: () => {
                goombaBody.position.z = goomba.position.z;
                goombaBody.position.y = goomba.position.y + 0.5;
            },
            onInterrupt: () => {
                gsap.killTweensOf(goomba.position);
            }
        });

        // Hover animation
        const hoverHeight = 0.15;
        const hoverDuration = 0.7;
        gsap.to(goomba.position, {
            y: 0.1 + hoverHeight,
            duration: hoverDuration / 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            onUpdate: () => {
                goombaBody.position.y = goomba.position.y + 0.5;
            }
        });

        lastGoombaZ = zPos;
        groundSpawned++;
    }

    // Spawn Brick Goombas
    let brickSpawned = 0;
    let lastBrickGoombaZ = lastGoombaZ; // Track last brick Goomba Z position separately
    while (brickSpawned < brickGoombasCount && lastBrickGoombaZ < maxZ && goombas.length < maxGoombas && availableBricks.length > 0) {
        // Find the next suitable brick ahead of lastBrickGoombaZ
        const eligibleBricks = availableBricks.filter(brick => 
            brick.position.z >= lastBrickGoombaZ + goombaSpawnDistance && 
            brick.position.z <= maxZ
        );

        if (eligibleBricks.length === 0) break; // No suitable bricks ahead

        // Sort by Z position and pick the closest one ahead
        eligibleBricks.sort((a, b) => a.position.z - b.position.z);
        const brick = eligibleBricks[0];
        const platformZ = brick.position.z;
        const platformY = brick.position.y + 0.5; // Top of brick

        // Find contiguous bricks to determine platform length
        const platformBricks = bricks.filter(b => 
            Math.abs(b.position.z - platformZ) < 3 && // Adjust based on brick spacing
            b.position.y === brick.position.y
        );
        const zMin = Math.min(...platformBricks.map(b => b.position.z)) - 0.5; // Platform start
        const zMax = Math.max(...platformBricks.map(b => b.position.z)) + 0.5; // Platform end

        const goomba = goombaModel.clone();
        const initialZ = platformZ; // Start at center of selected brick
        goomba.position.set(0, platformY, initialZ);
        scene.add(goomba);

        const goombaBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        });
        goombaBody.position.set(0, platformY + 0.5, initialZ);
        world.addBody(goombaBody);

        const goombaObj = {
            mesh: goomba,
            body: goombaBody,
            position: new THREE.Vector3(0, platformY, initialZ),
            defeated: false,
            moving: true,
            isOnBrick: true,
            zMin: zMin,
            zMax: zMax
        };
        goombas.push(goombaObj);

        // Oscillate back and forth on the platform
        const travelDistance = zMax - zMin;
        const moveDuration = travelDistance / brickGoombaSpeed / 2; // Use brickGoombaSpeed
        gsap.to(goomba.position, {
            z: zMax,
            duration: moveDuration / 2,
            ease: "linear",
            repeat: -1,
            yoyo: true,
            onUpdate: () => {
                goombaBody.position.z = goomba.position.z;
                goombaBody.position.y = goomba.position.y + 0.5;
            },
            onInterrupt: () => {
                gsap.killTweensOf(goomba.position);
            }
        });

        // Hover animation
        const hoverHeight = 0.15;
        const hoverDuration = 0.7;
        gsap.to(goomba.position, {
            y: platformY + hoverHeight,
            duration: hoverDuration / 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            onUpdate: () => {
                goombaBody.position.y = goomba.position.y + 0.5;
            }
        });

        // Update lastBrickGoombaZ and remove used brick
        lastBrickGoombaZ = platformZ;
        const brickIndex = availableBricks.indexOf(brick);
        if (brickIndex !== -1) availableBricks.splice(brickIndex, 1);
        brickSpawned++;
    }

    // Update lastGoombaZ to the furthest point reached by either ground or brick Goombas
    lastGoombaZ = Math.max(lastGoombaZ, lastBrickGoombaZ);
}

function createMonsters() {
    gltfLoader.load(
        'models/monster2.glb',
        (gltf) => {
            monsterModel = gltf.scene;
            monsterModel.scale.set(0.015, 0.015, 0.015); // Match Goomba size
            monsterModel.rotation.y = -Math.PI; // Face forward
            spawnMonsters(characterModel.position.z);
        }
    );
}

function spawnMonsters(characterZ) {
    if (!monsterModel || !characterModel) return;

    const minZ = Math.max(characterZ + 10, lastMonsterZ);
    const maxZ = Math.min(characterZ + 200, maxWorldZ);
    const maxMonsters = 40;
    const pipeBufferDistance = 8.5; // Minimum distance from pipe edge (adjust as needed)

    const availableBricks = bricks.filter(brick => 
        brick.position.z >= minZ && brick.position.z <= maxZ
    );
    const availablePipes = pipes.filter(pipe => 
        pipe.position.z >= minZ && pipe.position.z <= maxZ
    );

    const goombaBrickPositions = goombas
        .filter(g => g.isOnBrick && !g.defeated)
        .map(g => g.position.z);

    const freeBricks = availableBricks.filter(brick => 
        !goombaBrickPositions.some(gz => Math.abs(gz - brick.position.z) < monsterSpawnDistance / 2)
    );

    const totalSpawnable = Math.min(maxMonsters - monsters.length, Math.floor((maxZ - minZ) / monsterSpawnDistance));
    const brickMonsterCount = Math.floor(totalSpawnable * 0.5);
    const groundMonsterCount = totalSpawnable - brickMonsterCount;

    // Spawn Brick Monsters (unchanged)
    let brickSpawned = 0;
    let lastBrickMonsterZ = lastMonsterZ || characterZ + monsterSpawnDistance;
    while (brickSpawned < brickMonsterCount && lastBrickMonsterZ < maxZ && freeBricks.length > 0) {
        const eligibleBricks = freeBricks.filter(brick => 
            brick.position.z >= lastBrickMonsterZ + monsterSpawnDistance && 
            brick.position.z <= maxZ
        );
        if (eligibleBricks.length === 0) break;

        eligibleBricks.sort((a, b) => a => b.position.z - b.position.z);
        const brick = eligibleBricks[0];
        const platformZ = brick.position.z;
        const platformY = brick.position.y + 0.5;

        const platformBricks = bricks.filter(b => 
            Math.abs(b.position.z - platformZ) < 3 && 
            b.position.y === brick.position.y
        );
        const zMin = Math.min(...platformBricks.map(b => b.position.z)) - 0.5;
        const zMax = Math.max(...platformBricks.map(b => b.position.z)) + 0.5;

        const monster = monsterModel.clone();
        const initialZ = platformZ;
        monster.position.set(0, platformY, initialZ);
        scene.add(monster);

        const monsterBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        });
        monsterBody.position.set(0, platformY + 0.5, initialZ);
        world.addBody(monsterBody);

        const monsterObj = {
            mesh: monster,
            body: monsterBody,
            position: new THREE.Vector3(0, platformY, initialZ),
            isOnBrick: true,
            zMin: zMin,
            zMax: zMax
        };
        monsters.push(monsterObj);

        gsap.to(monster.position, {
            z: zMax,
            duration: (zMax - zMin) / monsterSpeed / 2,
            ease: "linear",
            repeat: -1,
            yoyo: true,
            onUpdate: () => {
                monsterBody.position.z = monster.position.z;
                monsterBody.position.y = monster.position.y + 0.5;
            },
            onInterrupt: () => {
                gsap.killTweensOf(monster.position);
            }
        });

        lastBrickMonsterZ = platformZ;
        const brickIndex = freeBricks.indexOf(brick);
        if (brickIndex !== -1) freeBricks.splice(brickIndex, 1);
        brickSpawned++;
    }

    // Spawn Ground Monsters with Distance from Pipes
    let groundSpawned = 0;
    let lastGroundMonsterZ = lastMonsterZ || characterZ + monsterSpawnDistance;
    while (groundSpawned < groundMonsterCount && lastGroundMonsterZ < maxZ && availablePipes.length > 0) {
        const eligiblePipes = availablePipes.filter(pipe => 
            pipe.position.z >= lastGroundMonsterZ + monsterSpawnDistance && 
            pipe.position.z <= maxZ
        );
        if (eligiblePipes.length === 0) break;

        eligiblePipes.sort((a, b) => a.position.z - b.position.z);
        const pipe = eligiblePipes[0];
        const pipeZ = pipe.position.z;
        const pipeWidth = 2; // Assuming pipe width is 2 units

        // Define spawn zones before or after the pipe with buffer
        const spawnBefore = pipeZ - (pipeWidth / 2 + pipeBufferDistance);
        const spawnAfter = pipeZ + (pipeWidth / 2 + pipeBufferDistance);
        const spawnZ = Math.random() < 0.5 ? spawnBefore : spawnAfter; // Randomly choose before or after
        const offsetX = 0; // Keep X centered or adjust slightly if desired
        const baseY = 0.1;

        // Ensure spawnZ is within bounds
        if (spawnZ < minZ || spawnZ > maxZ) {
            lastGroundMonsterZ = pipeZ;
            const pipeIndex = availablePipes.indexOf(pipe);
            if (pipeIndex !== -1) availablePipes.splice(pipeIndex, 1);
            continue;
        }

        const monster = monsterModel.clone();
        monster.position.set(offsetX, baseY, spawnZ);
        scene.add(monster);

        const monsterBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) // Fixed: Changed from Vec3 to Box
        });
        monsterBody.position.set(offsetX, baseY + 0.5, spawnZ);
        world.addBody(monsterBody);

        const monsterObj = {
            mesh: monster,
            body: monsterBody,
            position: new THREE.Vector3(offsetX, baseY, spawnZ),
            isOnBrick: false,
            isJumping: false,
            baseY: baseY
        };
        monsters.push(monsterObj);

        gsap.to(monster.position, {
            y: baseY + 0.1,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            onUpdate: () => monsterBody.position.y = monster.position.y + 0.5
        });

        lastGroundMonsterZ = spawnZ;
        const pipeIndex = availablePipes.indexOf(pipe);
        if (pipeIndex !== -1) availablePipes.splice(pipeIndex, 1);
        groundSpawned++;
    }

    lastMonsterZ = Math.max(lastBrickMonsterZ, lastGroundMonsterZ);
}


function spawnPipesAndPlants(characterZ) {
    if (!pipeModel || !plantModel) return;

    const minZ = Math.max(characterZ - 20, maxZReached - 20);
    const maxZ = Math.min(characterZ + 200, maxWorldZ);
    const maxPipes = 16;
    const pipeWidth = 2;
    const minHeight = 1;
    const maxHeight = 3;
    const brickOverlapThreshold = 2;
    const specialPipeBuffer = 10; // Buffer distance from special pipes’ range

    if (lastPipeZ === 0) lastPipeZ = startPosition.z + pipeSpawnDistance;

    while (lastPipeZ < maxZ && pipes.length < maxPipes) {
        const zPos = lastPipeZ + pipeSpawnDistance + (Math.random() * 10 - 5);
        if (zPos > maxWorldZ) break;

        const isNearBrick = bricks.some(brick => 
            Math.abs(brick.position.z - zPos) < brickOverlapThreshold
        );
        // Check if zPos is within buffer of special pipes’ range
        const specialPipeStartZ = maxWorldZ - 20;
        const specialPipeEndZ = specialPipeStartZ + 2 * 9; // 10 pipes * 2 spacing = 18 units
        const isNearSpecialPipe = specialPipes.length > 0 && 
            zPos >= specialPipeStartZ - specialPipeBuffer && 
            zPos <= specialPipeEndZ + specialPipeBuffer;

        if (!isNearBrick && !isNearSpecialPipe) {
            const pipeHeight = minHeight + Math.random() * (maxHeight - minHeight);
            const pipe = pipeModel.clone();
            pipe.position.set(0, 0, zPos);
            scene.add(pipe);

            const pipeShape = new CANNON.Box(new CANNON.Vec3(pipeWidth / 2, pipeHeight / 2, 0.5));
            const pipeBody = new CANNON.Body({ mass: 0, shape: pipeShape });
            pipeBody.position.set(0, pipeHeight / 2, zPos);
            world.addBody(pipeBody);

            const plant = plantModel.clone();
            plant.position.set(0, 0, zPos);
            scene.add(plant);

            gsap.to(plant.position, {
                y: 2.5,
                duration: 1.5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            pipes.push({
                mesh: pipe,
                body: pipeBody,
                position: new THREE.Vector3(0, 0, zPos),
                height: pipeHeight
            });

            plants.push({
                mesh: plant,
                position: new THREE.Vector3(0, 0, zPos),
                pipeHeight: pipeHeight
            });

            lastPipeZ = zPos;
        } else {
            lastPipeZ += 5;
        }
    }
}


let specialPipes = []; // Array to store special side-by-side pipes (upper and lower)

function createSpecialPipes() {
    return new Promise((resolve) => {
        if (!pipeModel) {
            gltfLoader.load('models/pipe.glb', (gltf) => {
                pipeModel = gltf.scene;
                pipeModel.scale.set(0.008, 0.008, 0.008); // Consistent scale for visibility
                placeSpecialPipes();
                resolve();
            });
        } else {
            placeSpecialPipes();
            resolve();
        }
    });

    function placeSpecialPipes() {
        const gapAfterWorld = 5; // Start pipes just after world content
        const baseZ = maxWorldZ + gapAfterWorld; // e.g., 800 + 5 = 805
        const pipeHeight = 2;
        const pipeWidth = 2;
        const spacing = 2;
        const pipeCount = 20; // Changed from 10 to 20
        const upperElevation = 10;
        const lowerElevation = 0;
        const xPos = 0;

        // Clear existing special pipes
        specialPipes.forEach(pipe => {
            scene.remove(pipe.mesh);
            world.removeBody(pipe.body);
        });
        specialPipes = [];

        // Create upper pipes
        for (let i = 0; i < pipeCount; i++) {
            const zPos = baseZ + i * spacing;
            const pipe = pipeModel.clone();
            pipe.position.set(xPos, upperElevation, zPos);
            pipe.rotation.x = Math.PI; // Upside down for upper pipes
            scene.add(pipe);

            const pipeShape = new CANNON.Box(new CANNON.Vec3(pipeWidth / 2, pipeHeight / 2, 0.5));
            const pipeBody = new CANNON.Body({ mass: 0, shape: pipeShape });
            pipeBody.position.set(xPos, upperElevation - pipeHeight / 2, zPos);
            world.addBody(pipeBody);

            specialPipes.push({
                mesh: pipe,
                body: pipeBody,
                position: new THREE.Vector3(xPos, upperElevation, zPos),
                height: pipeHeight,
                isUpper: true
            });
        }

        // Create lower pipes
        for (let i = 0; i < pipeCount; i++) {
            const zPos = baseZ + i * spacing;
            const pipe = pipeModel.clone();
            pipe.position.set(xPos, lowerElevation, zPos);
            pipe.rotation.x = 0; // Normal orientation for lower pipes
            scene.add(pipe);

            const pipeShape = new CANNON.Box(new CANNON.Vec3(pipeWidth / 2, pipeHeight / 2, 0.5));
            const pipeBody = new CANNON.Body({ mass: 0, shape: pipeShape });
            pipeBody.position.set(xPos, lowerElevation + pipeHeight / 2, zPos);
            world.addBody(pipeBody);

            specialPipes.push({
                mesh: pipe,
                body: pipeBody,
                position: new THREE.Vector3(xPos, lowerElevation, zPos),
                height: pipeHeight,
                isUpper: false
            });
        }

        console.log(`Created ${pipeCount} upper and ${pipeCount} lower special pipes starting at z = ${baseZ}, maxWorldZ = ${maxWorldZ}`);
        createChains(); // Call createChains after placing pipes
    }
}

// New function to create and manage chains
function createChains() {
    if (!chainModel || !specialPipes.length) {
        return;
    }

    // Clear existing chains
    chains.forEach(chain => {
        gsap.killTweensOf(chain.mesh.position);
        scene.remove(chain.mesh);
    });
    chains = [];
    if (chainSpawnTimeout) {
        clearTimeout(chainSpawnTimeout);
        chainSpawnTimeout = null;
    }

    function spawnChains() {
        // Clear existing chains to ensure only the new set is active
        chains.forEach(chain => {
            gsap.killTweensOf(chain.mesh.position);
            scene.remove(chain.mesh);
        });
        chains = [];

        // Randomly decide to spawn 3, 4, or 5 chains
        const randomValue = Math.random();
        const chainCount = randomValue < 0.33 ? 3 : randomValue < 0.66 ? 4 : 5;

        // Shuffle specialPipes array to select random pipes
        const shuffledPipes = [...specialPipes].sort(() => Math.random() - 0.5);
        const selectedPipes = shuffledPipes.slice(0, chainCount);

        selectedPipes.forEach(pipe => {
            const isUpper = pipe.isUpper;
            const pipeZ = pipe.position.z;
            const pipeX = pipe.position.x;
            const pipeHeight = pipe.height;
            const baseY = isUpper ? pipe.position.y - pipeHeight : pipe.position.y + pipeHeight;
            const yOffset = isUpper ? 1 : -0.5;
            const modelOffset = 0;

            const chain = chainModel.clone();
            const initialY = baseY + yOffset + modelOffset;
            chain.position.set(pipeX, initialY, pipeZ);

            // Restore original rotations
            if (isUpper) {
                chain.rotation.z = -Math.PI / 2;
                chain.rotation.y = -Math.PI / 2;
            } else {
                chain.rotation.z = Math.PI / 2;
                chain.rotation.y = Math.PI / 2;
            }

            scene.add(chain);

            // Movement parameters
            const targetY = isUpper ? -2 : 12;
            const moveDuration = 0.8 + Math.random() * 0.4; // Adjusted movement: 0.8-1.2 seconds
            const delay = Math.random() * 0.5;

            // One-way movement animation
            gsap.to(chain.position, {
                y: targetY,
                duration: moveDuration,
                ease: "linear",
                delay: delay,
                onComplete: () => {
                    scene.remove(chain);
                    const chainIndex = chains.findIndex(c => c.mesh === chain);
                    if (chainIndex !== -1) chains.splice(chainIndex, 1);
                    // Check if all chains in this batch are done
                    if (chains.length === 0) {
                        // Schedule next chain spawn after 50ms
                        const nextSpawnTime = 70;
                        chainSpawnTimeout = setTimeout(spawnChains, nextSpawnTime);
                    }
                }
            });

            chains.push({
                mesh: chain,
                position: new THREE.Vector3(pipeX, initialY, pipeZ),
                isUpper: isUpper,
                pipe: pipe
            });
        });
    }

    // Start the first chain spawn
    spawnChains();
}

// New function to check chain collisions
function checkChainCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const characterHeight = isPoweredUp ? 1.5 : 1;
    const characterWidth = 0.5;
    const chainWidth = 0.5; // Adjust based on chain model
    const chainHeight = 1; // Adjust based on chain model

    for (const chain of chains) {
        const chainPosition = chain.mesh.position.clone();
        const distanceZ = Math.abs(characterPosition.z - chainPosition.z);
        const distanceY = characterPosition.y - chainPosition.y;
        const distanceX = Math.abs(characterPosition.x - chainPosition.x);

        if (distanceZ < (chainWidth + characterWidth) &&
            distanceX < (chainWidth + characterWidth) &&
            distanceY < chainHeight &&
            distanceY > -characterHeight) {
            if (isPoweredUp) {
                // Scale down with blinking effect
                gsap.killTweensOf(characterModel.scale);
                const originalScale = 0.02;
                const blinkDuration = 0.15;
                const blinkCount = 4;

                const applyBlinkingScaleDown = () => {
                    let currentScale = characterModel.scale.x;
                    const scaleStep = (originalScale - currentScale) / blinkCount;

                    const blinkTimeline = gsap.timeline({
                        onComplete: () => {
                            isPoweredUp = false;
                            loseLife();
                        }
                    });
                    for (let i = 0; i < blinkCount; i++) {
                        const midScale = currentScale + scaleStep * (i + 0.5);
                        const finalScale = currentScale + scaleStep * (i + 1);

                        blinkTimeline.to(characterModel.scale, {
                            x: midScale + scaleStep * 0.1,
                            y: midScale + scaleStep * 0.1,
                            z: midScale + scaleStep * 0.1,
                            duration: blinkDuration,
                            ease: "power2.out"
                        }).to(characterModel.scale, {
                            x: finalScale,
                            y: finalScale,
                            z: finalScale,
                            duration: blinkDuration,
                            ease: "power2.in"
                        });
                    }
                };

                applyBlinkingScaleDown();
            } else {
                loseLife();
            }
            break; // Exit after first collision
        }
    }
}

function updateSpecialPipesPosition() {
    if (specialPipes.length === 0) {
        console.log("No special pipes to update");
        return;
    }

    const gapAfterWorld = 5; // Match createSpecialPipes
    const baseZ = maxWorldZ + gapAfterWorld; // e.g., 800 + 5 = 805
    const pipeHeight = 2;
    const pipeWidth = 2;
    const spacing = 2;
    const pipeCount = 10;
    const upperElevation = 10;
    const lowerElevation = 0;
    const xPos = 0;

    specialPipes.forEach((pipe, index) => {
        const i = index % pipeCount;
        const zPos = baseZ + i * spacing;
        const elevation = pipe.isUpper ? upperElevation : lowerElevation;
        const rotationX = pipe.isUpper ? Math.PI : 0;

        pipe.mesh.position.set(xPos, elevation, zPos);
        pipe.mesh.rotation.x = rotationX;
        pipe.body.position.set(
            xPos,
            elevation + (pipe.isUpper ? -pipeHeight / 2 : pipeHeight / 2),
            zPos
        );
        pipe.position.set(xPos, elevation, zPos);

        console.log(`Moved ${pipe.isUpper ? 'upper' : 'lower'} special pipe ${i} to x=${xPos}, y=${elevation}, z=${zPos}, rotation.x=${pipe.mesh.rotation.x}, pipeHeight=${pipeHeight}, body.y=${pipe.body.position.y}`);
    });

    console.log(`Special pipes positioned starting at z=${baseZ}, maxWorldZ=${maxWorldZ}`);
}

function checkPipeCollisions() {
    if (!characterModel) return { canMove: true, onPipe: false, pipeHeight: 0 };

    const characterPosition = characterModel.position.clone();
    const characterHeight = isPoweredUp ? 1.5 : 1;
    const characterWidth = 0.2;
    const pipeWidth = 2;
    let canMove = true;
    let onPipe = false;
    let pipeHeight = 0; // Height of the pipe top when onPipe is true

    // Check regular pipes (obstacles)
    for (const pipe of pipes) {
        const regularPipeZ = pipe.position.z;
        const regularPipeHeight = pipe.height;
        const distanceZ = Math.abs(characterPosition.z - regularPipeZ);
        const distanceY = characterPosition.y - pipe.position.y;

        if (distanceZ < (pipeWidth / 2 + characterWidth) && 
            distanceY < regularPipeHeight &&
            distanceY > -characterHeight) {
            if (isRightKeyPressed && characterPosition.z < regularPipeZ) {
                characterModel.position.z = regularPipeZ - (pipeWidth / 2 + characterWidth);
                canMove = false;
            } else if (isLeftKeyPressed && characterPosition.z > regularPipeZ) {
                characterModel.position.z = regularPipeZ + (pipeWidth / 2 + characterWidth);
                canMove = false;
            }
            
            if (isJumping && verticalVelocity > 0 && 
                characterPosition.y + characterHeight > pipe.position.y && 
                characterPosition.y < pipe.position.y + regularPipeHeight) {
                verticalVelocity = 0;
                characterModel.position.y = pipe.position.y - characterHeight;
            }
        }
    }

    // Check special pipes (lower as platforms, upper as obstacles)
    for (const pipe of specialPipes) {
        const specialPipeZ = pipe.position.z;
        const specialPipeHeight = pipe.height; // e.g., 2
        const pipeTop = pipe.isUpper ? pipe.position.y - specialPipeHeight : pipe.position.y + specialPipeHeight; // y = 8 (upper), y = 2 (lower)
        const pipeBottom = pipe.isUpper ? pipe.position.y : pipe.position.y; // y = 10 (upper), y = 0 (lower)
        const pipeCenterY = pipe.isUpper ? pipe.position.y - specialPipeHeight / 2 : pipe.position.y + specialPipeHeight / 2; // y = 9 (upper), y = 1 (lower)
        const distanceZ = Math.abs(characterPosition.z - specialPipeZ);
        const distanceY = characterPosition.y - pipeCenterY;

        // Side collision: block movement if within pipe height
        if (distanceZ < (pipeWidth / 2 + characterWidth) && 
            distanceY < specialPipeHeight / 2 &&
            distanceY > -(specialPipeHeight / 2 + characterHeight)) {
            if (isRightKeyPressed && characterPosition.z < specialPipeZ) {
                characterModel.position.z = specialPipeZ - (pipeWidth / 2 + characterWidth);
                canMove = false;
            } else if (isLeftKeyPressed && characterPosition.z > specialPipeZ) {
                characterModel.position.z = specialPipeZ + (pipeWidth / 2 + characterWidth);
                canMove = false;
            }
        }

        // Vertical collision
        if (distanceZ < (pipeWidth / 2 + characterWidth)) {
            if (pipe.isUpper) {
                // Upper pipe: block upward jumps hitting bottom (y = 8)
                if (isJumping && verticalVelocity > 0 && 
                    characterPosition.y + characterHeight > pipeBottom && 
                    characterPosition.y < pipeBottom + specialPipeHeight) {
                    verticalVelocity = 0;
                    characterModel.position.y = pipeBottom - characterHeight; // y = 8 - characterHeight
                }
            } else {
                // Lower pipe: land on top (y = 2) when falling
                if (verticalVelocity <= 0 && 
                    characterPosition.y > pipeTop - 0.1 && 
                    characterPosition.y <= pipeTop + characterHeight &&
                    !onPipe) { // Prevent overwriting if already on another pipe
                    onPipe = true;
                    pipeHeight = pipeTop; // Set to y = 2
                    characterModel.position.y = pipeTop; // Place on top
                    verticalVelocity = 0;
                    isJumping = false;
                    // console.log(`Landed on lower pipe at y=${pipeTop}, z=${specialPipeZ}`);
                }
                // Block upward jumps hitting bottom (y = 0) if below pipe
                else if (isJumping && verticalVelocity > 0 && 
                         characterPosition.y + characterHeight > pipeBottom && 
                         characterPosition.y < pipeBottom + specialPipeHeight / 2) {
                    verticalVelocity = 0;
                    characterModel.position.y = pipeBottom - characterHeight; // y = 0 - characterHeight
                }
            }
        }
    }

    return { canMove, onPipe, pipeHeight };
}

function checkPlantCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const characterHeight = 1;
    const characterWidth = 0.5;
    const plantWidth = 0.3;
    const plantHeight = 1.3;

    for (const plant of plants) {
        const plantPosition = plant.mesh.position.clone();
        const distanceZ = Math.abs(characterPosition.z - plantPosition.z);
        const distanceY = characterPosition.y - plantPosition.y;
        const distanceX = Math.abs(characterPosition.x - plantPosition.x);

        if (distanceZ < (plantWidth + characterWidth) && 
            distanceX < (plantWidth + characterWidth) &&
            distanceY < plantHeight && 
            distanceY > -characterHeight) {
            if (isRightKeyPressed && characterPosition.z < plantPosition.z) {
                characterModel.position.z = plantPosition.z - (plantWidth + characterWidth);
            } else if (isLeftKeyPressed && characterPosition.z > plantPosition.z) {
                characterModel.position.z = plantPosition.z + (plantWidth + characterWidth);
            }

            if (isPoweredUp) {
                // Kill existing scaling animations
                gsap.killTweensOf(characterModel.scale);

                // Scale down with blinking effect
                const originalScale = 0.02;
                const blinkDuration = 0.15;
                const blinkCount = 4;

                const applyBlinkingScaleDown = () => {
                    let currentScale = characterModel.scale.x;
                    const scaleStep = (originalScale - currentScale) / blinkCount;

                    const blinkTimeline = gsap.timeline({
                        onComplete: () => {
                            isPoweredUp = false; // Reset power-up state
                            loseLife(); // Lose a life after scaling down
                        }
                    });
                    for (let i = 0; i < blinkCount; i++) {
                        const midScale = currentScale + scaleStep * (i + 0.5);
                        const finalScale = currentScale + scaleStep * (i + 1);

                        blinkTimeline.to(characterModel.scale, {
                            x: midScale + scaleStep * 0.1,
                            y: midScale + scaleStep * 0.1,
                            z: midScale + scaleStep * 0.1,
                            duration: blinkDuration,
                            ease: "power2.out"
                        }).to(characterModel.scale, {
                            x: finalScale,
                            y: finalScale,
                            z: finalScale,
                            duration: blinkDuration,
                            ease: "power2.in"
                        });
                    }
                };

                applyBlinkingScaleDown();
            } else {
                loseLife(); // Normal life loss if not powered up
            }
            break; // Exit after first collision to avoid multiple triggers
        }
    }
}

function checkHeartCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const collisionDistance = 0.7;

    hearts.forEach((heart, index) => {
        if (!heart.collected) {
            const distance = characterPosition.distanceTo(heart.mesh.position);
            if (distance < collisionDistance) {
                heart.collected = true;
                heart.mesh.visible = false;
                gsap.killTweensOf(heart.mesh.position); // Stop heart animation
            
                if (lives < 3) {
                    lives++;
                    createLivesDisplay(); // Update lives display
                }
            }
        }
    });
}

function checkGiftBoxCollisions() {
    if (!characterModel) return true;

    const characterPosition = characterModel.position.clone();
    const characterHeight = 2.2;
    const characterWidth = 0.5;
    const boxSize = 0.5;
    let canMove = true;

    for (const box of giftBoxes) {
        const boxPosition = box.body.position;
        const distanceZ = Math.abs(characterPosition.z - boxPosition.z);
        const distanceY = characterPosition.y - boxPosition.y;
        const distanceX = Math.abs(characterPosition.x - boxPosition.x);

        if (distanceZ < (boxSize / 2 + characterWidth) &&
            distanceX < (boxSize / 2 + characterWidth) &&
            distanceY < boxSize &&
            distanceY > -characterHeight) {
            if (isRightKeyPressed && characterPosition.z < boxPosition.z) {
                characterModel.position.z = boxPosition.z - (boxSize / 2 + characterWidth);
                canMove = false;
            } else if (isLeftKeyPressed && characterPosition.z > boxPosition.z) {
                characterModel.position.z = boxPosition.z + (boxSize / 2 + characterWidth);
                canMove = false;
            }

            if (isJumping && verticalVelocity > 0 && 
                characterPosition.y + characterHeight > boxPosition.y - boxSize / 2 && 
                characterPosition.y < boxPosition.y + boxSize / 2) {
                verticalVelocity = 0;
                characterModel.position.y = boxPosition.y - characterHeight;
                if (box.hasMushroom) {
                    spawnMushroom(box);
                } else if (box.hasHeart) {
                    spawnHeart(box);
                } else if (box.hasSword) {
                    spawnSword(box);
                }
                if (!box.hit) { // Play sound only if not hit before
                    const giftBoxSound = new Audio('music/coin1.wav');
                    giftBoxSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
                    giftBoxSound.play();
                    box.hit = true; // Mark as hit
                }
            } else if (characterPosition.y <= boxPosition.y + boxSize / 2 && 
                       characterPosition.y >= boxPosition.y - characterHeight) {
                characterModel.position.y = boxPosition.y + boxSize / 2;
                verticalVelocity = 0;
                isJumping = false;
            }
        }
    }
    return canMove;
}

function checkSwordCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const collisionDistance = 0.7;

    swords.forEach((sword, index) => {
        if (!sword.collected) {
            const distance = characterPosition.distanceTo(sword.mesh.position);
            if (distance < collisionDistance) {
                sword.collected = true;
                sword.mesh.visible = false;
                gsap.killTweensOf(sword.mesh.position);

                // Display sword icon and count separately
                document.getElementById('sword-icon').style.display = 'block';
                document.getElementById('sword-count').style.display = 'block';
                if (hasSwordSkill) {
                    // Add 5 more throws to existing count, cap at 10
                    swordThrowsRemaining = Math.min(swordThrowsRemaining + 5, 10);
                } else {
                    // First time getting sword skill, set to 5
                    hasSwordSkill = true;
                    swordThrowsRemaining = 5;
                }
                updateSwordCountDisplay();
            }
        }
    });
}

function checkGoombaCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const characterHeight = isPoweredUp ? 1.5 : 1;
    const characterWidth = 0.6;
    const goombaWidth = 1.5;
    const goombaHeight = 1.0;

    // Use reverse loop to safely modify array during iteration
    for (let i = goombas.length - 1; i >= 0; i--) {
        const goomba = goombas[i];
        if (goomba.defeated) continue; // Skip already defeated Goombas

        const goombaPosition = goomba.mesh.position.clone(); // Clone position at collision time
        const distanceZ = Math.abs(characterPosition.z - goombaPosition.z);
        const distanceY = characterPosition.y - goombaPosition.y;
        const distanceX = Math.abs(characterPosition.x - goombaPosition.x);

        const isOverlapping = distanceZ < (goombaWidth + characterWidth) / 2 &&
                             distanceX < (goombaWidth + characterWidth) / 2 &&
                             distanceY < goombaHeight &&
                             distanceY > -characterHeight;

        if (isOverlapping) {
            // console.log(`Overlap detected - Y: ${characterPosition.y}, Goomba Y: ${goombaPosition.y}, Velocity: ${verticalVelocity}`);
            if (verticalVelocity < 0 && characterPosition.y > goombaPosition.y - 0.2) {
                console.log("Defeating Goomba");
                defeatGoomba(goomba, i, goombaPosition); // Pass collision position
            } else if (!isInvulnerable && characterPosition.y <= goombaPosition.y + goombaHeight * 0.75) {
                console.log("Losing life");
                loseLife();
            }
        }
    }
}

function defeatGoomba(goomba, index, collisionPosition) {
    if (goomba.defeated) return; // Prevent re-defeat
    goomba.defeated = true;
    goomba.moving = false;


    if (verticalVelocity < 0) {
        const stompSound = new Audio('music/stomp.wav');
        stompSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
        stompSound.play();
    }

    // Kill all animations on the Goomba
    gsap.killTweensOf(goomba.mesh.position);
    gsap.killTweensOf(goomba.mesh.scale);

    // Remove from array immediately
    goombas.splice(index, 1);
    console.log(`Goomba defeated at index ${index}, remaining: ${goombas.length}`);

    // Show score popup using the collision position
    const points = 100;
    showScorePopup(collisionPosition.x, collisionPosition.y, collisionPosition.z, points);

    // Animate defeat
    gsap.to(goomba.mesh.scale, {
        y: 0.1,
        x: 0.3,
        z: 0.3,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
            gsap.to(goomba.mesh.scale, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    scene.remove(goomba.mesh);
                    world.removeBody(goomba.body);
                    console.log("Goomba mesh and body removed from scene/world");
                }
            });
        }
    });

    // Bounce character if defeated by jumping (not applicable for sword, but keep for consistency)
    if (verticalVelocity < 0) { // Only if character jumped on it
        verticalVelocity = jumpVelocity * 0.3;
        isJumping = true;
    }
}

function checkMonsterCollisions() {
    if (!characterModel) return;
    
    const characterPosition = characterModel.position.clone();
    const characterHeight = isPoweredUp ? 1.5 : 1;
    const characterWidth = 0.6;
    const monsterWidth = 1.5;
    const monsterHeight = 1.0;
    const proximityDistance = 5;
    const slowDuration = 10; // 10 seconds
    const slowMultiplier = 0.5; // Reduce speed to 50%
    
    for (let i = 0; i < monsters.length; i++) {
        const monster = monsters[i];
        const monsterPosition = monster.mesh.position.clone();
        const distanceToCharacter = characterPosition.distanceTo(monsterPosition);
        
        if (!monster.isOnBrick && !monster.isJumping && distanceToCharacter < proximityDistance) {
            monster.isJumping = true;
            gsap.killTweensOf(monster.mesh.position);
            gsap.to(monster.mesh.position, {
                y: monster.baseY + 1.5,
                duration: 0.5,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut",
                onUpdate: () => monster.body.position.y = monster.mesh.position.y + 0.5
            });
        }
        
        const distanceZ = Math.abs(characterPosition.z - monsterPosition.z);
        const distanceY = characterPosition.y - monsterPosition.y;
        const distanceX = Math.abs(characterPosition.x - monsterPosition.x);
        
        const isOverlapping = distanceZ < (monsterWidth + characterWidth) / 2 &&
                            distanceX < (monsterWidth + characterWidth) / 2 &&
                            distanceY < monsterHeight &&
                            distanceY > -characterHeight;
        
        if (isOverlapping && !isInvulnerable && !isSlowed) { // Only trigger if not already slowed
            // Store original speeds based on current stage
            const stageRunningSpeed = speedStage === 1 ? 6 : speedStage === 2 ? 8 : speedStage === 3 ? 10 : 12.5; // Changed 12 to 12.5
            const stageBackwardSpeed = speedStage === 1 ? 5 : speedStage === 2 ? 6.25 : speedStage === 3 ? 7.5 : 8.3335;

            // Apply slow effect
            runningSpeed = stageRunningSpeed * slowMultiplier; // e.g., 12 -> 6
            backwardSpeed = stageBackwardSpeed * slowMultiplier; // e.g., 8.33 -> 4.165
            isSlowed = true;
            slowEndTime = clock.getElapsedTime() + slowDuration;
            console.log(`Speed slowed to ${runningSpeed} until ${slowEndTime}s`);


            const turtleSound = new Audio('music/turtle.wav');
            turtleSound.volume = 0.5;
            turtleSound.play();

            isInvulnerable = true;
            setTimeout(() => {
                isInvulnerable = false;
            }, slowDuration * 1000);
            break;
        }
    }
}

function checkMushroomCollisions() {
    if (!characterModel) return;

    const characterPosition = characterModel.position.clone();
    const collisionDistance = 0.7;

    mushrooms.forEach((mushroom, index) => {
        if (!mushroom.collected) {
            const distance = characterPosition.distanceTo(mushroom.mesh.position);
            if (distance < collisionDistance) {
                mushroom.collected = true;
                mushroom.mesh.visible = false;
                gsap.killTweensOf(mushroom.mesh.position);


                const powerupSound = new Audio('music/powerup.wav');
                powerupSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
                powerupSound.play();

                const originalScale = 0.02;
                const powerUpScale = 0.03;
                const totalDuration = 15;
                const blinkDuration = 0.15;
                const blinkCount = 4;
                const totalBlinkTimeUp = blinkDuration * blinkCount * 2;
                const totalBlinkTimeDown = blinkDuration * blinkCount * 2;
                const holdDuration = totalDuration - (totalBlinkTimeUp + totalBlinkTimeDown);

                // Set speed to 10 explicitly
                runningSpeed = 10;
                backwardSpeed = originalBackwardSpeed * 1.5; // Adjust as desired, e.g., 7.5

                const applyBlinkingScale = (targetScale, onComplete) => {
                    let currentScale = characterModel.scale.x;
                    const scaleStep = (targetScale - currentScale) / blinkCount;

                    const blinkTimeline = gsap.timeline({ onComplete });
                    for (let i = 0; i < blinkCount; i++) {
                        const midScale = currentScale + scaleStep * (i + 0.5);
                        const finalScale = currentScale + scaleStep * (i + 1);

                        blinkTimeline.to(characterModel.scale, {
                            x: midScale + scaleStep * 0.1,
                            y: midScale + scaleStep * 0.1,
                            z: midScale + scaleStep * 0.1,
                            duration: blinkDuration,
                            ease: "power2.out"
                        }).to(characterModel.scale, {
                            x: finalScale,
                            y: finalScale,
                            z: finalScale,
                            duration: blinkDuration,
                            ease: "power2.in"
                        });
                    }
                };

                gsap.killTweensOf(characterModel.scale);
                isPoweredUp = true;
                applyBlinkingScale(powerUpScale, () => {
                    gsap.to(characterModel.scale, {
                        x: powerUpScale,
                        y: powerUpScale,
                        z: powerUpScale,
                        duration: 0.1,
                        onComplete: () => {
                            setTimeout(() => {
                                if (isPoweredUp) {
                                    applyBlinkingScale(originalScale, () => {
                                        isPoweredUp = false;
                                        // Restore stage-based speed
                                        runningSpeed = speedStage === 1 ? 6 : speedStage === 2 ? 8 : speedStage === 3 ? 10 : 12.5; // Changed 12 to 12.5
                                        backwardSpeed = speedStage === 1 ? 5 : speedStage === 2 ? 6.25 : speedStage === 3 ? 7.5 : 8.3335;
                                        console.log("Mushroom power-up expired, speed restored to:", runningSpeed);
                                    });
                                }
                            }, holdDuration * 1000);
                        }
                    });
                });
            }
        }
    });
}

function checkSwordProjectileCollisions() {
    if (!characterModel) return;

    const collisionDistance = 0.7;

    for (let projIndex = swordProjectiles.length - 1; projIndex >= 0; projIndex--) {
        const projectile = swordProjectiles[projIndex];
        if (!projectile.active) continue;

        const projectilePosition = projectile.mesh.position.clone();

        // Check Goombas
        for (let i = goombas.length - 1; i >= 0; i--) {
            const goomba = goombas[i];
            if (goomba.defeated) continue;

            const distance = projectilePosition.distanceTo(goomba.mesh.position);
            if (distance < collisionDistance) {
                console.log(`Sword hit Goomba at index ${i}, position:`, goomba.mesh.position);
                defeatGoomba(goomba, i, goomba.mesh.position.clone());
                const swordSound = new Audio('music/sword.wav');
                swordSound.volume = 0.5;
                swordSound.play();
                projectile.active = false;
                break;
            }
        }

        // Check Monsters
        for (let i = monsters.length - 1; i >= 0; i--) {
            const monster = monsters[i];
            const distance = projectilePosition.distanceTo(monster.mesh.position);
            if (distance < collisionDistance) {
                console.log(`Sword hit Monster at index ${i}`);
                defeatMonster(monster, i);
                const swordSound = new Audio('music/sword.wav');
                swordSound.volume = 0.5;
                swordSound.play();
                projectile.active = false;
                break;
            }
        }

        // Check Plants
        for (let i = plants.length - 1; i >= 0; i--) {
            const plant = plants[i];
            const distance = projectilePosition.distanceTo(plant.mesh.position);
            if (distance < collisionDistance) {
                console.log(`Sword hit Plant at index ${i}`);
                defeatPlant(plant, i);
                const swordSound = new Audio('music/sword.wav');
                swordSound.volume = 0.5;
                swordSound.play();
                projectile.active = false;
                break;
            }
        }

        // Cleanup inactive projectiles
        if (!projectile.active) {
            gsap.killTweensOf(projectile.mesh.position);
            scene.remove(projectile.mesh);
            world.removeBody(projectile.body);
            swordProjectiles.splice(projIndex, 1);
        }
    }
}

function defeatMonster(monster, index) {
    gsap.killTweensOf(monster.mesh.position);
    gsap.killTweensOf(monster.mesh.scale);

    const projectile = swordProjectiles.find(p => p.active && 
        p.mesh.position.distanceTo(monster.mesh.position) < 0.7);
    const forwardDirectionZ = projectile ? (projectile.targetZ > projectile.position.z ? 1 : -1) : 1;

    const startY = monster.mesh.position.y;
    const startZ = monster.mesh.position.z;

    // Show score popup and update total score
    const points = 50;
    showScorePopup(monster.position.x, monster.position.y, monster.position.z, points);

    gsap.to(monster.mesh.position, {
        z: startZ + forwardDirectionZ * 19,
        y: startY + 4.5,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
            monster.body.position.set(
                monster.mesh.position.x,
                monster.mesh.position.y + 0.5,
                monster.mesh.position.z
            );
        },
        onComplete: () => {
            gsap.to(monster.mesh.position, {
                y: -2,
                duration: 0.4,
                ease: "power2.in",
                onUpdate: () => {
                    monster.body.position.y = monster.mesh.position.y + 0.5;
                },
                onComplete: () => {
                    scene.remove(monster.mesh);
                    world.removeBody(monster.body);
                    monsters.splice(index, 1);
                }
            });
            gsap.to(monster.mesh.scale, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.4,
                ease: "power2.in"
            });
        }
    });

    gsap.to(monster.mesh.rotation, {
        x: forwardDirectionZ * Math.PI,
        duration: 0.7,
        ease: "linear"
    });
}

function defeatPlant(plant, index) {
    gsap.killTweensOf(plant.mesh.position);

    // Show score popup and update total score
    const points = 25;
    showScorePopup(plant.position.x, plant.position.y, plant.position.z, points);

    gsap.to(plant.mesh.scale, {
        y: 0.1,
        x: 0.3,
        z: 0.3,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
            gsap.to(plant.mesh.scale, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    scene.remove(plant.mesh);
                    plants.splice(index, 1);
                }
            });
        }
    });
}

function createCastle() {
    gltfLoader.load(
        'models/castle.glb',
        (gltf) => {
            castleModel = gltf.scene;
            castleModel.scale.set(0.003, 0.002, 0.002);
            castleModel.rotation.y = -Math.PI + Math.PI / 3;
            
            const castleZ = maxWorldZ + 60; // Changed from +70 to +60
            castleModel.position.set(0, 0, castleZ);
            scene.add(castleModel);

            const castleBody = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(new CANNON.Vec3(5, 5, 5))
            });
            castleBody.position.set(0, 5, castleZ);
            world.addBody(castleBody);

            console.log(`Castle placed at Z: ${castleZ}, maxWorldZ was: ${maxWorldZ}`);
        },
        undefined,
        (error) => {
            console.error('Error loading castle.glb:', error);
        }
    );
}

Promise.all([
    new Promise(resolve => fbxLoader.load('models/Idle.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/Running.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/jumping.fbx', resolve)),
    new Promise(resolve => gltfLoader.load('models/chain.glb', (gltf) => {
        chainModel = gltf.scene;
        chainModel.scale.set(0.005, 0.005, 0.005); // Adjust scale as needed
        // chainModel.rotation.y = -Math.PI / 2;
        resolve();
    }))
]).then(([idleObject, runObject, jumpObject]) => {
    characterModel = idleObject;
    characterModel.scale.set(0.02, 0.02, 0.02);
    characterModel.position.copy(startPosition);
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

    createBricks()
    .then(() => createCoins())
    .then(() => {
        console.log(`Before creating castle, maxWorldZ is: ${maxWorldZ}`);
        speedStageDistance1 = 133;
        speedStageDistance2 = 267;
        speedStageDistance3 = 600;
        console.log(`speedStageDistance1 set to: ${speedStageDistance1}`);
        console.log(`speedStageDistance2 set to: ${speedStageDistance2}`);
        console.log(`speedStageDistance3 set to: ${speedStageDistance3}`);
        createSpecialPipes(); // Create special pipes early
        updateSpecialPipesPosition(); // Move special pipes to final position
        createCastle();
        createChains(); // Create chains after special pipes
        createGiftBoxes();
        createClouds(characterModel.position.z);
        createPipesAndPlants();
        createGoombas();
        createScoreDisplay();
        createLivesDisplay();
        createMonsters();
        document.getElementById('sword-count').style.display = 'none';

        // Add Restart button listener
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', restartGame);
        } else {
            console.error("Restart button not found in DOM");
        }
        
        const lowScoreRestartButton = document.getElementById('low-score-restart-button');
        if (lowScoreRestartButton) {
            lowScoreRestartButton.addEventListener('click', restartGame);
        } else {
            console.error("Low Score Restart button not found in DOM");
        }
    })
    .catch((error) => {
        console.error('Error in setup chain:', error);
    });
});

let ambientLight = new THREE.AmbientLight('white', 1);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight('white', 6);
directionalLight.position.set(3, 2, 10);
scene.add(directionalLight);


let camera = new THREE.PerspectiveCamera(10, aspectRatio, 0.1, 2000);
camera.position.set(-100, 5, 0);
camera.lookAt(new THREE.Vector3(0, 1, 5));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);

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

// Near the top, after variable declarations
const handleKeyDown = (event) => {
    if ((event.key === 'ArrowUp' || event.key === 'Space') && !isJumping) {
        isJumping = true;
        verticalVelocity = jumpVelocity;
        setAction(jumpAction, 1.5);
        isUpKeyPressed = (event.key === 'ArrowUp');
        const jumpSound = new Audio('music/jump.wav');
        jumpSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
        jumpSound.play();
    } else if (event.key === 'ArrowRight' && runAction && idleAction) {
        if (!isRunningForward && !isRunningBackward) {
            setAction(runAction, 1.5);
            isRunningForward = true;
            characterModel.rotation.y = 0;
        }
        isRightKeyPressed = true;
    } else if (event.key === 'ArrowLeft' && runAction && idleAction) {
        if (!isRunningBackward && !isRunningForward) {
            setAction(runAction, 1.3);
            isRunningBackward = true;
            characterModel.rotation.y = Math.PI;
        }
        isLeftKeyPressed = true;
    }
    if (event.key === 'Enter' && hasSwordSkill) {
        spawnSwordProjectile();
    }
};

const handleKeyUp = (event) => {
    if (event.key === 'ArrowUp') {
        isUpKeyPressed = false;
    } else if (event.key === 'ArrowRight') {
        isRightKeyPressed = false;
        if (!isJumping && isRunningForward) {
            setAction(idleAction);
            isRunningForward = false;
        }
    } else if (event.key === 'ArrowLeft') {
        isLeftKeyPressed = false;
        if (!isJumping && isRunningBackward) {
            setAction(idleAction);
            isRunningBackward = false;
            characterModel.rotation.y = 0;
        }
    }
};


let gameStarted = false;

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    toggleFullscreen();
    animation();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleStartKey(event) {
    if (event.key === 'Enter' && !gameStarted) {
        showRuleScreen();
        window.removeEventListener('keydown', handleStartKey);
        window.addEventListener('keydown', handleRuleKey);
    }
}

// Add start screen key listener
window.addEventListener('keydown', handleStartKey);




function checkCoinCollisions() {
    if (!characterModel) return;
    
    const characterPosition = characterModel.position.clone();
    const collisionDistance = 1;
    
    coins.forEach(coin => {
        if (!coin.collected) {
            const distance = characterPosition.distanceTo(coin.mesh.position);
            if (distance < collisionDistance) {
                coin.collected = true;
                coin.mesh.visible = false;
                coinCount++;
                document.getElementById('score-display').innerHTML = `Coins: ${coinCount}`;
                const coinSound = new Audio('music/coin.wav');
                coinSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
                coinSound.play();
            }
        }
    });
}

function checkBrickCollisions() {
    if (!characterModel) return;
    
    const characterPosition = characterModel.position.clone();
    const characterHeight = 1;
    const boundingBoxSize = 0.5;
    let onBrick = false;
    let brickHeight = 0;
    let collisionAbove = false;

    for (const brick of bricks) {
        const brickPosition = brick.body.position;
        
        if (Math.abs(characterPosition.x - brickPosition.x) < boundingBoxSize &&
            Math.abs(characterModel.position.z - brickPosition.z) < boundingBoxSize) {
            if (characterPosition.y <= brickPosition.y + 0.5 && 
                characterPosition.y >= brickPosition.y - 0.1) {
                onBrick = true;
                brickHeight = brickPosition.y + 0.5;
                break;
            }
            else if (characterPosition.y < brickPosition.y + 0.5 &&
                     characterPosition.y > brickPosition.y - 0.5) {
                if (isRightKeyPressed) {
                    characterModel.position.z = brickPosition.z - 0.5;
                } else if (isLeftKeyPressed) {
                    characterModel.position.z = brickPosition.z + 0.5;
                }
            }
            else if (characterPosition.y + characterHeight > brickPosition.y - 0.5 && 
                     characterModel.position.y < brickPosition.y) {
                collisionAbove = true;
            }
        }
    }
    return { onBrick, brickHeight, collisionAbove };
}

let clock = new THREE.Clock();
let animation = () => {
    const delta = clock.getDelta();
    world.step(1/60, delta);

    if (mixer) {
        mixer.update(delta);
    }

    mushrooms.forEach(mushroom => {
        if (!mushroom.collected) {
            mushroom.mesh.lookAt(camera.position);
            mushroom.mesh.rotation.x = 0;
            mushroom.mesh.rotation.z = 0;
        }
    });

    swords.forEach(sword => {
        if (!sword.collected) {
            sword.mesh.rotation.y += 0.05;
            sword.mesh.lookAt(camera.position);
            sword.mesh.rotation.x = 0;
            sword.mesh.rotation.z = 0;
        }
    });

    if (characterModel && !isGameOver) {
        const characterZ = characterModel.position.z;

        const { onBrick, brickHeight, collisionAbove } = checkBrickCollisions();
        const { canMove, onPipe, pipeHeight } = checkPipeCollisions();
        const canMoveGiftBoxes = checkGiftBoxCollisions();
        const canMoveTotal = canMove && canMoveGiftBoxes;

        maxZReached = Math.max(maxZReached, characterModel.position.z);

        const currentTime = clock.getElapsedTime();
        if (isSlowed && currentTime >= slowEndTime) {
            isSlowed = false;
            runningSpeed = speedStage === 1 ? originalRunningSpeed : speedStage === 2 ? 9 : speedStage === 3 ? 11 : 14;
            backwardSpeed = speedStage === 1 ? originalBackwardSpeed : speedStage === 2 ? originalBackwardSpeed * 1.2857 : speedStage === 3 ? originalBackwardSpeed * 1.5714 : originalBackwardSpeed * 2;
            console.log(`Slow effect ended, speed restored to ${runningSpeed}`);
        }

        if (!isSlowed) {
            if (speedStageDistance1 && characterZ > speedStageDistance1 && speedStage === 1) {
                speedStage = 2;
                runningSpeed = 9;
                backwardSpeed = originalBackwardSpeed * 1.2857;
                goombaSpeed = originalGoombaSpeed * 1.25;
                brickGoombaSpeed = originalBrickGoombaSpeed * 1.125;
                monsterSpeed = originalMonsterSpeed * 1.25;
                console.log("Speed Stage 2: runningSpeed to 9, brickGoombaSpeed to 2.25");
            } else if (speedStageDistance2 && characterZ > speedStageDistance2 && speedStage === 2) {
                speedStage = 3;
                runningSpeed = 11;
                backwardSpeed = originalBackwardSpeed * 1.5714;
                goombaSpeed = originalGoombaSpeed * 1.5;
                brickGoombaSpeed = originalBrickGoombaSpeed * 1.25;
                monsterSpeed = originalMonsterSpeed * 1.5;
                console.log("Speed Stage 3: runningSpeed to 11, brickGoombaSpeed to 2.5");
            } else if (speedStageDistance3 && characterZ > speedStageDistance3 && speedStage === 3) {
                speedStage = 4;
                runningSpeed = 12.5;
                backwardSpeed = originalBackwardSpeed * 2;
                goombaSpeed = originalGoombaSpeed * 1.75;
                brickGoombaSpeed = originalBrickGoombaSpeed * 1.25;
                monsterSpeed = originalMonsterSpeed * 1.75;
                console.log("Speed Stage 4: runningSpeed to 12.5, brickGoombaSpeed to 2.5");
            }

            if (speedStage === 4) {
                runningSpeed = 12.5;
            }
        }

        if (speedStage !== lastSpeedStage) {
            goombas.forEach(goomba => {
                if (goomba.isOnBrick && goomba.moving) {
                    gsap.killTweensOf(goomba.position);
                    const travelDistance = goomba.zMax - goomba.zMin;
                    const newDuration = travelDistance / brickGoombaSpeed / 2;
                    gsap.to(goomba.position, {
                        duration: newDuration / 2,
                        z: goomba.position.z < (goomba.zMin + goomba.zMax) / 2 ? goomba.zMax : goomba.zMin,
                        ease: "linear",
                        onComplete: () => {
                            gsap.to(goomba.position, {
                                z: goomba.position.z === goomba.zMax ? goomba.zMin : goomba.zMax,
                                duration: newDuration,
                                ease: "linear",
                                repeat: -1,
                                yoyo: true,
                                onUpdate: () => {
                                    goomba.body.position.z = goomba.position.z;
                                    goomba.body.position.y = goomba.position.y + 0.5;
                                }
                            });
                        },
                        onUpdate: () => {
                            goomba.body.position.z = goomba.position.z;
                            goomba.body.position.y = goomba.position.y + 0.5;
                        }
                    });
                }
            });
            lastSpeedStage = speedStage;
        }

        if (isPoweredUp) {
            const stageSpeed = speedStage === 1 ? 6 : speedStage === 2 ? 8 : speedStage === 3 ? 10 : 12;
            runningSpeed = Math.max(runningSpeed, stageSpeed);
            backwardSpeed = Math.max(backwardSpeed, originalBackwardSpeed * 1.5);
        }

        const groundLevel = 0.1;
        let baseY = groundLevel;
        if (onPipe) {
            baseY = pipeHeight;
        } else if (onBrick) {
            baseY = brickHeight;
        }

        if (isRightKeyPressed && canMoveTotal) {
            characterModel.position.z += runningSpeed * delta;
            if (!isRunningForward && !isJumping) {
                setAction(runAction, 1.5);
                isRunningForward = true;
                characterModel.rotation.y = 0;
            }
        } else if (isLeftKeyPressed && canMoveTotal) {
            const newZ = characterModel.position.z - backwardSpeed * delta;
            if (newZ >= maxZReached - 8 && canMoveTotal) {
                characterModel.position.z = newZ;
                if (!isRunningBackward && !isJumping) {
                    setAction(runAction, 1.3);
                    isRunningBackward = true;
                    characterModel.rotation.y = Math.PI;
                }
            } else {
                characterModel.position.z = maxZReached - 5;
                if (!isJumping && !isRunningBackward) {
                    setAction(runAction, 1.3);
                    isRunningBackward = true;
                    characterModel.rotation.y = Math.PI;
                }
            }
        }

        if (isJumping || characterModel.position.y > baseY) {
            verticalVelocity -= gravity * delta;
            const characterHeight = isPoweredUp ? 1.5 : 1;
            const nextY = characterModel.position.y + verticalVelocity * delta;

            const { canMove: pipeCanMove, onPipe: pipeOnPipe, pipeHeight: pipeHeightDynamic } = checkPipeCollisions();
            const canMoveGiftBoxesDynamic = checkGiftBoxCollisions();

            if (collisionAbove && verticalVelocity > 0) {
                const blockingBrick = bricks.find(brick => 
                    Math.abs(characterModel.position.x - brick.body.position.x) < 0.5 &&
                    Math.abs(characterModel.position.z - brick.body.position.z) < 0.5 &&
                    characterModel.position.y + characterHeight > brick.body.position.y - 0.5 &&
                    characterModel.position.y < brick.body.position.y
                );
                if (blockingBrick) {
                    characterModel.position.y = blockingBrick.body.position.y - characterHeight;
                    verticalVelocity = -jumpVelocity * 0.8;
                    isJumping = true;
                }
            } else {
                characterModel.position.y = nextY;
            }

            if (characterModel.position.y <= baseY) {
                characterModel.position.y = baseY;
                verticalVelocity = 0;
                isJumping = false;
                if (isRightKeyPressed && canMoveTotal) {
                    setAction(runAction, 1.5);
                    isRunningForward = true;
                    characterModel.rotation.y = 0;
                } else if (isLeftKeyPressed && canMoveTotal) {
                    setAction(runAction, 1.3);
                    isRunningBackward = true;
                    characterModel.rotation.y = Math.PI;
                } else {
                    setAction(idleAction);
                    isRunningForward = false;
                    isRunningBackward = false;
                }
            }
        } else {
            characterModel.position.y = baseY;
            if (!isRightKeyPressed && !isLeftKeyPressed && activeAction !== idleAction && !isJumping) {
                setAction(idleAction);
                isRunningForward = false;
                isRunningBackward = false;
            }
        }

        camera.position.z = characterModel.position.z;
        camera.position.x = characterModel.position.x - 100;
        camera.position.y = 1;
        camera.lookAt(new THREE.Vector3(characterModel.position.x, 1, characterModel.position.z + 5));
        
        checkCoinCollisions();
        checkPlantCollisions();
        checkMushroomCollisions();
        checkHeartCollisions();
        checkSwordCollisions();
        checkMonsterCollisions();
        checkSwordProjectileCollisions();
        checkChainCollisions(); // Add chain collision check

        spawnClouds(characterZ);
        spawnPipesAndPlants(characterZ);
        spawnGoombas(characterZ);
        checkGoombaCollisions();
        spawnMonsters(characterZ);

        const castleTriggerDistance = 1;
        if (castleModel && Math.abs(characterModel.position.z - castleModel.position.z) < castleTriggerDistance && !isGameOver && lives > 0) {
            console.log(`Reached the castle! Total Score: ${totalScore}, Coins: ${coinCount}`);

            const endReachSound = new Audio('music/endreach.wav');
            endReachSound.volume = 0.5;
            endReachSound.play();

            isGameOver = true;
            setAction(idleAction);
            isRunningForward = false;
            isRunningBackward = false;
            isJumping = false;
            verticalVelocity = 0;
        
            if (totalScore > 3000 && coinCount >= 150) {
                console.log("Score > 3000 and Coins >= 150, proceeding to Level 2...");


                document.querySelector('.loader-background').style.display = 'block';
                document.querySelector('.loader').style.display = 'block';
                const style = document.createElement('style');
                style.id = 'level2-loader-style';
                style.textContent = `.loader::before { content: "Loading Level 2..."; }`;
                document.head.appendChild(style);
        
                // Redirect to level2.html after 3-second delay
                setTimeout(() => {
                    window.location.href = 'level2.html';
                }, 3000);
            } else {
                console.log(`Conditions not met (Score: ${totalScore} <= 3000 or Coins: ${coinCount} < 150), showing Low Score Game Over screen...`);
                showLowScoreGameOver();
            }
        }

        const cleanupDistance = 50;

        for (let i = clouds.length - 1; i >= 0; i--) {
            const cloudZ = clouds[i].position.z;
            if (cloudZ < maxZReached - cleanupDistance) {
                scene.remove(clouds[i].mesh);
                clouds.splice(i, 1);
            }
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipeZ = pipes[i].position.z;
            if (pipeZ < maxZReached - cleanupDistance) {
                scene.remove(pipes[i].mesh);
                world.removeBody(pipes[i].body);
                pipes.splice(i, 1);
            }
        }

        for (let i = plants.length - 1; i >= 0; i--) {
            const plantZ = plants[i].position.z;
            if (plantZ < maxZReached - cleanupDistance) {
                gsap.killTweensOf(plants[i].mesh.position);
                scene.remove(plants[i].mesh);
                plants.splice(i, 1);
            }
        }

        for (let i = coins.length - 1; i >= 0; i--) {
            const coinZ = coins[i].position.z;
            if (coinZ < maxZReached - cleanupDistance) {
                if (!coins[i].collected) {
                    scene.remove(coins[i].mesh);
                }
                coins.splice(i, 1);
            }
        }

        for (let i = bricks.length - 1; i >= 0; i--) {
            const brickZ = bricks[i].position.z;
            if (brickZ < maxZReached - cleanupDistance) {
                scene.remove(bricks[i].mesh);
                world.removeBody(bricks[i].body);
                bricks.splice(i, 1);
            }
        }

        for (let i = giftBoxes.length - 1; i >= 0; i--) {
            const boxZ = giftBoxes[i].position.z;
            if (boxZ < maxZReached - cleanupDistance) {
                scene.remove(giftBoxes[i].mesh);
                world.removeBody(giftBoxes[i].body);
                giftBoxes.splice(i, 1);
            }
        }

        for (let i = mushrooms.length - 1; i >= 0; i--) {
            const mushroomZ = mushrooms[i].position.z;
            if (mushrooms[i].collected || mushroomZ < maxZReached - cleanupDistance) {
                scene.remove(mushrooms[i].mesh);
                world.removeBody(mushrooms[i].body);
                mushrooms.splice(i, 1);
            }
        }

        for (let i = hearts.length - 1; i >= 0; i--) {
            const heartZ = hearts[i].position.z;
            if (hearts[i].collected || heartZ < maxZReached - cleanupDistance) {
                scene.remove(hearts[i].mesh);
                world.removeBody(hearts[i].body);
                hearts.splice(i, 1);
            }
        }

        for (let i = swords.length - 1; i >= 0; i--) {
            const swordZ = swords[i].position.z;
            if (swords[i].collected || swordZ < maxZReached - cleanupDistance) {
                scene.remove(swords[i].mesh);
                world.removeBody(swords[i].body);
                swords.splice(i, 1);
            }
        }

        for (let i = goombas.length - 1; i >= 0; i--) {
            const goombaZ = goombas[i].position.z;
            if (goombaZ < maxZReached - cleanupDistance || goombas[i].defeated) {
                if (!goombas[i].defeated) {
                    gsap.killTweensOf(goombas[i].mesh.position);
                    gsap.killTweensOf(goombas[i].mesh.scale);
                    scene.remove(goombas[i].mesh);
                    world.removeBody(goombas[i].body);
                }
                goombas.splice(i, 1);
            }
        }

        for (let i = monsters.length - 1; i >= 0; i--) {
            const monsterZ = monsters[i].position.z;
            if (monsterZ < maxZReached - cleanupDistance) {
                gsap.killTweensOf(monsters[i].mesh.position);
                scene.remove(monsters[i].mesh);
                world.removeBody(monsters[i].body);
                monsters.splice(i, 1);
            }
        }

        for (let i = swordProjectiles.length - 1; i >= 0; i--) {
            const projectile = swordProjectiles[i];
            if (!projectile.active || projectile.mesh.position.z < maxZReached - 50) {
                gsap.killTweensOf(projectile.mesh.position);
                scene.remove(projectile.mesh);
                world.removeBody(projectile.body);
                swordProjectiles.splice(i, 1);
                console.log("Cleaned up inactive sword projectile at index", i);
            }
        }

        // Cleanup chains
        for (let i = chains.length - 1; i >= 0; i--) {
            const chain = chains[i];
            const chainZ = chain.position.z;
            const chainY = chain.mesh.position.y;
            const isUpper = chain.isUpper;
            if (chainZ < maxZReached - 50 || (isUpper && chainY < -2) || (!isUpper && chainY > 12)) {
                gsap.killTweensOf(chain.mesh.position);
                scene.remove(chain.mesh);
                chains.splice(i, 1);
            }
        }
    }
    
    coins.forEach(coin => {
        if (!coin.collected) {
            coin.mesh.rotation.y += 0.03;
        }
    });

    giftBoxes.forEach(box => {
        if (box.hasMushroom || box.hasHeart || box.hasSword) {
            box.mesh.rotation.y += 0.02;
        }
    });

    hearts.forEach(heart => {
        if (!heart.collected) {
            heart.mesh.lookAt(camera.position);
            heart.mesh.rotation.x = 0;
            heart.mesh.rotation.z = 0;
        }
    });

    mushrooms.forEach(mushroom => {
        if (!mushroom.collected) {
            mushroom.mesh.lookAt(camera.position);
            mushroom.mesh.rotation.x = 0;
            mushroom.mesh.rotation.z = 0;
        }
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animation);
};
