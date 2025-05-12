import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
let introMusic = null;


// Hide coin, diamond, and score displays
document.getElementById('score-display')?.style.setProperty('display', 'none');
document.getElementById('diamond-display')?.style.setProperty('display', 'none');
document.getElementById('total-score-display')?.style.setProperty('display', 'none');
document.getElementById('score-popups')?.style.setProperty('display', 'none');

// Ensure health bar is in top left for final level
const healthBarContainer = document.querySelector('.health-bar-container');
if (healthBarContainer) {
    healthBarContainer.style.left = '20px';
    healthBarContainer.style.top = '20px';
    healthBarContainer.style.transform = 'none';
}


const monsterHealthBarContainer = document.querySelector('.monster-health-bar-container');
if (monsterHealthBarContainer) {
    monsterHealthBarContainer.style.right = '60px';
    monsterHealthBarContainer.style.top = '20px';
    monsterHealthBarContainer.style.transform = 'none';
}



// Fullscreen button functionality
const fullscreenButton = document.getElementById('fullscreen-button');

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

    canvas.tabIndex = 0;

    // Inject fullscreen styles to ensure UI elements remain visible
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        :fullscreen .health-bar-container,
        :fullscreen .monster-health-bar-container,
        :fullscreen .ability-icons {
            display: flex !important;
            visibility: visible !important;
        }

        :-webkit-full-screen .health-bar-container,
        :-webkit-full-screen .monster-health-bar-container,
        :-webkit-full-screen .ability-icons {
            display: flex !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(styleElement);
}




const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => {
    document.querySelector('.loader-background').style.display = 'block';
    document.querySelector('.loader').style.display = 'block';
};
loadingManager.onLoad = () => {
    document.querySelector('.loader-background').style.display = 'none';
    document.querySelector('.loader').style.display = 'none';
    if (!hasShownRuleScreen && ruleScreen && !hasShownDisplayScreen) {
        hasShownRuleScreen = true;
        showRuleScreen();
        window.addEventListener('keydown', handleRuleKey);
    }
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




canvas.style.display = 'none';
const ruleScreen = document.getElementById('rule-screen');
const ruleImage = document.getElementById('rule-image');
const ruleImages = ['images/level3-1.png', 'images/level3-2.png'];
let currentRuleIndex = 0;
let hasShownRuleScreen = false;

function showRuleScreen() {
    if (ruleScreen) {
        ruleScreen.style.display = 'flex';
        canvas.style.display = 'none';
        currentRuleIndex = 0;
        if (ruleImage) ruleImage.src = ruleImages[currentRuleIndex];
    }
}

function handleRuleKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        currentRuleIndex++; // Fixed typo: changed currentRulegmtIndex to currentRuleIndex
        if (currentRuleIndex < ruleImages.length) {
            if (ruleImage) ruleImage.src = ruleImages[currentRuleIndex];
        } else {
            if (ruleScreen) {
                ruleScreen.style.display = 'none';
                window.removeEventListener('keydown', handleRuleKey);
                introMusic = new Audio('music/intro.mp3');
                introMusic.loop = true;
                introMusic.volume = 0.3;
                introMusic.play();
                if (displayScreen && !hasShownDisplayScreen) {
                    hasShownDisplayScreen = true;
                    displayScreen.style.display = 'flex';
                    window.addEventListener('keydown', handleDisplayKey);
                }
            }
        }
    }
}





const displayScreen = document.getElementById('display-screen');
let hasShownDisplayScreen = false;

function handleDisplayKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (displayScreen) {
            displayScreen.style.display = 'none';
            window.removeEventListener('keydown', handleDisplayKey);
            canvas.style.display = 'block';
            const powerupSound = new Audio('music/growing.wav');
            powerupSound.volume = 0.5;
            powerupSound.play();
            gsap.to(characterModel.scale, {
                x: 0.07,
                y: 0.07,
                z: 0.07,
                duration: 4,
                ease: "power2.out"
            });
            toggleFullscreen();
            if (characterModel && platforms.length === 0) {
                createPlatforms();
                if (platforms.length > 0) {
                    animation();
                }
            }
        }
    }
}




const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

const platformColor = 0x5A5A5A;
const platforms = [];
let preloadedMonster = null;
let finalMonster = null; // Track the final monster6.glb

let playerHealth = 100; // Single health bar system
let monsterHealth = 100; // Monster starts with 100% health
let preloadedFire = null;
let lastJumpTime = 0;
const jumpInterval = 8; // 8 seconds
let isMonsterVisible = false;
let monsterVisibleTime = 0;
let preloadedPlayerFireball = null;
let isMonsterInContact = false; // Tracks if monster is currently touching character
let preloadedShield = null;
let isGameOver = false;


// Global punch counter
let punchCount = 0;
let firstPlatformY = 0;

let lastShieldSpawnTime = -Infinity; // Allow first shield to spawn immediately
const shieldCooldown = 6; // 6 seconds cooldown

let lastFireballSpawnTime = -Infinity; // Allow first fireball to spawn immediately
const fireballCooldown = 6; // 6 seconds cooldown

function updateHealthBar() {
    const healthBar = document.querySelector('.health-bar');
    const gameOverText = document.querySelector('.game-over-text');

    if (healthBar) {
        healthBar.style.width = `${playerHealth}%`;
    }

    if (playerHealth <= 0 && !isGameOver) {
        showGameOver();
        if (gameOverText) {
            gameOverText.style.display = 'none'; // Hide redundant text
        }
    } else {
        if (gameOverText) {
            gameOverText.style.display = 'none';
        }
    }
}


function updateMonsterHealthBar() {
    const monsterHealthBar = document.querySelector('.monster-health-bar');
    if (monsterHealthBar) {
        monsterHealthBar.style.width = `${monsterHealth}%`;
    }
}

// Initialize health bar
updateHealthBar();
updateMonsterHealthBar();


function showGameOver() {


        if (introMusic) {
    introMusic.pause();
    introMusic.currentTime = 0; // Reset to start
    }


    const gameOverSound = new Audio('music/gameover.wav');
    gameOverSound.volume = 0.5; // Adjust volume (0.0 to 1.0)
    gameOverSound.play();

    if (isGameOver) return; // Prevent multiple calls
    isGameOver = true;
    isJumping = false;
    isPunching = false;
    isRightKeyPressed = false;
    isLeftKeyPressed = false;

    // Show game over screen
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    }

    // Hide final-score and final-coins
    const finalScore = document.getElementById('final-score');
    const finalCoins = document.getElementById('final-coins');
    if (finalScore) finalScore.style.display = 'none';
    if (finalCoins) finalCoins.style.display = 'none';

    // Style restart button wrapper (move "a bit upper" than Level 2)
    const restartButtonWrapper = document.getElementById('restart-button-wrapper');
    if (restartButtonWrapper) {
        restartButtonWrapper.style.transform = 'translate(-10px, -120px)';
        restartButtonWrapper.style.marginTop = '10px';
    }

    // Stop animations and inputs
    if (mixer) {
        mixer.stopAllAction();
        setAction(idleAction);
    }
    gsap.killTweensOf(finalMonster?.position); // Stop monster jumps
    scene.traverse((object) => {
        if (object.userData.direction || object.userData.spawnTime) {
            gsap.killTweensOf(object.position); // Stop fireballs and shields
        }
    });

    // Disable keyboard inputs
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}


function restartGame() {
    console.log("Restarting game, redirecting to index.html");
    window.location.href = 'index.html';
}

// Attach restart button listener
const restartButton = document.getElementById('restart-button');
if (restartButton) {
    restartButton.addEventListener('click', restartGame);
    console.log("Restart button listener added");
}


const winRestartButton = document.getElementById('win-restart-button');
if (winRestartButton) {
    winRestartButton.addEventListener('click', restartGame);
    console.log("Win restart button listener added");
}



function showWinScreen() {

    
    if (isGameOver) return;
    isGameOver = true;
    isJumping = false;
    isPunching = false;
    isRightKeyPressed = false;
    isLeftKeyPressed = false;

    const winScreen = document.getElementById('win-screen');
    if (winScreen) {
        winScreen.style.display = 'flex';

        if (introMusic) {
        introMusic.pause();
        introMusic.currentTime = 0;
        }
        const winSound = new Audio('music/mariowins.mp3');
        winSound.volume = 0.5;
        winSound.play();

        console.log("Win screen displayed: flex");
    }

    const whiteLine = document.querySelector('.white-line');
    const blackLine = document.querySelector('.black-line');
    const marioText = document.querySelector('.mario-text');
    const winsText = document.querySelector('.wins-text');
    const marioImage = document.querySelector('.mario-image');
    if (whiteLine) whiteLine.classList.add('animate');
    if (blackLine) blackLine.classList.add('animate');
    if (marioText) marioText.classList.add('animate');
    if (winsText) winsText.classList.add('animate');
    if (marioImage) marioImage.classList.add('animate');

    const winRestartButtonWrapper = document.querySelector('.win-restart-button-wrapper');
    if (winRestartButtonWrapper) {
        winRestartButtonWrapper.style.zIndex = '1003';
        gsap.to(winRestartButtonWrapper, {
            opacity: 1,
            duration: 0.5,
            delay: 0.8,
            ease: "power2.in"
        });
        console.log("Win restart button wrapper animated:", {
            zIndex: winRestartButtonWrapper.style.zIndex,
            opacity: getComputedStyle(winRestartButtonWrapper).opacity
        });
    }

    const healthBarContainer = document.querySelector('.health-bar-container');
    const monsterHealthBarContainer = document.querySelector('.monster-health-bar-container');
    const abilityIcons = document.querySelector('.ability-icons');
    if (healthBarContainer) healthBarContainer.style.display = 'none';
    if (monsterHealthBarContainer) monsterHealthBarContainer.style.display = 'none';
    if (abilityIcons) abilityIcons.style.display = 'none';

    if (mixer) {
        mixer.stopAllAction();
        setAction(idleAction);
    }
    gsap.killTweensOf(finalMonster?.position);
    scene.traverse((object) => {
        if (object.userData.direction || object.userData.spawnTime) {
            gsap.killTweensOf(object.position);
        }
    });

    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}



const fireballIcon = document.getElementById('fireball-icon');
const shieldIcon = document.getElementById('shield-icon');
const punchIcon = document.getElementById('punch-icon');
if (fireballIcon) fireballIcon.style.visibility = 'visible';
if (shieldIcon) shieldIcon.style.visibility = 'visible';
if (punchIcon) punchIcon.style.visibility = 'visible';

function createPlatforms() {
    const platformMaterial = new THREE.MeshPhysicalMaterial({ 
        color: platformColor,
        metalness: 0.3,
        roughness: 0.7
    });

    // Single small platform
    const platformWidth = 4;
    const platformDepth = 1000;
    const platformHeight = 0.4;
    const yPos = -3;
    const zPos = 30;

    const platformGeometry = new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth);
    
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

    // Add seven Goombas
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.load('models/goomba.glb', (gltf) => {
        const originalGoomba = gltf.scene;

        // Define Goombas with updated z positions (+8 units)
        const centerGoomba = originalGoomba.clone();
        centerGoomba.scale.set(0.2, 0.2, 0.2);
        centerGoomba.rotation.y = -Math.PI / 2;
        centerGoomba.position.set(0, yPos + platformHeight / 2 + 0.1, 18);
        scene.add(centerGoomba);

        const forwardGoomba = originalGoomba.clone();
        forwardGoomba.scale.set(0.2, 0.2, 0.2);
        forwardGoomba.rotation.y = -Math.PI / 2;
        forwardGoomba.position.set(0, yPos + platformHeight / 2 + 2.5, 21);
        scene.add(forwardGoomba);

        const backwardGoomba = originalGoomba.clone();
        backwardGoomba.scale.set(0.2, 0.2, 0.2);
        backwardGoomba.rotation.y = -Math.PI / 2;
        backwardGoomba.position.set(0, yPos + platformHeight / 2 + 2.5, 15);
        scene.add(backwardGoomba);

        const topForwardGoomba = originalGoomba.clone();
        topForwardGoomba.scale.set(0.2, 0.2, 0.2);
        topForwardGoomba.rotation.y = -Math.PI / 2;
        topForwardGoomba.position.set(0, yPos + platformHeight / 2 + 4.5, 21);
        scene.add(topForwardGoomba);

        const topBackwardGoomba = originalGoomba.clone();
        topBackwardGoomba.scale.set(0.2, 0.2, 0.2);
        topBackwardGoomba.rotation.y = -Math.PI / 2;
        topBackwardGoomba.position.set(0, yPos + platformHeight / 2 + 4.5, 15);
        scene.add(topBackwardGoomba);

        const firstTopCenterGoomba = originalGoomba.clone();
        firstTopCenterGoomba.scale.set(0.2, 0.2, 0.2);
        firstTopCenterGoomba.rotation.y = -Math.PI / 2;
        firstTopCenterGoomba.position.set(0, yPos + platformHeight / 2 + 3.3, 18);
        scene.add(firstTopCenterGoomba);

        const secondTopCenterGoomba = originalGoomba.clone();
        secondTopCenterGoomba.scale.set(0.2, 0.2, 0.2);
        secondTopCenterGoomba.rotation.y = -Math.PI / 2;
        secondTopCenterGoomba.position.set(0, yPos + platformHeight / 2 + 6.5, 18);
        scene.add(secondTopCenterGoomba);

        const goombaPositions = [
            { x: 0, y: yPos + platformHeight / 2 + 0.1, z: 18 },
            { x: 0, y: yPos + platformHeight / 2 + 2.5, z: 21 },
            { x: 0, y: yPos + platformHeight / 2 + 4.5, z: 21 },
            { x: 0, y: yPos + platformHeight / 2 + 6.5, z: 18 },
            { x: 0, y: yPos + platformHeight / 2 + 4.5, z: 15 },
            { x: 0, y: yPos + platformHeight / 2 + 2.5, z: 15 }
        ];

        const goombas = [
            centerGoomba,
            forwardGoomba,
            topForwardGoomba,
            secondTopCenterGoomba,
            topBackwardGoomba,
            backwardGoomba
        ];

        const tl = gsap.timeline({ repeat: 0, defaults: { duration: 0.5, ease: "power1.inOut" } });

        for (let step = 0; step < 3; step++) {
            goombas.forEach((goomba, index) => {
                const nextIndex = (index + step + 1) % goombaPositions.length;
                const targetPosition = goombaPositions[nextIndex];

                tl.to(goomba.position, {
                    x: targetPosition.x,
                    y: targetPosition.y,
                    z: targetPosition.z,
                    onComplete: () => {
                        goomba.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
                    }
                }, step);
            });
        }

        const integrationPosition = {
            x: 0,
            y: yPos + platformHeight / 2 + 3.3,
            z: 18
        };

        goombas.forEach((goomba) => {
            tl.to(goomba.position, {
                x: integrationPosition.x,
                y: integrationPosition.y,
                z: integrationPosition.z,
                duration: 0.25,
                onComplete: () => {
                    goomba.position.set(integrationPosition.x, integrationPosition.y, integrationPosition.z);
                }
            }, 1.5);
        });

        tl.call(() => {
            const allGoombas = [...goombas, firstTopCenterGoomba];
            allGoombas.forEach((goomba) => {
                scene.remove(goomba);
                goomba.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            });

            if (preloadedMonster) {
                finalMonster = preloadedMonster.clone();
                finalMonster.scale.set(0.08, 0.08, 0.08);
                finalMonster.rotation.y = -Math.PI / 1.5;
                finalMonster.position.set(0, yPos + platformHeight / 2 + 0.1, 18);
                finalMonster.traverse((child) => {
                    if (child.isMesh) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.transparent = true;
                                mat.opacity = 0;
                            });
                        } else {
                            child.material.transparent = true;
                            child.material.opacity = 0;
                        }
                    }
                });
                scene.add(finalMonster);

                finalMonster.traverse((child) => {
                    if (child.isMesh) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                tl.to(mat, {
                                    opacity: 1,
                                    duration: 0.5,
                                    ease: "power2.in"
                                }, 1.5);
                            });
                        } else {
                            tl.to(child.material, {
                                opacity: 1,
                                duration: 0.5,
                                ease: "power2.in"
                            }, 1.5);
                        }
                    }
                });

                tl.to(finalMonster.position, {
                    y: yPos + platformHeight / 2 - 0.5,
                    duration: 0.5,
                    ease: "power2.out",
                    onComplete: () => {
                        finalMonster.position.set(0, yPos + platformHeight / 2 - 0.5, 18);
                        isMonsterVisible = true;
                        monsterVisibleTime = clock.getElapsedTime();
                    }
                }, 1.5);
            } else {
                console.warn('Preloaded monster6.glb not available');
            }
        }, null, 1.80);
    }, undefined, (error) => {
        console.error('Error loading goomba.glb:', error);
    });

    platforms.push({
        mesh: platformMesh,
        body: platformBody,
        position: new THREE.Vector3(0, yPos, zPos),
        width: platformWidth,
        depth: platformDepth,
        height: platformHeight
    });

    firstPlatformY = yPos + platformHeight / 2;

    characterModel.position.set(0, firstPlatformY + 0.1, 0);
}


function spawnFire() {
    if (!preloadedFire || !finalMonster || !characterModel) return;

    const fire = preloadedFire.clone();
    fire.scale.set(2, 2, 2);
    fire.position.set(
        finalMonster.position.x,
        finalMonster.position.y + 2, // Start slightly above monster's base
        finalMonster.position.z
    );
    fire.rotation.y = Math.PI / 4;
    scene.add(fire);

    // Target the character's center
    const targetPosition = new THREE.Vector3(
        characterModel.position.x,
        characterModel.position.y + 1, // Aim at character's center (assuming height ~2)
        characterModel.position.z
    );
    const direction = new THREE.Vector3()
        .subVectors(targetPosition, fire.position)
        .normalize();
    const speed = 30;

    fire.userData = { direction, speed, hasHit: false };

    return fire;
}


function spawnPlayerFireball() {
    if (!preloadedPlayerFireball || !finalMonster || !characterModel) return;

    const fireball = preloadedPlayerFireball.clone();
    fireball.scale.set(0.7, 0.7, 0.7);
    fireball.position.set(
        characterModel.position.x,
        characterModel.position.y + 2.5, // Updated: Start lower
        characterModel.position.z + 1 // Updated: Closer to character
    );
    fireball.rotation.y = -Math.PI / 4;
    scene.add(fireball);

    const direction = new THREE.Vector3()
        .subVectors(
            new THREE.Vector3(
                finalMonster.position.x,
                finalMonster.position.y + 2.5, // Updated: Target higher
                finalMonster.position.z
            ),
            fireball.position
        )
        .normalize();
    const speed = 30;

    fireball.userData = { direction, speed, isPlayerFireball: true };

    return fireball;
}


function createBrickBorders() {
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.load('models/brick3.glb', (gltf) => {
        const topBorderContainer = new THREE.Group();
        const bottomBorderContainer = new THREE.Group();
        scene.add(topBorderContainer);
        scene.add(bottomBorderContainer);
        
        const originalBrick = gltf.scene;
        
        const brickScale = 2;
        
        const tempBrick = originalBrick.clone();
        tempBrick.scale.set(brickScale, brickScale, brickScale);
        
        const brickBoundingBox = new THREE.Box3().setFromObject(tempBrick);
        const brickSize = new THREE.Vector3();
        brickBoundingBox.getSize(brickSize);
        
        const totalBricks = 15;
        const overlapFactor = 0.47;
        const brickLength = brickSize.z;
        const effectiveLength = brickLength * (1 - overlapFactor);
        
        const topBorderY = 0.05;
        const topLeftOffset = -37.6;
        
        const bottomBorderY = -9.1;
        const bottomLeftOffset = -37.6;
        
        for (let i = 0; i < totalBricks; i++) {
            const brick = originalBrick.clone();
            brick.scale.set(brickScale, brickScale, brickScale);
            
            const zPos = (i * effectiveLength * brickScale) - (2 * brickLength * brickScale);
            
            brick.position.set(topLeftOffset, topBorderY, zPos);
            
            topBorderContainer.add(brick);
        }
        
        for (let i = 0; i < totalBricks; i++) {
            const brick = originalBrick.clone();
            brick.scale.set(brickScale, brickScale, brickScale);
            
            const zPos = (i * effectiveLength * brickScale) - (2 * brickLength * brickScale);
            
            brick.position.set(bottomLeftOffset, bottomBorderY, zPos);
            
            bottomBorderContainer.add(brick);
        }

        window.topBorderContainer = topBorderContainer;
        window.bottomBorderContainer = bottomBorderContainer;
    }, undefined, (error) => {
        console.error('Error loading brick3.glb:', error);
    });
}

createBrickBorders();

function updateBorderPositions() {
    if (window.topBorderContainer && window.bottomBorderContainer && characterModel) {
        window.topBorderContainer.position.z = characterModel.position.z;
        window.bottomBorderContainer.position.z = characterModel.position.z;
    }
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
let punchAction;
let activeAction;
let previousAction;
const jumpVelocity = 15;
let verticalVelocity = 0;
let isJumping = false;
let isRightKeyPressed = false;
let isLeftKeyPressed = false;
let isPunching = false;
let runningSpeed = 7;
let backwardSpeed = 5;
const gravity = 25.82;

const fbxLoader = new FBXLoader(loadingManager);

Promise.all([
    new Promise(resolve => fbxLoader.load('models/Idle.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/Running.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/Jumping.fbx', resolve)),
    new Promise(resolve => fbxLoader.load('models/Punching2.fbx', resolve)),
    new Promise(resolve => {
        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('models/monster6.glb', (gltf) => {
            preloadedMonster = gltf.scene;
            resolve();
        }, undefined, (error) => {
            console.error('Error preloading monster6.glb:', error);
            resolve();
        });
    }),
    new Promise(resolve => {
        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('models/firefinal.glb', (gltf) => {
            preloadedFire = gltf.scene;
            resolve();
        }, undefined, (error) => {
            console.error('Error preloading finalfire.glb:', error);
            resolve();
        });
    }),
    new Promise(resolve => {
        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('models/fireball.glb', (gltf) => {
            preloadedPlayerFireball = gltf.scene;
            resolve();
        }, undefined, (error) => {
            console.error('Error preloading fireball.glb:', error);
            resolve();
        });
    }),
    new Promise(resolve => {
        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('models/shield2.glb', (gltf) => {
            preloadedShield = gltf.scene;
            resolve();
        }, undefined, (error) => {
            console.error('Error preloading shield.glb:', error);
            resolve();
        });
    })
]).then(([idleObject, runObject, jumpObject, punchObject]) => {
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

    const punchClip = punchObject.animations[0];
    if (punchClip) {
        punchClip.tracks = punchClip.tracks.filter(track => !track.name.includes('.position'));
        punchAction = mixer.clipAction(punchClip);
        punchAction.setLoop(THREE.LoopOnce);
        punchAction.clampWhenFinished = true;
        punchAction.timeScale = 1.5;
    }

    
}).catch(error => {
    console.error('Error loading character animations:', error);
});

let ambientLight = new THREE.AmbientLight('white', 1.5);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight('white', 2);
directionalLight.position.set(-3, 2, -5);
scene.add(directionalLight);

let directionalLight1 = new THREE.DirectionalLight('white', 2);
directionalLight1.position.set(4, 2, 10);
scene.add(directionalLight1);

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
        previousAction = activeAction;
        activeAction.fadeOut(0.2);
        toAction.reset().fadeIn(0.2).play();
        activeAction = toAction;
    }
    if (toAction) toAction.timeScale = timeScale;
}

let hasHitMonster = false;


function handleKeyUp(event) {
    if (event.key === 'ArrowRight') {
        isRightKeyPressed = false;
        if (!isJumping && !isLeftKeyPressed && !isPunching) {
            setAction(idleAction);
        }
    } else if (event.key === 'ArrowLeft') {
        isLeftKeyPressed = false;
        if (!isJumping && !isRightKeyPressed && !isPunching) {
            setAction(idleAction);
            characterModel.rotation.y = 0;
        }
    }
};



function handleKeyDown(event) {
    console.log('Key pressed:', event.key, 'Code:', event.code); // Debug log
    if (event.key === 'Enter' && punchAction && !isPunching && ruleScreen.style.display === 'none') {
        isPunching = true;
        hasHitMonster = false; // Reset hit flag for new punch
        setAction(punchAction, 1.5);
        const punchSound = new Audio('music/damage1.wav');
        punchSound.volume = 0.5;
        punchSound.play();
        punchAction.reset().play();
        punchAction.getMixer().addEventListener('finished', () => {
            isPunching = false;
            hasHitMonster = false; // Reset hit flag after punch ends
            if (isRightKeyPressed) {
                setAction(runAction, 1.5);
                characterModel.rotation.y = 0;
            } else if (isLeftKeyPressed) {
                setAction(runAction, 1.3);
                characterModel.rotation.y = Math.PI;
            } else if (!isJumping) {
                setAction(idleAction);
            }
        }, { once: true });
    } else if (event.key === 'ArrowUp' && !isJumping) {
        const jumpSound = new Audio('music/jump.wav');
        jumpSound.volume = 0.3; // Adjust volume (0.0 to 1.0)
        jumpSound.play();
        isJumping = true;
        verticalVelocity = jumpVelocity;
        if (!isPunching) {
            setAction(jumpAction, 1.5);
        }
        console.log('Jump triggered for ArrowUp'); // Debug log
    } else if (event.code === 'Space') {
        if (!preloadedShield) {
            console.warn('Shield not spawned: preloadedShield is not loaded');
        } else if (clock.getElapsedTime() - lastShieldSpawnTime < shieldCooldown) {
            console.log(`Shield not spawned: Cooldown active, ${Math.max(0, shieldCooldown - (clock.getElapsedTime() - lastShieldSpawnTime)).toFixed(1)} seconds remaining`);
        } else {
            const shield = preloadedShield.clone();
            shield.scale.set(1.5, 1.5, 1.5);
            shield.position.set(
                characterModel.position.x,
                characterModel.position.y + 3.5,
                characterModel.position.z + (characterModel.rotation.y === 0 ? 3 : -3) // Adjust based on facing
            );
            shield.rotation.y = characterModel.rotation.y === 0 ? -Math.PI / 10 : Math.PI + Math.PI / 10;
            shield.userData = { spawnTime: clock.getElapsedTime() };
            scene.add(shield);
            lastShieldSpawnTime = clock.getElapsedTime(); // Update last spawn time
            console.log('Shield spawned at:', shield.position);
            if (shieldIcon) shieldIcon.style.visibility = 'hidden';
        }
    }
     else if (event.key === 'ArrowRight' && runAction && idleAction) {
        isRightKeyPressed = true;
        if (!isJumping && !isPunching) {
            setAction(runAction, 1.5);
            characterModel.rotation.y = 0;
        }
    } else if (event.key === 'ArrowLeft' && runAction && idleAction) {
        isLeftKeyPressed = true;
        if (!isJumping && !isPunching) {
            setAction(runAction, 1.3);
            characterModel.rotation.y = Math.PI;
        }
    }
    if (event.key === 'Shift' && !isPunching && !isJumping) {
        if (!preloadedPlayerFireball) {
            console.warn('Fireball not spawned: preloadedPlayerFireball is not loaded');
        } else if (clock.getElapsedTime() - lastFireballSpawnTime < fireballCooldown) {
            console.log(`Fireball not spawned: Cooldown active, ${Math.max(0, fireballCooldown - (clock.getElapsedTime() - lastFireballSpawnTime)).toFixed(1)} seconds remaining`);
        } else {
            spawnPlayerFireball();
            // const punchSound = new Audio('music/punch.wav');
            // punchSound.volume = 1.0;
            // punchSound.play();
            lastFireballSpawnTime = clock.getElapsedTime(); // Update last spawn time
            if (fireballIcon) fireballIcon.style.visibility = 'hidden';
        }
    }
};


window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);


function checkPlatformCollisions() {
    if (!characterModel) return { onPlatform: false, platformHeight: firstPlatformY };

    const characterPosition = characterModel.position.clone();
    const characterHeight = 1;
    const characterWidth = 0.5;

    for (const platform of platforms) {
        const platformPos = platform.body.position;
        const platformTop = platformPos.y;
        const platformWidth = platform.mesh.geometry.parameters.width;
        const platformDepth = platform.mesh.geometry.parameters.depth;

        const isWithinX = Math.abs(characterPosition.x - platformPos.x) < (platformWidth / 2 + characterWidth / 2);
        const isWithinZ = Math.abs(characterPosition.z - platformPos.z) < (platformDepth / 2 + characterWidth / 2);
        const isAbovePlatform = characterPosition.y <= platformTop + platform.height / 2 + characterHeight;
        const isBelowTop = characterPosition.y >= platformTop - characterHeight / 2;

        if (isWithinX && isWithinZ && isAbovePlatform && isBelowTop) {
            return { onPlatform: true, platformHeight: platformTop };
        }
    }
    return { onPlatform: false, platformHeight: firstPlatformY };
}

let clock = new THREE.Clock();
let lastFireSpawnTime = 0;
let lastMonsterCollisionTime = 0;
const collisionCooldown = 0.5; // 0.5 seconds cooldown between health deductions


function animation() {
    if (isGameOver) return;
    const delta = clock.getDelta();
    world.step(1 / 60, delta);

    if (mixer) {
        mixer.update(delta);
    }

    if (finalMonster) {
        const currentTime = clock.getElapsedTime();
        const initialPosition = { x: 0, y: firstPlatformY - 0.1, z: 18 };
    
        // Check if it's time to jump (every 8 seconds)
        if (currentTime - lastJumpTime >= jumpInterval) {
            // Calculate jump target (character's position)
            const targetPosition = characterModel.position.clone();
            targetPosition.y = firstPlatformY - 0.5; // Keep monster at platform level
    
            // Check for active shields
            const shields = [];
            scene.traverse((object) => {
                if (object.userData.spawnTime) {
                    shields.push(object);
                }
            });

            // Calculate forward position, adjusted for shield presence
            const forwardDistance = characterModel.rotation.y === 0 ? 15 : -15; // 15 units forward
            let forwardPositionZ = characterModel.position.z + forwardDistance;
            let jumpTargetZ = targetPosition.z;

            if (shields.length > 0) {
                // If a shield is active, stop monster at shield's position (z + 3 or z - 3 based on facing)
                const shieldZ = characterModel.position.z + (characterModel.rotation.y === 0 ? 3 : -3);
                jumpTargetZ = characterModel.rotation.y === 0 ? 
                    Math.min(targetPosition.z, shieldZ) : 
                    Math.max(targetPosition.z, shieldZ);
                forwardPositionZ = jumpTargetZ + forwardDistance;
            }

            const forwardPosition = {
                x: characterModel.position.x,
                y: firstPlatformY - 0.5,
                z: Math.max(-20, Math.min(80, forwardPositionZ)) // Clamp to platform
            };

            // Create a GSAP timeline to sequence jump movements
            const tl = gsap.timeline({
                onComplete: () => {
                    if (finalMonster) {
                        // Set final position to exactly the forward position
                        finalMonster.position.set(
                            forwardPosition.x,
                            forwardPosition.y,
                            forwardPosition.z
                        );
                        console.log("Final position:", finalMonster.position.z);
                    }
                }
            });

            // Step 1: Jump to character (or shield)
            tl.to(finalMonster.position, {
                x: targetPosition.x,
                z: jumpTargetZ,
                duration: 1,
                ease: "linear", // Prevent overshooting
                onComplete: () => {
                    if (finalMonster) {
                        finalMonster.position.set(targetPosition.x, targetPosition.y, jumpTargetZ); // Snap position
                        console.log("Jumped to:", finalMonster.position.z);
                    }
                }
            });

            // Step 2: Move to forward distance
            tl.to(finalMonster.position, {
                x: forwardPosition.x,
                y: forwardPosition.y,
                z: forwardPosition.z,
                duration: 0.5,
                ease: "power2.out",
                onComplete: () => console.log("Moved forward to:", finalMonster.position.z)
            });

            lastJumpTime = currentTime;
        } else {
            // Hover in place when not jumping
            finalMonster.position.y = initialPosition.y + Math.sin(Date.now() * 0.001 * 1) * 0.5;
        }
    
        // Check for monster-shield collision before character collision
        const monsterBox = new THREE.Box3().setFromObject(finalMonster);
        let isBlockedByShield = false;
        const shields = [];
        scene.traverse((object) => {
            if (object.userData.spawnTime) {
                shields.push(object);
            }
        });

        for (const shield of shields) {
            const shieldBox = new THREE.Box3().setFromCenterAndSize(
                shield.position,
                new THREE.Vector3(2, 3, 2) // Shield size for collision
            );
            if (monsterBox.intersectsBox(shieldBox)) {
                isBlockedByShield = true;
                // Stop monster at shield's position
                const shieldZ = characterModel.position.z + (characterModel.rotation.y === 0 ? 3 : -3);
                finalMonster.position.z = characterModel.rotation.y === 0 ? 
                    Math.min(finalMonster.position.z, shieldZ) : 
                    Math.max(finalMonster.position.z, shieldZ);
                break;
            }
        }

        // Check for monster-character collision only if not blocked by shield
        if (!isBlockedByShield) {
            const characterBox = new THREE.Box3().setFromCenterAndSize(
                characterModel.position,
                new THREE.Vector3(0.5, 2, 0.5)
            );
            if (monsterBox.intersectsBox(characterBox)) {
                if (!isMonsterInContact && currentTime - lastMonsterCollisionTime >= collisionCooldown && !isPunching) {
                    playerHealth = Math.max(0, playerHealth - 10);

                    const turtleSound = new Audio('music/turtle.wav');
                    turtleSound.volume = 0.5;
                    turtleSound.play();

                    updateHealthBar();
                    lastMonsterCollisionTime = currentTime;
                    isMonsterInContact = true;
                    // Push character back slightly
                    gsap.to(characterModel.position, {
                        z: characterModel.position.z - 2,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            } else {
                isMonsterInContact = false;
            }
        } else {
            isMonsterInContact = false; // No contact if shield is blocking
        }
    }

    if (characterModel) {
        const { onPlatform, platformHeight } = checkPlatformCollisions();
        const baseY = onPlatform ? platformHeight : -10;

        if (isRightKeyPressed) {
            characterModel.position.z += runningSpeed * delta;
        } else if (isLeftKeyPressed) {
            characterModel.position.z -= backwardSpeed * delta;
        }

        if (isJumping || characterModel.position.y > baseY + 0.01) {
            verticalVelocity -= gravity * delta;
            characterModel.position.y += verticalVelocity * delta;

            if (characterModel.position.y <= baseY) {
                characterModel.position.y = baseY;
                verticalVelocity = 0;
                isJumping = false;
                if (!isPunching) {
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
        } else {
            characterModel.position.y = baseY;
            verticalVelocity = 0;
        }

        // Check for fall damage
        if (characterModel.position.y < -5) {
            console.log("Character fell off! All health lost!");
            playerHealth = 0;
            updateHealthBar();
            characterModel.position.y = baseY;
            verticalVelocity = 0;
            isJumping = false;
            setAction(idleAction);
        }

        // Check for punch collision with monster
        if (isPunching && finalMonster && !hasHitMonster) {
            const characterBox = new THREE.Box3().setFromCenterAndSize(
                characterModel.position,
                new THREE.Vector3(0.5, 2, 0.5)
            );
            const monsterBox = new THREE.Box3().setFromObject(finalMonster);

            if (characterBox.intersectsBox(monsterBox)) {
                hasHitMonster = true;
                console.log("Monster punched!");
                punchCount += 1; // Increment punch counter
                monsterHealth = Math.max(0, monsterHealth - 5);
                updateMonsterHealthBar();

                if (monsterHealth <= 0 && finalMonster) {
                    scene.remove(finalMonster);
                    finalMonster.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                    finalMonster = null;
                    punchCount = 0; // Reset punch count if monster is defeated
                    showWinScreen(); // Show winning screen
                }

                if (finalMonster) {
                    // Push monster forward with overwrite to avoid conflicts
                    gsap.to(finalMonster.position, {
                        z: finalMonster.position.z + 5,
                        duration: 0.5,
                        ease: "power2.out",
                        overwrite: "auto", // Prevent conflicts with jump timeline
                        onComplete: () => {
                            if (finalMonster) {
                                finalMonster.position.z = finalMonster.position.z;
                            }
                        }
                    });
                }

                // Move character backward after 3 punches
                if (punchCount >= 3 && finalMonster) {
                    const backwardDistance = characterModel.rotation.y === 0 ? -5 : 5; // 5 units backward based on facing direction
                    gsap.to(characterModel.position, {
                        z: characterModel.position.z + backwardDistance,
                        duration: 0.5,
                        ease: "power2.out",
                        onComplete: () => {
                            punchCount = 0; // Reset punch count after movement
                        }
                    });
                }
            }
        }

        camera.position.z = characterModel.position.z;
        camera.position.x = characterModel.position.x - 100;
        camera.position.y = 1;
        camera.lookAt(new THREE.Vector3(characterModel.position.x, 1, characterModel.position.z + 11));
    }

    updateBorderPositions();

    const currentTime = clock.getElapsedTime();
    if (finalMonster && isMonsterVisible && currentTime - monsterVisibleTime >= 4 && currentTime - lastFireSpawnTime >= 3) {
        const numFireballs = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < numFireballs; i++) {
            setTimeout(() => {
                spawnFire();
            }, i * 200);
        }
        lastFireSpawnTime = currentTime;
    }

    const fires = [];
    scene.traverse((object) => {
        if (object.userData.direction && object.userData.speed) {
            fires.push(object);
        }
    });
    
    fires.forEach((fire) => {
        fire.position.addScaledVector(fire.userData.direction, fire.userData.speed * delta);
        const fireBox = new THREE.Box3().setFromObject(fire);

        // Check for shield collision before character collision
        let hitShield = false;
        const shields = [];
        scene.traverse((object) => {
            if (object.userData.spawnTime) {
                shields.push(object);
            }
        });

        for (const shield of shields) {
            const shieldBox = new THREE.Box3().setFromCenterAndSize(
                shield.position,
                new THREE.Vector3(2, 3, 2) // Shield size for collision
            );
            if (fireBox.intersectsBox(shieldBox)) {
                hitShield = true;
                console.log('Fireball hit shield at:', {
                    fireballPosition: fire.position,
                    shieldPosition: shield.position
                });
                scene.remove(fire);
                fire.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                break;
            }
        }

        if (!hitShield) {
            if (fire.userData.isPlayerFireball) {
                if (finalMonster) {
                    const monsterBox = new THREE.Box3().setFromCenterAndSize(
                        finalMonster.position,
                        new THREE.Vector3(1, 4, 1)
                    );
                    if (fireBox.intersectsBox(monsterBox)) {
                        console.log('Fireball hit monster at:', {
                            fireballPosition: fire.position,
                            monsterPosition: finalMonster.position,
                            distance: fire.position.distanceTo(finalMonster.position)
                        });
                        monsterHealth = Math.max(0, monsterHealth - 10);

                        const turtleSound = new Audio('music/sword.wav');
                        turtleSound.volume = 0.5;
                        turtleSound.play();

                        updateMonsterHealthBar();

                        if (monsterHealth <= 0 && finalMonster) {
                            scene.remove(finalMonster);
                            finalMonster.traverse((child) => {
                                if (child.isMesh) {
                                    if (child.geometry) child.geometry.dispose();
                                    if (child.material) {
                                        if (Array.isArray(child.material)) {
                                            child.material.forEach(mat => mat.dispose());
                                        } else {
                                            child.material.dispose();
                                        }
                                    }
                                }
                            });
                            finalMonster = null;
                            punchCount = 0; // Reset punch count if monster is defeated
                            showWinScreen(); // Show winning screen
                        }
                        scene.remove(fire);
                        fire.traverse((child) => {
                            if (child.isMesh) {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(mat => mat.dispose());
                                    } else {
                                        child.material.dispose();
                                    }
                                }
                            }
                        });
                    }
                }
                if (fire.position.distanceTo(finalMonster?.position || characterModel.position) > 50) {
                    scene.remove(fire);
                    fire.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }
            } else {
                const characterBox = new THREE.Box3().setFromCenterAndSize(
                    characterModel.position,
                    new THREE.Vector3(0.7, 2.5, 0.7)
                );
                if (fireBox.intersectsBox(characterBox) && !fire.userData.hasHit) {
                    fire.userData.hasHit = true;
                    playerHealth = Math.max(0, playerHealth - 5);
                    const turtleSound = new Audio('music/punch.wav');
                    turtleSound.volume = 1.0;
                    turtleSound.play();
                    updateHealthBar();
                    scene.remove(fire);
                    fire.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }
                if (fire.position.distanceTo(characterModel.position) > 50) {
                    scene.remove(fire);
                    fire.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }
            }
        }
    });

    const shields = [];
    scene.traverse((object) => {
        if (object.userData.spawnTime) {
            shields.push(object);
        }
    });
    shields.forEach((shield) => {
        shield.position.set(
            characterModel.position.x,
            characterModel.position.y + 3.5,
            characterModel.position.z + (characterModel.rotation.y === 0 ? 3 : -3) // Adjust based on facing
        );
        shield.rotation.y = characterModel.rotation.y === 0 ? -Math.PI / 10 : Math.PI + Math.PI / 10;
        if (clock.getElapsedTime() - shield.userData.spawnTime >= 1) {
            scene.remove(shield);
            shield.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    });

    if (fireballIcon) {
        fireballIcon.style.visibility = (clock.getElapsedTime() - lastFireballSpawnTime >= fireballCooldown) ? 'visible' : 'hidden';
    }
    if (shieldIcon) {
        shieldIcon.style.visibility = (clock.getElapsedTime() - lastShieldSpawnTime >= shieldCooldown) ? 'visible' : 'hidden';
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animation);
}


