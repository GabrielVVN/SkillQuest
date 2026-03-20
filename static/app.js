// --- TEMA (Mantido em localStorage por ser config local) ---
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;
const themeIconDark = document.getElementById('theme-icon-dark');
const themeIconLight = document.getElementById('theme-icon-light');

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark'); themeIconDark.classList.remove('hidden'); themeIconLight.classList.add('hidden');
} else {
    htmlElement.classList.remove('dark'); themeIconLight.classList.remove('hidden'); themeIconDark.classList.add('hidden');
}

themeToggleBtn.addEventListener('click', () => {
    htmlElement.classList.toggle('dark'); const isDark = htmlElement.classList.contains('dark');
    gsap.fromTo(themeToggleBtn, {rotation: -90, scale: 0.5}, {rotation: 0, scale: 1, duration: 0.5, ease: "back.out(2)"});
    localStorage.theme = isDark ? 'dark' : 'light';
    themeIconDark.classList.toggle('hidden', !isDark); themeIconLight.classList.toggle('hidden', isDark);
});

// --- ESTADO GLOBAL (Sincronizado com BD) ---
let xp = 0;
let level = 1;
let modules = [];
let username = "";
let activeModuleId = null;
let streak = 0;

// --- ELEMENTOS UI ---
const authScreen = document.getElementById('auth-screen');
const dashScreen = document.getElementById('dashboard-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const modulesGrid = document.getElementById('modules-grid');

// Inicialização: Verifica se o usuário já está logado na sessão do Flask
checkAuthSession();

// --- LÓGICA DE AUTENTICAÇÃO ---
let isLoginMode = true;
const authForm = document.getElementById('auth-form');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authError = document.getElementById('auth-error');

authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Criar Conta';
    authToggleText.textContent = isLoginMode ? 'Novo por aqui?' : 'Já tem uma conta?';
    authToggleBtn.textContent = isLoginMode ? 'Criar Conta' : 'Fazer Login';
    authError.classList.add('hidden');
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('auth-username').value;
    const pass = document.getElementById('auth-password').value;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();

        if (data.success) {
            if (isLoginMode) {
                checkAuthSession(); // Faz o login e carrega os dados
            } else {
                // Se registrou com sucesso, muda pro modo login automaticamente
                authError.classList.remove('hidden');
                authError.className = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold p-4 rounded-xl mb-6 text-center";
                authError.textContent = "Conta criada! Faça login para jogar.";
                isLoginMode = false;
                authToggleBtn.click(); // Alterna a UI
            }
        } else {
            showAuthError(data.error);
        }
    } catch (err) {
        showAuthError("Erro de conexão com o servidor.");
    }
});

function showAuthError(msg) {
    authError.className = "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold p-4 rounded-xl mb-6 text-center";
    authError.textContent = msg;
    authError.classList.remove('hidden');
    gsap.fromTo(authError, {x: -10}, {x: 10, yoyo: true, repeat: 3, duration: 0.1});
}

document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    location.reload(); // Recarrega a página para voltar pra tela de login
});

// --- COMUNICAÇÃO COM BANCO DE DADOS ---

async function checkAuthSession() {
    try {
        const res = await fetch('/api/userdata');
        const data = await res.json();
        
        if (data.authenticated) {
            // Preenche o estado global com dados do BD
            username = data.username;
            xp = data.xp;
            level = data.level;
            modules = data.modules;
            
            // Atualiza UI
            document.getElementById('profile-username').textContent = username;
            updateDashStats();
            
            // Animação de transição para o Dashboard
            gsap.to(authScreen, {opacity: 0, duration: 0.5, onComplete: () => {
                authScreen.classList.add('hidden');
                dashScreen.classList.remove('hidden');
                dashScreen.classList.add('flex');
                renderDashboard();
            }});
        } else {
            authScreen.classList.remove('hidden');
            dashScreen.classList.add('hidden');
        }
    } catch (err) {
        console.error("Erro ao verificar sessão", err);
    }
}

// Essa função salva tudo no SQLite do Backend instantaneamente
async function syncData() {
    try {
        await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xp: xp, level: level, modules: modules })
        });
    } catch (err) {
        console.error("Erro ao sincronizar com servidor", err);
    }
}

// --- UPLOAD E GERENCIAMENTO DE MÓDULOS ---
const fileInput = document.getElementById('json-upload');
const errorMsg = document.getElementById('upload-error');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const defaultName = file.name.replace('.json', '');
    const customName = prompt("Escolha um título para esta Quest/Matéria:", defaultName);
    if (customName === null) { fileInput.value = ''; return; }
    const finalName = customName.trim() === '' ? defaultName : customName.trim();

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            errorMsg.classList.add('hidden');
            modules.push({
                id: Date.now().toString(),
                name: finalName, 
                questions: result.data,
                progressIndex: 0 
            });
            syncData(); // SALVA NO BANCO REAL
            renderDashboard();
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } else {
            showModuleError(result.error);
        }
    } catch (err) {
        showModuleError("Erro na comunicação com o servidor.");
    }
    fileInput.value = ''; 
});

function showModuleError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    gsap.fromTo(errorMsg, {x: -15}, {x: 15, yoyo: true, repeat: 4, duration: 0.08, ease: "power1.inOut"});
}

function renderDashboard() {
    modulesGrid.innerHTML = '';
    
    if (modules.length === 0) {
        modulesGrid.innerHTML = `
            <div class="col-span-full text-center py-10 text-slate-500">
                <span class="text-4xl block mb-4">📭</span>
                Nenhuma matéria cadastrada. Faça o upload de um JSON para começar!
            </div>
        `;
        return;
    }

    modules.forEach((mod, index) => {
        const total = mod.questions.length;
        const current = mod.progressIndex;
        const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
        const isDone = current >= total;

        const card = document.createElement('div');
        card.className = 'quest-card group relative';
        
        card.innerHTML = `
            <div class="absolute top-5 right-5 flex gap-3 opacity-70 hover:opacity-100 transition-opacity">
                <button onclick="renameModule('${mod.id}')" class="text-slate-400 hover:text-primary transition-colors hover:scale-110 transform" title="Renomear Matéria">✏️</button>
                <button onclick="deleteModule('${mod.id}')" class="text-slate-400 hover:text-rose-500 transition-colors hover:scale-110 transform" title="Excluir Matéria">🗑️</button>
            </div>
            <h3 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 truncate pr-16" title="${mod.name.toUpperCase()}">${mod.name.toUpperCase()}</h3>
            <p class="text-sm font-bold text-slate-500 mb-6">${current} / ${total} perguntas</p>
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-6">
                <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
            <button onclick="startQuest('${mod.id}')" class="mt-auto w-full py-4 rounded-2xl font-bold text-white transition-all duration-200 ${isDone ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none' : 'bg-primary hover:bg-primaryDark shadow-[0_4px_0_#4f46e5] active:translate-y-1 active:shadow-none'}">
                ${isDone ? '🔄 Revisar' : (current > 0 ? '▶️ Continuar' : '⚔️ Iniciar Quest')}
            </button>
        `;
        modulesGrid.appendChild(card);
        gsap.fromTo(card, {y: 30, opacity: 0}, {y: 0, opacity: 1, duration: 0.5, delay: index * 0.1, ease: "power2.out"});
    });
}

window.renameModule = function(id) {
    const mod = modules.find(m => m.id === id);
    if (!mod) return;
    const newName = prompt("Digite o novo título para a matéria:", mod.name);
    if (newName !== null && newName.trim() !== "") {
        mod.name = newName.trim();
        syncData(); // Atualiza BD
        renderDashboard(); 
    }
}

window.deleteModule = function(id) {
    if(confirm("Tem certeza que deseja excluir esta matéria? O progresso será perdido.")) {
        modules = modules.filter(m => m.id !== id);
        syncData(); // Atualiza BD
        renderDashboard();
    }
}

// --- LÓGICA DO JOGO (GAMEPLAY) ---
window.startQuest = function(moduleId) {
    activeModuleId = moduleId;
    const mod = modules.find(m => m.id === activeModuleId);
    
    if (mod.progressIndex >= mod.questions.length) {
        mod.progressIndex = 0;
        syncData();
    }
    
    streak = 0;
    document.getElementById('streak-display').textContent = streak;

    gsap.to(dashScreen, {
        opacity: 0, y: -20, duration: 0.4, onComplete: () => {
            dashScreen.classList.add('hidden');
            dashScreen.classList.remove('flex');
            dashScreen.style.opacity = 1;
            dashScreen.style.transform = "none";
            gameScreen.classList.remove('hidden');
            gameScreen.classList.add('flex');
            loadQuestion();
        }
    });
}

document.getElementById('btn-back-dash').addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('flex');
    dashScreen.classList.remove('hidden');
    dashScreen.classList.add('flex');
    renderDashboard(); 
});

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');

function loadQuestion() {
    const mod = modules.find(m => m.id === activeModuleId);
    
    if (mod.progressIndex >= mod.questions.length) {
        finishGame();
        return;
    }

    let q = mod.questions[mod.progressIndex];
    q.errouNesta = false;

    const progress = (mod.progressIndex / mod.questions.length) * 100;
    gsap.to('#progress-bar', {width: `${progress}%`, duration: 0.8, ease: "elastic.out(1, 0.7)"});

    questionText.textContent = q.pergunta;
    optionsContainer.innerHTML = '';
    
    q.opcoes.forEach((opcao, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; 
        btn.innerHTML = `<span class="option-marker">${index + 1}</span> <span class="flex-1">${opcao}</span>`;
        btn.onclick = () => checkAnswer(btn, index, q.resposta_correta, q, mod);
        optionsContainer.appendChild(btn);
    });

    gsap.fromTo(questionText, {y: -40, opacity: 0, scale: 0.8}, {y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)"});
    gsap.fromTo('.option-btn', {x: 100, opacity: 0}, {x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)"});
}

function checkAnswer(btn, selectedIndex, correctIndex, questionObj, mod) {
    if (btn.classList.contains('wrong') || btn.classList.contains('correct')) return;

    const allButtons = document.querySelectorAll('.option-btn');

    if (selectedIndex === correctIndex) {
        btn.classList.add('correct');
        allButtons.forEach(b => b.style.pointerEvents = 'none'); 

        if (!questionObj.errouNesta) {
            streak++;
            addXP(10 + (streak > 2 ? 5 : 0));
        } else {
            addXP(5);
        }

        playSound(800, 'sine', 0.1);
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 }, colors: ['#6366f1', '#10b981', '#ffffff'] });
        gsap.to(btn, {scale: 1.05, duration: 0.4, ease: "elastic.out(1, 0.3)"});

        mod.progressIndex++;
        syncData(); // Sincroniza avanço de pergunta

        setTimeout(() => {
            gsap.to('.option-btn', {y: 50, opacity: 0, stagger: 0.05, duration: 0.3, ease: "power2.in"});
            gsap.to(questionText, {y: -50, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => loadQuestion()});
        }, 1500);

    } else {
        btn.classList.add('wrong');
        btn.style.pointerEvents = 'none'; 
        questionObj.errouNesta = true;
        streak = 0;
        document.getElementById('streak-display').textContent = streak;
        playSound(200, 'sawtooth', 0.2);

        gsap.to(btn, {x: [-20, 20, -15, 15, -10, 10, -5, 5, 0], duration: 0.6, ease: "power2.inOut"});
    }
}

// --- SISTEMA DE XP ---
function addXP(amount) {
    xp += amount;
    if (xp >= level * 100) {
        level++;
        triggerLevelUp();
    }
    updateDashStats();
    syncData(); // Sincroniza ganho de XP

    const xpFloat = document.createElement('div');
    xpFloat.textContent = `+${amount} XP`;
    xpFloat.className = 'fixed text-primary font-black text-4xl pointer-events-none z-50 drop-shadow-lg';
    xpFloat.style.left = '50%'; xpFloat.style.top = '40%'; xpFloat.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(xpFloat);

    gsap.fromTo(xpFloat, {y: 0, opacity: 1, scale: 0.5}, {y: -150, opacity: 0, scale: 1.5, duration: 1.5, ease: "power3.out", onComplete: () => xpFloat.remove()});
}

function triggerLevelUp() {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, zIndex: 100 });
}

function updateDashStats() {
    document.getElementById('dash-xp').textContent = xp;
    document.getElementById('dash-level').textContent = level;
    if(document.getElementById('streak-display')) document.getElementById('streak-display').textContent = streak;
}

function finishGame() {
    gameScreen.classList.add('hidden'); gameScreen.classList.remove('flex');
    endScreen.classList.remove('hidden');
    gsap.fromTo(endScreen.firstElementChild, {opacity: 0, scale: 0.5, y: 50}, {opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "elastic.out(1, 0.6)"});
    
    const duration = 3 * 1000; const animationEnd = Date.now() + duration;
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
    }, 250);
}

document.getElementById('btn-return-lobby').addEventListener('click', () => {
    endScreen.classList.add('hidden'); dashScreen.classList.remove('hidden'); dashScreen.classList.add('flex');
    renderDashboard();
});

function playSound(frequency, type, duration) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.start(); gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    oscillator.stop(audioCtx.currentTime + duration);
}

// --- LÓGICA DO RANKING GLOBAL (LEADERBOARD) ---

const tabQuests = document.getElementById('tab-quests');
const tabRanking = document.getElementById('tab-ranking');
const questsSection = document.getElementById('quests-section');
const rankingSection = document.getElementById('ranking-section');
const leaderboardList = document.getElementById('leaderboard-list');

// Alternar para a aba de Ranking
tabRanking.addEventListener('click', () => {
    // Estilo das abas
    tabRanking.classList.add('text-primary', 'border-primary');
    tabRanking.classList.remove('text-slate-400', 'border-transparent');
    tabQuests.classList.remove('text-primary', 'border-primary');
    tabQuests.classList.add('text-slate-400', 'border-transparent');
    
    // Mostra/Esconde seções
    questsSection.classList.replace('block', 'hidden');
    rankingSection.classList.replace('hidden', 'flex');
    
    loadLeaderboard();
});

// Alternar para a aba de Quests (Matérias)
tabQuests.addEventListener('click', () => {
    // Estilo das abas
    tabQuests.classList.add('text-primary', 'border-primary');
    tabQuests.classList.remove('text-slate-400', 'border-transparent');
    tabRanking.classList.remove('text-primary', 'border-primary');
    tabRanking.classList.add('text-slate-400', 'border-transparent');
    
    // Mostra/Esconde seções
    rankingSection.classList.replace('flex', 'hidden');
    questsSection.classList.replace('hidden', 'block');
});

async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="p-10 text-center text-slate-400 font-bold animate-pulse">Carregando o ranking...</div>';
    
    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        
        if (data.success) {
            leaderboardList.innerHTML = '';
            
            data.leaderboard.forEach((player, index) => {
                // Destaca o top 3 com fundos especiais
                let rowBg = '';
                let rankVisual = `<span class="text-lg font-black text-slate-400">#${player.rank}</span>`;
                
                if (player.rank === 1) {
                    rowBg = 'bg-yellow-50 dark:bg-yellow-900/10';
                    rankVisual = `<span class="text-3xl" title="1º Lugar">👑</span>`;
                } else if (player.rank === 2) {
                    rowBg = 'bg-slate-50 dark:bg-slate-800/30';
                    rankVisual = `<span class="text-2xl">🥈</span>`;
                } else if (player.rank === 3) {
                    rowBg = 'bg-amber-50 dark:bg-amber-900/10';
                    rankVisual = `<span class="text-2xl">🥉</span>`;
                }

                // Destaca o usuário logado
                const isMe = player.username === username;
                if (isMe) rowBg = 'bg-primary/5 border-l-4 border-primary';

                const row = document.createElement('div');
                row.className = `grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${rowBg}`;
                
                row.innerHTML = `
                    <div class="col-span-2 text-center flex justify-center items-center h-full">
                        ${rankVisual}
                    </div>
                    <div class="col-span-5 flex flex-col">
                        <span class="font-black text-lg ${isMe ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}">
                            ${player.username} ${isMe ? '(Você)' : ''}
                        </span>
                        <span class="text-sm font-bold text-slate-400">Level ${player.level}</span>
                    </div>
                    <div class="col-span-3 flex justify-center items-center gap-2">
                        <span class="text-2xl">${player.league_icon}</span>
                        <span class="font-bold ${player.league_color}">${player.league_name}</span>
                    </div>
                    <div class="col-span-2 text-right font-black text-xl text-primary">
                        ${player.xp}
                    </div>
                `;
                
                leaderboardList.appendChild(row);
                
                // Animação em cascata
                gsap.fromTo(row, {opacity: 0, x: -20}, {opacity: 1, x: 0, duration: 0.4, delay: index * 0.05, ease: "power2.out"});
            });
        }
    } catch (err) {
        leaderboardList.innerHTML = '<div class="p-10 text-center text-rose-500 font-bold">Erro ao carregar o ranking.</div>';
    }
}