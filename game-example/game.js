const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const eventLog = document.getElementById('event-log');

// Set canvas size
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Text to Speech (TTS) ---
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1.15;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang === 'id-ID' || v.lang === 'id_ID');
        if (idVoice) utterance.voice = idVoice;

        window.speechSynthesis.speak(utterance);
    }
}

// --- Configuration ---
// Change this to your production backend URL when deploying
const BACKEND_URL = 'http://localhost:3001';

const setupLayer = document.getElementById('setup-layer');
const gameInfo = document.getElementById('game-info');
const connectBtn = document.getElementById('connectBtn');
const usernameInput = document.getElementById('usernameInput');
const apiKeyInput = document.getElementById('apiKeyInput');

let socket = null;

// Game Entities
const character = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    vy: 0,
    gravity: 0.8,
    jumpPower: -15,
    isGrounded: false,
    color: '#6366f1'
};

const items = []; // For gifts

const urlParams = new URLSearchParams(window.location.search);
const queryUsername = urlParams.get('username');
const queryApiKey = urlParams.get('apiKey');

if (queryUsername && queryApiKey) {
    usernameInput.value = queryUsername;
    apiKeyInput.value = queryApiKey;
    connectToSocket(queryUsername, queryApiKey);
}

connectBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    if (username && apiKey) {
        window.history.replaceState({}, '', `?username=${username}&apiKey=${apiKey}`);
        connectToSocket(username, apiKey);
    } else {
        alert("Please enter both Username and API Key!");
    }
});

function connectToSocket(username, apiKey) {
    setupLayer.style.display = 'none';
    gameInfo.style.display = 'block';

    // Socket.io Connection
    socket = io(BACKEND_URL, {
        query: { username: username, apiKey: apiKey }
    });

    socket.on('connect', () => {
        statusEl.textContent = 'Connected for Username: ' + username;
        statusEl.className = 'connected';
        addLog('System', 'Socket.io connected to account: ' + username);
    });

    socket.on('disconnect', () => {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'disconnected';
    });

    // Listen to TikTok Events
    socket.on('tiktok_event', (event) => {
        const { eventType, data } = event;
        
        if (eventType === 'chat') {
            const msg = data.comment.toLowerCase();
            const uniqueId = data.uniqueId;
            
            // Speak the chat message
            speakText(`${uniqueId} berkata: ${data.comment}`);

            if (msg.includes('jump') || msg.includes('lompat')) {
                jump();
                addLog('CHAT', `${data.uniqueId} made character jump!`);
                createParticles(character.x + character.width/2, character.y + character.height, '#fff');
            }
        } else if (eventType === 'gift') {
            const giftName = data.giftName;
            const repeatCount = data.repeatCount;
            
            // Only process the gift if it's the end of a combo, or process every tick depending on needs.
            // tiktok-live-connector sends repeatEnd: true on the last combo tick.
            if (data.repeatEnd || data.giftType === 1) {
                addLog('GIFT', `${data.uniqueId} sent ${repeatCount}x ${giftName}!`);
                speakText(`Terima kasih ${data.uniqueId} atas ${repeatCount} ${giftName}!`);
                
                for (let i = 0; i < repeatCount; i++) {
                    setTimeout(() => {
                        items.push({
                            x: Math.random() * (canvas.width - 30),
                            y: -30,
                            size: 30,
                            vy: 2 + Math.random() * 3,
                            color: '#fbbf24',
                            label: giftName
                        });
                    }, i * 200); // Stagger drops
                }
            }
        } else if (eventType === 'like') {
            addLog('LIKE', `${data.uniqueId} sent ${data.likeCount} likes! 💖`);
        } else if (eventType === 'social') {
            // Covers Follow, Share
            addLog('SOCIAL', `${data.uniqueId} interacted (Follow/Share)! 🚀`);
            speakText(`${data.uniqueId} berinteraksi, terima kasih!`);
        } else if (eventType === 'member') {
            // User joined the stream
            addLog('JOIN', `${data.uniqueId} joined the stream! 👋`);
        }
    });
}

function jump() {
    if (character.isGrounded) {
        character.vy = character.jumpPower;
        character.isGrounded = false;
        character.color = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color on jump
    }
}

function spawnItem(sender, giftName) {
    items.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -50,
        vy: 2,
        size: 30,
        label: giftName,
        sender: sender
    });
}

function addLog(type, message) {
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerHTML = `<strong>[${type}]</strong> ${message}`;
    eventLog.prepend(el);
    
    if (eventLog.children.length > 5) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Particle System
const particles = [];
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color
        });
    }
}

// Game Loop
function update() {
    character.vy += character.gravity;
    character.y += character.vy;
    
    const floorY = canvas.height - 50;
    if (character.y + character.height >= floorY) {
        character.y = floorY - character.height;
        character.vy = 0;
        character.isGrounded = true;
    }

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.vy;
        
        if (item.y > canvas.height) {
            items.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    ctx.fillStyle = character.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = character.color;
    ctx.fillRect(character.x, character.y, character.width, character.height);
    ctx.shadowBlur = 0;

    for (const item of items) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.sender, item.x, item.y - 20);
    }

    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
