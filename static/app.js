// --- TEMA ---
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
    gsap.fromTo(themeToggleBtn, {rotation: -180, scale: 0.5}, {rotation: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)"});
    localStorage.theme = isDark ? 'dark' : 'light';
    themeIconDark.classList.toggle('hidden', !isDark); themeIconLight.classList.toggle('hidden', isDark);
});

// --- ESTADO GLOBAL ---
let xp = 0; let level = 1; let modules = []; let username = ""; let activeModuleId = null; let streak = 0;

const authScreen = document.getElementById('auth-screen');
const dashScreen = document.getElementById('dashboard-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const modulesGrid = document.getElementById('modules-grid');

// --- LÓGICA DAS ABAS ---
const tabQuests = document.getElementById('tab-quests');
const tabRanking = document.getElementById('tab-ranking');
const questsSection = document.getElementById('quests-section');
const rankingSection = document.getElementById('ranking-section');
const leaderboardList = document.getElementById('leaderboard-list');

tabRanking.addEventListener('click', () => {
    tabRanking.classList.add('text-primary', 'border-primary'); tabRanking.classList.remove('text-slate-400', 'border-transparent');
    tabQuests.classList.remove('text-primary', 'border-primary'); tabQuests.classList.add('text-slate-400', 'border-transparent');
    questsSection.classList.replace('block', 'hidden'); rankingSection.classList.replace('hidden', 'flex');
    loadLeaderboard();
});

tabQuests.addEventListener('click', () => {
    tabQuests.classList.add('text-primary', 'border-primary'); tabQuests.classList.remove('text-slate-400', 'border-transparent');
    tabRanking.classList.remove('text-primary', 'border-primary'); tabRanking.classList.add('text-slate-400', 'border-transparent');
    rankingSection.classList.replace('flex', 'hidden'); questsSection.classList.replace('hidden', 'block');
});

checkAuthSession();

// --- AUTENTICAÇÃO ---
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
    const user = document.getElementById('auth-username').value; const pass = document.getElementById('auth-password').value;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    const originalText = authSubmitBtn.textContent;
    authSubmitBtn.textContent = 'Aguarde...'; authSubmitBtn.classList.add('opacity-80', 'pointer-events-none');

    try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        if (data.success) {
            if (isLoginMode) { checkAuthSession(); } 
            else {
                authError.classList.remove('hidden'); authError.className = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold p-4 rounded-xl mb-6 text-center shadow-lg";
                authError.textContent = "Conta criada! Faça login para jogar.";
                isLoginMode = false; authToggleBtn.click(); 
            }
        } else { showAuthError(data.error); }
    } catch (err) { showAuthError("Erro de conexão com o servidor."); }
    
    authSubmitBtn.textContent = originalText; authSubmitBtn.classList.remove('opacity-80', 'pointer-events-none');
});

function showAuthError(msg) {
    authError.className = "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold p-4 rounded-xl mb-6 text-center shadow-lg";
    authError.textContent = msg; authError.classList.remove('hidden');
    gsap.fromTo(authError, {x: -15}, {x: 15, yoyo: true, repeat: 4, duration: 0.08, ease: "power1.inOut"});
}

document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' }); location.reload(); 
});

// --- EDITAR PERFIL ---
const profileModal = document.getElementById('profile-modal');
const btnEditProfile = document.getElementById('btn-edit-profile');
const closeProfileModal = document.getElementById('close-profile-modal');
const profileForm = document.getElementById('profile-form');
const editUsernameInput = document.getElementById('edit-username');
const profileError = document.getElementById('profile-error');
const profileSuccess = document.getElementById('profile-success');

btnEditProfile.addEventListener('click', () => {
    profileError.classList.add('hidden'); profileSuccess.classList.add('hidden');
    editUsernameInput.value = username; document.getElementById('edit-password').value = '';
    profileModal.classList.remove('hidden'); profileModal.classList.add('flex');
    gsap.fromTo(profileModal.firstElementChild, {scale: 0.8, opacity: 0}, {scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)"});
});

closeProfileModal.addEventListener('click', () => {
    gsap.to(profileModal.firstElementChild, {scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => {
        profileModal.classList.add('hidden'); profileModal.classList.remove('flex');
    }});
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUser = editUsernameInput.value; const newPass = document.getElementById('edit-password').value;
    const submitBtn = document.getElementById('profile-submit-btn');
    
    submitBtn.textContent = 'Salvando...'; submitBtn.classList.add('opacity-80', 'pointer-events-none');
    profileError.classList.add('hidden'); profileSuccess.classList.add('hidden');

    try {
        const res = await fetch('/api/edit_profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUser, password: newPass }) });
        const data = await res.json();

        if (data.success) {
            username = data.username; document.getElementById('profile-username').textContent = username;
            profileSuccess.textContent = "Perfil atualizado!"; profileSuccess.classList.remove('hidden');
            setTimeout(() => closeProfileModal.click(), 1500);
        } else {
            profileError.textContent = data.error; profileError.classList.remove('hidden');
            gsap.fromTo(profileError, {x: -10}, {x: 10, yoyo: true, repeat: 3, duration: 0.1});
        }
    } catch (err) { profileError.textContent = "Erro de conexão."; profileError.classList.remove('hidden'); }
    submitBtn.textContent = 'Salvar Alterações'; submitBtn.classList.remove('opacity-80', 'pointer-events-none');
});


// --- COMUNICAÇÃO COM BANCO ---
async function checkAuthSession() {
    try {
        const res = await fetch('/api/userdata'); const data = await res.json();
        if (data.authenticated) {
            username = data.username; xp = data.xp; level = data.level; modules = data.modules;
            document.getElementById('profile-username').textContent = username; updateDashStats();
            gsap.to(authScreen, {opacity: 0, scale: 0.9, duration: 0.5, ease: "power2.in", onComplete: () => {
                authScreen.classList.add('hidden'); dashScreen.classList.remove('hidden'); dashScreen.classList.add('flex');
                renderDashboard();
                gsap.fromTo(dashScreen, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.6, ease: "power2.out"});
            }});
        } else { authScreen.classList.remove('hidden'); dashScreen.classList.add('hidden'); }
    } catch (err) { console.error("Erro ao verificar sessão", err); }
}

async function syncData() {
    try { await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xp: xp, level: level, modules: modules }) }); } 
    catch (err) { console.error("Erro ao sincronizar com servidor", err); }
}

// --- FUNÇÃO DE ORDENAÇÃO DE DIFICULDADE (NOVO) ---
function sortQuestionsByDifficulty(questionsArray) {
    const difficultyWeights = { 'facil': 1, 'media': 2, 'dificil': 3 };
    return questionsArray.sort((a, b) => {
        const weightA = difficultyWeights[a.dificuldade ? a.dificuldade.toLowerCase() : 'facil'] || 1;
        const weightB = difficultyWeights[b.dificuldade ? b.dificuldade.toLowerCase() : 'facil'] || 1;
        return weightA - weightB;
    });
}

// --- UPLOAD VIA JSON TRADICIONAL ---
const fileInput = document.getElementById('json-upload');
const errorMsg = document.getElementById('upload-error');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const defaultName = file.name.replace('.json', '');
    const customName = prompt("Arquivo recebido. Qual o nome desta Quest?", defaultName);
    if (customName === null) { fileInput.value = ''; return; }
    
    const finalName = customName.trim() === '' ? defaultName : customName.trim();
    const formData = new FormData(); formData.append('file', file);

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            errorMsg.classList.add('hidden');
            
            // Ordena as questões antes de salvar!
            const sortedQuestions = sortQuestionsByDifficulty(result.data);
            
            modules.push({ id: Date.now().toString(), name: finalName, questions: sortedQuestions, progressIndex: 0 });
            syncData(); renderDashboard();
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.8 }, zIndex: 9999 });
        } else { showModuleError(result.error); }
    } catch (err) { showModuleError("Erro na comunicação com o servidor."); }
    fileInput.value = ''; 
});

// --- GERADOR IA (NOVO) ---
const aiModal = document.getElementById('ai-modal');
const btnOpenAiModal = document.getElementById('btn-open-ai-modal');
const closeAiModal = document.getElementById('close-ai-modal');
const btnCopyPrompt = document.getElementById('btn-copy-prompt');
const btnImportAi = document.getElementById('btn-import-ai');
const aiPasteArea = document.getElementById('ai-paste-area');
const aiError = document.getElementById('ai-error');

btnOpenAiModal.addEventListener('click', () => {
    aiPasteArea.value = ''; aiError.classList.add('hidden');
    aiModal.classList.remove('hidden'); aiModal.classList.add('flex');
    gsap.fromTo(aiModal.firstElementChild, {scale: 0.9, opacity: 0, y: 30}, {scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.2)"});
});

closeAiModal.addEventListener('click', () => {
    gsap.to(aiModal.firstElementChild, {scale: 0.9, opacity: 0, y: 30, duration: 0.3, ease: "power2.in", onComplete: () => {
        aiModal.classList.add('hidden'); aiModal.classList.remove('flex');
    }});
});

// Botão de Copiar o Prompt
btnCopyPrompt.addEventListener('click', () => {
    const promptText = document.getElementById('ai-prompt-template').value;
    navigator.clipboard.writeText(promptText).then(() => {
        const originalText = btnCopyPrompt.innerHTML;
        btnCopyPrompt.innerHTML = "✅ Copiado!";
        btnCopyPrompt.classList.replace('bg-cyan-500', 'bg-emerald-500');
        setTimeout(() => {
            btnCopyPrompt.innerHTML = "Copiar";
            btnCopyPrompt.classList.replace('bg-emerald-500', 'bg-cyan-500');
        }, 2000);
    });
});

// Lógica pesada: O conversor e limpador do texto do ChatGPT
btnImportAi.addEventListener('click', () => {
    const rawText = aiPasteArea.value;
    aiError.classList.add('hidden');

    if (!rawText.trim()) {
        aiError.textContent = "Cole a resposta do ChatGPT primeiro."; aiError.classList.remove('hidden'); return;
    }

    try {
        // Limpeza inteligente: O ChatGPT as vezes coloca ```json ... ``` no inicio e fim. Essa regex remove isso.
        let cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        // As vezes o chat manda texto solto antes ou depois da array. Encontra o primeiro [ e o último ]
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if(firstBracket === -1 || lastBracket === -1) {
            throw new Error("Não encontrei o formato de colchetes [] do JSON.");
        }
        
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);

        // Tenta converter texto pra Javascript puro
        const parsedData = JSON.parse(cleanText);

        // Validação estrutural básica
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error("O JSON precisa ser uma lista [] com perguntas.");
        }

        // Valida se as perguntas têm o formato correto
        for (let i = 0; i < parsedData.length; i++) {
            const q = parsedData[i];
            if (!q.pergunta || !Array.isArray(q.opcoes) || q.opcoes.length !== 4 || typeof q.resposta_correta !== 'number') {
                throw new Error(`A pergunta ${i + 1} está com o formato incorreto ou faltam opções.`);
            }
        }

        // Tudo Certo! Ordena a dificuldade e salva
        const sortedQuestions = sortQuestionsByDifficulty(parsedData);
        
        const questName = prompt("Sucesso! Qual será o nome desta Quest?", "Quest Gerada por IA");
        if (questName === null) return;

        modules.push({ id: Date.now().toString(), name: questName || "Quest Gerada", questions: sortedQuestions, progressIndex: 0 });
        syncData(); renderDashboard();
        
        closeAiModal.click();
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#06b6d4', '#6366f1', '#ffffff'], zIndex: 9999 });

    } catch (error) {
        aiError.textContent = "Erro ao ler os dados: " + error.message; 
        aiError.classList.remove('hidden');
        gsap.fromTo(aiError, {x: -10}, {x: 10, yoyo: true, repeat: 4, duration: 0.08});
    }
});

function showModuleError(msg) {
    errorMsg.textContent = msg; errorMsg.classList.remove('hidden');
    gsap.fromTo(errorMsg, {scale: 0.9, opacity: 0}, {scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)"});
    gsap.fromTo(errorMsg, {x: -10}, {x: 10, yoyo: true, repeat: 4, duration: 0.08, delay: 0.3});
}

// --- RENDER DASHBOARD E RESTANTE IGUAL ---
function renderDashboard() {
    modulesGrid.innerHTML = '';
    if (modules.length === 0) {
        modulesGrid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-500"><span class="text-6xl block mb-6 animate-bounce">📭</span><span class="text-xl font-bold">Nenhuma matéria na sua base de dados.</span><br>Faça o upload ou gere um mapa com a IA para iniciar!</div>`;
        return;
    }

    modules.forEach((mod, index) => {
        const total = mod.questions.length; const current = mod.progressIndex;
        const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0; const isDone = current >= total;

        const card = document.createElement('div');
        card.className = 'quest-card group';
        card.innerHTML = `
            <div class="absolute top-5 right-5 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button onclick="renameModule('${mod.id}')" class="bg-surfaceLight dark:bg-surfaceDark p-2 rounded-full shadow-md text-slate-500 hover:text-primary transition-colors hover:scale-110" title="Renomear">✏️</button>
                <button onclick="deleteModule('${mod.id}')" class="bg-surfaceLight dark:bg-surfaceDark p-2 rounded-full shadow-md text-slate-500 hover:text-rose-500 transition-colors hover:scale-110" title="Excluir">🗑️</button>
            </div>
            <h3 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 truncate pr-20" title="${mod.name.toUpperCase()}">${mod.name.toUpperCase()}</h3>
            <p class="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2"><span class="w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-primary'}"></span> ${current} / ${total} perguntas</p>
            <div class="w-full bg-slate-200/50 dark:bg-slate-700/50 h-3 rounded-full overflow-hidden mb-8 shadow-inner">
                <div class="h-full rounded-full transition-all duration-1000 ease-out relative ${isDone ? 'bg-emerald-500' : 'bg-primary'}" style="width: ${percent}%"><div class="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div></div>
            </div>
            <button onclick="startQuest('${mod.id}')" class="mt-auto w-full py-4 rounded-2xl font-bold text-white transition-all duration-200 transform group-hover:scale-[1.02] ${isDone ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none' : 'bg-primary hover:bg-primaryDark shadow-[0_4px_0_#4f46e5] active:translate-y-1 active:shadow-none'}">
                ${isDone ? '🔄 Revisar Conhecimento' : (current > 0 ? '▶️ Continuar Treino' : '⚔️ Iniciar Quest')}
            </button>
        `;
        modulesGrid.appendChild(card);
        gsap.fromTo(card, {y: 40, opacity: 0}, {y: 0, opacity: 1, duration: 0.6, delay: index * 0.1, ease: "back.out(1.2)"});
    });
}

window.renameModule = function(id) {
    const mod = modules.find(m => m.id === id); if (!mod) return;
    const newName = prompt("Digite o novo título para a matéria:", mod.name);
    if (newName !== null && newName.trim() !== "") { mod.name = newName.trim(); syncData(); renderDashboard(); }
}

window.deleteModule = function(id) {
    if(confirm("Destruir esta Quest? Todo o progresso nela será perdido.")) { modules = modules.filter(m => m.id !== id); syncData(); renderDashboard(); }
}

// --- GAMEPLAY ---
window.startQuest = function(moduleId) {
    activeModuleId = moduleId; const mod = modules.find(m => m.id === activeModuleId);
    if (mod.progressIndex >= mod.questions.length) { mod.progressIndex = 0; syncData(); }
    
    streak = 0; document.querySelectorAll('[id="streak-display"]').forEach(el => el.textContent = streak);

    gsap.to(dashScreen, {
        opacity: 0, scale: 0.95, duration: 0.4, ease: "power2.in", onComplete: () => {
            dashScreen.classList.add('hidden'); dashScreen.classList.remove('flex'); dashScreen.style.opacity = 1; dashScreen.style.transform = "none";
            gameScreen.classList.remove('hidden'); gameScreen.classList.add('flex');
            gsap.fromTo(gameScreen, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5, ease: "power2.out"});
            loadQuestion();
        }
    });
}

document.getElementById('btn-back-dash').addEventListener('click', () => {
    gsap.to(gameScreen, {opacity: 0, y: 20, duration: 0.3, onComplete: () => {
        gameScreen.classList.add('hidden'); gameScreen.classList.remove('flex'); gameScreen.style.opacity = 1; gameScreen.style.transform = "none";
        dashScreen.classList.remove('hidden'); dashScreen.classList.add('flex');
        gsap.fromTo(dashScreen, {opacity: 0, scale: 0.95}, {opacity: 1, scale: 1, duration: 0.4, ease: "power2.out"});
        renderDashboard(); 
    }});
});

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');

function loadQuestion() {
    const mod = modules.find(m => m.id === activeModuleId);
    if (mod.progressIndex >= mod.questions.length) { finishGame(); return; }

    let q = mod.questions[mod.progressIndex]; q.errouNesta = false;

    // Atualiza a barrinha visual de dificuldade no topo
    const difBadge = document.getElementById('difficulty-badge');
    if(difBadge) {
        difBadge.className = 'hidden md:flex items-center px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider';
        const dif = q.dificuldade ? q.dificuldade.toLowerCase() : 'facil';
        if (dif === 'facil') { difBadge.classList.add('bg-emerald-500'); difBadge.textContent = '🟢 Fácil'; }
        else if (dif === 'media') { difBadge.classList.add('bg-yellow-500'); difBadge.textContent = '🟡 Média'; }
        else { difBadge.classList.add('bg-rose-500'); difBadge.textContent = '🔴 Difícil'; }
    }

    const progress = (mod.progressIndex / mod.questions.length) * 100;
    gsap.to('#progress-bar', {width: `${progress}%`, duration: 1, ease: "elastic.out(1, 0.5)"});

    questionText.textContent = q.pergunta;
    optionsContainer.innerHTML = '';
    
    q.opcoes.forEach((opcao, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn group'; 
        btn.innerHTML = `<span class="option-marker group-hover:rotate-12 group-active:-rotate-12">${index + 1}</span> <span class="flex-1">${opcao}</span>`;
        btn.onclick = (e) => checkAnswer(btn, index, q.resposta_correta, q, mod, e);
        optionsContainer.appendChild(btn);
    });

    gsap.fromTo(questionText, {y: -40, opacity: 0, scale: 0.9}, {y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)"});
    gsap.fromTo('.option-btn', {x: 100, opacity: 0}, {x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.2)"});
}

function checkAnswer(btn, selectedIndex, correctIndex, questionObj, mod, event) {
    if (btn.classList.contains('wrong') || btn.classList.contains('correct')) return;
    const allButtons = document.querySelectorAll('.option-btn');

    if (selectedIndex === correctIndex) {
        btn.classList.add('correct');
        allButtons.forEach(b => b.style.pointerEvents = 'none'); 

        const rect = btn.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({ particleCount: 60, spread: 70, origin: { x: originX, y: originY }, colors: ['#6366f1', '#10b981', '#ffffff'], zIndex: 9999 });

        if (!questionObj.errouNesta) { 
            streak++; addXP(10 + (streak > 2 ? 5 : 0)); 
            document.querySelectorAll('[id="fire-icon-container"]').forEach(el => { gsap.fromTo(el, {scale: 1.5, rotation: -15}, {scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.3)"}); });
        } else { addXP(5); }

        playSound(800, 'sine', 0.1);
        gsap.to(btn, {scale: 1.05, duration: 0.4, ease: "elastic.out(1, 0.3)"});

        mod.progressIndex++; syncData();

        setTimeout(() => {
            gsap.to('.option-btn', {y: 60, opacity: 0, stagger: 0.05, duration: 0.3, ease: "power2.in"});
            gsap.to(questionText, {y: -60, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => loadQuestion()});
        }, 1500);

    } else {
        btn.classList.add('wrong'); btn.style.pointerEvents = 'none'; questionObj.errouNesta = true;
        streak = 0; document.querySelectorAll('[id="streak-display"]').forEach(el => el.textContent = streak);
        playSound(200, 'sawtooth', 0.2);
        gsap.to(btn, {x: [-25, 25, -15, 15, -10, 10, -5, 5, 0], duration: 0.6, ease: "power2.inOut"});
    }
}

function addXP(amount) {
    xp += amount;
    if (xp >= level * 100) { level++; triggerLevelUp(); }
    updateDashStats(); syncData();

    const xpFloat = document.createElement('div');
    xpFloat.textContent = `+${amount} XP`;
    xpFloat.className = 'fixed text-primary font-black text-5xl pointer-events-none z-50 drop-shadow-2xl';
    xpFloat.style.left = '50%'; xpFloat.style.top = '50%'; xpFloat.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(xpFloat);

    gsap.fromTo(xpFloat, {y: 0, opacity: 0, scale: 0.5}, {y: -150, opacity: 1, scale: 1.2, duration: 1.5, ease: "power3.out", onComplete: () => xpFloat.remove()});
    gsap.to(xpFloat, {opacity: 0, duration: 0.5, delay: 1});
}

function triggerLevelUp() { 
    confetti({ particleCount: 300, spread: 160, origin: { y: 0.5 }, zIndex: 10000 }); 
    playSound(400, 'sine', 0.1); setTimeout(() => playSound(600, 'sine', 0.1), 100); setTimeout(() => playSound(800, 'sine', 0.3), 200);
}

function updateDashStats() {
    document.getElementById('dash-xp').textContent = xp;
    document.getElementById('dash-level').textContent = level;
    document.querySelectorAll('[id="streak-display"]').forEach(el => el.textContent = streak);
}

function finishGame() {
    gameScreen.classList.add('hidden'); gameScreen.classList.remove('flex');
    endScreen.classList.remove('hidden');
    gsap.fromTo(endScreen.firstElementChild, {opacity: 0, scale: 0.8, y: 50}, {opacity: 1, scale: 1, y: 0, duration: 1, ease: "elastic.out(1, 0.5)"});
    
    const duration = 3 * 1000; const animationEnd = Date.now() + duration;
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, { startVelocity: 40, spread: 360, ticks: 60, zIndex: 9999 }, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
    }, 250);
}

document.getElementById('btn-return-lobby').addEventListener('click', () => {
    endScreen.classList.add('hidden'); dashScreen.classList.remove('hidden'); dashScreen.classList.add('flex');
    gsap.fromTo(dashScreen, {opacity: 0, scale: 0.95}, {opacity: 1, scale: 1, duration: 0.4, ease: "power2.out"});
    renderDashboard();
});

function playSound(frequency, type, duration) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.start(); gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    oscillator.stop(audioCtx.currentTime + duration);
}

async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="p-10 text-center text-primary font-bold animate-pulse text-lg">Atualizando o ranking na nuvem... ☁️</div>';
    try {
        const res = await fetch('/api/leaderboard'); const data = await res.json();
        if (data.success) {
            leaderboardList.innerHTML = '';
            data.leaderboard.forEach((player, index) => {
                let rowBg = ''; let rankVisual = `<span class="text-lg font-black text-slate-400">#${player.rank}</span>`;
                if (player.rank === 1) { rowBg = 'bg-yellow-50 dark:bg-yellow-900/20'; rankVisual = `<span class="text-3xl" title="1º Lugar">👑</span>`; } 
                else if (player.rank === 2) { rowBg = 'bg-slate-50 dark:bg-slate-800/40'; rankVisual = `<span class="text-2xl">🥈</span>`; } 
                else if (player.rank === 3) { rowBg = 'bg-amber-50 dark:bg-amber-900/20'; rankVisual = `<span class="text-2xl">🥉</span>`; }

                const isMe = player.username === username;
                if (isMe) rowBg = 'bg-primary/10 border-l-4 border-primary';

                const row = document.createElement('div');
                row.className = `grid grid-cols-12 gap-2 md:gap-4 p-4 md:p-5 items-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${rowBg}`;
                
                row.innerHTML = `
                    <div class="col-span-2 text-center flex justify-center items-center h-full">${rankVisual}</div>
                    <div class="col-span-6 md:col-span-5 flex flex-col justify-center">
                        <span class="font-black text-base md:text-lg truncate ${isMe ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}">${player.username} ${isMe ? '(Você)' : ''}</span>
                        <span class="text-xs md:text-sm font-bold text-slate-400">Level ${player.level}</span>
                    </div>
                    <div class="col-span-4 md:col-span-3 flex justify-center items-center gap-1 md:gap-2">
                        <span class="text-xl md:text-2xl">${player.league_icon}</span>
                        <span class="font-bold text-xs md:text-base ${player.league_color} truncate">${player.league_name}</span>
                    </div>
                    <div class="hidden md:flex col-span-2 justify-end items-center font-black text-xl text-primary">${player.xp}</div>
                `;
                leaderboardList.appendChild(row);
                gsap.fromTo(row, {opacity: 0, x: -30}, {opacity: 1, x: 0, duration: 0.5, delay: index * 0.05, ease: "back.out(1.2)"});
            });
        }
    } catch (err) { leaderboardList.innerHTML = '<div class="p-10 text-center text-rose-500 font-bold">Erro de conexão ao carregar o ranking.</div>'; }
}