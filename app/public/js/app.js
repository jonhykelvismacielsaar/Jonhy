// ============================================================
// VITRINE FC — Script Principal do Aplicativo 🇧🇷⚽
// Conecta jogadores, olheiros e organizadores em todo o Brasil.
// ============================================================

const API = '/api';
const $ = s => document.querySelector(s);
let TOKEN = localStorage.getItem('vfc_token') || null;
let ME = null;
let currentTab = 'feed';
let profileMode = 'feed';
let chatPoll = null, badgePoll = null, feedPoll = null, eventsPoll = null;

const ROLES = {
  jogador: { emoji: '🏃', label: 'Jogador' },
  goleiro: { emoji: '🧤', label: 'Goleiro' },
  tecnico: { emoji: '📋', label: 'Técnico' },
  arbitro: { emoji: '🟨', label: 'Árbitro' },
  olheiro: { emoji: '🔎', label: 'Olheiro / Clube' },
  admin: { emoji: '🛡️', label: 'Administrador' }
};

// ---------- Papéis oferecidos no cadastro (só 4 — goleiro virou posição do jogador) ----------
const SIGNUP_ROLES = [
  {
    id: 'jogador', emoji: '🏃', accent: 'green', label: 'Jogador(a)',
    tag: 'De linha ou goleiro',
    desc: 'Sua vitrine com lances, card FIFA e números de carreira.'
  },
  {
    id: 'tecnico', emoji: '📋', accent: 'cyan', label: 'Técnico(a)',
    tag: 'Comando e treino',
    desc: 'Currículo do banco: licenças, categorias e conquistas.'
  },
  {
    id: 'arbitro', emoji: '🟨', accent: 'gold', label: 'Árbitro / Juiz',
    tag: 'Apito e bandeira',
    desc: 'Entidade, quadro e os jogos em que você apitou.'
  },
  {
    id: 'olheiro', emoji: '🔎', accent: 'rose', label: 'Olheiro / Clube',
    tag: 'Descobre talentos',
    desc: 'Cadastro rapidinho: e-mail, senha e um perfil de contato.'
  }
];
function signupRole(id) { return SIGNUP_ROLES.find(r => r.id === id) || SIGNUP_ROLES[0]; }

// ---------- Posições agrupadas por setor (jogador) ----------
const POS_GROUPS = [
  { id: 'gk', label: '🧤 Goleiro', items: ['Goleiro'] },
  { id: 'defesa', label: '🛡️ Defesa', items: ['Zagueiro Central', 'Zagueiro Canhoto', 'Lateral Direito', 'Lateral Esquerdo', 'Fixo'] },
  { id: 'meio', label: '🎯 Meio-campo', items: ['Volante / 1º Volante', 'Segundo Volante', 'Meia Central', 'Meia-Armador / Camisa 10', 'Ala Direito', 'Ala Esquerdo'] },
  { id: 'ataque', label: '⚽ Ataque', items: ['Ponta Direita', 'Ponta Esquerda', 'Segundo Atacante', 'Pivô', 'Centroavante', 'Atacante Geral'] }
];

// ---------- Vocabulário do Técnico ----------
const COACH_SPECIALTIES = ['Técnico Principal', 'Auxiliar Técnico', 'Treinador de Base', 'Treinador de Goleiros', 'Preparador Físico', 'Analista de Desempenho', 'Coordenador Técnico'];
const COACH_CATEGORIES = ['Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Feminino', 'Amador', 'Semiprofissional', 'Profissional', 'Futsal', 'Society'];
const COACH_LICENSES = ['Sem licença ainda', 'Curso regional', 'CBF C (Licença C)', 'CBF B (Licença B)', 'CBF A (Licença A)', 'CBF Pró', 'Licença CONMEBOL / FIFA'];
const COACH_LEVELS = ['Base', 'Amador', 'Semiprofissional', 'Profissional'];
const PLAYSTYLES = ['Posse de bola', 'Contra-ataque', 'Pressão alta', 'Jogo direto', 'Bloco baixo', 'Flexível'];

// ---------- Vocabulário do Árbitro ----------
const REF_FUNCTIONS = ['Árbitro Central', 'Assistente (Bandeirinha)', 'Quarto Árbitro', 'Árbitro de Futsal', 'Árbitro de Society', 'Árbitro de Vídeo (VAR)'];
const REF_ENTITIES = ['CBF', 'Federação Estadual', 'Liga Municipal', 'Liga Amadora', 'Escola / Faculdade', 'Independente'];
const REF_LEVELS = ['Aspirante / Iniciante', 'Municipal', 'Estadual', 'Nacional', 'FIFA'];

// ---------- Vocabulário do Olheiro ----------
const SCOUT_ROLES = ['Olheiro', 'Coordenador de Base', 'Diretor de Futebol', 'Analista de Mercado', 'Agente / Empresário', 'Supervisor', 'Presidente de Clube'];

const MODALITY_CHIPS = [
  { id: 'campo', label: '🌿 Campo' },
  { id: 'society', label: '🏟️ Society' },
  { id: 'quadra', label: '⚡ Futsal' }
];

function roleKind(u) {
  if (!u) return 'jogador';
  if (u.role === 'goleiro') return 'jogador';
  return u.role || 'jogador';
}
function arrVal(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

const MODALITIES = {
  campo: {
    id: 'campo',
    name: 'Futebol de Campo',
    shortName: 'Campo (11x11)',
    emoji: '🌿',
    badgeClass: 'badge-mod-campo',
    desc: 'Grama natural ou sintética grande (11 vs 11)'
  },
  society: {
    id: 'society',
    name: 'Society / Fut 7',
    shortName: 'Society (Fut 7)',
    emoji: '🏟️',
    badgeClass: 'badge-mod-society',
    desc: 'Grama sintética (6 a 8 jogadores na linha)'
  },
  quadra: {
    id: 'quadra',
    name: 'Futsal / Quadra',
    shortName: 'Futsal / Quadra',
    emoji: '⚡',
    badgeClass: 'badge-mod-quadra',
    desc: 'Quadra de salão / piso liso (5 vs 5)'
  }
};

const POSITIONS = [
  'Goleiro',
  'Zagueiro Central',
  'Zagueiro Canhoto',
  'Lateral Direito',
  'Lateral Esquerdo',
  'Ala Direito',
  'Ala Esquerdo',
  'Fixo',
  'Volante / 1º Volante',
  'Segundo Volante',
  'Meia Central',
  'Meia-Armador / Camisa 10',
  'Ponta Direita',
  'Ponta Esquerda',
  'Segundo Atacante',
  'Pivô',
  'Centroavante',
  'Atacante Geral',
  'Técnico',
  'Árbitro'
];

const POSITIONS_PRESETS = {
  campo: ['Goleiro', 'Zagueiro Central', 'Lateral Direito', 'Lateral Esquerdo', 'Volante / 1º Volante', 'Meia Central', 'Meia-Armador / Camisa 10', 'Ponta Direita', 'Ponta Esquerda', 'Centroavante'],
  society: ['Goleiro', 'Zagueiro Central', 'Ala Direito', 'Ala Esquerdo', 'Volante / 1º Volante', 'Meia Central', 'Pivô', 'Centroavante'],
  quadra: ['Goleiro', 'Fixo', 'Ala Direito', 'Ala Esquerdo', 'Pivô'],
  goleiro: ['Goleiro'],
  defesa: ['Zagueiro Central', 'Zagueiro Canhoto', 'Lateral Direito', 'Lateral Esquerdo', 'Fixo', 'Volante / 1º Volante'],
  meio: ['Volante / 1º Volante', 'Segundo Volante', 'Meia Central', 'Meia-Armador / Camisa 10', 'Ala Direito', 'Ala Esquerdo'],
  ataque: ['Ponta Direita', 'Ponta Esquerda', 'Segundo Atacante', 'Pivô', 'Centroavante', 'Atacante Geral']
};

const POS_ABBR = {
  'Goleiro': 'GL',
  'Zagueiro': 'ZAG',
  'Zagueiro Central': 'ZAG',
  'Zagueiro Canhoto': 'ZAG',
  'Lateral Direito': 'LD',
  'Lateral Esquerdo': 'LE',
  'Ala Direito': 'ALD',
  'Ala Esquerdo': 'ALE',
  'Fixo': 'FIX',
  'Volante': 'VOL',
  'Volante / 1º Volante': 'VOL',
  'Segundo Volante': '2ºVOL',
  'Meia': 'MEI',
  'Meia Central': 'MC',
  'Meia-Armador / Camisa 10': 'MEI',
  'Ponta Direita': 'PD',
  'Ponta Esquerda': 'PE',
  'Segundo Atacante': 'SA',
  'Pivô': 'PIV',
  'Atacante': 'ATA',
  'Atacante Geral': 'ATA',
  'Centroavante': 'CA',
  'Técnico': 'TEC',
  'Árbitro': 'ARB',
  'Administrador': 'ADM'
};

const FIFA_ATTRS = [
  { key: 'ritmo', label: 'PAC', name: 'Ritmo', icon: '⚡' },
  { key: 'finalizacao', label: 'SHO', name: 'Finalização', icon: '🎯' },
  { key: 'passe', label: 'PAS', name: 'Passe', icon: '🎽' },
  { key: 'drible', label: 'DRI', name: 'Drible', icon: '🌀' },
  { key: 'defesa', label: 'DEF', name: 'Defesa', icon: '🛡️' },
  { key: 'fisico', label: 'PHY', name: 'Físico', icon: '💪' }
];

const FIFA_ATTRS_GK = [
  { key: 'mergulho', label: 'DIV', name: 'Mergulho', icon: '🦘' },
  { key: 'manejo', label: 'HAN', name: 'Manejo', icon: '🧤' },
  { key: 'chute', label: 'KIC', name: 'Chute/Reposição', icon: '🥅' },
  { key: 'reflexos', label: 'REF', name: 'Reflexos', icon: '⚡' },
  { key: 'velocidade', label: 'SPD', name: 'Velocidade', icon: '💨' },
  { key: 'posicionamento', label: 'POS', name: 'Posicionamento', icon: '🧭' }
];

function isGoalkeeper(u) {
  return (u?.role === 'goleiro') || (u?.position === 'Goleiro');
}

function fifaAttrSet(u) {
  return isGoalkeeper(u) ? FIFA_ATTRS_GK : FIFA_ATTRS;
}

function hasFifaAttrs(u) {
  const f = u?.fifa || {};
  return fifaAttrSet(u).some(a => typeof f[a.key] === 'number');
}

function nationalityCode(u) {
  if (u.nationality && u.nationality.trim()) return u.nationality.trim().replace(/\s+/g, ' ').slice(0, 3).toUpperCase();
  return (u.state || 'BR').toUpperCase().slice(0, 3);
}

function fmtDateBR(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fifaBarsHtml(u) {
  const f = u.fifa || {};
  return fifaAttrSet(u).map(a => {
    const val = typeof f[a.key] === 'number' ? f[a.key] : 60;
    return `
      <div class="fifa-bar-row">
        <span class="fb-label">${a.icon} ${a.name}</span>
        <div class="fb-track"><div class="fb-fill" style="width:${Math.min(100, Math.max(0, val))}%"></div></div>
        <span class="fb-val">${val}</span>
      </div>`;
  }).join('');
}

const LEVELS = ['Várzea', 'Amador', 'Base', 'Semiprofissional', 'Profissional'];

const POST_CATEGORIES = {
  profissional: { emoji: '🏆', label: 'Jogo profissional/campeonato' },
  pelada: { emoji: '🎉', label: 'Pelada/várzea' }
};

function postCategory(p) {
  const c = POST_CATEGORIES[p.category] ? p.category : 'pelada';
  return POST_CATEGORIES[c];
}
function postCategoryHtml(p) {
  const c = postCategory(p);
  const cls = p.category === 'profissional' ? 'cat-prof' : 'cat-pelada';
  const mod = MODALITIES[p.modality] || MODALITIES.campo;
  return `
    <span class="post-cat ${cls}">${c.emoji} ${c.label}</span>
    <span class="pill ${mod.badgeClass}" style="font-size:10.5px;padding:2px 8px">${mod.emoji} ${mod.shortName}</span>`;
}

// ---------- API Wrapper ----------
// Diferencia "sessão inválida" (401 → sai da conta) de "internet/servidor
// falhou" (mantém a sessão). Antes, qualquer falha de rede derrubava o usuário
// para a tela inicial e dava a sensação de que o site tinha resetado sozinho.
class NetworkError extends Error {
  constructor(msg) { super(msg); this.name = 'NetworkError'; this.offline = true; }
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (TOKEN) headers['x-token'] = TOKEN;
  let body = opts.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + path, { ...opts, headers, body });
  } catch {
    // Servidor dormindo (plano grátis acorda em ~50s), 4G oscilando, etc.
    throw new NetworkError('Sem conexão com o servidor. Seus dados estão salvos — tente de novo.');
  }
  if (res.status === 401) { logout(); throw new Error('Sessão expirada. Faça login novamente.'); }
  if (res.status >= 500 || res.status === 502 || res.status === 503) {
    throw new NetworkError('O servidor está acordando ou instável. Tente novamente em instantes.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
  return data;
}


function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>⚽</span> <span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

function avatarHtml(u, size = '', showVerified = true) {
  const photo = u?.photo || '/img/logo.png';
  const isGold = (u?.overall || 60) >= 80 || u?.verified;
  return `
    <div style="position:relative;display:inline-block;flex-shrink:0">
      <img class="avatar ${size} ${isGold ? 'gold' : ''}" src="${photo}" alt="">
      ${showVerified && u?.verified ? `<span style="position:absolute;bottom:-2px;right:-2px;font-size:12px;background:#05140b;border-radius:50%;padding:1px;line-height:1" title="Verificado">✅</span>` : ''}
    </div>`;
}

function starsHtml(avg, count) {
  if (!avg) return '<span class="stars" style="color:var(--text-muted)">Sem avaliações ainda</span>';
  const full = Math.round(avg);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <b style="color:var(--gold)">${avg}</b> <small style="color:var(--text-secondary)">(${count})</small>`;
}

function logout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('vfc_token');
  clearInterval(chatPoll); clearInterval(badgePoll); clearInterval(feedPoll); clearInterval(eventsPoll);
  renderSplash();
}

// ============================================================
// TELAS DE ENTRADA / AUTH
// ============================================================
const app = document.getElementById('app');

function renderSplash() {
  app.innerHTML = `
    <div class="screen" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:100dvh;padding:24px">
      <img src="/img/logo.png" style="width:110px;height:110px;border-radius:28px;box-shadow:0 0 35px rgba(0,245,155,0.45);margin-bottom:20px" alt="Vitrine FC">
      <h1 style="font-size:32px;font-weight:900;letter-spacing:-1px;margin-bottom:6px;background:linear-gradient(135deg,#fff 30%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent">VITRINE FC ⚽</h1>
      <p style="color:var(--text-secondary);font-size:15px;max-width:320px;line-height:1.5;margin-bottom:32px">A rede que conecta talentos da várzea e da base a clubes, olheiros e jogos em todo o Brasil.</p>
      
      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:12px">
        <button class="btn btn-primary" onclick="renderRegister()">Criar Conta Grátis 🚀</button>
        <button class="btn btn-outline" onclick="renderLogin()">Já tenho conta — Entrar</button>
      </div>

      <div style="margin-top:40px;font-size:11.5px;color:var(--text-muted)">
        Futebol de Campo • Society (Fut 7) • Futsal / Quadra
      </div>
    </div>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="screen" style="padding-top:40px">
      <button class="back" onclick="renderSplash()">‹ Voltar</button>
      <h2>Entrar na conta ⚽</h2>
      <p class="sub">Digite seu e-mail e senha para acessar a Vitrine.</p>
      
      <label>E-mail</label>
      <input id="f-email" type="email" placeholder="seu@email.com" autocomplete="email">
      
      <label>Senha</label>
      <input id="f-pass" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()">
      
      <div id="f-err" class="err"></div>
      <button class="btn btn-primary mt" onclick="doLogin()">Entrar</button>

      <div style="margin-top:24px;padding:14px;background:rgba(251,191,36,0.08);border:1px dashed var(--border-gold);border-radius:14px;text-align:center">
        <div style="font-size:12.5px;font-weight:900;color:var(--gold);margin-bottom:4px">🛡️ Acesso do Administrador Oficial</div>
        <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.5">
          E-mail: <b style="color:var(--text-primary)">admin@vitrinefc.com</b><br>
          Senha: <b style="color:var(--text-primary)">chefe2026</b>
        </div>
        <button type="button" class="btn btn-outline btn-xs" style="margin-top:8px" onclick="$('#f-email').value='admin@vitrinefc.com';$('#f-pass').value='chefe2026';$('#f-err').textContent='';">Preencher Admin</button>
      </div>
    </div>`;
}

async function doLogin() {
  try {
    const res = await api('/login', {
      method: 'POST',
      body: { email: $('#f-email').value.trim(), password: $('#f-pass').value }
    });
    TOKEN = res.token;
    ME = res.user;
    localStorage.setItem('vfc_token', TOKEN);
    enterApp();
  } catch (e) {
    $('#f-err').textContent = e.message;
  }
}

// ============================================================
// CADASTRO — assistente em 2 passos 🪄
// Passo 1: escolher o papel (4 opções). Passo 2: dados do papel.
// ============================================================
let regRole = 'jogador';
let regStep = 1;
let regPos = '';
let regSpecialty = '';

function renderRegister() {
  regStep = 1;
  regRole = 'jogador';
  regPos = '';
  regSpecialty = '';
  drawRegister();
}

function drawRegister() {
  app.innerHTML = regStep === 1 ? regStep1Html() : regStep2Html();
  window.scrollTo({ top: 0 });
  const first = document.getElementById('r-name');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 220);
}

function regAuthShell(inner) {
  return `
    <div class="screen auth">
      <div class="auth-head">
        <button class="back" onclick="${regStep === 1 ? 'renderSplash()' : 'regBack()'}">‹ ${regStep === 1 ? 'Voltar' : 'Trocar papel'}</button>
        <div class="steps">
          <span class="dot ${regStep >= 1 ? 'on' : ''}"></span>
          <span class="dot ${regStep >= 2 ? 'on' : ''}"></span>
        </div>
      </div>
      ${inner}
    </div>`;
}

function regStep1Html() {
  return regAuthShell(`
    <img class="auth-logo" src="/img/logo.png" alt="Vitrine FC">
    <h1 class="auth-title">Qual é o seu papel<br><span>no futebol?</span></h1>
    <p class="sub">Escolha uma opção — o cadastro muda inteiro conforme ela.</p>

    <div class="role-picker">
      ${SIGNUP_ROLES.map(r => `
        <button class="role-card acc-${r.accent} ${regRole === r.id ? 'on' : ''}" data-role="${r.id}" onclick="pickRole('${r.id}')">
          <span class="rc-emoji">${r.emoji}</span>
          <span class="rc-body">
            <b>${r.label}</b>
            <i>${r.tag}</i>
            <small>${r.desc}</small>
          </span>
          <span class="rc-check">✓</span>
        </button>`).join('')}
    </div>

    <button class="btn btn-primary btn-lg mt" onclick="regGoStep2()">Continuar ➜</button>
    <p class="auth-foot">Já tem conta? <a onclick="renderLogin()">Entrar</a></p>`);
}

function regStep2Html() {
  const r = signupRole(regRole);
  const extra = regExtraHtml();
  return regAuthShell(`
    <div class="auth-chip acc-${r.accent}">${r.emoji} ${r.label}</div>
    <h1 class="auth-title">${r.id === 'olheiro' ? 'Cadastro rápido' : 'Criar sua conta'}</h1>
    <p class="sub">${r.id === 'olheiro'
      ? 'Só o essencial agora. O resto você completa no seu perfil.'
      : 'Só o essencial agora — depois você completa a ficha no seu perfil.'}</p>

    <div class="form-card">
      <div class="field">
        <label for="r-name">${r.id === 'olheiro' ? 'Nome do responsável' : 'Seu nome completo'}</label>
        <input id="r-name" placeholder="Ex: Gabriel Silva" autocomplete="name">
      </div>
      <div class="field">
        <label for="r-email">E-mail</label>
        <input id="r-email" type="email" placeholder="gabriel@email.com" autocomplete="email" inputmode="email">
      </div>
      <div class="field">
        <label for="r-pass">Senha</label>
        <div class="pw-wrap">
          <input id="r-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password"
                 oninput="updatePwMeter(this.value)" onkeydown="if(event.key==='Enter')doRegister()">
          <button type="button" class="pw-eye" onclick="togglePw(this,'r-pass')" aria-label="Mostrar senha">👁️</button>
        </div>
        <div class="pw-meter"><span id="pw-bar" data-s="0"></span></div>
      </div>
      ${extra}
    </div>

    <div id="r-err" class="err"></div>
    <button class="btn btn-primary btn-lg mt" onclick="doRegister()">⚽ Criar conta e entrar</button>
    <p class="auth-foot">Depois de entrar você completa a ficha no seu perfil. 📲</p>`);
}

function regExtraHtml() {
  if (regRole === 'jogador') {
    return `
      <div class="field">
        <label>Sua posição <span class="opt">(goleiro é uma posição)</span></label>
        ${POS_GROUPS.map(g => `
          <div class="chip-group">
            <h5>${g.label}</h5>
            <div class="chip-row" data-chip="pos" data-multi="0">
              ${g.items.map(p => `<button type="button" class="chip ${regPos === p ? 'on' : ''}" onclick="pickChip('pos','${p.replace(/'/g, "\\'")}')">${p}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>`;
  }
  if (regRole === 'tecnico') {
    return `
      <div class="field">
        <label>Sua função no futebol</label>
        <div class="chip-row" data-chip="spec" data-multi="0">
          ${COACH_SPECIALTIES.map(s => `<button type="button" class="chip ${regSpecialty === s ? 'on' : ''}" onclick="pickChip('spec','${s}')">${s}</button>`).join('')}
        </div>
      </div>`;
  }
  if (regRole === 'arbitro') {
    return `
      <div class="field">
        <label>Sua função em campo</label>
        <div class="chip-row" data-chip="func" data-multi="0">
          ${REF_FUNCTIONS.map(s => `<button type="button" class="chip ${regSpecialty === s ? 'on' : ''}" onclick="pickChip('spec','${s}')">${s}</button>`).join('')}
        </div>
      </div>`;
  }
  return `
    <div class="field">
      <label for="r-club">Clube, empresa ou agência <span class="opt">(opcional)</span></label>
      <input id="r-club" placeholder="Ex: EC Juventude / Agência Bola de Ouro">
    </div>
    <div class="mini-note">🔎 Atletas vão ver seu perfil e seus contatos na busca.</div>`;
}

function pickChip(kind, value) {
  if (kind === 'pos') regPos = regPos === value ? '' : value;
  else regSpecialty = regSpecialty === value ? '' : value;

  // guarda o que já foi digitado, redesenha o passo 2 e devolve os valores
  const keep = {
    name: document.getElementById('r-name')?.value || '',
    email: document.getElementById('r-email')?.value || '',
    pass: document.getElementById('r-pass')?.value || '',
    club: document.getElementById('r-club')?.value || ''
  };
  const holder = document.createElement('div');
  holder.innerHTML = regStep2Html();
  const next = holder.firstElementChild;
  document.querySelector('.auth')?.replaceWith(next);
  document.getElementById('r-name').value = keep.name;
  document.getElementById('r-email').value = keep.email;
  document.getElementById('r-pass').value = keep.pass;
  const clubEl = document.getElementById('r-club');
  if (clubEl) clubEl.value = keep.club;
  updatePwMeter(keep.pass);
  window.scrollTo({ top: 0 });
}

function togglePw(btn, id) {
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁️';
}

function updatePwMeter(v) {
  const bar = document.getElementById('pw-bar');
  if (!bar) return;
  const score = Math.min(4, (v.length >= 6 ? 1 : 0) + (v.length >= 10 ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/[0-9]/.test(v) ? 1 : 0));
  bar.style.width = (score * 25) + '%';
  bar.dataset.s = score;
}

function pickRole(role) {
  regRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.toggle('on', c.dataset.role === role));
}

function regGoStep2() {
  regStep = 2;
  drawRegister();
}

function regBack() {
  regStep = 1;
  drawRegister();
}

async function doRegister() {
  const name = $('#r-name').value.trim();
  const email = $('#r-email').value.trim();
  const password = $('#r-pass').value;
  const err = $('#r-err');
  if (!name) return (err.textContent = 'Digite seu nome.', $('#r-name').focus());
  if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = 'Digite um e-mail válido.', $('#r-email').focus());
  if (password.length < 6) return (err.textContent = 'A senha precisa ter pelo menos 6 caracteres.', $('#r-pass').focus());
  err.textContent = '';
  const btn = document.querySelector('.auth .btn-lg');
  if (btn) { btn.disabled = true; btn.textContent = 'Criando sua conta… ⏳'; }
  try {
    const res = await api('/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        role: regRole,
        position: regRole === 'jogador' ? regPos : '',
        specialty: regSpecialty,
        club: document.getElementById('r-club')?.value?.trim() || ''
      }
    });
    TOKEN = res.token;
    ME = res.user;
    localStorage.setItem('vfc_token', TOKEN);
    renderEditProfile(true);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '⚽ Criar conta e entrar'; }
    if (err) err.textContent = e.message;
  }
}

// ============================================================
// INICIALIZAÇÃO DO APP
// ============================================================
async function init() {
  if (TOKEN) {
    // Tenta algumas vezes: no plano grátis o servidor pode levar ~50s para acordar.
    // Só desloga se o servidor REALMENTE disser que a sessão não vale mais (401).
    for (let tentativa = 1; tentativa <= 4; tentativa++) {
      try {
        ME = await api('/me');
        enterApp();
        return;
      } catch (e) {
        if (e.offline) {
          renderWaking(tentativa);
          await new Promise(r => setTimeout(r, tentativa * 3000));
          continue;
        }
        // Sessão inválida de verdade
        localStorage.removeItem('vfc_token');
        TOKEN = null;
        break;
      }
    }
    if (TOKEN) {
      // Continua sem resposta: mantém o login salvo e oferece tentar de novo,
      // em vez de jogar o usuário para fora da conta.
      renderConnectionError();
      return;
    }
  }
  renderSplash();
}

function renderWaking(tentativa) {
  document.getElementById('app').innerHTML = `
    <div class="waking-screen">
      <img src="/img/logo.png" alt="Vitrine FC">
      <h2>Vitrine FC ⚽</h2>
      <p>Acordando o servidor… (tentativa ${tentativa} de 4)</p>
      <div class="waking-bar"><span></span></div>
      <small>Seus dados e sua conta continuam salvos.</small>
    </div>`;
}

function renderConnectionError() {
  document.getElementById('app').innerHTML = `
    <div class="waking-screen">
      <img src="/img/logo.png" alt="Vitrine FC">
      <h2>Sem conexão 📡</h2>
      <p>Não conseguimos falar com o servidor agora.<br>Sua conta <b>continua salva</b> neste aparelho.</p>
      <button class="btn btn-primary" style="max-width:280px" onclick="init()">🔄 Tentar novamente</button>
      <button class="btn btn-outline" style="max-width:280px" onclick="logout()">Entrar com outra conta</button>
    </div>`;
}


function enterApp() {
  renderShell();
  showTab('feed');
  clearInterval(badgePoll);
  badgePoll = setInterval(refreshBadges, 5000);
  refreshBadges();
}

function renderShell() {
  const isAdmin = ME && !!ME.isAdmin;
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><img src="/img/logo.png" alt="">Vitrine FC</div>
      <div style="display:flex;align-items:center;gap:8px">
        ${isAdmin ? `<button class="topbar-admin-pill" onclick="showTab('admin')" title="Painel do Administrador">🛡️ Admin</button>` : ''}
        <button class="bell" onclick="showTab('notifs')">🔔<span class="badge" id="b-notif" style="display:none"></span></button>
      </div>
    </div>
    <div class="screen" id="content"></div>
    <div class="nav">
      <button id="nav-feed" onclick="showTab('feed')"><span class="ico">🏠</span>Feed</button>
      <button id="nav-reels" onclick="showTab('reels')"><span class="ico">🎬</span>Lances</button>
      <button id="nav-events" onclick="showTab('events')"><span class="ico">📍</span>Jogos</button>
      <button id="nav-search" onclick="showTab('search')"><span class="ico">🔎</span>Buscar</button>
      <button id="nav-chat" onclick="showTab('chat')"><span class="ico">💬</span>Chat<span class="badge" id="b-chat" style="display:none"></span></button>
      <button id="nav-profile" onclick="showTab('profile')"><span class="ico">👤</span>Perfil</button>
      ${isAdmin ? `<button id="nav-admin" onclick="showTab('admin')"><span class="ico">🛡️</span>Admin</button>` : ''}
    </div>`;
}

async function refreshBadges() {
  if (!TOKEN) return;
  try {
    const b = await api('/badges');
    setBadge('b-chat', (b.unreadMsgs || 0) + (b.pendingProps || 0));
    setBadge('b-notif', b.unreadNotifs || 0);
  } catch {}
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = count > 0 ? 'inline-flex' : 'none';
  el.textContent = count > 99 ? '99+' : count;
}

function showTab(tab) {
  currentTab = tab;
  clearInterval(chatPoll);
  clearInterval(feedPoll);
  clearInterval(eventsPoll);
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
  const nb = document.getElementById('nav-' + tab);
  if (nb) nb.classList.add('on');
  if (tab === 'props') { document.getElementById('nav-chat')?.classList.add('on'); }

  const tabHandlers = {
    feed: renderFeed,
    reels: renderReels,
    events: renderEvents,
    search: renderSearch,
    props: renderProps,
    chat: renderConvs,
    profile: () => renderProfile(ME.id),
    notifs: renderNotifs,
    admin: renderAdmin
  };

  if (tabHandlers[tab]) tabHandlers[tab]();
}

// ============================================================
// FEED
// ============================================================
let feedCategory = 'all';
let feedModality = '';
let _postsCache = {};

function cachePosts(posts) {
  if (!Array.isArray(posts)) return;
  posts.forEach(p => { if (p && p.id) _postsCache[p.id] = p; });
}

async function renderFeed() {
  const c = $('#content');
  c.innerHTML = `
    <div id="stories-wrap"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 12px">
      <button class="btn btn-primary btn-sm" onclick="openNewPost()" style="width:100%;box-shadow:0 0 15px rgba(0,245,155,0.3)">
        ➕ Publicar Lance / Foto / Vídeo
      </button>
    </div>
    <div class="subtabs" style="margin-bottom:8px">
      <button class="${feedCategory === 'all' ? 'on' : ''}" onclick="feedCategory='all'; loadFeed()">🌐 Todos</button>
      <button class="${feedCategory === 'profissional' ? 'on' : ''}" onclick="feedCategory='profissional'; loadFeed()">🏆 Profissional</button>
      <button class="${feedCategory === 'pelada' ? 'on' : ''}" onclick="feedCategory='pelada'; loadFeed()">🎉 Pelada / Várzea</button>
    </div>
    <div class="modality-filter-strip" style="margin-bottom:12px">
      <button class="mod-pill ${feedModality === '' ? 'on' : ''}" onclick="feedModality=''; loadFeed()">⚽ Todas</button>
      <button class="mod-pill mod-campo ${feedModality === 'campo' ? 'on' : ''}" onclick="feedModality='campo'; loadFeed()">🌿 Campo</button>
      <button class="mod-pill mod-society ${feedModality === 'society' ? 'on' : ''}" onclick="feedModality='society'; loadFeed()">🏟️ Society</button>
      <button class="mod-pill mod-quadra ${feedModality === 'quadra' ? 'on' : ''}" onclick="feedModality='quadra'; loadFeed()">⚡ Quadra</button>
    </div>
    <div id="feed-list"><p class="empty">Carregando lances… ⚽</p></div>`;
  loadStories();
  loadFeed();
  feedPoll = setInterval(loadFeedSilent, 8000);
}

let lastFeedSig = '';
function feedSignature(posts) {
  return (posts || []).map(p => `${p.id}:${p.likes.length}:${p.comments.length}:${p.starsCount}`).join('|');
}

async function loadFeed() {
  const params = new URLSearchParams();
  if (feedCategory !== 'all') params.set('category', feedCategory);
  if (feedModality) params.set('modality', feedModality);
  const posts = await api('/posts?' + params);
  lastFeedSig = feedSignature(posts);
  cachePosts(posts);
  drawFeed(posts);
}

async function loadFeedSilent() {
  const el = $('#feed-list');
  if (!el || currentTab !== 'feed') return;
  const params = new URLSearchParams();
  if (feedCategory !== 'all') params.set('category', feedCategory);
  if (feedModality) params.set('modality', feedModality);
  try {
    const posts = await api('/posts?' + params);
    const sig = feedSignature(posts);
    if (sig !== lastFeedSig) {
      lastFeedSig = sig;
      cachePosts(posts);
      drawFeed(posts);
    }
  } catch {}
}

function drawFeed(posts) {
  const el = $('#feed-list');
  if (!el) return;
  el.innerHTML = posts.length ? posts.map(postHtml).join('')
    : '<div class="empty"><span class="big">⚽</span>Nenhum lance publicado nesta categoria.<br>Seja o primeiro a postar!</div>';
}

function openNewPost() {
  let selectedMod = 'campo';
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>➕ Publicar novo lance</h3>
      <p class="sub">Mostre seu futebol para olheiros e outros jogadores!</p>

      <label>Modalidade</label>
      <div class="modality-selector-grid">
        <div class="modality-card selected campo" onclick="selectPostMod(this, 'campo')">
          <span class="mod-icon">🌿</span><b>Campo</b><span>11 vs 11</span>
        </div>
        <div class="modality-card society" onclick="selectPostMod(this, 'society')">
          <span class="mod-icon">🏟️</span><b>Society</b><span>Fut 7</span>
        </div>
        <div class="modality-card quadra" onclick="selectPostMod(this, 'quadra')">
          <span class="mod-icon">⚡</span><b>Quadra</b><span>Futsal</span>
        </div>
      </div>

      <label>Categoria do Lance</label>
      <select id="np-cat">
        <option value="pelada">🎉 Pelada / Várzea / Amador</option>
        <option value="profissional">🏆 Jogo Profissional / Campeonato / Base</option>
      </select>
      
      <label>Título / Lance</label>
      <input id="np-title" placeholder="Ex: Gol de falta no ângulo na final!">
      
      <label>Descrição / Detalhes (opcional)</label>
      <textarea id="np-desc" rows="2" placeholder="Ex: Jogo contra o Juventude, camisa 10 titular…"></textarea>
      
      <label>Foto ou Vídeo do lance</label>
      <input id="np-file" type="file" accept="image/*,video/*">

      <button class="btn btn-primary mt" id="np-send">Publicar Agora 📢</button>
      <button class="btn btn-outline mt" id="np-cancel">Cancelar</button>
    </div>`;

  window.selectPostMod = (el, mod) => {
    selectedMod = mod;
    bg.querySelectorAll('.modality-card').forEach(c => c.className = 'modality-card');
    el.className = `modality-card selected ${mod}`;
  };

  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#np-cancel').onclick = () => bg.remove();
  bg.querySelector('#np-send').onclick = async () => {
    const file = bg.querySelector('#np-file').files[0];
    const title = bg.querySelector('#np-title').value.trim();
    if (!title || !file) return toast('Preencha o título e selecione uma foto/vídeo.');
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', bg.querySelector('#np-desc').value.trim());
    fd.append('category', bg.querySelector('#np-cat').value);
    fd.append('modality', selectedMod);
    fd.append('media', file);
    toast('Enviando seu lance… ⏳');
    bg.remove();
    try {
      await api('/posts', { method: 'POST', body: fd });
      toast('Lance publicado com sucesso! ⚽🔥');
      loadFeed();
    } catch (e) { toast('Erro: ' + e.message); }
  };
  document.body.appendChild(bg);
}

// ---------- Stories ----------
let _storiesData = [];
async function loadStories() {
  const wrap = $('#stories-wrap');
  if (!wrap) return;
  try {
    _storiesData = await api('/stories');
    const myStories = _storiesData.find(s => s.user.id === ME.id);
    wrap.innerHTML = `
      <div class="stories-strip">
        <div class="story-add">
          <div class="story-ring add">
            ${avatarHtml(ME, '', false)}
            <div class="plus" onclick="newStory()">+</div>
          </div>
          <span>Seu story</span>
        </div>
        ${_storiesData.map((s, idx) => `
          <button class="story-item" onclick="openStories(${idx})">
            <div class="story-ring ${s.hasUnseen ? '' : 'seen'}">
              ${avatarHtml(s.user, '', false)}
            </div>
            <span>${esc((s.user.nickname || s.user.name).split(' ')[0])}</span>
          </button>`).join('')}
      </div>`;
  } catch {}
}

function newStory() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*,video/*';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const cap = prompt('Legenda do story (opcional):') || '';
    const fd = new FormData();
    fd.append('media', file);
    fd.append('caption', cap);
    toast('Publicando story… ⏳');
    try {
      await api('/stories', { method: 'POST', body: fd });
      toast('Story publicado! 📖✨ (expira em 24h)');
      loadStories();
    } catch (e) { toast('Erro: ' + e.message); }
  };
  inp.click();
}

let storyViewerIdx = 0, storySubIdx = 0, storyTimer = null;
function openStories(userIndex) {
  storyViewerIdx = userIndex;
  storySubIdx = 0;
  renderStoryModal();
}

function renderStoryModal() {
  clearTimeout(storyTimer);
  const uStory = _storiesData[storyViewerIdx];
  if (!uStory || !uStory.stories.length) return closeStories();
  const current = uStory.stories[storySubIdx];
  if (!current) {
    if (storyViewerIdx + 1 < _storiesData.length) {
      storyViewerIdx++; storySubIdx = 0; return renderStoryModal();
    }
    return closeStories();
  }

  api('/stories/' + current.id + '/view', { method: 'POST' }).catch(() => {});

  let box = document.getElementById('story-modal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'story-modal';
    box.className = 'story-viewer';
    document.body.appendChild(box);
  }

  const isMine = uStory.user.id === ME.id;
  box.innerHTML = `
    <div class="sv-bars">
      ${uStory.stories.map((s, i) => `
        <div class="sv-bar"><div class="sv-progress" style="width:${i < storySubIdx ? 100 : (i === storySubIdx ? 0 : 0)}%"></div></div>`).join('')}
    </div>
    <div class="sv-top">
      <div class="sv-author" onclick="renderProfile('${uStory.user.id}'); closeStories();">
        ${avatarHtml(uStory.user, 'sm')}
        <div>
          <b>${esc(uStory.user.name)}</b>
          <span>${timeAgo(current.createdAt)} atrás</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        ${isMine ? `<button style="color:var(--danger);font-size:18px" onclick="delStory('${current.id}')" title="Excluir">🗑️</button>` : ''}
        <button class="sv-close" onclick="closeStories()">✕</button>
      </div>
    </div>
    <div class="sv-touch-left" onclick="prevStory()"></div>
    <div class="sv-touch-right" onclick="nextStory()"></div>
    <div class="sv-media-wrap">
      ${current.type === 'video'
        ? `<video id="sv-video" src="${current.url}" autoplay playsinline muted></video>`
        : `<img src="${current.url}" alt="">`}
    </div>
    ${current.caption ? `<div class="sv-caption">${esc(current.caption)}</div>` : ''}`;

  const bar = box.querySelectorAll('.sv-progress')[storySubIdx];
  if (current.type === 'video') {
    const v = box.querySelector('#sv-video');
    v.onloadedmetadata = () => {
      const dur = (v.duration || 5) * 1000;
      animateBar(bar, dur);
      storyTimer = setTimeout(nextStory, dur);
    };
    v.onended = nextStory;
  } else {
    animateBar(bar, 5000);
    storyTimer = setTimeout(nextStory, 5000);
  }
}

function animateBar(bar, ms) {
  if (!bar) return;
  bar.style.transition = `width ${ms}ms linear`;
  setTimeout(() => { bar.style.width = '100%'; }, 20);
}

function nextStory() {
  clearTimeout(storyTimer);
  const uStory = _storiesData[storyViewerIdx];
  if (storySubIdx + 1 < (uStory?.stories.length || 0)) {
    storySubIdx++;
    renderStoryModal();
  } else if (storyViewerIdx + 1 < _storiesData.length) {
    storyViewerIdx++; storySubIdx = 0;
    renderStoryModal();
  } else {
    closeStories();
  }
}

function prevStory() {
  clearTimeout(storyTimer);
  if (storySubIdx > 0) {
    storySubIdx--;
    renderStoryModal();
  } else if (storyViewerIdx > 0) {
    storyViewerIdx--;
    storySubIdx = _storiesData[storyViewerIdx].stories.length - 1;
    renderStoryModal();
  } else {
    renderStoryModal();
  }
}

function closeStories() {
  clearTimeout(storyTimer);
  document.getElementById('story-modal')?.remove();
  loadStories();
}

async function delStory(id) {
  if (!confirm('Excluir este story?')) return;
  await api('/stories/' + id, { method: 'DELETE' });
  toast('Story excluído.');
  nextStory();
}

// ---------- Post Card HTML ----------
function postHtml(p) {
  const liked = p.likes.includes(ME.id);
  const isMine = p.userId === ME.id || ME.isAdmin;
  return `
    <div class="post" id="post-${p.id}">
      <div class="head">
        ${avatarHtml(p.user, 'md')}
        <div class="who" onclick="renderProfile('${p.user?.id}')" style="cursor:pointer">
          <b>${esc(p.user?.name || '?')} ${p.user?.verified ? '✅' : ''} <span class="ovr-mini">${p.user?.overall || 60}</span></b>
          <span>${ROLES[p.user?.role]?.emoji || ''} ${esc(p.user?.position || '')}${p.user?.city ? ' · ' + esc(p.user?.city) : ''} · ${timeAgo(p.createdAt)}</span>
        </div>
        ${isMine ? `<button style="font-size:16px;color:var(--text-muted);padding:4px" onclick="delPost('${p.id}')" title="Excluir">🗑️</button>` : ''}
      </div>
      
      <div class="post-media-wrap" ondblclick="triggerDoubleTapLike('${p.id}')">
        ${p.type === 'video'
          ? `<video class="media" src="${esc(p.url)}" controls playsinline preload="metadata"></video>`
          : `<img class="media" src="${esc(p.url)}" alt="${esc(p.title)}">`}
      </div>
      
      <div class="body">
        <div>${postCategoryHtml(p)}</div>
        <p class="caption" style="margin-top:8px"><b>${esc(p.title)}</b>${p.description ? ' — ' + esc(p.description) : ''}</p>
      </div>

      <div class="post-stars">
        <span class="ps-label">Avalie o lance:</span>
        <div class="ps-pick" id="ps-${p.id}">
          ${[1,2,3,4,5].map(s => `<button class="ps-star ${p.myStars && p.myStars >= s ? 'on' : ''}" onclick="ratePost('${p.id}', ${s})">★</button>`).join('')}
        </div>
        <span class="ps-avg">${p.starsAvg ? `⭐ <b>${p.starsAvg}</b> (${p.starsCount})` : '<span style="color:var(--text-muted)">Sem notas</span>'}</span>
      </div>

      <div class="actions">
        <button class="${liked ? 'liked' : ''}" onclick="likePost('${p.id}')">
          ${liked ? '❤️' : '🤍'} <span>${p.likes.length}</span>
        </button>
        <button onclick="toggleComments('${p.id}')">
          💬 <span>${p.comments.length}</span>
        </button>
        <button onclick="sharePost('${p.id}')" style="margin-left:auto">
          🔗 Compartilhar
        </button>
      </div>

      <div class="comments" id="comments-${p.id}">
        ${p.comments.slice(-2).map(c => commentHtml(p.id, c)).join('')}
        ${p.comments.length > 2 ? `<button class="see-all" onclick="openAllComments('${p.id}')">Ver todos os ${p.comments.length} comentários</button>` : ''}
        <div class="c-input">
          ${avatarHtml(ME, 'sm', false)}
          <input id="ci-${p.id}" placeholder="Escreva um comentário…" onkeydown="if(event.key==='Enter')addComment('${p.id}')">
          <button onclick="addComment('${p.id}')">➤</button>
        </div>
      </div>
    </div>`;
}

function commentHtml(postId, c) {
  const canDel = c.userId === ME.id || ME.isAdmin;
  return `
    <div class="comment">
      <b onclick="renderProfile('${c.user?.id}')">${esc(c.user?.name || '?')}</b> ${esc(c.text)}
      <span class="c-when">${timeAgo(c.createdAt)}${canDel ? ` · <a onclick="delComment('${postId}', '${c.id}')">excluir</a>` : ''}</span>
    </div>`;
}

async function likePost(id) {
  const post = await api(`/posts/${id}/like`, { method: 'POST' });
  _postsCache[id] = post;
  updatePostDom(post);
}

function triggerDoubleTapLike(id) {
  const wrap = document.querySelector(`#post-${id} .post-media-wrap`);
  if (wrap) {
    const heart = document.createElement('div');
    heart.className = 'double-tap-heart'; heart.textContent = '❤️';
    wrap.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
  }
  likePost(id);
}

async function ratePost(id, stars) {
  const post = await api(`/posts/${id}/rate`, { method: 'POST', body: { stars } });
  _postsCache[id] = post;
  updatePostDom(post);
  toast(`Você avaliou este lance com ${stars} estrela(s)! ⭐`);
}

async function addComment(id) {
  const inp = document.getElementById('ci-' + id);
  if (!inp || !inp.value.trim()) return;
  const comment = await api(`/posts/${id}/comments`, { method: 'POST', body: { text: inp.value.trim() } });
  inp.value = '';
  const p = _postsCache[id];
  if (p) {
    p.comments.push(comment);
    updatePostDom(p);
  } else loadFeed();
}

async function delComment(postId, commentId) {
  await api('/comments/' + commentId, { method: 'DELETE' });
  const p = _postsCache[postId];
  if (p) {
    p.comments = p.comments.filter(c => c.id !== commentId);
    updatePostDom(p);
  }
}

async function delPost(id) {
  if (!confirm('Excluir este lance permanentemente?')) return;
  await api('/posts/' + id, { method: 'DELETE' });
  document.getElementById('post-' + id)?.remove();
  toast('Lance excluído.');
}

function updatePostDom(p) {
  const old = document.getElementById('post-' + p.id);
  if (!old) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = postHtml(p);
  old.replaceWith(tmp.firstElementChild);
}

function toggleComments(id) {
  const el = document.getElementById('comments-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('ci-' + id)?.focus();
}

function sharePost(id) {
  const url = window.location.origin + '#post-' + id;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    toast('Link copiado para a área de transferência! 🔗');
  } else toast('Link: ' + url);
}

// ============================================================
// REELS (Lances em tela cheia)
// ============================================================
let reelsVideos = [];
async function renderReels() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando lances em vídeo… 🎬</p>';
  const posts = await api('/posts?type=video');
  cachePosts(posts);
  reelsVideos = posts;
  if (!posts.length) {
    c.innerHTML = `
      <div class="empty">
        <span class="big">🎬</span>
        Nenhum vídeo publicado ainda.<br>
        Poste o primeiro vídeo de lance no botão ➕ do feed!
      </div>`;
    return;
  }
  c.innerHTML = `
    <div class="reels">
      ${posts.map((p, i) => `
        <div class="reel" data-idx="${i}">
          <video src="${esc(p.url)}" playsinline loop ${i === 0 ? 'autoplay' : ''} onclick="toggleVideoPlay(this)"></video>
          <div class="r-side">
            <button class="${p.likes.includes(ME.id) ? 'liked' : ''}" onclick="likeReel('${p.id}', this)">
              ${p.likes.includes(ME.id) ? '❤️' : '🤍'}<i>${p.likes.length}</i>
            </button>
            <button onclick="openChat('${p.user?.id}', '${esc(p.user?.name || '')}')">💬<i>Chat</i></button>
            <button onclick="sharePost('${p.id}')">🔗<i>Share</i></button>
          </div>
          <div class="r-info" onclick="renderProfile('${p.user?.id}')">
            ${avatarHtml(p.user, 'md')}
            <div>
              <b>${esc(p.user?.name || '?')} ${p.user?.verified ? '✅' : ''} <span class="ovr-mini">${p.user?.overall || 60}</span></b>
              <span>${ROLES[p.user?.role]?.emoji || ''} ${esc(p.user?.position || '')}</span>
              <p>${esc(p.title)}</p>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  const reelsEl = c.querySelector('.reels');
  reelsEl.onscroll = () => {
    const idx = Math.round(reelsEl.scrollTop / reelsEl.clientHeight);
    reelsEl.querySelectorAll('video').forEach((v, i) => {
      if (i === idx) { v.play().catch(() => {}); }
      else { v.pause(); v.currentTime = 0; }
    });
  };
}

function toggleVideoPlay(v) {
  if (v.paused) v.play(); else v.pause();
}
async function likeReel(id, btn) {
  const post = await api(`/posts/${id}/like`, { method: 'POST' });
  const liked = post.likes.includes(ME.id);
  btn.classList.toggle('liked', liked);
  btn.innerHTML = `${liked ? '❤️' : '🤍'}<i>${post.likes.length}</i>`;
}

// ============================================================
// PENEIRAS & MONTAR TIME 📍 (CAMPO, SOCIETY, QUADRA)
// ============================================================
let evMap = null, evView = 'list', evModalityFilter = '', evTypeFilter = '', evCityFilter = '', evPositionFilter = '', evMyOnly = false;

async function renderEvents() {
  const c = $('#content');
  c.innerHTML = `
    <div class="events-header">
      <div>
        <h2>Jogos & Peneiras 📍</h2>
        <p class="sub">Lance seu jogo, monte seu time ou candidate-se a vagas abertas!</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openNewEvent()" style="white-space:nowrap;box-shadow:0 0 16px rgba(0,245,155,0.35)">
        ➕ Criar Jogo / Vagas
      </button>
    </div>

    <!-- Modality Filter Selector -->
    <div class="modality-filter-strip">
      <button class="mod-pill ${evModalityFilter === '' ? 'on' : ''}" onclick="filterEvModality('')">
        ⚽ Todas
      </button>
      <button class="mod-pill mod-campo ${evModalityFilter === 'campo' ? 'on' : ''}" onclick="filterEvModality('campo')">
        🌿 Campo (11x11)
      </button>
      <button class="mod-pill mod-society ${evModalityFilter === 'society' ? 'on' : ''}" onclick="filterEvModality('society')">
        🏟️ Society (Fut 7)
      </button>
      <button class="mod-pill mod-quadra ${evModalityFilter === 'quadra' ? 'on' : ''}" onclick="filterEvModality('quadra')">
        ⚡ Futsal / Quadra
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="filters mt">
      <input id="ev-city" placeholder="📍 Filtrar por cidade…" value="${esc(evCityFilter)}" oninput="evMyOnly=false; evCityFilter=this.value; loadEvents();">
      <select id="ev-type" onchange="evMyOnly=false; evTypeFilter=this.value; loadEvents();">
        <option value="">🥅 Peneiras & Jogos</option>
        <option value="jogo" ${evTypeFilter === 'jogo' ? 'selected' : ''}>⚽ Jogos / Montar Time</option>
        <option value="peneira" ${evTypeFilter === 'peneira' ? 'selected' : ''}>🥅 Peneiras / Avaliações</option>
      </select>
    </div>

    <div class="row2" style="margin-bottom:14px">
      <button class="btn btn-outline btn-sm" id="ev-toggle" onclick="toggleEvView()">
        ${evView === 'list' ? '🗺️ Ver no mapa' : '📋 Ver lista de jogos'}
      </button>
      <button class="btn btn-gold btn-sm" onclick="showMyEventsOnly()">
        👑 Meus Jogos Criados
      </button>
    </div>

    <div id="ev-map" style="display:${evView === 'map' ? 'block' : 'none'}"></div>
    <div id="ev-list"><p class="empty">Carregando jogos e peneiras… ⏳</p></div>`;

  loadEvents();
  // ⏰ A lista se atualiza sozinha: jogo que passou do horário sai da lista
  // automaticamente, sem precisar recarregar o app.
  eventsPoll = setInterval(loadEventsSilent, 30000);
}

function filterEvModality(mod) {
  evModalityFilter = mod;
  evMyOnly = false;
  document.querySelectorAll('.modality-filter-strip .mod-pill').forEach(b => b.classList.remove('on'));
  event.target.classList.add('on');
  loadEvents();
}

function showMyEventsOnly() {
  evMyOnly = true;
  loadEvents();
  toast('Exibindo só os jogos criados por você 👑');
}

function toggleEvView() {
  evView = evView === 'list' ? 'map' : 'list';
  $('#ev-map').style.display = evView === 'map' ? 'block' : 'none';
  $('#ev-list').style.display = evView === 'map' ? 'none' : 'block';
  $('#ev-toggle').textContent = evView === 'list' ? '🗺️ Ver no mapa' : '📋 Ver lista de jogos';
  if (evView === 'map') setTimeout(() => { evMap && evMap.invalidateSize(); }, 100);
}

let evTimer = null;
let _eventsSig = '';
function eventsQuery() {
  const params = new URLSearchParams();
  if (evMyOnly) params.set('myEvents', '1');
  if (evCityFilter) params.set('city', evCityFilter);
  if (evTypeFilter) params.set('type', evTypeFilter);
  if (evModalityFilter) params.set('modality', evModalityFilter);
  if (evPositionFilter) params.set('position', evPositionFilter);
  return params;
}
function eventsSignature(events) {
  return (events || []).map(e => `${e.id}:${e.date}:${e.proposalsCount || 0}:${(e.participants || []).length}`).join('|');
}
function loadEvents() {
  clearTimeout(evTimer);
  evTimer = setTimeout(async () => {
    const events = await api('/events?' + eventsQuery());
    window._events = events;
    _eventsSig = eventsSignature(events);
    renderEventList(events);
    renderEventMap(events);
  }, 250);
}
async function loadEventsSilent() {
  if (currentTab !== 'events' || !document.getElementById('ev-list')) return;
  try {
    const events = await api('/events?' + eventsQuery());
    const sig = eventsSignature(events);
    if (sig !== _eventsSig) {
      _eventsSig = sig;
      window._events = events;
      renderEventList(events);
      renderEventMap(events);
    }
  } catch {}
}

function eventCardHtml(ev) {
  const d = new Date(ev.date);
  const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isOwner = ev.userId === ME.id || ME.isAdmin;
  const myProp = ev.myProposal;
  const mod = MODALITIES[ev.modality] || MODALITIES.campo;
  const neededPositions = Array.isArray(ev.neededPositions) ? ev.neededPositions : [];
  const participants = Array.isArray(ev.participantUsers) ? ev.participantUsers : [];
  const pendingCount = ev.pendingProposalsCount || (ev.proposals ? ev.proposals.filter(p => p.status === 'pendente').length : 0);

  return `
    <div class="event-card ${mod.badgeClass}">
      <div class="ev-top">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="pill ${mod.badgeClass}">
            ${mod.emoji} ${mod.name}
          </span>
          <span class="pill ${ev.type === 'peneira' ? 'pill-peneira' : 'pill-jogo'}">
            ${ev.type === 'peneira' ? '🥅 PENEIRA' : '⚽ JOGO ABERTO'}
          </span>
        </div>
        <span class="ev-date">📅 ${dateStr}</span>
      </div>

      <b class="ev-title">${esc(ev.title)}</b>
      ${ev.description ? `<p class="ev-desc">${esc(ev.description)}</p>` : ''}

      <!-- Vagas / Posições Faltando -->
      ${neededPositions.length ? `
        <div class="needed-pos-box">
          <div class="needed-pos-title">🎯 VAGAS / POSIÇÕES FALTANDO NO TIME:</div>
          <div class="needed-pos-chips">
            ${neededPositions.map(pos => `<span class="needed-pos-chip">🧤 ${esc(pos)}</span>`).join('')}
          </div>
        </div>` : ''}

      <div class="ev-meta">
        <span>📍 <b>${esc(ev.place ? ev.place + ' — ' : '')}${esc(ev.city)}${ev.state ? '/' + esc(ev.state) : ''}</b></span>
        ${ev.fee ? `<span> · 💰 <b>${esc(ev.fee)}</b></span>` : ''}
        ${ev.address ? `<div style="margin-top:3px">🗺️ ${esc(ev.address)}</div>` : ''}
        ${ev.lat && ev.lng ? `<div style="margin-top:4px"><a href="https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--neon-green);font-weight:700;font-size:12px">➡️ Como chegar</a></div>` : ''}
      </div>

      <!-- Organizador do Evento -->
      <div class="ev-meta organizer-row" style="margin-top:10px">
        <span>Organizado por:</span>
        <div style="display:inline-flex;align-items:center;gap:6px;cursor:pointer" onclick="renderProfile('${ev.creator?.id}')">
          ${avatarHtml(ev.creator, 'sm')}
          <b style="color:var(--gold-soft)">${esc(ev.creator?.name || '?')}</b>
          ${ev.creator?.verified ? '<span title="Verificado">✅</span>' : ''}
          <span class="ovr-mini">${ev.creator?.overall || 60}</span>
        </div>
      </div>

      <!-- Jogadores Escalados / Confirmados -->
      <div class="ev-participants-strip">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:6px">
          <span style="font-size:12px;color:var(--text-secondary);font-weight:700">
            🙋 Time Escalado (${(ev.participants || []).length} jogadores aprovados):
          </span>
          ${isOwner && (ev.participants || []).length ? `
            <button class="btn btn-outline btn-xs" onclick="openEventParticipantsModal('${ev.id}', '${esc(ev.title)}')">
              👥 Gerenciar Escalados
            </button>` : ''}
        </div>
        ${participants.length ? `
          <div class="ev-part-avatars">
            ${participants.map(u => `
              <div class="squad-avatar-item" onclick="renderProfile('${u.id}')" title="${esc(u.name)} (${esc(u.position || '')})">
                ${avatarHtml(u, 'sm')}
                <span class="squad-player-name">${esc((u.nickname || u.name).split(' ')[0])}</span>
              </div>`).join('')}
          </div>` : `<span style="font-size:12px;color:var(--text-muted);font-style:italic">Nenhum jogador escalado ainda. Envie sua proposta para ser avaliado!</span>`}
      </div>

      <!-- Feedback de Candidatura do Jogador -->
      ${myProp ? `
        <div class="candidacy-status-box ${myProp.status}">
          <div class="csb-header">
            ${myProp.status === 'aceita' ? '🎉 VOCÊ FOI ESCALADO NO TIME!' : (myProp.status === 'pendente' ? '⏳ CANDIDATURA ENVIADA (AGUARDANDO ORGANIZADOR)' : '❌ PROPOSTA NÃO ACEITA')}
          </div>
          <div class="csb-body">
            ${myProp.status === 'aceita' ? 'O organizador aceitou sua proposta. Combine no chat e compareça no horário!' : (myProp.status === 'pendente' ? 'Sua proposta está sob análise do organizador. Você será notificado assim que ele responder.' : 'O organizador não pôde aceitar sua proposta desta vez.')}
            ${myProp.position ? `<br><small style="color:var(--gold)">Vaga pretendida: <b>${esc(myProp.position)}</b></small>` : ''}
          </div>
        </div>` : ''}

      <!-- Ações do Card -->
      <div class="event-actions-grid mt">
        ${isOwner ? `
          <!-- Organizador do Evento -->
          <div class="organizer-badge-banner">👑 Você é o organizador deste evento</div>
          <button class="btn btn-primary btn-sm ${pendingCount > 0 ? 'btn-pulse' : ''}" onclick="openEventProposalsDrawer('${ev.id}', '${esc(ev.title)}')">
            📋 Candidatos & Propostas (${pendingCount > 0 ? `<b>${pendingCount} nova(s)!</b>` : (ev.proposalsCount || 0)})
          </button>
          <div class="row2 mt" style="margin-top:6px">
            <button class="btn btn-outline btn-sm" onclick="openChat('${ev.creator?.id}', '${esc(ev.creator?.name || '')}')">
              💬 Meu Chat
            </button>
            <button class="btn btn-danger btn-sm" onclick="delEvent('${ev.id}')">
              🗑️ Excluir Evento
            </button>
          </div>
        ` : `
          <!-- Jogador Comum (Fazer proposta apenas) -->
          ${!myProp ? `
            <button class="btn btn-apply-glow btn-sm" onclick="openEventProposalModal('${ev.id}', '${esc(ev.title)}')">
              📩 Fazer Proposta / Candidatar-se à Vaga
            </button>
          ` : (myProp.status === 'pendente' ? `
            <div class="row2">
              <button class="btn btn-outline btn-sm" onclick="openChat('${ev.creator?.id}', '${esc(ev.creator?.name || '')}')">
                💬 Chat com Organizador
              </button>
              <button class="btn btn-danger btn-sm" onclick="cancelEventProposal('${myProp.id}')">
                ❌ Cancelar Candidatura
              </button>
            </div>
          ` : (myProp.status === 'aceita' ? `
            <button class="btn btn-green btn-sm" onclick="openChat('${ev.creator?.id}', '${esc(ev.creator?.name || '')}')">
              💬 Abrir Chat com Organizador
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="openEventProposalModal('${ev.id}', '${esc(ev.title)}')">
              📩 Tentar Nova Proposta
            </button>
          `))}
          
          <button class="btn btn-outline btn-sm mt" style="margin-top:6px" onclick="openChat('${ev.creator?.id}', '${esc(ev.creator?.name || '')}')">
            💬 Conversar com Organizador
          </button>
        `}
      </div>
    </div>`;
}

function renderEventList(events) {
  const el = $('#ev-list');
  if (!el) return;
  el.innerHTML = events.length ? events.map(eventCardHtml).join('')
    : '<div class="empty"><span class="big">📍</span>Nenhum racha ou peneira encontrado com esses filtros.<br>Jogo que já passou do horário sai da lista sozinho.<br>Divulgue o primeiro da sua região!</div>';
}

function renderEventMap(events) {
  const el = $('#ev-map');
  if (!el || typeof L === 'undefined') return;
  if (evMap) { evMap.remove(); evMap = null; }
  evMap = L.map('ev-map').setView([-14.2, -55.9], 4.5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(evMap);
  const withCoords = events.filter(e => e.lat && e.lng);
  withCoords.forEach(ev => {
    const mod = MODALITIES[ev.modality] || MODALITIES.campo;
    const m = L.marker([ev.lat, ev.lng]).addTo(evMap);
    m.bindPopup(`<b>${mod.emoji} ${esc(ev.title)}</b><br>${esc(ev.place || ev.city)} · ${new Date(ev.date).toLocaleDateString('pt-BR')}<br><a href="#" onclick="evView='list';toggleEvView();return false">ver na lista</a>`);
  });
  if (withCoords.length) evMap.fitBounds(withCoords.map(e => [e.lat, e.lng]), { padding: [40, 40], maxZoom: 11 });
}

async function delEvent(id) {
  if (!confirm('Deseja excluir este evento permanentemente?')) return;
  await api('/events/' + id, { method: 'DELETE' });
  toast('Evento excluído com sucesso! 🗑️');
  loadEvents();
}

// ---------- Modal de Criação de Evento (com seleção de modalidade e posições) ----------
// Data/hora já vem preenchida com AGORA (o dia de hoje). Depois que o
// horário do jogo passa, o evento sai da lista sozinho.
function nowDateTimeLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openNewEvent() {
  let pick = null, pickMap = null, marker = null;
  let selectedModality = 'campo';
  let selectedPositions = new Set();

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>➕ Divulgar Jogo / Montar Time</h3>
      <p class="sub">Selecione a modalidade e as posições que estão faltando no seu time:</p>

      <!-- Seletor de Modalidade -->
      <label>1. Escolha a Modalidade de Futebol</label>
      <div class="modality-selector-grid">
        <div class="modality-card selected campo" data-mod="campo" onclick="pickMod(this, 'campo')">
          <span class="mod-icon">🌿</span>
          <b>Campo</b>
          <span>11 vs 11</span>
        </div>
        <div class="modality-card society" data-mod="society" onclick="pickMod(this, 'society')">
          <span class="mod-icon">🏟️</span>
          <b>Society (Fut 7)</b>
          <span>Sintético</span>
        </div>
        <div class="modality-card quadra" data-mod="quadra" onclick="pickMod(this, 'quadra')">
          <span class="mod-icon">⚡</span>
          <b>Futsal / Quadra</b>
          <span>Salão</span>
        </div>
      </div>

      <label>2. Tipo de Evento</label>
      <select id="ne-type">
        <option value="jogo">⚽ Jogo Aberto / Montar Time / Racha</option>
        <option value="peneira">🥅 Peneira / Avaliação de Atletas</option>
      </select>

      <label>3. Título do Jogo</label>
      <input id="ne-title" placeholder="Ex: Racha de Sexta - Precisa de Goleiro e Zagueiro">

      <!-- Posições Faltantes -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
        <label style="margin:0">4. Posições que Faltam no Time</label>
        <span id="ne-pos-count" style="font-size:11px;color:var(--gold);font-weight:800">0 selecionadas</span>
      </div>
      <p class="sub" style="margin-bottom:6px">Toque nas posições que estão vagas no seu time:</p>

      <div class="preset-pos-bar">
        <button type="button" class="preset-chip" onclick="applyPosPreset('goleiro')">🧤 Falta Goleiro</button>
        <button type="button" class="preset-chip" onclick="applyPosPreset('defesa')">🛡️ Defesa</button>
        <button type="button" class="preset-chip" onclick="applyPosPreset('meio')">🎯 Meio</button>
        <button type="button" class="preset-chip" onclick="applyPosPreset('ataque')">⚽ Ataque</button>
        <button type="button" class="preset-chip" onclick="applyPosPreset('modality')">⚡ Padrão da Modalidade</button>
        <button type="button" class="preset-chip" onclick="clearPos()">🧹 Limpar</button>
      </div>

      <div class="position-picker-grid" id="ne-pos-grid">
        ${POSITIONS.map(p => `
          <button type="button" class="pos-chip" data-pos="${esc(p)}" onclick="togglePos('${esc(p)}')">
            ${p}
          </button>`).join('')}
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px">
        <input id="ne-custom-pos" placeholder="Outra posição específica…" style="padding:8px 12px;font-size:12.5px">
        <button type="button" class="btn btn-outline btn-sm" onclick="addCustomPos()">+ Adicionar</button>
      </div>

      <label>5. Descrição / Regras</label>
      <textarea id="ne-desc" rows="2" placeholder="Detalhes: nível da pelada, tipo de chuteira (trava, society, salão), horário…"></textarea>

      <div class="row2">
        <div><label>Cidade</label><input id="ne-city" value="${esc(ME.city || '')}"></div>
        <div><label>UF</label><input id="ne-state" value="${esc(ME.state || '')}" maxlength="2"></div>
      </div>

      <label>Local (Arena, Campo, Ginásio, Clube…)</label>
      <input id="ne-place" placeholder="Ex: Arena Bola de Ouro - Quadra 2" oninput="neAddrChanged()">

      <label>📍 Endereço (rua, número e bairro)</label>
      <input id="ne-address" placeholder="Ex: Rua das Palmeiras, 250 - Centro" oninput="neAddrChanged()">
      <div class="geo-bar">
        <button type="button" class="btn btn-outline btn-sm" id="ne-geo-btn" onclick="neLocalizar()">🔍 Localizar no mapa</button>
        <span class="geo-status" id="ne-geo-status">Digite o endereço e o mapa marca sozinho.</span>
      </div>

      <div id="ne-map"></div>
      <p class="sub" style="margin-top:-4px">Confira o pino: você pode arrastá-lo ou tocar no mapa para ajustar o ponto exato.</p>

      <div class="row2">
        <div><label>Data e hora <span class="opt">(já vem preenchida com hoje)</span></label><input id="ne-date" type="datetime-local" value="${nowDateTimeLocal()}" min="${nowDateTimeLocal()}"></div>
        <div><label>Custo por jogador</label><input id="ne-fee" placeholder="Ex: Gratuito / R$ 15"></div>
      </div>

      <button class="btn btn-primary mt" id="ne-send">Publicar Evento & Abrir Vagas 📢⚽</button>
      <button class="btn btn-outline mt" id="ne-cancel">Cancelar</button>
    </div>`;

  window.pickMod = (el, mod) => {
    selectedModality = mod;
    bg.querySelectorAll('.modality-card').forEach(c => c.className = 'modality-card ' + c.dataset.mod);
    el.className = `modality-card selected ${mod} ${mod}`;
  };

  window.togglePos = (pos) => {
    if (selectedPositions.has(pos)) selectedPositions.delete(pos);
    else selectedPositions.add(pos);
    updatePosUi();
  };

  window.applyPosPreset = (presetKey) => {
    if (presetKey === 'modality') {
      const list = POSITIONS_PRESETS[selectedModality] || [];
      list.forEach(p => selectedPositions.add(p));
    } else if (POSITIONS_PRESETS[presetKey]) {
      POSITIONS_PRESETS[presetKey].forEach(p => selectedPositions.add(p));
    }
    updatePosUi();
  };

  window.clearPos = () => {
    selectedPositions.clear();
    updatePosUi();
  };

  window.addCustomPos = () => {
    const val = bg.querySelector('#ne-custom-pos').value.trim();
    if (!val) return;
    selectedPositions.add(val);
    bg.querySelector('#ne-custom-pos').value = '';
    
    // Check if in DOM
    const grid = bg.querySelector('#ne-pos-grid');
    if (!grid.querySelector(`[data-pos="${val}"]`)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pos-chip active';
      b.dataset.pos = val; b.textContent = val;
      b.onclick = () => window.togglePos(val);
      grid.appendChild(b);
    }
    updatePosUi();
  };

  function updatePosUi() {
    bg.querySelectorAll('#ne-pos-grid .pos-chip').forEach(b => {
      b.classList.toggle('active', selectedPositions.has(b.dataset.pos));
    });
    const countEl = bg.querySelector('#ne-pos-count');
    if (countEl) countEl.textContent = `${selectedPositions.size} selecionada(s)`;
  }

  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#ne-cancel').onclick = () => bg.remove();
  document.body.appendChild(bg);

  setTimeout(() => {
    if (typeof L === 'undefined') return;
    pickMap = L.map('ne-map').setView([-14.2, -55.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(pickMap);

    // Toque no mapa: ajusta o pino manualmente (ajuste fino)
    pickMap.on('click', e => {
      setPin(e.latlng.lat, e.latlng.lng, true);
      geoStatus('📌 Ponto ajustado manualmente no mapa.', 'ok');
    });
  }, 150);

  // ---------- 🗺️ Vínculo automático do endereço com o mapa ----------
  function geoStatus(msg, kind = '') {
    const el = bg.querySelector('#ne-geo-status');
    if (el) { el.textContent = msg; el.className = 'geo-status ' + kind; }
  }

  function setPin(lat, lng, keepZoom) {
    pick = { lat, lng };
    if (!pickMap) return;
    if (marker) marker.setLatLng(pick);
    else {
      marker = L.marker(pick, { draggable: true }).addTo(pickMap);
      // Arrastar o pino também vale como ajuste fino
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        pick = { lat: p.lat, lng: p.lng };
        geoStatus('📌 Pino reposicionado por você.', 'ok');
      });
    }
    pickMap.setView(pick, keepZoom ? pickMap.getZoom() : 16, { animate: true });
    setTimeout(() => pickMap.invalidateSize(), 60);
  }

  // Monta o endereço completo a partir dos campos preenchidos
  function enderecoCompleto() {
    const place = bg.querySelector('#ne-place').value.trim();
    const addr = bg.querySelector('#ne-address').value.trim();
    const city = bg.querySelector('#ne-city').value.trim();
    const uf = bg.querySelector('#ne-state').value.trim();
    const partes = [addr, city, uf, 'Brasil'].filter(Boolean);
    // O nome do local ajuda a achar arenas/ginásios conhecidos quando não há rua
    if (!addr && place) partes.unshift(place);
    return { texto: partes.join(', '), temEndereco: !!(addr || place), city };
  }

  let geoTimer = null, geoUltimaBusca = '', geoTravado = false;

  window.neAddrChanged = () => {
    clearTimeout(geoTimer);
    const { temEndereco, city } = enderecoCompleto();
    if (!temEndereco || !city) return;
    geoStatus('⌛ Procurando o endereço no mapa…');
    // Espera parar de digitar (respeita o limite de uso do serviço de mapas)
    geoTimer = setTimeout(() => buscarEndereco(false), 1100);
  };

  window.neLocalizar = () => { clearTimeout(geoTimer); buscarEndereco(true); };

  async function buscarEndereco(manual) {
    const { texto, temEndereco, city } = enderecoCompleto();
    if (!temEndereco || !city) {
      if (manual) geoStatus('Preencha o endereço e a cidade primeiro.', 'err');
      return;
    }
    if (!manual && texto === geoUltimaBusca) return;
    if (geoTravado) return;

    geoTravado = true;
    geoStatus('⌛ Procurando o endereço no mapa…');
    const btn = bg.querySelector('#ne-geo-btn');
    if (btn) btn.disabled = true;

    try {
      const achado = await geocodificar(texto);
      geoUltimaBusca = texto;

      if (achado) {
        setPin(achado.lat, achado.lng);
        geoStatus('✅ Vinculado ao mapa: ' + achado.nome, 'ok');
      } else if (manual) {
        geoStatus('❌ Endereço não encontrado. Confira a rua/cidade ou toque no mapa para marcar.', 'err');
      } else {
        geoStatus('Não achamos esse endereço ainda — continue digitando ou toque no mapa.', 'err');
      }
    } catch {
      geoStatus(manual ? '⚠️ Não deu para consultar o mapa agora. Toque nele para marcar o ponto.' : '', 'err');
    }
    geoTravado = false;
    if (btn) btn.disabled = false;
  }

  // Cidade/UF também disparam a busca automática
  setTimeout(() => {
    ['#ne-city', '#ne-state'].forEach(sel => {
      const el = bg.querySelector(sel);
      if (el) el.addEventListener('input', () => window.neAddrChanged());
    });
  }, 100);


  bg.querySelector('#ne-send').onclick = async () => {
    try {
      const dateVal = bg.querySelector('#ne-date').value;
      const title = bg.querySelector('#ne-title').value.trim();
      const city = bg.querySelector('#ne-city').value.trim();
      if (!title || !city || !dateVal) return toast('Preencha título, cidade e data do evento.');

      await api('/events', {
        method: 'POST',
        body: {
          type: bg.querySelector('#ne-type').value,
          modality: selectedModality,
          title,
          description: bg.querySelector('#ne-desc').value.trim(),
          neededPositions: Array.from(selectedPositions),
          city,
          state: bg.querySelector('#ne-state').value.trim(),
          place: bg.querySelector('#ne-place').value.trim(),
          address: bg.querySelector('#ne-address').value.trim(),
          date: new Date(dateVal).getTime(),
          fee: bg.querySelector('#ne-fee').value.trim(),
          lat: pick?.lat, lng: pick?.lng
        }
      });
      bg.remove();
      toast('Evento publicado com sucesso! 📢⚽');
      loadEvents();
    } catch (e) { toast('Erro: ' + e.message); }
  };
}

// Converte um endereço em coordenadas. Usa o OpenStreetMap (Nominatim) e,
// se ele falhar, tenta o Photon como reserva — assim o pino quase nunca falha.
async function geocodificar(texto) {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&addressdetails=1&q='
      + encodeURIComponent(texto), { headers: { 'Accept': 'application/json' } });
    if (r.ok) {
      const achados = await r.json();
      if (achados && achados.length) {
        return {
          lat: +achados[0].lat,
          lng: +achados[0].lon,
          nome: (achados[0].display_name || '').split(',').slice(0, 4).join(',')
        };
      }
    }
  } catch {}

  try {
    const r = await fetch('https://photon.komoot.io/api/?limit=1&lang=pt&q=' + encodeURIComponent(texto));
    if (r.ok) {
      const j = await r.json();
      const f = j.features && j.features[0];
      if (f && f.geometry) {
        const pr = f.properties || {};
        return {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          nome: [pr.name, pr.street, pr.city, pr.state].filter(Boolean).join(', ')
        };
      }
    }
  } catch {}

  return null;
}

// ---------- Modal de Proposta do Jogador (Candidatura à Vaga) ----------
function openEventProposalModal(eventId, title) {
  const ev = (window._events || []).find(e => e.id === eventId);
  const needed = ev && Array.isArray(ev.neededPositions) && ev.neededPositions.length ? ev.neededPositions : POSITIONS;
  const mod = ev ? (MODALITIES[ev.modality] || MODALITIES.campo) : MODALITIES.campo;

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>📩 Candidatar-se à Vaga no Time</h3>
      <p class="sub">Jogo: <b>${esc(title)}</b> (${mod.emoji} ${mod.name})</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
        ${avatarHtml(ME, 'sm')}
        <div>
          <b>${esc(ME.name)} <span class="ovr-mini">${ME.overall}</span></b>
          <span style="font-size:11.5px;color:var(--text-secondary);display:block">${ROLES[ME.role]?.emoji || ''} ${esc(ME.position || 'Jogador')}</span>
        </div>
      </div>
      
      <label>1. Posição que você quer jogar</label>
      <select id="epm-pos">
        ${needed.map(p => `<option ${ME.position === p ? 'selected' : ''}>${p}</option>`).join('')}
        ${!needed.includes(ME.position) && ME.position ? `<option selected>${ME.position}</option>` : ''}
        ${POSITIONS.filter(p => !needed.includes(p)).map(p => `<option>${p}</option>`).join('')}
      </select>
      
      <label>2. Disponibilidade / Cachê ou Observação</label>
      <input id="epm-fee" placeholder="Ex: Confirmado no horário / Rachando custo" value="${esc(ME.fee || '')}">

      <label>3. Mensagem para o Organizador</label>
      <textarea id="epm-msg" rows="3" placeholder="Ex: Fala chefe! Jogo de lateral/ponta, tenho ótima resistência, pontual e comprometido. Bora vencer!"></textarea>

      <button class="btn btn-primary mt" id="epm-send" style="width:100%">Enviar Candidatura ao Organizador 📢</button>
      <button class="btn btn-outline mt" id="epm-cancel" style="width:100%">Cancelar</button>
    </div>`;

  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#epm-cancel').onclick = () => bg.remove();
  bg.querySelector('#epm-send').onclick = async () => {
    try {
      const pos = bg.querySelector('#epm-pos').value;
      const fee = bg.querySelector('#epm-fee').value.trim();
      const msg = bg.querySelector('#epm-msg').value.trim();
      const text = `Vaga pretendida: ${pos}${fee ? ' (' + fee + ')' : ''}. ${msg}`;
      
      await api('/proposals', {
        method: 'POST',
        body: { eventId, position: pos, message: text, type: 'freela' }
      });
      bg.remove();
      toast('Candidatura enviada ao organizador! 📩⚽');
      loadEvents();
    } catch (e) { toast('Erro: ' + e.message); }
  };
  document.body.appendChild(bg);
}

// ---------- Drawer de Candidatos (Apenas Organizador / Admin) ----------
function openEventProposalsDrawer(eventId, title) {
  const ev = (window._events || []).find(e => e.id === eventId);
  const props = ev ? ev.proposals || [] : [];
  const pendingProps = props.filter(p => p.status === 'pendente');
  const mod = ev ? (MODALITIES[ev.modality] || MODALITIES.campo) : MODALITIES.campo;

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>📋 Candidatos & Propostas</h3>
      <p class="sub">Jogo: <b>${esc(title)}</b> (${mod.emoji} ${mod.name})</p>
      
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <div class="stat" style="flex:1">
          <b>${props.length}</b><span>Total Candidatos</span>
        </div>
        <div class="stat" style="flex:1">
          <b style="color:var(--neon-green)">${(ev?.participants || []).length}</b><span>Escalados</span>
        </div>
        <div class="stat" style="flex:1">
          <b style="color:var(--gold)">${pendingProps.length}</b><span>Pendentes</span>
        </div>
      </div>

      <div id="epd-list"><p class="empty">Carregando candidatos… ⏳</p></div>
      <button class="btn btn-outline mt" id="epd-close" style="width:100%">Fechar</button>
    </div>`;

  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#epd-close').onclick = () => bg.remove();
  document.body.appendChild(bg);

  const el = bg.querySelector('#epd-list');
  if (!props.length) {
    el.innerHTML = `<div class="empty"><span class="big">📩</span>Nenhum jogador se candidatou para este jogo ainda.<br>Divulgue o jogo para atrair atletas!</div>`;
    return;
  }

  el.innerHTML = props.map(p => `
    <div class="candidate-card" id="prop-card-${p.id}">
      <div class="candidate-head">
        ${avatarHtml(p.from, 'md')}
        <div class="candidate-info" onclick="renderProfile('${p.from?.id}'); bg.remove();" style="cursor:pointer">
          <b>${esc(p.from?.name || '?')} ${p.from?.verified ? '✅' : ''} <span class="ovr-mini">${p.from?.overall || 60}</span></b>
          <span>${ROLES[p.from?.role]?.emoji || ''} ${esc(p.from?.position || '')}${p.from?.city ? ' · ' + esc(p.from?.city) : ''}</span>
        </div>
        <span class="status ${p.status}">${p.status.toUpperCase()}</span>
      </div>

      ${p.position ? `
        <div style="margin-top:8px">
          <span class="pill green" style="font-size:11px">🎯 Vaga solicitada: ${esc(p.position)}</span>
        </div>` : ''}
      
      <p style="font-size:13px;margin:8px 0;line-height:1.4;color:var(--text-primary)">${esc(p.message || 'Sem mensagem.')}</p>
      
      <div class="row2 mt" style="margin-top:10px">
        <button class="btn btn-outline btn-sm" onclick="renderProfile('${p.from?.id}'); bg.remove();">
          👤 Ver Perfil
        </button>
        <button class="btn btn-green btn-sm" onclick="openChat('${p.from?.id}', '${esc(p.from?.name || '')}'); bg.remove();">
          💬 Chat
        </button>
      </div>

      ${p.status === 'pendente' ? `
        <div class="row2 mt" style="margin-top:8px">
          <button class="btn btn-primary btn-sm" onclick="acceptCandidate('${p.id}', '${eventId}', '${esc(p.from?.name || '')}', '${p.from?.id}')">
            ✅ Aceitar & Escalar
          </button>
          <button class="btn btn-danger btn-sm" onclick="rejectCandidate('${p.id}', '${eventId}')">
            ❌ Recusar
          </button>
        </div>` : (p.status === 'aceita' ? `
          <div style="margin-top:8px;padding:6px 10px;background:rgba(0,245,155,0.12);border:1px solid var(--neon-green);border-radius:8px;font-size:11.5px;color:var(--neon-green);text-align:center;font-weight:800">
            ✔️ Jogador escalado no time!
          </div>` : '')}
    </div>`).join('');
}

async function acceptCandidate(propId, eventId, candidateName, candidateId) {
  try {
    await api('/proposals/' + propId, { method: 'PUT', body: { status: 'aceita' } });
    toast(`✅ ${candidateName} foi aceito e escalado no time!`);
    document.querySelector('.modal-bg')?.remove();
    // 💬 Na hora que o organizador ACEITA, a conversa com o jogador abre
    // sozinha para combinar os detalhes do jogo.
    if (candidateId) openChat(candidateId, candidateName || 'Jogador');
    else loadEvents();
  } catch (e) { toast('Erro: ' + e.message); }
}

async function rejectCandidate(propId, eventId) {
  try {
    await api('/proposals/' + propId, { method: 'PUT', body: { status: 'recusada' } });
    toast('Proposta recusada.');
    document.querySelector('.modal-bg')?.remove();
    loadEvents();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ---------- Modal de Gerenciamento do Time Escalado ----------
function openEventParticipantsModal(eventId, title) {
  const ev = (window._events || []).find(e => e.id === eventId);
  if (!ev) return;
  const isOwner = ev.userId === ME.id || ME.isAdmin;
  const participants = Array.isArray(ev.participantUsers) ? ev.participantUsers : [];

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>👥 Time Escalado (${participants.length} jogadores)</h3>
      <p class="sub">Jogo: <b>${esc(title)}</b></p>
      
      <div class="modal-admin-list">
        ${participants.length ? participants.map(u => `
          <div class="modal-admin-item">
            <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="renderProfile('${u.id}'); bg.remove();">
              ${avatarHtml(u, 'sm')}
              <div>
                <b>${esc(u.name)} <span class="ovr-mini">${u.overall}</span></b>
                <div style="font-size:11px;color:var(--text-secondary)">${ROLES[u.role]?.emoji || ''} ${esc(u.position || '')}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-outline btn-xs" onclick="openChat('${u.id}', '${esc(u.name)}'); bg.remove();">💬</button>
              ${isOwner ? `<button class="btn btn-danger btn-xs" onclick="removeParticipantFromSquad('${eventId}', '${u.id}', '${esc(u.name)}')">Remover</button>` : ''}
            </div>
          </div>`).join('') : '<p class="empty">Nenhum jogador escalado.</p>'}
      </div>
      
      <button class="btn btn-outline mt" id="epm-close" style="width:100%">Fechar</button>
    </div>`;

  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#epm-close').onclick = () => bg.remove();
  document.body.appendChild(bg);
}

async function removeParticipantFromSquad(eventId, userId, userName) {
  if (!confirm(`Remover ${userName} da escalação deste jogo?`)) return;
  try {
    await api(`/events/${eventId}/participants/${userId}`, { method: 'DELETE' });
    toast(`${userName} foi removido da escalação.`);
    document.querySelector('.modal-bg')?.remove();
    loadEvents();
  } catch (e) { toast('Erro: ' + e.message); }
}

async function cancelEventProposal(propId) {
  if (!confirm('Deseja cancelar sua candidatura para este jogo?')) return;
  try {
    await api('/proposals/' + propId, { method: 'DELETE' });
    toast('Candidatura cancelada.');
    loadEvents();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ============================================================
// BUSCA DE TALENTOS & COMPARADOR 🆚
// ============================================================
let compareSel = [];
async function renderSearch() {
  const c = $('#content');
  c.innerHTML = `
    <h2>Buscar Talentos 🔎</h2>
    <p class="sub">Só aparece quem marcou no perfil <b>✅ disponível p/ contratação</b> e/ou <b>⚡ freela</b>. Digite uma cidade e o mapa mostra os jogos da região!</p>
    <div id="rankings"></div>
    <div class="filters">
      <input class="full" id="s-q" placeholder="🔎 Nome, apelido, time…" oninput="doSearch()">
      <select id="s-role" onchange="doSearch()">
        <option value="">Todos os tipos</option>
        <option value="jogador">🏃 Jogadores</option>
        <option value="goleiro">🧤 Goleiros</option>
        <option value="tecnico">📋 Técnicos</option>
        <option value="arbitro">🟨 Árbitros</option>
        <option value="olheiro">🔎 Olheiros / Clubes</option>
      </select>
      <select id="s-pos" onchange="doSearch()">
        <option value="">Todas as posições</option>
        ${POSITIONS.map(p => `<option>${p}</option>`).join('')}
      </select>
      <input id="s-city" placeholder="📍 Cidade (abre o mapa)" oninput="onSearchCityInput()">
      <select id="s-level" onchange="doSearch()">
        <option value="">Todos os níveis</option>
        ${LEVELS.map(l => `<option>${l}</option>`).join('')}
      </select>
      <select id="s-avail" class="full" onchange="doSearch()">
        <option value="">🤝 Vinculados: contratação ou freela</option>
        <option value="contratacao">✅ Só disponíveis p/ contratação</option>
        <option value="freela">⚡ Só disponíveis p/ freela (avulso)</option>
      </select>
    </div>
    <div id="s-map-wrap" style="display:none">
      <div class="s-map-head">🗺️ <b id="s-map-title">Mapa da região</b></div>
      <div id="s-map"></div>
      <div class="s-map-note" id="s-map-note"></div>
    </div>
    <div id="s-results"></div>`;
  doSearch();
  loadTrending();
}

function addCompare(id, name) {
  event.stopPropagation();
  if (compareSel.find(c => c.id === id)) {
    compareSel = compareSel.filter(c => c.id !== id);
    toast(`${name} removido do comparador`); return;
  }
  compareSel.push({ id, name });
  if (compareSel.length === 2) { openCompare(); }
  else toast(`🆚 ${name} selecionado — escolha mais 1 para comparar`);
}

async function openCompare() {
  const [a, b] = compareSel;
  compareSel = [];
  toast('Montando o duelo… 🆚');
  const [ra, rb] = await Promise.all([api('/users/' + a.id), api('/users/' + b.id)]);
  const [cva, cvb] = await Promise.all([
    drawFifaCard(ra.user, ra.achievements),
    drawFifaCard(rb.user, rb.achievements)
  ]);
  const u1 = ra.user, u2 = rb.user;
  const s1 = u1.stats || {}, s2 = u2.stats || {};
  const gk1 = isGoalkeeper(u1), gk2 = isGoalkeeper(u2);
  const fifaRows1 = (gk1 ? FIFA_ATTRS_GK : FIFA_ATTRS).map(a => [a.name, (u1.fifa || {})[a.key] || 60]);
  const fifaRows2 = (gk2 ? FIFA_ATTRS_GK : FIFA_ATTRS).map(a => [a.name, (u2.fifa || {})[a.key] || 60]);
  const rows = [
    ['Nota geral (OVR)', u1.overall, u2.overall],
    ...(gk1 === gk2 ? fifaRows1.map((r, i) => [`🎮 ${r[0]}`, r[1], fifaRows2[i][1]]) : []),
    ['Jogos', s1.jogos || 0, s2.jogos || 0],
    ['Gols', s1.gols || 0, s2.gols || 0],
    ['Assistências', s1.assistencias || 0, s2.assistencias || 0],
    ['Defesas 🧤', s1.defesas || 0, s2.defesas || 0],
    ['Pênaltis pegos 🧤', s1.penaltisDefendidos || 0, s2.penaltisDefendidos || 0],
    ['Títulos', s1.titulos || 0, s2.titulos || 0],
    ['Média ⭐ dos lances', u1.ratingAvg || 0, u2.ratingAvg || 0],
    ['Seguidores', u1.followers, u2.followers],
    ['Visitas de olheiro', u1.scoutViews || 0, u2.scoutViews || 0]
  ];
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.style.alignItems = 'center';
  bg.innerHTML = `
    <div class="modal" style="border-radius:24px">
      <h3 style="text-align:center">🆚 ${esc(u1.nickname || u1.name)} × ${esc(u2.nickname || u2.name)}</h3>
      <div class="vs-cards">
        <img src="${cva.toDataURL('image/png')}">
        <span class="vs-x">🆚</span>
        <img src="${cvb.toDataURL('image/png')}">
      </div>
      <div class="vs-rows">
        ${rows.map(([label, v1, v2]) => `
          <div class="vs-row">
            <span class="v1 ${+v1 > +v2 ? 'win' : ''}">${v1}</span>
            <span class="v-label">${label}</span>
            <span class="v2 ${+v2 > +v1 ? 'win' : ''}">${v2}</span>
          </div>`).join('')}
      </div>
      <button class="btn btn-outline mt" id="vs-close" style="width:100%">Fechar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#vs-close').onclick = () => bg.remove();
  document.body.appendChild(bg);
}

async function loadTrending() {
  try {
    _rankData = await api('/trending');
    renderRankings();
  } catch {}
}

let _rankData = null;
let _rankOpen = { contratacao: false, freela: false };

function toggleRank(kind) {
  _rankOpen[kind] = !_rankOpen[kind];
  renderRankings();
}

// Uma linha do ranking: 🥇 miniatura + nome + nota. Tocar no nome ou na
// miniatura já entra no perfil da pessoa.
function rankRowsHtml(list, kind) {
  const MEDALS = ['🥇', '🥈', '🥉'];
  const visiveis = _rankOpen[kind] ? list : list.slice(0, 5);
  return `
    <ol class="rank-list">
      ${visiveis.map((u, i) => `
        <li class="rank-row ${i < 3 ? 'top' + (i + 1) : ''}" onclick="renderProfile('${u.id}')">
          <span class="rank-pos">${MEDALS[i] || i + 1}</span>
          <img class="rank-thumb" src="${u.photo || '/img/logo.png'}" alt="" loading="lazy">
          <span class="rank-name">
            <b>${esc(u.nickname || u.name)}${u.verified ? ' ✅' : ''}</b>
            <small>${esc([u.position, u.city].filter(Boolean).join(' · '))}</small>
          </span>
          <span class="rank-ovr">${u.overall}</span>
        </li>`).join('')}
    </ol>
    ${list.length > 5 ? `
      <button type="button" class="rank-more" onclick="toggleRank('${kind}')">
        ${_rankOpen[kind] ? '▲ Mostrar menos' : `▼ Ver o top ${list.length}`}
      </button>` : ''}`;
}

// 🏆 Dois rankings na busca: um p/ contratação e outro p/ freela — 1º, 2º, 3º…
function renderRankings() {
  const el = document.getElementById('rankings');
  if (!el || !_rankData) return;
  const boxes = [
    { kind: 'contratacao', icon: '🤝', title: 'Ranking p/ Contratação', sub: 'disponíveis p/ contrato', list: _rankData.contratacao || [] },
    { kind: 'freela', icon: '⚡', title: 'Ranking Freela / Avulso', sub: 'aceita jogo avulso', list: _rankData.freela || [] }
  ];
  el.innerHTML = boxes.map(b => `
    <div class="rank-box">
      <div class="rank-head">
        <b>${b.icon} ${b.title}</b>
        <span>${b.sub}</span>
      </div>
      ${b.list.length ? rankRowsHtml(b.list, b.kind)
        : '<p class="empty" style="padding:12px">Ninguém marcou essa disponibilidade no perfil ainda.</p>'}
    </div>`).join('');
}


// ---------- Resultado compacto: miniatura pequena + nome clicável ----------
// Tocar na miniatura, no nome ou em qualquer lugar da linha abre o perfil.
function miniUserHtml(u) {
  const k = roleKind(u);
  const isScout = k === 'olheiro';
  const sub = isScout
    ? [u.scoutRole, u.club].filter(Boolean).map(esc).join(' · ')
    : [u.position || ROLES[u.role]?.label || '', u.level, u.city ? u.city + '/' + (u.state || '') : '']
      .filter(Boolean).map(esc).join(' · ');
  return `
  <div class="mini-user" onclick="renderProfile('${u.id}')">
    <img class="mini-thumb ${((u.overall || 60) >= 80 || u.verified) ? 'gold' : ''}" src="${u.photo || '/img/logo.png'}" alt="" loading="lazy">
    <div class="mini-info">
      <b>${esc(u.nickname || u.name)} ${u.verified ? '✅' : ''} ${isScout ? '' : `<span class="ovr-mini">${u.overall}</span>`}</b>
      <small>${ROLES[u.role]?.emoji || ''} ${sub}</small>
      <span class="mini-badges">
        ${isScout ? '<span class="pill rose">🔎 Olheiro / Clube</span>' : ''}
        ${u.availableHire ? '<span class="pill green">✅ Contratação</span>' : ''}
        ${u.availableFreela ? '<span class="pill">⚡ Freela</span>' : ''}
      </span>
    </div>
    ${isScout ? '' : `<button class="vs-btn" onclick="addCompare('${u.id}', '${esc((u.nickname || u.name).split(' ')[0])}')">🆚</button>`}
  </div>`;
}

let searchTimer = null;
function doSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const params = new URLSearchParams();
    if ($('#s-q').value) params.set('q', $('#s-q').value);
    if ($('#s-role').value) params.set('role', $('#s-role').value);
    if ($('#s-pos').value) params.set('position', $('#s-pos').value);
    if ($('#s-city').value) params.set('city', $('#s-city').value);
    if ($('#s-level').value) params.set('level', $('#s-level').value);
    if ($('#s-avail').value) params.set('availability', $('#s-avail').value);
    const users = await api('/search?' + params);
    $('#s-results').innerHTML = users.length ? users.map(miniUserHtml).join('')
      : '<div class="empty"><span class="big">🥅</span>Nenhum perfil encontrado com esses filtros.<br>Na busca só aparece quem marcou ✅ contratação ou ⚡ freela no perfil.</div>';
  }, 250);
}

// ---------- 🗺️ Mapa da cidade na busca ----------
// Ao digitar o nome da cidade, o mapa vai até ela e mostra os pontos
// próximos com jogos cadastrados.
let sMapTimer = null, sMap = null, sMapCity = '';

function onSearchCityInput() {
  doSearch();
  clearTimeout(sMapTimer);
  sMapTimer = setTimeout(() => updateSearchMap($('#s-city').value.trim()), 700);
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function updateSearchMap(city) {
  const wrap = document.getElementById('s-map-wrap');
  if (!wrap) return;
  if (!city || city.length < 3) {
    wrap.style.display = 'none';
    sMapCity = '';
    return;
  }
  if (city === sMapCity) return;
  sMapCity = city;
  wrap.style.display = 'block';
  const title = document.getElementById('s-map-title');
  const note = document.getElementById('s-map-note');
  title.textContent = `Procurando "${city}" no mapa…`;
  note.textContent = '';
  try {
    const centro = await geocodificar(city.includes(',') ? city : city + ', Brasil');
    if (sMapCity !== city) return; // usuário já digitou outra coisa
    if (!centro) {
      title.textContent = `Cidade "${city}"`;
      note.textContent = 'Não achamos essa cidade no mapa — confira a grafia.';
      return;
    }
    title.textContent = `Jogos perto de ${centro.nome.split(',')[0]}`;
    const events = await api('/events');
    if (sMapCity !== city) return;
    const alvo = city.toLowerCase();
    const prox = events.filter(ev => {
      const evCity = (ev.city || '').toLowerCase();
      if (evCity && (evCity.includes(alvo) || alvo.includes(evCity))) return true;
      if (ev.lat && ev.lng) return distKm(centro.lat, centro.lng, ev.lat, ev.lng) <= 60;
      return false;
    });

    if (typeof L === 'undefined') {
      note.textContent = 'Mapa indisponível agora — verifique sua conexão.';
      return;
    }
    if (sMap) { sMap.remove(); sMap = null; }
    sMap = L.map('s-map').setView([centro.lat, centro.lng], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(sMap);

    let comPonto = 0;
    window._searchMapEvents = prox;
    prox.forEach((ev, idx) => {
      const mod = MODALITIES[ev.modality] || MODALITIES.campo;
      const d = new Date(ev.date);
      if (ev.lat && ev.lng) {
        comPonto++;
        const m = L.marker([ev.lat, ev.lng]).addTo(sMap);
        m.bindPopup(
          `<b>${mod.emoji} ${esc(ev.title)}</b><br>` +
          `📍 ${esc(ev.place || ev.city)}<br>` +
          `📅 ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<br>` +
          `<a href="#" onclick="searchMapGoEvents(${idx});return false" style="color:#00f59b;font-weight:700">Ver na aba Jogos ➜</a>`
        );
      }
    });
    note.innerHTML = !prox.length
      ? 'Nenhum jogo cadastrado perto desta cidade ainda. Divulgue o primeiro! ⚽'
      : `📍 <b>${prox.length}</b> jogo(s) na região${comPonto ? '' : ' (sem ponto exato no mapa)'}.`;
    setTimeout(() => sMap && sMap.invalidateSize(), 80);
  } catch (e) {
    if (sMapCity === city) {
      title.textContent = `Cidade "${city}"`;
      note.textContent = 'Não deu para carregar o mapa agora. Tente de novo.';
    }
  }
}

function searchMapGoEvents(idx) {
  const ev = (window._searchMapEvents || [])[idx];
  evCityFilter = ev ? (ev.city || '') : '';
  showTab('events');
}

// ============================================================
// PERFIL DO USUÁRIO
// ============================================================
// ---------- Seções do perfil: cada tipo de usuário mostra só o que é dele ----------
function profileRoleSections(u, earned, achievements) {
  const kind = roleKind(u);
  const medals = `
    <div class="section">
      <h4>🏅 Conquistas & Medalhas (${earned.length}/${(achievements || []).length})</h4>
      <div class="medal-grid">
        ${(achievements || []).map(a => `
          <div class="medal ${a.earned ? '' : 'locked'}">
            <span class="m-emoji">${a.emoji}</span>
            <b>${esc(a.title)}</b>
            <span class="m-desc">${esc(a.desc)}</span>
          </div>`).join('')}
      </div>
    </div>`;

  if (kind === 'jogador') {
    const gk = isGoalkeeper(u);
    const st = u.stats || {};
    return `
      <div class="section">
        <h4>${gk ? '🧤 Ficha do Goleiro' : '📋 Ficha do Atleta'}</h4>
        <div class="row2" style="font-size:13px;line-height:1.7">
          <div>
            ${u.age ? `Idade: <b>${u.age} anos</b><br>` : ''}
            ${u.height ? `Altura: <b>${u.height} cm</b><br>` : ''}
            ${u.weight ? `Peso: <b>${u.weight} kg</b><br>` : ''}
            ${u.foot ? `Perna boa: <b>${esc(u.foot)}</b><br>` : ''}
          </div>
          <div>
            ${u.level ? `Nível: <b>${esc(u.level)}</b><br>` : ''}
            ${u.fee ? `Cachê: <b>${esc(u.fee)}</b><br>` : ''}
            ${u.availableHire ? 'Status: <b style="color:var(--neon-green)">Disponível</b><br>' : ''}
            ${u.availableFreela ? 'Freela: <b style="color:var(--gold)">Aceita jogo avulso</b>' : ''}
          </div>
        </div>
        ${u.teams ? `<p style="margin-top:10px;font-size:13px">Times por onde passou: <b>${esc(u.teams)}</b></p>` : ''}
        ${u.strengths ? `<p style="margin-top:6px;font-size:13px">Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
        ${(u.nationality || u.birthdate || u.club || u.shirtNumber) ? `
          <div style="margin-top:10px;font-size:13px;line-height:1.7;border-top:1px solid var(--border-glass);padding-top:8px">
            ${u.nationality ? `Nacionalidade: <b>${esc(u.nationality)}</b><br>` : ''}
            ${u.birthdate ? `Nascimento: <b>${fmtDateBR(u.birthdate)}</b><br>` : ''}
            ${u.club ? `Clube atual: <b>${esc(u.club)}</b><br>` : ''}
            ${u.shirtNumber ? `Camisa: <b>nº ${esc(u.shirtNumber)}</b><br>` : ''}
          </div>` : ''}
      </div>

      <div class="section">
        <h4>📊 Números de Carreira</h4>
        <div class="stat-grid" style="grid-template-columns:repeat(3, 1fr);margin:8px 0">
          <div class="stat"><b>${st.jogos || 0}</b><span>Jogos</span></div>
          ${gk
            ? `<div class="stat"><b>${st.defesas || 0}</b><span>Defesas 🧤</span></div>
               <div class="stat"><b>${st.penaltisDefendidos || 0}</b><span>Pênaltis 🧤</span></div>`
            : `<div class="stat"><b>${st.gols || 0}</b><span>Gols</span></div>
               <div class="stat"><b>${st.assistencias || 0}</b><span>Assistências</span></div>`}
          <div class="stat"><b>${st.titulos || 0}</b><span>Títulos 🏆</span></div>
        </div>
      </div>

      ${hasFifaAttrs(u) ? `
        <div class="section">
          <h4>🎮 Atributos FIFA</h4>
          <p class="sub" style="margin-bottom:10px">Atributos que compõem a cartinha e a nota geral <b class="ovr-mini" style="margin:0">${u.overall}</b>.</p>
          ${fifaBarsHtml(u)}
        </div>` : ''}
      ${medals}`;
  }

  if (kind === 'tecnico') {
    const st = u.stats || {};
    const cats = arrVal(u.coachCategories);
    const winRate = st.jogos > 0 ? Math.round(((st.vitorias || 0) / st.jogos) * 100) : null;
    return `
      <div class="section">
        <h4>📋 Ficha do Treinador</h4>
        <div class="row2" style="font-size:13px;line-height:1.7">
          <div>
            ${u.position ? `Função: <b>${esc(u.position)}</b><br>` : ''}
            ${u.level ? `Nível: <b>${esc(u.level)}</b><br>` : ''}
            ${u.licenses ? `Licença: <b>${esc(u.licenses)}</b><br>` : ''}
          </div>
          <div>
            ${u.experienceYears ? `Experiência: <b>${u.experienceYears} anos</b><br>` : ''}
            ${u.playstyle ? `Estilo: <b>${esc(u.playstyle)}</b><br>` : ''}
            ${u.club ? `Equipe atual: <b>${esc(u.club)}</b><br>` : ''}
          </div>
        </div>
        ${cats.length ? `<div class="pill-row mt">${cats.map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div>` : ''}
        ${u.teams ? `<p style="margin-top:10px;font-size:13px">Onde já trabalhou: <b>${esc(u.teams)}</b></p>` : ''}
        ${u.strengths ? `<p style="margin-top:6px;font-size:13px">Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
        ${u.methodology ? `<p style="margin-top:6px;font-size:13px">Metodologia: <b>${esc(u.methodology)}</b></p>` : ''}
        <div style="margin-top:10px;font-size:13px;border-top:1px solid var(--border-glass);padding-top:8px">
          ${u.availableHire ? 'Status: <b style="color:var(--neon-green)">Disponível para assumir equipe</b><br>' : ''}
          ${u.availableFreela ? 'Projetos: <b style="color:var(--gold)">Aceita clínica / avaliação avulsa</b><br>' : ''}
          ${u.fee ? `Pretensão: <b>${esc(u.fee)}</b>` : ''}
        </div>
      </div>

      <div class="section">
        <h4>📈 Números no Banco</h4>
        <div class="stat-grid" style="grid-template-columns:repeat(3, 1fr);margin:8px 0">
          <div class="stat"><b>${st.jogos || 0}</b><span>Jogos</span></div>
          <div class="stat"><b>${st.vitorias || 0}</b><span>Vitórias</span></div>
          <div class="stat"><b>${st.empates || 0}</b><span>Empates</span></div>
          <div class="stat"><b>${st.titulos || 0}</b><span>Títulos 🏆</span></div>
          <div class="stat"><b>${st.acessos || 0}</b><span>Acessos 📈</span></div>
          <div class="stat"><b>${winRate === null ? '—' : winRate + '%'}</b><span>Aproveitamento</span></div>
        </div>
      </div>
      ${medals}`;
  }

  if (kind === 'arbitro') {
    const st = u.stats || {};
    const mods = arrVal(u.modalities);
    return `
      <div class="section">
        <h4>🟨 Ficha do Árbitro</h4>
        <div class="row2" style="font-size:13px;line-height:1.7">
          <div>
            ${u.position ? `Função: <b>${esc(u.position)}</b><br>` : ''}
            ${u.level ? `Quadro: <b>${esc(u.level)}</b><br>` : ''}
            ${u.refEntity ? `Entidade: <b>${esc(u.refEntity)}</b><br>` : ''}
          </div>
          <div>
            ${u.experienceYears ? `Experiência: <b>${u.experienceYears} anos</b><br>` : ''}
            ${u.refRegions ? `Atua em: <b>${esc(u.refRegions)}</b><br>` : ''}
            ${u.fee ? `Taxa: <b>${esc(u.fee)}</b><br>` : ''}
          </div>
        </div>
        ${mods.length ? `<div class="pill-row mt">${mods.map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div>` : ''}
        ${u.strengths ? `<p style="margin-top:10px;font-size:13px">Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
        <div style="margin-top:10px;font-size:13px;border-top:1px solid var(--border-glass);padding-top:8px">
          ${u.availableHire ? 'Status: <b style="color:var(--neon-green)">Disponível para escalação</b><br>' : ''}
          ${u.availableFreela ? 'Avulso: <b style="color:var(--gold)">Apita pelada / várzea</b>' : ''}
        </div>
      </div>

      <div class="section">
        <h4>📊 Números do Apito</h4>
        <div class="stat-grid" style="grid-template-columns:repeat(3, 1fr);margin:8px 0">
          <div class="stat"><b>${st.jogos || 0}</b><span>Jogos apitados</span></div>
          <div class="stat"><b>${st.amarelos || 0}</b><span>Amarelos 🟨</span></div>
          <div class="stat"><b>${st.vermelhos || 0}</b><span>Vermelhos 🟥</span></div>
          <div class="stat"><b>${st.penaltisMarcados || 0}</b><span>Pênaltis 📣</span></div>
          <div class="stat"><b>${st.finais || 0}</b><span>Finais 🏆</span></div>
          <div class="stat"><b>${u.ratingAvg ? u.ratingAvg : '—'}</b><span>Média ⭐</span></div>
        </div>
      </div>
      ${medals}`;
  }

  // olheiro / clube — perfil enxuto e com contatos à vista
  const mods = arrVal(u.modalities);
  const contacts = [
    u.contactPhone ? { icon: '💬', label: 'WhatsApp / Telefone', value: u.contactPhone, href: 'https://wa.me/55' + u.contactPhone.replace(/\D/g, '') } : null,
    u.contactInstagram ? { icon: '📸', label: 'Instagram', value: u.contactInstagram.replace(/^@/, ''), href: 'https://instagram.com/' + u.contactInstagram.replace(/^@/, '').replace(/\/$/, '') } : null,
    (u.contactEmail || u.email) ? { icon: '✉️', label: 'E-mail', value: u.contactEmail || u.email, href: 'mailto:' + (u.contactEmail || u.email) } : null
  ].filter(Boolean);

  return `
    <div class="section scout-card">
      <div class="scout-head">
        <span class="scout-badge">🔎 Olheiro / Clube</span>
        <h4 style="margin:0">Quem está de olho em você</h4>
        ${u.club ? `<p class="scout-club">🏛️ ${esc(u.club)}</p>` : ''}
        ${u.scoutRole ? `<p class="scout-role">${esc(u.scoutRole)}</p>` : ''}
      </div>
      <div class="info-list">
        ${u.city ? `<div><span>📍 Base</span><b>${esc(u.city)}${u.state ? '/' + esc(u.state) : ''}</b></div>` : ''}
        ${u.scoutRegions ? `<div><span>🗺️ Regiões que avalia</span><b>${esc(u.scoutRegions)}</b></div>` : ''}
        ${u.scoutPositions ? `<div><span>🎯 Posições que busca</span><b>${esc(u.scoutPositions)}</b></div>` : ''}
        ${mods.length ? `<div><span>⚽ Modalidades</span><b>${mods.map(esc).join(' · ')}</b></div>` : ''}
        ${u.verified ? `<div><span>✅ Selo</span><b style="color:var(--gold)">Olheiro verificado</b></div>` : ''}
      </div>
      ${contacts.length ? `
        <div class="contact-list">
          ${contacts.map(x => `
            <a class="contact-row" href="${esc(x.href)}" target="_blank" rel="noopener">
              <span class="ci">${x.icon}</span>
              <span class="ct"><b>${x.label}</b><small>${esc(x.value)}</small></span>
              <span class="ca">➜</span>
            </a>`).join('')}
        </div>` : `<p class="sub" style="margin:10px 0 0">Este olheiro ainda não publicou contatos.</p>`}
      <p class="scout-note">Fale pelo chat do app ou pelos contatos acima. Toda visita sua fica registrada no perfil do atleta.</p>
    </div>
    ${medals}`;
}

async function renderProfile(userId) {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando perfil… ⚽</p>';
  const { user: u, ratings, achievements } = await api('/users/' + userId);
  const posts = await api('/posts?userId=' + userId);
  const isFollowingRes = await api('/users/' + userId + '/is-following').catch(() => ({ following: false }));
  const iFollow = isFollowingRes.following;
  
  window._lastProfile = { user: u, achievements: achievements || [] };
  cachePosts(posts);
  const mine = u.id === ME.id;
  const kind = roleKind(u);
  const videos = posts.filter(p => p.type === 'video').length;
  const postsProf = posts.filter(p => p.category === 'profissional');
  const postsPelada = posts.filter(p => p.category !== 'profissional');
  const totalLikes = posts.reduce((s, p) => s + p.likes.length, 0);
  const earned = (achievements || []).filter(a => a.earned);

  c.innerHTML = `
    ${!mine ? `<button class="back" onclick="showTab('${currentTab === 'profile' ? 'search' : currentTab}')">‹ Voltar</button>` : ''}
    <div class="profile-head">
      ${kind === 'olheiro' ? `<div class="scout-flag">🔎</div>`
        : `<div class="overall-badge"><b>${u.overall}</b><span>${kind === 'jogador' ? 'OVR' : 'NVL'}</span></div>`}
      ${mine ? `
        <div class="upload-btn" style="display:inline-block">
          ${avatarHtml(u, 'lg', false)}
          <input type="file" accept="image/*" onchange="newProfilePhoto(this)">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">toque para trocar a foto</div>
        </div>` : avatarHtml(u, 'lg', false)}
      <h3>${esc(u.name)} ${u.verified ? '✅' : ''}</h3>
      ${u.nickname ? `<div class="nick">"${esc(u.nickname)}"</div>` : ''}
      <div class="loc">${ROLES[u.role]?.emoji || ''} ${esc(u.position || ROLES[u.role]?.label || '')}${u.positions2 ? ' · também: ' + esc(u.positions2) : ''}</div>
      <div class="loc">${kind === 'olheiro' && u.club ? '🏛️ ' + esc(u.club) + ' · ' : ''}${u.city ? '📍 ' + esc(u.city) + '/' + esc(u.state || '') : ''} ${u.level ? ' · ' + esc(u.level) : ''}</div>
      <div style="margin-top:6px">${starsHtml(u.ratingAvg, u.ratingCount)}</div>

      <div class="follow-row">
        <span><b id="prof-followers">${u.followers}</b> seguidores</span>
        <span><b>${u.following}</b> seguindo</span>
        ${kind === 'olheiro' ? `<span><b>${u.scoutViewsGiven || 0}</b> atletas vistos</span>` : ''}
      </div>

      <div class="row2 mt" style="max-width:320px;margin-left:auto;margin-right:auto">
        ${kind === 'jogador' ? `<button class="btn btn-gold btn-sm" onclick="openFifaCard()">🃏 Ver Card FIFA</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="openResumePdf()">📄 ${kind === 'jogador' ? 'Currículo' : (kind === 'tecnico' ? 'Portfólio' : (kind === 'arbitro' ? 'Súmula' : 'Cartão de visita'))} PDF</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat"><b>${posts.length}</b><span>Publicações</span></div>
      <div class="stat"><b>${videos}</b><span>Vídeos</span></div>
      <div class="stat"><b>${totalLikes}</b><span>Curtidas</span></div>
    </div>

    ${mine ? `
      <div class="row2">
        <button class="btn btn-green btn-sm" onclick="renderEditProfile()">✏️ Editar Perfil</button>
        <button class="btn btn-outline btn-sm" onclick="openSecurityModal()">🔐 E-mail e Senha</button>
        <button class="btn btn-primary btn-sm" onclick="shareProfile('${u.id}')">🔗 Compartilhar</button>
      </div>
      ${ME.isAdmin ? `
        <button class="btn btn-primary btn-sm mt" style="width:100%" onclick="showTab('admin')">
          🛡️ Acessar Painel do Administrador
        </button>` : ''}
      <button class="btn btn-danger btn-sm mt" style="width:100%" onclick="logout()">Sair da conta</button>` : kind === 'olheiro' ? `
      <div class="row2">
        <button class="btn btn-primary btn-sm" onclick="openChat('${u.id}', '${esc(u.name)}')">💬 Falar com o olheiro</button>
        <button class="btn ${iFollow ? 'btn-outline' : 'btn-green'} btn-sm" id="btn-follow" onclick="toggleFollow('${u.id}')">${iFollow ? 'Seguindo' : '➕ Seguir'}</button>
      </div>
      <div class="row2 mt" style="margin-top:8px">
        <button class="btn btn-outline btn-sm" onclick="openRating('${u.id}', '${esc(u.name)}')">⭐ Avaliar atendimento</button>
        <button class="btn btn-outline btn-sm" onclick="shareProfile('${u.id}')">🔗 Compartilhar</button>
      </div>` : `
      <div class="row2">
        <button class="btn btn-primary btn-sm" onclick="openProposal('${u.id}', '${esc(u.name)}')">${kind === 'arbitro' ? '🟨 Chamar para apitar' : (kind === 'tecnico' ? '📋 Chamar para comandar' : '🤝 Contratar / Chamar p/ jogo')}</button>
        <button class="btn ${iFollow ? 'btn-outline' : 'btn-green'} btn-sm" id="btn-follow" onclick="toggleFollow('${u.id}')">${iFollow ? 'Seguindo' : '➕ Seguir'}</button>
      </div>
      <div class="row2 mt" style="margin-top:8px">
        <button class="btn btn-outline btn-sm" onclick="openChat('${u.id}', '${esc(u.name)}')">💬 Mensagem privada</button>
        <button class="btn btn-outline btn-sm" onclick="openRating('${u.id}', '${esc(u.name)}')">⭐ Avaliar ${kind === 'arbitro' ? 'arbitragem' : (kind === 'tecnico' ? 'trabalho' : 'atleta')}</button>
      </div>`}

    <!-- Seção de Jogos & Eventos Criados pelo Usuário -->
    <div class="section" id="profile-events-section" style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="margin:0">📍 Jogos & Peneiras Criados</h4>
        ${mine ? `<button class="btn btn-primary btn-xs" onclick="openNewEvent()">➕ Criar Jogo</button>` : ''}
      </div>
      <div id="profile-events-list"><p class="empty" style="padding:12px">Carregando jogos do perfil… ⏳</p></div>
    </div>

    ${u.bio ? `<div class="section"><h4>📖 Sobre</h4><p>${esc(u.bio)}</p></div>` : ''}

    ${profileRoleSections(u, earned, achievements)}

    <div class="section">
      <div class="profile-view-toggle">
        <button class="btn btn-sm ${profileMode === 'feed' ? 'btn-primary' : 'btn-outline'}" onclick="profileMode='feed'; renderProfile('${u.id}')">📰 Feed</button>
        <button class="btn btn-sm ${profileMode === 'grid' ? 'btn-primary' : 'btn-outline'}" onclick="profileMode='grid'; renderProfile('${u.id}')">🔲 Grade</button>
      </div>
      ${profileMode === 'feed' ? `<h4>📰 Feed (${posts.length})</h4>${posts.length ? posts.map(postHtml).join('') : '<p class="empty">Nenhuma publicação ainda.</p>'}` : `
        <h4>🎥 Mídia (${posts.length}) — ${videos} vídeo(s)</h4>
        <div class="gal-group"><h5>🏆 Lances em jogos profissionais (${postsProf.length})</h5>${postsProf.length ? mediaGridHtml(postsProf) : '<p class="sub">Nenhum lance profissional ainda.</p>'}</div>
        <div class="gal-group"><h5>🎉 Lances de pelada/várzea (${postsPelada.length})</h5>${postsPelada.length ? mediaGridHtml(postsPelada) : '<p class="sub">Nenhum lance de pelada/várzea ainda.</p>'}</div>`}
    </div>

    ${ME.isAdmin && !mine ? `
      <div class="section" style="border-left:4px solid var(--gold)">
        <h4>🛡️ Moderação do Administrador</h4>
        <p class="sub">Excluir este perfil removerá posts, stories e dados vinculados.</p>
        <button class="btn btn-danger btn-sm" onclick="adminDeleteUserFromProfile('${u.id}', '${esc(u.name)}')">🗑️ Excluir Usuário</button>
      </div>` : ''}

    ${ratings.length ? `
      <div class="section">
        <h4>⭐ Avaliações</h4>
        ${ratings.map(r => `
          <div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border-glass)">
            <b>${esc(r.from?.name || '')}</b> — <span class="stars">${'★'.repeat(r.stars)}</span><br>
            <span style="color:var(--text-secondary);font-size:12.5px">${esc(r.comment)}</span>
          </div>`).join('')}
      </div>` : ''}`;

  loadProfileEvents(userId, mine);
}

async function loadProfileEvents(userId, mine) {
  try {
    const events = await api('/events?city=');
    const userEvents = events.filter(e => e.userId === userId);
    const el = document.getElementById('profile-events-list');
    if (!el) return;

    if (!userEvents.length) {
      el.innerHTML = `<p class="empty" style="padding:10px">Nenhum jogo criado por este usuário ainda.</p>`;
      return;
    }

    el.innerHTML = userEvents.map(ev => {
      const mod = MODALITIES[ev.modality] || MODALITIES.campo;
      const d = new Date(ev.date);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const pendingCount = ev.pendingProposalsCount || (ev.proposals ? ev.proposals.filter(p => p.status === 'pendente').length : 0);

      return `
        <div class="candidate-card" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="pill ${mod.badgeClass}" style="font-size:10px;padding:2px 7px">${mod.emoji} ${mod.shortName}</span>
            <span style="font-size:11px;color:var(--gold)">📅 ${dateStr}</span>
          </div>
          <b style="display:block;margin:6px 0 2px;font-size:14px">${esc(ev.title)}</b>
          <div style="font-size:11.5px;color:var(--text-secondary)">
            📍 ${esc(ev.place || ev.city)} · 🙋 <b>${(ev.participants || []).length}</b> escalados
          </div>

          ${mine ? `
            <div class="row2 mt" style="margin-top:8px">
              <button class="btn btn-primary btn-xs ${pendingCount > 0 ? 'btn-pulse' : ''}" onclick="openEventProposalsDrawer('${ev.id}', '${esc(ev.title)}')">
                📋 Candidatos (${pendingCount > 0 ? `<b>${pendingCount} pendente(s)</b>` : (ev.proposalsCount || 0)})
              </button>
              <button class="btn btn-outline btn-xs" onclick="openEventParticipantsModal('${ev.id}', '${esc(ev.title)}')">
                👥 Ver Escalados
              </button>
            </div>` : ''}
        </div>`;
    }).join('');
  } catch {}
}

function mediaGridHtml(posts) {
  return `
    <div class="media-grid">
      ${posts.map(p => `
        <button class="cell" onclick="openMediaModal('${p.id}')">
          ${p.type === 'video' ? `<video src="${esc(p.url)}#t=0.5" preload="metadata"></video><span class="play">▶</span>` : `<img src="${esc(p.url)}" alt="">`}
        </button>`).join('')}
    </div>`;
}

function openMediaModal(postId) {
  const p = _postsCache[postId];
  if (!p) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.style.alignItems = 'center';
  bg.innerHTML = `
    <div class="modal" style="border-radius:22px;padding:0;overflow:hidden">
      ${postHtml(p)}
      <button class="btn btn-outline mt" style="margin:12px;width:calc(100% - 24px)" onclick="this.closest('.modal-bg').remove()">Fechar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
}

async function toggleFollow(targetId) {
  const res = await api('/users/' + targetId + '/follow', { method: 'POST' });
  const btn = document.getElementById('btn-follow');
  if (btn) {
    btn.className = `btn ${res.following ? 'btn-outline' : 'btn-green'} btn-sm`;
    btn.textContent = res.following ? 'Seguindo' : '➕ Seguir';
  }
  const folEl = document.getElementById('prof-followers');
  if (folEl) folEl.textContent = res.followers;
  toast(res.following ? 'Você começou a seguir este atleta! 👥' : 'Deixou de seguir.');
}

function shareProfile(id) {
  const url = window.location.origin + '#profile-' + id;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    toast('Link do perfil copiado! 🔗');
  } else toast('Link: ' + url);
}

async function newProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('photo', file);
  toast('Atualizando foto… ⏳');
  try {
    const res = await api('/me/photo', { method: 'POST', body: fd });
    ME.photo = res.photo;
    toast('Foto atualizada! 📸✨');
    renderProfile(ME.id);
  } catch (e) { toast('Erro: ' + e.message); }
}

function openSecurityModal() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>🔐 Segurança: E-mail e Senha</h3>
      <p class="sub">Atualize seus dados de login com segurança.</p>
      <label>E-mail</label>
      <input id="sec-email" type="email" value="${esc(ME.email)}">
      <label>Nova senha (deixe em branco para manter a atual)</label>
      <input id="sec-pass" type="password" placeholder="Nova senha (opcional)">
      <label>Senha atual (obrigatória para confirmar)</label>
      <input id="sec-current" type="password" placeholder="Digite sua senha atual">
      <button class="btn btn-primary mt" id="sec-save">Salvar Alterações</button>
      <button class="btn btn-outline mt" id="sec-cancel">Cancelar</button>
    </div>`;
  bg.querySelector('#sec-cancel').onclick = () => bg.remove();
  bg.querySelector('#sec-save').onclick = async () => {
    try {
      ME = await api('/me/security', {
        method: 'PUT',
        body: {
          email: bg.querySelector('#sec-email').value.trim(),
          password: bg.querySelector('#sec-pass').value,
          currentPassword: bg.querySelector('#sec-current').value
        }
      });
      bg.remove();
      toast('Dados atualizados com sucesso! ✅');
      renderProfile(ME.id);
    } catch (e) { toast('Erro: ' + e.message); }
  };
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
}

async function adminDeleteUserFromProfile(id, name) {
  if (!confirm(`Excluir o usuário ${name} e todos os dados vinculados? Esta ação não pode ser desfeita.`)) return;
  try {
    await api('/admin/users/' + id, { method: 'DELETE' });
    toast('Usuário excluído pelo administrador.');
    showTab('admin');
  } catch (e) { toast('Erro: ' + e.message); }
}

// ---------- Editar Perfil ----------
// ---------- Editar Perfil (campos específicos por tipo de usuário) ----------
function chipRowHtml(name, items, selected, multi = false) {
  const sel = arrVal(selected);
  return `
    <input type="hidden" id="ec-${name}" value="${esc(sel.join(', '))}">
    <div class="chip-row" data-chip="${name}" data-multi="${multi ? 1 : 0}">
      ${items.map(v => `<button type="button" class="chip ${sel.includes(v) ? 'on' : ''}" onclick="toggleEditChip(this)">${esc(v)}</button>`).join('')}
    </div>`;
}

function toggleEditChip(btn) {
  const row = btn.closest('.chip-row');
  if (!row) return;
  const multi = row.dataset.multi === '1';
  if (!multi) row.querySelectorAll('.chip').forEach(c => { if (c !== btn) c.classList.remove('on'); });
  btn.classList.toggle('on');
  const vals = [...row.querySelectorAll('.chip.on')].map(c => c.textContent.trim());
  const hid = document.getElementById('ec-' + row.dataset.chip);
  if (hid) hid.value = vals.join(', ');
}

function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function checked(id) { const el = document.getElementById(id); return !!(el && el.checked); }
function chipVal(name) { return val('ec-' + name).split(',').map(s => s.trim()).filter(Boolean); }

function playerFields(u) {
  const isGK = isGoalkeeper(u);
  const attrs = isGK ? FIFA_ATTRS_GK : FIFA_ATTRS;
  return `
    <div class="form-sec">
      <h4>⚽ Dentro de campo</h4>
      <label>Posição principal ${isGK ? '<span class="tag-gk">🧤 goleiro</span>' : ''}</label>
      ${POS_GROUPS.map(g => `
        <div class="chip-group">
          <h5>${g.label}</h5>
          <div class="chip-row" data-chip="pos" data-multi="0">
            ${g.items.map(p => `<button type="button" class="chip ${u.position === p ? 'on' : ''}" onclick="toggleEditChip(this)">${p}</button>`).join('')}
          </div>
        </div>`).join('')}
      <input type="hidden" id="ec-pos" value="${esc(u.position || '')}">
      <label>Outras posições que joga <span class="opt">(opcional)</span></label>
      <input id="e-pos2" value="${esc(u.positions2 || '')}" placeholder="Ex: Meia, Ponta esquerda">
      <div class="row2">
        <div><label>Nível</label>
          <select id="e-level"><option value="">Selecione…</option>${LEVELS.map(l => `<option ${u.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label>Nº da camisa</label><input id="e-shirt" type="number" min="1" max="99" value="${u.shirtNumber ?? ''}" placeholder="10"></div>
      </div>
    </div>

    <div class="form-sec">
      <h4>📏 Corpo &amp; origem</h4>
      <div class="row2">
        <div><label>Idade</label><input id="e-age" type="number" value="${u.age ?? ''}" placeholder="22"></div>
        <div><label>Altura (cm)</label><input id="e-height" type="number" value="${u.height ?? ''}" placeholder="178"></div>
      </div>
      <div class="row2">
        <div><label>Peso (kg)</label><input id="e-weight" type="number" value="${u.weight ?? ''}" placeholder="72"></div>
        <div><label>Perna boa</label>
          <select id="e-foot"><option value="">—</option>${['Destro', 'Canhoto', 'Ambidestro'].map(f => `<option ${u.foot === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
      </div>
      <div class="row2">
        <div><label>Nacionalidade</label><input id="e-nation" value="${esc(u.nationality || '')}" placeholder="Brasil"></div>
        <div><label>Data de nascimento</label><input id="e-birth" type="date" value="${esc(u.birthdate || '')}"></div>
      </div>
      <label>Clube atual</label><input id="e-club" value="${esc(u.club || '')}" placeholder="Ex: Palmeiras">
      <label>Times por onde passou</label><input id="e-teams" value="${esc(u.teams || '')}" placeholder="Ex: Juína EC, Operário VG">
      <label>Pontos fortes <span class="opt">(separados por vírgula)</span></label>
      <input id="e-strengths" value="${esc(u.strengths || '')}" placeholder="${isGK ? 'Ex: saída de gol, reposição, defesa de pênalti' : 'Ex: velocidade, drible, cabeceio'}">
    </div>

    <div class="form-sec">
      <h4>🎮 Atributos FIFA <span class="opt">(1–99)</span></h4>
      <p class="sec-hint">Definem sua nota geral <b class="ovr-mini">OVR</b> na cartinha.</p>
      <div class="fifa-attr-grid">
        ${attrs.map(a => `
          <div class="fifa-attr-field">
            <label>${a.icon} ${a.name} (${a.label})</label>
            <input id="fa-${a.key}" type="number" min="1" max="99" value="${u.fifa?.[a.key] ?? ''}" placeholder="60">
          </div>`).join('')}
      </div>
    </div>

    <div class="form-sec">
      <h4>📊 ${isGK ? 'Números da carreira 🧤' : 'Números da carreira'}</h4>
      <div class="row2">
        <div><label>Jogos disputados</label><input id="st-jogos" type="number" min="0" value="${u.stats?.jogos ?? ''}" placeholder="0"></div>
        ${isGK
          ? `<div><label>Defesas</label><input id="st-defesas" type="number" min="0" value="${u.stats?.defesas ?? ''}" placeholder="0"></div>`
          : `<div><label>Gols marcados</label><input id="st-gols" type="number" min="0" value="${u.stats?.gols ?? ''}" placeholder="0"></div>`}
      </div>
      <div class="row2">
        ${isGK
          ? `<div><label>Pênaltis defendidos</label><input id="st-pen" type="number" min="0" value="${u.stats?.penaltisDefendidos ?? ''}" placeholder="0"></div>`
          : `<div><label>Assistências</label><input id="st-assist" type="number" min="0" value="${u.stats?.assistencias ?? ''}" placeholder="0"></div>`}
        <div><label>Títulos</label><input id="st-titulos" type="number" min="0" value="${u.stats?.titulos ?? ''}" placeholder="0"></div>
      </div>
    </div>

    <div class="form-sec">
      <h4>🤝 Disponibilidade</h4>
      <label class="check"><input type="checkbox" id="e-hire" ${u.availableHire ? 'checked' : ''}> ✅ Disponível para contratação</label>
      <label class="check"><input type="checkbox" id="e-freela" ${u.availableFreela ? 'checked' : ''}> ⚡ Aceito jogo avulso (freela)</label>
      <label>Cachê por jogo <span class="opt">(opcional)</span></label>
      <input id="e-fee" value="${esc(u.fee || '')}" placeholder="Ex: R$ 120/jogo">
    </div>`;
}

function coachFields(u) {
  return `
    <div class="form-sec">
      <h4>📋 Comando técnico</h4>
      <label>Sua função</label>
      ${chipRowHtml('spec', COACH_SPECIALTIES, u.position || u.specialty, false)}
      <label>Categorias que treina</label>
      ${chipRowHtml('cats', COACH_CATEGORIES, u.coachCategories, true)}
      <div class="row2">
        <div><label>Nível de atuação</label>
          <select id="e-level"><option value="">Selecione…</option>${COACH_LEVELS.map(l => `<option ${u.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label>Anos de experiência</label><input id="e-exp" type="number" min="0" value="${u.experienceYears ?? ''}" placeholder="8"></div>
      </div>
      <label>Licença / formação</label>
      <select id="e-licenses"><option value="">Selecione…</option>${COACH_LICENSES.map(l => `<option ${u.licenses === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label>Estilo de jogo</label>
      ${chipRowHtml('style', PLAYSTYLES, u.playstyle, false)}
    </div>

    <div class="form-sec">
      <h4>🏟️ Trajetória</h4>
      <label>Clube ou equipe atual</label><input id="e-club" value="${esc(u.club || '')}" placeholder="Ex: EC Operário">
      <label>Onde já trabalhou</label><input id="e-teams" value="${esc(u.teams || '')}" placeholder="Ex: Sub-17 do Mixto, Amador do CPA">
      <label>Metodologia / formação</label>
      <textarea id="e-method" rows="3" placeholder="Ex: Curso CBF C, trabalho com saída de bola curta e pressão pós-perda…">${esc(u.methodology || '')}</textarea>
      <label>Pontos fortes do seu trabalho</label><input id="e-strengths" value="${esc(u.strengths || '')}" placeholder="Ex: organização defensiva, gestão de grupo, bola parada">
    </div>

    <div class="form-sec">
      <h4>📈 Números no banco</h4>
      <p class="sec-hint">Sem gols aqui — só o que o treinador assina embaixo.</p>
      <div class="row2">
        <div><label>Jogos no comando</label><input id="st-jogos" type="number" min="0" value="${u.stats?.jogos ?? ''}" placeholder="0"></div>
        <div><label>Vitórias</label><input id="st-vitorias" type="number" min="0" value="${u.stats?.vitorias ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>Empates</label><input id="st-empates" type="number" min="0" value="${u.stats?.empates ?? ''}" placeholder="0"></div>
        <div><label>Títulos</label><input id="st-titulos" type="number" min="0" value="${u.stats?.titulos ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>Acessos / subidas</label><input id="st-acessos" type="number" min="0" value="${u.stats?.acessos ?? ''}" placeholder="0"></div>
        <div></div>
      </div>
    </div>

    <div class="form-sec">
      <h4>🤝 Disponibilidade</h4>
      <label class="check"><input type="checkbox" id="e-hire" ${u.availableHire !== false ? 'checked' : ''}> ✅ Disponível para assumir equipe</label>
      <label class="check"><input type="checkbox" id="e-freela" ${u.availableFreela ? 'checked' : ''}> ⚡ Aceito projeto avulso (clínica, avaliação)</label>
      <label>Pretensão / cachê <span class="opt">(opcional)</span></label>
      <input id="e-fee" value="${esc(u.fee || '')}" placeholder="Ex: R$ 3.000/mês">
    </div>`;
}

function refereeFields(u) {
  return `
    <div class="form-sec">
      <h4>🟨 Arbitragem</h4>
      <label>Função em campo</label>
      ${chipRowHtml('func', REF_FUNCTIONS, u.position, false)}
      <div class="row2">
        <div><label>Quadro / nível</label>
          <select id="e-reflevel"><option value="">Selecione…</option>${REF_LEVELS.map(l => `<option ${u.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label>Anos de apito</label><input id="e-exp" type="number" min="0" value="${u.experienceYears ?? ''}" placeholder="5"></div>
      </div>
      <label>Entidade / federação</label>
      <select id="e-refentity"><option value="">Selecione…</option>${REF_ENTITIES.map(l => `<option ${u.refEntity === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label>Modalidades que apita</label>
      ${chipRowHtml('mods', MODALITY_CHIPS.map(m => m.label), arrVal(u.modalities), true)}
      <label>Região de atuação</label><input id="e-refregions" value="${esc(u.refRegions || '')}" placeholder="Ex: Cuiabá e Várzea Grande">
      <label>Pontos fortes</label><input id="e-strengths" value="${esc(u.strengths || '')}" placeholder="Ex: posicionamento, controle de jogo, preparo físico">
    </div>

    <div class="form-sec">
      <h4>📊 Números do apito</h4>
      <div class="row2">
        <div><label>Jogos apitados</label><input id="st-jogos" type="number" min="0" value="${u.stats?.jogos ?? ''}" placeholder="0"></div>
        <div><label>Cartões amarelos</label><input id="st-amarelos" type="number" min="0" value="${u.stats?.amarelos ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>Cartões vermelhos</label><input id="st-vermelhos" type="number" min="0" value="${u.stats?.vermelhos ?? ''}" placeholder="0"></div>
        <div><label>Pênaltis marcados</label><input id="st-penmarc" type="number" min="0" value="${u.stats?.penaltisMarcados ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>Finais apitadas</label><input id="st-finais" type="number" min="0" value="${u.stats?.finais ?? ''}" placeholder="0"></div>
        <div></div>
      </div>
    </div>

    <div class="form-sec">
      <h4>🤝 Disponibilidade</h4>
      <label class="check"><input type="checkbox" id="e-hire" ${u.availableHire !== false ? 'checked' : ''}> ✅ Disponível para escalação</label>
      <label class="check"><input type="checkbox" id="e-freela" ${u.availableFreela ? 'checked' : ''}> ⚡ Apito pelada / várzea avulsa</label>
      <label>Taxa por jogo <span class="opt">(opcional)</span></label>
      <input id="e-fee" value="${esc(u.fee || '')}" placeholder="Ex: R$ 150 + transporte">
    </div>`;
}

function scoutFields(u) {
  return `
    <div class="form-sec">
      <h4>🔎 Quem é você</h4>
      <label>Clube, empresa ou agência</label><input id="e-club" value="${esc(u.club || '')}" placeholder="Ex: EC Juventude">
      <label>Seu cargo</label>
      ${chipRowHtml('srole', SCOUT_ROLES, u.scoutRole || u.position, false)}
      <div class="row2">
        <div><label>Cidade</label><input id="e-city2" value="${esc(u.city || '')}" placeholder="São Paulo"></div>
        <div><label>Estado (UF)</label><input id="e-state2" value="${esc(u.state || '')}" placeholder="SP" maxlength="2"></div>
      </div>
    </div>

    <div class="form-sec">
      <h4>🎯 O que procura</h4>
      <label>Modalidades de interesse</label>
      ${chipRowHtml('mods', MODALITY_CHIPS.map(m => m.label), arrVal(u.modalities), true)}
      <label>Posições que busca</label><input id="e-spos" value="${esc(u.scoutPositions || '')}" placeholder="Ex: Lateral esquerdo, Centroavante, Goleiro">
      <label>Regiões que avalia</label><input id="e-sreg" value="${esc(u.scoutRegions || '')}" placeholder="Ex: Mato Grosso, interior de SP">
    </div>

    <div class="form-sec">
      <h4>📞 Contatos públicos</h4>
      <p class="sec-hint">Aparecem no seu perfil para os atletas falarem com você.</p>
      <label>WhatsApp / telefone</label><input id="e-phone" value="${esc(u.contactPhone || '')}" placeholder="(65) 99999-0000" inputmode="tel">
      <div class="row2">
        <div><label>Instagram</label><input id="e-ig" value="${esc(u.contactInstagram || '')}" placeholder="@seu_clube"></div>
        <div><label>E-mail de contato</label><input id="e-cmail" type="email" value="${esc(u.contactEmail || u.email || '')}" placeholder="olheiro@clube.com"></div>
      </div>
      <label class="check mt"><input type="checkbox" id="e-public" ${u.publicProfile !== false ? 'checked' : ''}> 🌐 Meu perfil aparece na busca de atletas</label>
    </div>`;
}

function renderEditProfile(first = false) {
  if (!$('#content')) { renderShell(); }
  const c = $('#content');
  const u = ME;
  const kind = roleKind(u);
  const r = signupRole(kind === 'jogador' && u.role === 'goleiro' ? 'jogador' : kind);
  const accent = { jogador: 'green', tecnico: 'cyan', arbitro: 'gold', olheiro: 'rose' }[kind] || 'green';

  const body = kind === 'tecnico' ? coachFields(u)
    : kind === 'arbitro' ? refereeFields(u)
    : kind === 'olheiro' ? scoutFields(u)
    : playerFields(u);

  const cityBlock = kind === 'olheiro' ? '' : `
    <div class="form-sec">
      <h4>📍 Onde você joga</h4>
      <div class="row2">
        <div><label>Cidade</label><input id="e-city" value="${esc(u.city || '')}" placeholder="São Paulo"></div>
        <div><label>Estado (UF)</label><input id="e-state" value="${esc(u.state || '')}" placeholder="SP" maxlength="2"></div>
      </div>
    </div>`;

  const bioBlock = `
    <div class="form-sec">
      <h4>📖 Sobre você</h4>
      <textarea id="e-bio" rows="3" placeholder="${kind === 'olheiro'
        ? 'Conte como você trabalha e o que oferece aos atletas…'
        : 'Conte sua história no futebol…'}">${esc(u.bio || '')}</textarea>
    </div>`;

  c.innerHTML = `
    ${first
      ? `<div class="edit-hero"><span class="eh-emoji">${r.emoji}</span><h2>Complete seu perfil</h2><p>Só o que importa para <b>${r.label.toLowerCase()}</b> — o resto você pode pular.</p></div>`
      : `<button class="back" onclick="showTab('profile')">‹ Voltar</button><h2>Editar perfil ✏️</h2>`}
    <div class="role-banner acc-${accent}">${r.emoji} ${ROLES[u.role]?.label || r.label}<span class="rb-hint">ficha de ${r.label.toLowerCase()}</span></div>
    <div class="form-card">
      <div class="form-sec">
        <h4>👤 Identificação</h4>
        <label>${kind === 'olheiro' ? 'Nome do responsável' : 'Nome'}</label><input id="e-name" value="${esc(u.name)}">
        ${kind === 'olheiro' ? '' : `<label>Apelido / nome de campo</label><input id="e-nick" value="${esc(u.nickname || '')}" placeholder='Ex: "Foguinho", "Paredão"'>`}
      </div>
      ${body}
      ${cityBlock}
      ${bioBlock}
    </div>
    <div id="e-err" class="err"></div>
    <button class="btn btn-primary btn-lg mt" onclick="saveProfile(${first})">💾 Salvar perfil</button>
    ${first ? `<button class="btn btn-outline mt" style="width:100%" onclick="skipProfileSetup()">Pular por enquanto</button>` : ''}`;
  window.scrollTo({ top: 0 });
}

function skipProfileSetup() {
  enterApp();
  toast('Sem problema — complete o perfil quando quiser. 😉');
}

async function saveProfile(first) {
  const kind = roleKind(ME);
  const err = document.getElementById('e-err');
  if (err) err.textContent = '';

  const body = {
    name: val('e-name').trim(),
    nickname: val('e-nick').trim(),
    city: val(kind === 'olheiro' ? 'e-city2' : 'e-city').trim(),
    state: val(kind === 'olheiro' ? 'e-state2' : 'e-state').trim().toUpperCase(),
    bio: val('e-bio').trim()
  };
  if (!body.name) { if (err) err.textContent = 'Digite seu nome.'; return; }

  let stats = null;
  let fifa = null;

  if (kind === 'jogador') {
    Object.assign(body, {
      position: chipVal('pos')[0] || ME.position || '',
      positions2: val('e-pos2').trim(),
      level: val('e-level'),
      age: +val('e-age') || null,
      height: +val('e-height') || null,
      weight: +val('e-weight') || null,
      foot: val('e-foot'),
      teams: val('e-teams').trim(),
      strengths: val('e-strengths').trim(),
      nationality: val('e-nation').trim(),
      birthdate: val('e-birth'),
      club: val('e-club').trim(),
      shirtNumber: +val('e-shirt') || null,
      availableHire: checked('e-hire'),
      availableFreela: checked('e-freela'),
      fee: val('e-fee').trim()
    });
    const isGK = body.position === 'Goleiro' || ME.role === 'goleiro';
    stats = isGK
      ? { jogos: val('st-jogos'), defesas: val('st-defesas'), penaltisDefendidos: val('st-pen'), titulos: val('st-titulos') }
      : { jogos: val('st-jogos'), gols: val('st-gols'), assistencias: val('st-assist'), titulos: val('st-titulos') };
    const attrSet = isGK ? FIFA_ATTRS_GK : FIFA_ATTRS;
    fifa = {};
    attrSet.forEach(a => {
      const v = val('fa-' + a.key);
      if (v !== '') fifa[a.key] = parseInt(v, 10) || 0;
    });
  }

  if (kind === 'tecnico') {
    Object.assign(body, {
      position: chipVal('spec')[0] || 'Técnico',
      level: val('e-level'),
      licenses: val('e-licenses'),
      experienceYears: +val('e-exp') || null,
      playstyle: chipVal('style')[0] || '',
      coachCategories: chipVal('cats'),
      club: val('e-club').trim(),
      teams: val('e-teams').trim(),
      methodology: val('e-method').trim(),
      strengths: val('e-strengths').trim(),
      availableHire: checked('e-hire'),
      availableFreela: checked('e-freela'),
      fee: val('e-fee').trim()
    });
    stats = {
      jogos: val('st-jogos'), vitorias: val('st-vitorias'), empates: val('st-empates'),
      titulos: val('st-titulos'), acessos: val('st-acessos')
    };
  }

  if (kind === 'arbitro') {
    Object.assign(body, {
      position: chipVal('func')[0] || 'Árbitro Central',
      level: val('e-reflevel'),
      refEntity: val('e-refentity'),
      experienceYears: +val('e-exp') || null,
      modalities: chipVal('mods'),
      refRegions: val('e-refregions').trim(),
      strengths: val('e-strengths').trim(),
      availableHire: checked('e-hire'),
      availableFreela: checked('e-freela'),
      fee: val('e-fee').trim()
    });
    stats = {
      jogos: val('st-jogos'), amarelos: val('st-amarelos'), vermelhos: val('st-vermelhos'),
      penaltisMarcados: val('st-penmarc'), finais: val('st-finais')
    };
  }

  if (kind === 'olheiro') {
    Object.assign(body, {
      club: val('e-club').trim(),
      scoutRole: chipVal('srole')[0] || 'Olheiro',
      position: chipVal('srole')[0] || 'Olheiro',
      modalities: chipVal('mods'),
      scoutPositions: val('e-spos').trim(),
      scoutRegions: val('e-sreg').trim(),
      contactPhone: val('e-phone').trim(),
      contactInstagram: val('e-ig').trim(),
      contactEmail: val('e-cmail').trim(),
      publicProfile: checked('e-public')
    });
  }

  const btn = document.querySelector('#content .btn-lg');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando… ⏳'; }
  try {
    if (stats) await api('/me/stats', { method: 'PUT', body: stats });
    if (fifa && Object.keys(fifa).length) await api('/me/fifa', { method: 'PUT', body: fifa });
    ME = await api('/me/profile', { method: 'PUT', body });
    toast('Perfil salvo com sucesso! ✅');
    if (first) enterApp(); else showTab('profile');
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar perfil'; }
    if (err) err.textContent = e.message;
    else toast('Erro: ' + e.message);
  }
}

// ============================================================
// CHAT & CONVERSAS
// ============================================================
async function renderConvs() {
  const c = $('#content');
  c.innerHTML = `
    <h2>Mensagens 💬</h2>
    <div class="subtabs">
      <button class="on" onclick="showTab('chat')">💬 Conversas</button>
      <button onclick="showTab('props')">🤝 Propostas</button>
    </div>
    <p class="sub">Conversas com organizadores, olheiros e companheiros de time.</p>
    <div id="convs"><p class="empty">Carregando conversas… ⏳</p></div>`;

  const load = async () => {
    const convs = await api('/conversations');
    const el = $('#convs');
    if (!el) return;
    el.innerHTML = convs.length ? convs.map(cv => `
      <div class="conv" onclick="openChat('${cv.user.id}', '${esc(cv.user.name)}')" style="cursor:pointer">
        ${avatarHtml(cv.user, 'md')}
        <div class="info">
          <b>${esc(cv.user.name)} ${cv.user.verified ? '✅' : ''} ${cv.unread ? `<span class="badge" style="position:static;display:inline-flex">${cv.unread}</span>` : ''}</b>
          <span>${esc(cv.lastMessage.text)}</span>
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${timeAgo(cv.lastMessage.createdAt)}</span>
      </div>`).join('')
      : '<div class="empty"><span class="big">💬</span>Nenhuma conversa iniciada.<br>Encontre talentos na busca ou no mural de jogos!</div>';
  };
  load();
  chatPoll = setInterval(load, 4000);
}

async function openChat(otherId, otherName) {
  clearInterval(chatPoll);
  clearInterval(eventsPoll);
  currentTab = 'chat';
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
  document.getElementById('nav-chat')?.classList.add('on');
  const c = $('#content');
  
  c.innerHTML = `
    <button class="back" onclick="showTab('chat')">‹ Conversas</button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <h2 style="font-size:18px;margin:0">💬 ${esc(otherName)}</h2>
      <button class="btn btn-outline btn-xs" style="margin-left:auto" onclick="renderProfile('${otherId}')">👤 Ver Perfil</button>
    </div>
    <div class="chat-box">
      <div class="chat-msgs" id="chat-msgs"></div>
      <div class="chat-input">
        <input id="chat-text" placeholder="Escreva sua mensagem…" onkeydown="if(event.key==='Enter')sendMsg('${otherId}')">
        <button onclick="sendMsg('${otherId}')">➤</button>
      </div>
    </div>`;

  const load = async () => {
    const msgs = await api('/messages/' + otherId);
    const el = $('#chat-msgs');
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    el.innerHTML = msgs.length ? msgs.map(m => `
      <div class="bubble ${m.fromId === ME.id ? 'me' : 'them'}">
        ${esc(m.text)}
        <span class="time">${new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>`).join('')
      : '<div class="empty">Diga olá e combine os lances! 👋⚽</div>';
    if (atBottom) el.scrollTop = el.scrollHeight;
  };
  load();
  chatPoll = setInterval(load, 3000);
  setTimeout(() => { $('#chat-text')?.focus(); }, 100);
}

async function sendMsg(otherId) {
  const inp = document.getElementById('chat-text');
  if (!inp || !inp.value.trim()) return;
  const text = inp.value.trim();
  inp.value = '';
  await api('/messages', { method: 'POST', body: { toId: otherId, text } });
  const msgsEl = $('#chat-msgs');
  if (msgsEl) {
    const b = document.createElement('div');
    b.className = 'bubble me';
    b.innerHTML = `${esc(text)}<span class="time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
    msgsEl.appendChild(b);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
}

// ============================================================
// PROPOSTAS DE CONTRATAÇÃO & JOGOS
// ============================================================
async function renderProps() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando propostas… 🤝</p>';
  const props = await api('/proposals');
  c.innerHTML = `
    <h2>Mensagens 💬</h2>
    <div class="subtabs">
      <button onclick="showTab('chat')">💬 Conversas</button>
      <button class="on" onclick="showTab('props')">🤝 Propostas</button>
    </div>
    <p class="sub">Contratações, convites e candidaturas para jogos.</p>
    ${props.length ? props.map(p => {
      const received = p.toId === ME.id;
      const other = received ? p.from : p.to;
      const mod = p.event ? (MODALITIES[p.event.modality] || MODALITIES.campo) : null;
      return `
      <div class="prop">
        <div class="top">
          <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="renderProfile('${other?.id}')">
            ${avatarHtml(other, 'md')}
            <div>
              <b>${received ? '📥 De' : '📤 Para'}: ${esc(other?.name || '?')} ${other?.verified ? '✅' : ''}</b>
              <div style="font-size:11.5px;color:var(--text-secondary)">${ROLES[other?.role]?.emoji || ''} ${esc(other?.position || '')} · OVR <span class="ovr-mini">${other?.overall || 60}</span></div>
            </div>
          </div>
          <span class="status ${p.status}">${p.status.toUpperCase()}</span>
        </div>
        
        ${p.event ? `<div class="pill ${mod ? mod.badgeClass : 'green'}" style="margin-bottom:6px">${mod ? mod.emoji : '⚽'} Jogo: ${esc(p.event.title)}</div>` : ''}
        ${p.position ? `<span class="pill green" style="margin-bottom:6px">🎯 Vaga: ${esc(p.position)}</span>` : ''}
        <span class="pill">${p.type === 'freela' || p.type === 'evento_candidatura' ? '⚡ Jogo / Vaga' : '📋 Contratação'}</span>
        <p>${esc(p.message || 'Sem mensagem.')}</p>

        <div class="row2 mt">
          <button class="btn btn-outline btn-sm" onclick="renderProfile('${other?.id}')">
            👤 Ver Perfil
          </button>
          <button class="btn btn-green btn-sm" onclick="openChat('${other?.id}', '${esc(other?.name || '')}')">
            💬 Conversar
          </button>
        </div>

        ${received && p.status === 'pendente' ? `
          <div class="row2 mt" style="margin-top:8px">
            <button class="btn btn-primary btn-sm" onclick="answerProp('${p.id}', 'aceita', '${other?.id}', '${esc(other?.name || '')}')">✅ Aceitar Proposta</button>
            <button class="btn btn-danger btn-sm" onclick="answerProp('${p.id}', 'recusada')">❌ Recusar</button>
          </div>` : ''}
      </div>`;
    }).join('') : '<div class="empty"><span class="big">🤝</span>Nenhuma proposta recebida ou enviada ainda.<br>Divulgue seus jogos ou envie propostas para outros craques!</div>'}`;
}

async function answerProp(id, status, otherId, otherName) {
  await api('/proposals/' + id, { method: 'PUT', body: { status } });
  toast(status === 'aceita' ? 'Proposta aceita! 🎉 O jogador foi escalado no time.' : 'Proposta recusada.');
  refreshBadges();
  // 💬 Aceitou a proposta? A conversa com a pessoa abre automaticamente.
  if (status === 'aceita' && otherId) openChat(otherId, otherName || '');
  else renderProps();
}

function openProposal(toId, toName) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>🤝 Enviar Proposta para ${esc(toName)}</h3>
      <label>Tipo de Proposta</label>
      <select id="pr-type">
        <option value="freela">⚡ Jogo avulso (diária / freela)</option>
        <option value="contratacao">📋 Contratação definitiva / Clube</option>
      </select>
      <label>Posição / Função sugerida</label>
      <select id="pr-pos">
        ${POSITIONS.map(p => `<option>${p}</option>`).join('')}
      </select>
      <label>Mensagem / Proposta</label>
      <textarea id="pr-msg" rows="3" placeholder="Ex: Fala chefe! Gostamos muito dos seus lances e queremos você jogando conosco nesta sexta às 20h."></textarea>
      <button class="btn btn-primary mt" id="pr-send">Enviar Proposta 📢</button>
      <button class="btn btn-outline mt" id="pr-cancel">Cancelar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#pr-cancel').onclick = () => bg.remove();
  bg.querySelector('#pr-send').onclick = async () => {
    try {
      await api('/proposals', {
        method: 'POST',
        body: {
          toId,
          type: bg.querySelector('#pr-type').value,
          position: bg.querySelector('#pr-pos').value,
          message: bg.querySelector('#pr-msg').value.trim()
        }
      });
      bg.remove();
      toast('Proposta enviada com sucesso! 🤝');
    } catch (e) { toast('Erro: ' + e.message); }
  };
  document.body.appendChild(bg);
}

// ============================================================
// AVALIAÇÕES & NOTIFICAÇÕES
// ============================================================
function openRating(toId, name) {
  let stars = 5;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>⭐ Avaliar ${esc(name)}</h3>
      <div class="star-pick" id="r-stars">${[1,2,3,4,5].map(i => `<span data-s="${i}" class="on">⭐</span>`).join('')}</div>
      <label>Comentário</label>
      <textarea id="r-comment" rows="2" placeholder="Ex: Jogou muito bem, pontual e comprometido!"></textarea>
      <button class="btn btn-primary mt" id="r-send">Enviar Avaliação</button>
      <button class="btn btn-outline mt" id="r-cancel">Cancelar</button>
    </div>`;
  bg.querySelectorAll('#r-stars span').forEach(s => s.onclick = () => {
    stars = +s.dataset.s;
    bg.querySelectorAll('#r-stars span').forEach(x => x.classList.toggle('on', +x.dataset.s <= stars));
  });
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#r-cancel').onclick = () => bg.remove();
  bg.querySelector('#r-send').onclick = async () => {
    await api('/ratings', { method: 'POST', body: { toId, stars, comment: $('#r-comment').value.trim() } });
    bg.remove();
    toast('Avaliação enviada com sucesso! ⭐');
    renderProfile(toId);
  };
  document.body.appendChild(bg);
}

async function renderNotifs() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando notificações… 🔔</p>';
  const notifs = await api('/notifications');
  c.innerHTML = `
    <button class="back" onclick="showTab('feed')">‹ Voltar</button>
    <h2>Notificações 🔔</h2>
    ${notifs.length ? notifs.map(n => `
      <div class="notif ${n.read ? '' : 'unread'}">
        ${esc(n.text)}
        <span class="when">${timeAgo(n.createdAt)} atrás</span>
      </div>`).join('')
      : '<div class="empty"><span class="big">🔔</span>Nenhuma notificação nova.</div>'}`;
  await api('/notifications/read', { method: 'POST' });
  refreshBadges();
}

// ============================================================
// PAINEL DO ADMINISTRADOR 🛡️ (Acesso Restrito)
// ============================================================
let adminSubTab = 'overview';
let _adminStats = null;
let _adminUsers = [];
let _adminUserRole = 'all';
let _adminUserSearch = '';
let _adminPosts = [];
let _adminPostCat = 'all';
let _adminPostType = 'all';
let _adminPostSearch = '';
let _adminEvents = [];
let _adminEventType = 'all';
let _adminEventModality = 'all';
let _adminEventSearch = '';
let _adminStories = [];
let _adminStoryType = 'all';

async function renderAdmin() {
  const c = $('#content');
  if (!ME || !ME.isAdmin) {
    c.innerHTML = `
      <div class="admin-locked">
        <span class="admin-locked-icon">🔒</span>
        <h2>Acesso Restrito</h2>
        <p class="sub">Esta área é exclusiva para administradores autorizados do Vitrine FC.</p>
        <div class="section" style="margin-top:20px;text-align:center">
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.6">
            Sua conta atual (<b>${esc(ME?.name || '')}</b>) não possui privilégios de administrador.<br>
            Apenas o administrador oficial cadastrado na plataforma tem permissão para gerenciar outros usuários.
          </p>
          <button class="btn btn-outline mt" onclick="showTab('feed')">🏠 Voltar ao Feed</button>
        </div>
      </div>`;
    return;
  }

  c.innerHTML = `
    <div class="admin-header">
      <h2>🛡️ Painel do Administrador</h2>
      <p class="sub">Gestão central de usuários, posts, eventos e moderação.</p>
      <button class="btn btn-outline btn-xs" onclick="openSecurityModal()">🔑 Minhas Credenciais</button>
    </div>
    <div class="admin-subnav">
      <button class="admin-subnav-btn ${adminSubTab === 'overview' ? 'active' : ''}" onclick="switchAdminSubTab('overview')">📊 Visão Geral</button>
      <button class="admin-subnav-btn ${adminSubTab === 'users' ? 'active' : ''}" onclick="switchAdminSubTab('users')">👥 Usuários</button>
      <button class="admin-subnav-btn ${adminSubTab === 'events' ? 'active' : ''}" onclick="switchAdminSubTab('events')">📍 Eventos</button>
      <button class="admin-subnav-btn ${adminSubTab === 'posts' ? 'active' : ''}" onclick="switchAdminSubTab('posts')">📸 Posts</button>
      <button class="admin-subnav-btn ${adminSubTab === 'stories' ? 'active' : ''}" onclick="switchAdminSubTab('stories')">📖 Stories</button>
    </div>
    <div id="admin-view"><p class="empty">Carregando painel… ⏳</p></div>`;

  await loadAdminSubView();
}

async function switchAdminSubTab(sub) {
  adminSubTab = sub;
  document.querySelectorAll('.admin-subnav-btn').forEach(b => b.classList.remove('active'));
  const btn = Array.from(document.querySelectorAll('.admin-subnav-btn')).find(b => b.getAttribute('onclick')?.includes(`'${sub}'`));
  if (btn) btn.classList.add('active');
  await loadAdminSubView();
}

async function loadAdminSubView() {
  const container = document.getElementById('admin-view');
  if (!container) return;
  container.innerHTML = '<p class="empty">Carregando… ⏳</p>';
  try {
    if (adminSubTab === 'overview') await renderAdminOverview(container);
    else if (adminSubTab === 'users') await renderAdminUsers(container);
    else if (adminSubTab === 'events') await renderAdminEvents(container);
    else if (adminSubTab === 'posts') await renderAdminPosts(container);
    else if (adminSubTab === 'stories') await renderAdminStories(container);
  } catch (e) {
    container.innerHTML = `<div class="empty"><span class="big">⚠️</span>Erro ao carregar: ${esc(e.message)}</div>`;
  }
}

// ---- Sub-aba 1: Visão Geral ----
async function renderAdminOverview(c) {
  const [s, cloudStatus] = await Promise.all([
    api('/admin/stats'),
    api('/admin/cloud-status').catch(() => ({ enabled: false }))
  ]);
  _adminStats = s;

  const cloudBox = cloudStatus.enabled ? `
    <div class="section" style="border-left:4px solid var(--neon-green)">
      <h4>🟢 Sincronização em Nuvem ATIVA</h4>
      <p class="sub" style="margin-bottom:10px">Seus dados e cadastros estão salvos na nuvem (<b>${esc(cloudStatus.repo)}</b>) e compartilhados em todos os Wi-Fi e celulares.</p>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
        Status: <b>${esc(cloudStatus.bootStatus?.cloud || 'Ativo')}</b> · Origem dos dados: <b>${esc(cloudStatus.bootStatus?.source || 'nuvem')}</b>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-green btn-sm" onclick="adminSyncCloudNow()">🔄 Sincronizar Agora com a Nuvem</button>
        <button class="btn btn-outline btn-sm" onclick="adminDownloadBackup()">⬇️ Baixar Backup JSON</button>
        <button class="btn btn-outline btn-sm" onclick="adminUploadBackupPrompt()">⬆️ Restaurar de JSON</button>
      </div>
    </div>
  ` : `
    <div class="section" style="border-left:4px solid var(--gold)">
      <h4>⚠️ Banco em Nuvem Não Configurado (Modo Temporário)</h4>
      <p class="sub" style="margin-bottom:10px">Atenção: No plano grátis do Render, sem a nuvem ativada os cadastros somem ao reiniciar. Digite seu GitHub Token e Repositório abaixo para ativar em 1 clique:</p>
      
      <div style="background:rgba(251,191,36,0.06);border:1px dashed var(--border-gold);border-radius:12px;padding:12px;margin-bottom:12px">
        <label style="font-weight:700">1. GitHub Token (com permissão 'repo')</label>
        <input id="ac-token" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
        <label style="font-weight:700;margin-top:8px">2. Repositório Privado no GitHub</label>
        <input id="ac-repo" placeholder="seu-usuario/vitrinefc-dados">
        <div id="ac-err" class="err"></div>
        <button class="btn btn-primary btn-sm mt" style="width:100%" onclick="adminSaveCloudConfig()">⚡ Salvar e Ativar Sincronização em Nuvem</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="adminDownloadBackup()">⬇️ Baixar Backup JSON Local</button>
        <button class="btn btn-outline btn-sm" onclick="adminUploadBackupPrompt()">⬆️ Restaurar de JSON</button>
      </div>
    </div>
  `;

  c.innerHTML = `
    ${cloudBox}
    <div class="admin-stats-grid">
      <div class="admin-stat-card" onclick="switchAdminSubTab('users')" style="cursor:pointer">
        <div class="stat-icon">👥</div>
        <div class="stat-num">${s.users.total}</div>
        <div class="stat-lbl">Usuários Totais</div>
        <div class="stat-extra">👑 ${s.users.admins} Admins · ✅ ${s.users.verified} Verificados</div>
      </div>
      <div class="admin-stat-card" onclick="switchAdminSubTab('events')" style="cursor:pointer">
        <div class="stat-icon">📍</div>
        <div class="stat-num">${s.events.total}</div>
        <div class="stat-lbl">Jogos & Peneiras</div>
        <div class="stat-extra">🌿 ${s.events.campo || 0} Campo · 🏟️ ${s.events.society || 0} Society · ⚡ ${s.events.quadra || 0} Quadra</div>
      </div>
      <div class="admin-stat-card" onclick="switchAdminSubTab('posts')" style="cursor:pointer">
        <div class="stat-icon">📸</div>
        <div class="stat-num">${s.posts.total}</div>
        <div class="stat-lbl">Publicações</div>
        <div class="stat-extra">🎥 ${s.posts.video} Vídeos · ❤️ ${s.posts.likes} Curtidas</div>
      </div>
      <div class="admin-stat-card" onclick="switchAdminSubTab('stories')" style="cursor:pointer">
        <div class="stat-icon">📖</div>
        <div class="stat-num">${s.stories.total}</div>
        <div class="stat-lbl">Stories Ativos</div>
        <div class="stat-extra">👀 ${s.stories.views} visualizações</div>
      </div>
    </div>

    <div class="section">
      <h4>⚡ Ações Rápidas de Gestão</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="switchAdminSubTab('users')">👥 Gerenciar Usuários</button>
        <button class="btn btn-outline btn-sm" onclick="switchAdminSubTab('events')">📍 Gerenciar Eventos</button>
        <button class="btn btn-outline btn-sm" onclick="switchAdminSubTab('posts')">📸 Moderar Posts</button>
        <button class="btn btn-outline btn-sm" onclick="switchAdminSubTab('stories')">📖 Limpar Stories</button>
      </div>
    </div>`;
}

async function adminSyncCloudNow() {
  toast('Sincronizando banco de dados com a nuvem… ⏳');
  try {
    const res = await api('/admin/cloud-sync-now', { method: 'POST' });
    toast('✅ ' + res.message);
    switchAdminSubTab('overview');
  } catch (e) { toast('Erro: ' + e.message); }
}

async function adminSaveCloudConfig() {
  const token = document.getElementById('ac-token')?.value.trim();
  const repo = document.getElementById('ac-repo')?.value.trim();
  const err = document.getElementById('ac-err');
  if (err) err.textContent = '';
  if (!token || !repo) {
    if (err) err.textContent = 'Informe o Token e o Repositório do GitHub.';
    return;
  }
  toast('Validando e sincronizando com o GitHub… ⏳');
  try {
    const res = await api('/admin/cloud-config', { method: 'POST', body: { token, repo } });
    toast('🎉 ' + res.message);
    switchAdminSubTab('overview');
  } catch (e) {
    if (err) err.textContent = e.message;
    else toast('Erro: ' + e.message);
  }
}

function adminDownloadBackup() {
  window.open('/api/admin/backup-download', '_blank');
  toast('Download do backup iniciado! 💾');
}

function adminUploadBackupPrompt() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      toast('Enviando e aplicando backup… ⏳');
      const res = await api('/admin/backup-upload', { method: 'POST', body: parsed });
      toast('✅ ' + res.message);
      switchAdminSubTab('overview');
    } catch (e) { toast('Erro ao ler ou restaurar backup: ' + e.message); }
  };
  inp.click();
}

// ---- Sub-aba 2: Usuários (Com controle de Admin) ----
async function renderAdminUsers(c) {
  _adminUsers = await api('/admin/users');
  c.innerHTML = `
    <div class="admin-search-box">
      <input id="au-search" placeholder="🔍 Buscar por nome, email ou cidade…" value="${esc(_adminUserSearch)}" oninput="_adminUserSearch=this.value; drawAdminUsersList();">
    </div>
    <div class="admin-filter-bar">
      <button class="admin-pill ${_adminUserRole === 'all' ? 'on' : ''}" onclick="_adminUserRole='all'; drawAdminUsersList();">Todos (${_adminUsers.length})</button>
      <button class="admin-pill ${_adminUserRole === 'admin' ? 'on' : ''}" onclick="_adminUserRole='admin'; drawAdminUsersList();">🛡️ Admins</button>
      <button class="admin-pill ${_adminUserRole === 'verified' ? 'on' : ''}" onclick="_adminUserRole='verified'; drawAdminUsersList();">✅ Verificados</button>
      <button class="admin-pill ${_adminUserRole === 'jogador' ? 'on' : ''}" onclick="_adminUserRole='jogador'; drawAdminUsersList();">🏃 Jogadores</button>
      <button class="admin-pill ${_adminUserRole === 'goleiro' ? 'on' : ''}" onclick="_adminUserRole='goleiro'; drawAdminUsersList();">🧤 Goleiros</button>
      <button class="admin-pill ${_adminUserRole === 'tecnico' ? 'on' : ''}" onclick="_adminUserRole='tecnico'; drawAdminUsersList();">📋 Técnicos</button>
      <button class="admin-pill ${_adminUserRole === 'arbitro' ? 'on' : ''}" onclick="_adminUserRole='arbitro'; drawAdminUsersList();">🟨 Árbitros</button>
      <button class="admin-pill ${_adminUserRole === 'olheiro' ? 'on' : ''}" onclick="_adminUserRole='olheiro'; drawAdminUsersList();">🔎 Olheiros</button>
    </div>
    <div id="au-list-container"></div>`;
  drawAdminUsersList();
}

function drawAdminUsersList() {
  const container = document.getElementById('au-list-container');
  if (!container) return;
  let list = _adminUsers;
  if (_adminUserRole === 'admin') list = list.filter(u => u.isAdmin);
  else if (_adminUserRole === 'verified') list = list.filter(u => u.verified);
  else if (_adminUserRole !== 'all') list = list.filter(u => u.role === _adminUserRole);

  if (_adminUserSearch.trim()) {
    const q = _adminUserSearch.trim().toLowerCase();
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q)
    );
  }

  document.querySelectorAll('.admin-filter-bar .admin-pill').forEach(b => {
    const isRole = b.getAttribute('onclick')?.includes(`'${_adminUserRole}'`);
    b.classList.toggle('on', !!isRole);
  });

  if (!list.length) {
    container.innerHTML = `<div class="empty"><span class="big">👥</span>Nenhum usuário encontrado.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-count-bar">
      <span>Exibindo <b>${list.length}</b> de ${_adminUsers.length} usuários</span>
    </div>
    ${list.map(u => {
      const isMainAdmin = u.id === 'admin_vitrine' || (u.email || '').toLowerCase() === 'admin@vitrinefc.com';
      return `
      <div class="admin-card" id="auc-${u.id}">
        <div class="admin-card-head">
          <button class="admin-avatar-btn" onclick="renderProfile('${u.id}')" title="Ver perfil de ${esc(u.name)}">
            ${avatarHtml(u, 'md')}
            <span class="admin-avatar-hint">👁️</span>
          </button>
          <div class="who">
            <b>${esc(u.name)} ${u.nickname ? `("${esc(u.nickname)}")` : ''}</b>
            <span>${esc(u.email)}</span>
            <div class="admin-badge-row">
              <span class="badge-role">${ROLES[u.role]?.emoji || '⚽'} ${ROLES[u.role]?.label || u.role}</span>
              ${u.isAdmin ? '<span class="badge-admin">🛡️ Admin</span>' : ''}
              ${u.verified ? '<span class="badge-verified">✅ Verificado</span>' : ''}
              ${u.position ? `<span class="badge-role">${esc(u.position)}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:8px;line-height:1.5">
          ${u.city ? `📍 ${esc(u.city)}${u.state ? '/' + esc(u.state) : ''} · ` : ''}
          Cadastrado ${timeAgo(u.createdAt)} · <b>${u.postsCount || 0}</b> post(s) · <b>${u.eventsCount || 0}</b> evento(s) · OVR <b>${u.overall}</b>
        </div>
        <div class="admin-actions">
          <button class="btn btn-outline" onclick="renderProfile('${u.id}')">👁️ Perfil</button>
          ${!isMainAdmin ? `
            <button class="btn ${u.isAdmin ? 'btn-danger' : 'btn-primary'}" onclick="adminToggleUserAdmin('${u.id}', ${!u.isAdmin})">
              ${u.isAdmin ? 'Remover Admin' : '👑 Tornar Admin'}
            </button>` : `<span style="font-size:11px;color:var(--gold);font-weight:800;align-self:center">👑 Admin Principal</span>`}
          <button class="btn btn-green" onclick="adminToggleUserVerified('${u.id}', ${!u.verified})">
            ${u.verified ? 'Remover Selo' : '✅ Verificar'}
          </button>
          ${!isMainAdmin && u.id !== ME.id ? `
            <button class="btn btn-danger" onclick="adminDeleteUser('${u.id}', '${esc(u.name)}')">🗑️ Excluir</button>` : ''}
        </div>
      </div>`;
    }).join('')}`;
}

async function adminToggleUserAdmin(userId, makeAdmin) {
  try {
    const updated = await api('/admin/users/' + userId, { method: 'PUT', body: { isAdmin: makeAdmin } });
    const u = _adminUsers.find(x => x.id === userId);
    if (u) u.isAdmin = updated.isAdmin;
    toast(makeAdmin ? 'Usuário promovido a Administrador! 👑' : 'Acesso de administrador removido.');
    drawAdminUsersList();
  } catch (e) { toast('Erro: ' + e.message); }
}

async function adminToggleUserVerified(userId, verify) {
  try {
    const updated = await api('/admin/users/' + userId, { method: 'PUT', body: { verified: verify } });
    const u = _adminUsers.find(x => x.id === userId);
    if (u) u.verified = updated.verified;
    toast(verify ? 'Selo de verificado concedido! ✅' : 'Selo removido.');
    drawAdminUsersList();
  } catch (e) { toast('Erro: ' + e.message); }
}

async function adminDeleteUser(userId, userName) {
  if (!confirm(`Excluir permanentemente o usuário "${userName}" e todos os seus lances e eventos?`)) return;
  try {
    await api('/admin/users/' + userId, { method: 'DELETE' });
    _adminUsers = _adminUsers.filter(u => u.id !== userId);
    toast('Usuário excluído! 🗑️');
    drawAdminUsersList();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ---- Sub-aba 3: Eventos (com modalidades) ----
async function renderAdminEvents(c) {
  _adminEvents = await api('/admin/events');
  c.innerHTML = `
    <div class="admin-search-box">
      <input id="ae-search" placeholder="🔍 Buscar eventos por título, cidade ou local…" value="${esc(_adminEventSearch)}" oninput="_adminEventSearch=this.value; drawAdminEventsList();">
    </div>
    <div class="admin-filter-bar">
      <button class="admin-pill ${_adminEventModality === 'all' ? 'on' : ''}" onclick="_adminEventModality='all'; drawAdminEventsList();">Todas Modalidades (${_adminEvents.length})</button>
      <button class="admin-pill ${_adminEventModality === 'campo' ? 'on' : ''}" onclick="_adminEventModality='campo'; drawAdminEventsList();">🌿 Campo</button>
      <button class="admin-pill ${_adminEventModality === 'society' ? 'on' : ''}" onclick="_adminEventModality='society'; drawAdminEventsList();">🏟️ Society</button>
      <button class="admin-pill ${_adminEventModality === 'quadra' ? 'on' : ''}" onclick="_adminEventModality='quadra'; drawAdminEventsList();">⚡ Quadra</button>
    </div>
    <div id="ae-list-container"></div>`;
  drawAdminEventsList();
}

function drawAdminEventsList() {
  const container = document.getElementById('ae-list-container');
  if (!container) return;
  let list = _adminEvents;
  if (_adminEventModality !== 'all') list = list.filter(e => (e.modality || 'campo') === _adminEventModality);

  if (_adminEventSearch.trim()) {
    const q = _adminEventSearch.trim().toLowerCase();
    list = list.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      (e.place || '').toLowerCase().includes(q) ||
      (e.creator?.name || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    container.innerHTML = `<div class="empty"><span class="big">📍</span>Nenhum evento encontrado.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-count-bar">
      <span>Exibindo <b>${list.length}</b> de ${_adminEvents.length} eventos</span>
    </div>
    ${list.map(e => {
      const mod = MODALITIES[e.modality] || MODALITIES.campo;
      return `
      <div class="admin-card" id="aec-${e.id}">
        <div class="admin-card-head">
          <div style="font-size:24px">${mod.emoji}</div>
          <div class="who">
            <b>${esc(e.title)}</b>
            <span>${mod.name} · 📅 ${new Date(e.date).toLocaleString('pt-BR')}</span>
          </div>
          <span class="badge-role">${e.type === 'peneira' ? '🥅 Peneira' : '⚽ Jogo'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.5">
          📍 ${esc(e.place ? e.place + ' — ' : '')}${esc(e.city)}${e.state ? '/' + esc(e.state) : ''}<br>
          Organizador: <b>${esc(e.creator?.name || '?')}</b> · 🙋 <b>${(e.participants || []).length}</b> escalados
          ${e.neededPositions && e.neededPositions.length ? `<br>🎯 Vagas: ${e.neededPositions.map(p => esc(p)).join(', ')}` : ''}
        </div>
        <div class="admin-actions">
          <button class="btn btn-outline" onclick="openEventParticipantsModal('${e.id}', '${esc(e.title)}')">👥 Ver Escalados (${(e.participants || []).length})</button>
          <button class="btn btn-danger" onclick="adminDeleteEvent('${e.id}', '${esc(e.title)}')">🗑️ Excluir Evento</button>
        </div>
      </div>`;
    }).join('')}`;
}

async function adminDeleteEvent(id, title) {
  if (!confirm(`Excluir o evento "${title}"?`)) return;
  try {
    await api('/admin/events/' + id, { method: 'DELETE' });
    _adminEvents = _adminEvents.filter(e => e.id !== id);
    toast('Evento excluído! 🗑️');
    drawAdminEventsList();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ---- Sub-aba 4: Posts ----
async function renderAdminPosts(c) {
  _adminPosts = await api('/admin/posts');
  c.innerHTML = `
    <div class="admin-search-box">
      <input id="ap-search" placeholder="🔍 Buscar por legenda ou autor…" value="${esc(_adminPostSearch)}" oninput="_adminPostSearch=this.value; drawAdminPostsList();">
    </div>
    <div class="admin-filter-bar">
      <button class="admin-pill ${_adminPostCat === 'all' ? 'on' : ''}" onclick="_adminPostCat='all'; drawAdminPostsList();">Todos (${_adminPosts.length})</button>
      <button class="admin-pill ${_adminPostCat === 'profissional' ? 'on' : ''}" onclick="_adminPostCat='profissional'; drawAdminPostsList();">🏆 Profissional</button>
      <button class="admin-pill ${_adminPostCat === 'pelada' ? 'on' : ''}" onclick="_adminPostCat='pelada'; drawAdminPostsList();">🎉 Pelada</button>
    </div>
    <div id="ap-list-container"></div>`;
  drawAdminPostsList();
}

function drawAdminPostsList() {
  const container = document.getElementById('ap-list-container');
  if (!container) return;
  let list = _adminPosts;
  if (_adminPostCat === 'profissional') list = list.filter(p => p.category === 'profissional');
  else if (_adminPostCat === 'pelada') list = list.filter(p => p.category !== 'profissional');

  if (_adminPostSearch.trim()) {
    const q = _adminPostSearch.trim().toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.user?.name || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    container.innerHTML = `<div class="empty"><span class="big">📸</span>Nenhum post encontrado.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-count-bar">
      <span>Exibindo <b>${list.length}</b> de ${_adminPosts.length} posts</span>
    </div>
    ${list.map(p => `
      <div class="admin-card" id="apc-${p.id}">
        <div class="admin-card-head">
          ${avatarHtml(p.user)}
          <div class="who">
            <b>${esc(p.user?.name || '?')}</b>
            <span>${p.category === 'profissional' ? '🏆 Profissional' : '🎉 Pelada'} · ${timeAgo(p.createdAt)}</span>
          </div>
        </div>
        <div class="admin-media-box">
          ${p.type === 'video' ? `<video src="${esc(p.url)}" controls playsinline></video>` : `<img src="${esc(p.url)}" alt="">`}
        </div>
        <p style="font-size:13px;margin:8px 0;line-height:1.4"><b>${esc(p.title)}</b>${p.description ? ' — ' + esc(p.description) : ''}</p>
        <div class="admin-actions">
          <button class="btn btn-outline" onclick="openMediaModal('${p.id}')">👁️ Ver Post</button>
          <button class="btn btn-danger" onclick="adminDeletePost('${p.id}')">🗑️ Excluir Post</button>
        </div>
      </div>`).join('')}`;
}

async function adminDeletePost(id) {
  if (!confirm('Excluir este post?')) return;
  try {
    await api('/admin/posts/' + id, { method: 'DELETE' });
    _adminPosts = _adminPosts.filter(p => p.id !== id);
    toast('Post excluído! 🗑️');
    drawAdminPostsList();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ---- Sub-aba 5: Stories ----
async function renderAdminStories(c) {
  _adminStories = await api('/admin/stories');
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin:0;font-size:14px;color:var(--gold)">📖 Stories Ativos (${_adminStories.length})</h4>
      <button class="btn btn-danger btn-xs" onclick="adminPurgeExpiredStories()">🧹 Limpar Expirados</button>
    </div>
    <div id="as-list-container"></div>`;
  drawAdminStoriesList();
}

function drawAdminStoriesList() {
  const container = document.getElementById('as-list-container');
  if (!container) return;
  if (!_adminStories.length) {
    container.innerHTML = `<div class="empty"><span class="big">📖</span>Nenhum story ativo nas últimas 24h.</div>`;
    return;
  }
  container.innerHTML = _adminStories.map(s => `
    <div class="admin-card">
      <div class="admin-card-head">
        ${avatarHtml(s.user)}
        <div class="who">
          <b>${esc(s.user?.name || '?')}</b>
          <span>Postado ${timeAgo(s.createdAt)} · 👀 ${s.viewersCount} views</span>
        </div>
      </div>
      <div class="admin-media-box">
        ${s.type === 'video' ? `<video src="${esc(s.url)}" controls playsinline></video>` : `<img src="${esc(s.url)}" alt="">`}
      </div>
      <div class="admin-actions">
        <button class="btn btn-danger" onclick="adminDeleteStory('${s.id}')">🗑️ Excluir Story</button>
      </div>
    </div>`).join('');
}

async function adminDeleteStory(id) {
  if (!confirm('Excluir este story?')) return;
  try {
    await api('/admin/stories/' + id, { method: 'DELETE' });
    _adminStories = _adminStories.filter(s => s.id !== id);
    toast('Story excluído! 🗑️');
    drawAdminStoriesList();
  } catch (e) { toast('Erro: ' + e.message); }
}

async function adminPurgeExpiredStories() {
  try {
    const res = await api('/admin/stories/purge-expired', { method: 'POST' });
    toast(`Stories limpos: ${res.purged} expirado(s) removido(s)! 🧹`);
    _adminStories = await api('/admin/stories');
    drawAdminStoriesList();
  } catch (e) { toast('Erro: ' + e.message); }
}

// ============================================================
// CANVAS CARD FIFA & PDF RESUME
// ============================================================
function loadImg(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

async function drawFifaCard(u, achievements) {
  const W = 640, H = 900;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const isGK = isGoalkeeper(u);
  const st = u.stats || {};

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#fcd34d'); g.addColorStop(0.45, '#f59e0b'); g.addColorStop(1, '#b45309');
  x.beginPath();
  x.moveTo(60, 30); x.lineTo(W - 60, 30); x.quadraticCurveTo(W - 30, 30, W - 30, 70);
  x.lineTo(W - 30, 700); x.quadraticCurveTo(W - 30, 760, W / 2, 870);
  x.quadraticCurveTo(30, 760, 30, 700); x.lineTo(30, 70); x.quadraticCurveTo(30, 30, 60, 30);
  x.closePath(); x.fillStyle = g; x.fill();
  x.lineWidth = 6; x.strokeStyle = '#78350f'; x.stroke();

  x.fillStyle = 'rgba(6, 28, 20, 0.25)';
  x.fillRect(30, 430, W - 60, 6);

  const dark = '#261601';
  x.fillStyle = dark; x.textAlign = 'left';
  x.font = '900 110px Arial'; x.fillText(u.overall || 60, 65, 175);
  x.font = '900 44px Arial'; x.fillText(POS_ABBR[u.position] || (u.position || '?').slice(0, 3).toUpperCase(), 72, 228);
  x.font = '700 26px Arial'; x.fillText(nationalityCode(u), 78, 268);

  try {
    const img = await loadImg(u.photo || '/img/logo.png');
    x.save();
    x.beginPath(); x.arc(390, 250, 160, 0, Math.PI * 2); x.clip();
    const s = Math.max(320 / img.width, 320 / img.height);
    x.drawImage(img, 390 - img.width * s / 2, 250 - img.height * s / 2, img.width * s, img.height * s);
    x.restore();
    x.beginPath(); x.arc(390, 250, 160, 0, Math.PI * 2);
    x.lineWidth = 8; x.strokeStyle = '#78350f'; x.stroke();
  } catch {}

  try {
    const logo = await loadImg('/img/logo.png');
    x.drawImage(logo, 60, 300, 72, 72);
  } catch {}

  x.textAlign = 'center'; x.fillStyle = dark;
  const name = (u.nickname || u.name || '').toUpperCase();
  x.font = `900 ${name.length > 14 ? 38 : 50}px Arial`;
  x.fillText(name, W / 2, 505);

  let stats;
  if (hasFifaAttrs(u)) {
    const f = u.fifa || {};
    stats = (isGK ? FIFA_ATTRS_GK : FIFA_ATTRS).map(a => [a.label, f[a.key] || 60]);
  } else {
    stats = isGK ? [
      ['JOG', st.jogos || 0], ['DEF', st.defesas || 0], ['PEN', st.penaltisDefendidos || 0],
      ['TIT', st.titulos || 0], ['⭐', u.ratingAvg || '—'], ['SEG', u.followers || 0]
    ] : [
      ['JOG', st.jogos || 0], ['GOL', st.gols || 0], ['ASS', st.assistencias || 0],
      ['TIT', st.titulos || 0], ['⭐', u.ratingAvg || '—'], ['SEG', u.followers || 0]
    ];
  }
  x.textAlign = 'left';
  stats.forEach(([label, val], i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const sx = 105 + col * 260, sy = 585 + row * 62;
    x.font = '900 40px Arial'; x.fillStyle = dark;
    x.fillText(String(val), sx, sy);
    x.font = '700 26px Arial'; x.fillStyle = '#78350f';
    x.fillText(label, sx + 105, sy);
  });
  x.fillStyle = 'rgba(38, 22, 1, 0.35)'; x.fillRect(W / 2 - 1, 560, 2, 180);

  x.textAlign = 'center';
  const clubParts = [];
  if (u.club) clubParts.push(String(u.club).toUpperCase());
  if (u.shirtNumber) clubParts.push('Nº ' + u.shirtNumber);
  if (clubParts.length) {
    x.font = '900 30px Arial'; x.fillStyle = dark;
    x.fillText(clubParts.join(' · '), W / 2, 778);
  }

  x.font = '700 22px Arial'; x.fillStyle = '#78350f';
  const medals = (achievements || []).filter(a => a.earned).slice(0, 5).map(a => a.emoji).join(' ');
  x.fillText(`${medals}  VITRINE FC  ⚽`, W / 2, 815);
  return cv;
}

async function openFifaCard() {
  const { user: u, achievements } = window._lastProfile || {};
  if (!u) return;
  toast('Gerando seu card FIFA… 🃏');
  const cv = await drawFifaCard(u, achievements);
  const url = cv.toDataURL('image/png');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.style.alignItems = 'center';
  bg.innerHTML = `
    <div class="modal" style="border-radius:24px;text-align:center">
      <h3>🃏 Card de ${esc(u.nickname || u.name)}</h3>
      <img src="${url}" style="width:100%;max-width:320px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.8)">
      <a class="btn btn-primary mt" style="display:block;text-decoration:none" href="${url}" download="card-vitrinefc-${esc((u.nickname || u.name).replace(/\s+/g, '-').toLowerCase())}.png">⬇️ Baixar Card</a>
      <button class="btn btn-outline mt" id="fc-close">Fechar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#fc-close').onclick = () => bg.remove();
  document.body.appendChild(bg);
}

// ---------- Corpo do currículo/PDF: específico por tipo de usuário ----------
function resumeBodyHtml(u) {
  const st = u.stats || {};
  const kind = roleKind(u);
  const table = (heads, cells) => `<table><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr><tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr></table>`;

  if (kind === 'tecnico') {
    const cats = arrVal(u.coachCategories);
    return `
      <h2>📋 Dados do Treinador</h2>
      <p>
        ${u.position ? `Função: <b>${esc(u.position)}</b> · ` : ''}
        ${u.level ? `Nível: <b>${esc(u.level)}</b> · ` : ''}
        ${u.experienceYears ? `Experiência: <b>${u.experienceYears} anos</b> · ` : ''}
        ${u.licenses ? `Licença: <b>${esc(u.licenses)}</b>` : ''}
      </p>
      <p>
        ${u.playstyle ? `Estilo de jogo: <b>${esc(u.playstyle)}</b> · ` : ''}
        ${u.club ? `Equipe atual: <b>${esc(u.club)}</b> · ` : ''}
        ${u.fee ? `Pretensão: <b>${esc(u.fee)}</b>` : ''}
      </p>
      ${cats.length ? `<p>Categorias: ${cats.map(c => `<span class="pill">${esc(c)}</span>`).join(' ')}</p>` : ''}
      ${u.teams ? `<p>Onde já trabalhou: <b>${esc(u.teams)}</b></p>` : ''}
      ${u.strengths ? `<p>Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
      ${u.methodology ? `<h2>🎓 Metodologia &amp; Formação</h2><p>${esc(u.methodology)}</p>` : ''}
      ${u.bio ? `<h2>📖 Sobre</h2><p>${esc(u.bio)}</p>` : ''}
      <h2>📈 Números no Banco</h2>
      ${table(['Jogos', 'Vitórias', 'Empates', 'Títulos', 'Acessos', 'Média ⭐'],
        [st.jogos || 0, st.vitorias || 0, st.empates || 0, st.titulos || 0, st.acessos || 0, u.ratingAvg || '—'])}`;
  }

  if (kind === 'arbitro') {
    const mods = arrVal(u.modalities);
    return `
      <h2>🟨 Dados do Árbitro</h2>
      <p>
        ${u.position ? `Função: <b>${esc(u.position)}</b> · ` : ''}
        ${u.level ? `Quadro: <b>${esc(u.level)}</b> · ` : ''}
        ${u.experienceYears ? `Experiência: <b>${u.experienceYears} anos</b> · ` : ''}
        ${u.refEntity ? `Entidade: <b>${esc(u.refEntity)}</b>` : ''}
      </p>
      <p>
        ${u.refRegions ? `Atua em: <b>${esc(u.refRegions)}</b> · ` : ''}
        ${u.fee ? `Taxa por jogo: <b>${esc(u.fee)}</b>` : ''}
      </p>
      ${mods.length ? `<p>Modalidades: ${mods.map(c => `<span class="pill">${esc(c)}</span>`).join(' ')}</p>` : ''}
      ${u.strengths ? `<p>Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
      ${u.bio ? `<h2>📖 Sobre</h2><p>${esc(u.bio)}</p>` : ''}
      <h2>📊 Números do Apito</h2>
      ${table(['Jogos', 'Amarelos', 'Vermelhos', 'Pênaltis', 'Finais', 'Média ⭐'],
        [st.jogos || 0, st.amarelos || 0, st.vermelhos || 0, st.penaltisMarcados || 0, st.finais || 0, u.ratingAvg || '—'])}`;
  }

  if (kind === 'olheiro') {
    const mods = arrVal(u.modalities);
    const contato = [u.contactPhone, u.contactInstagram, u.contactEmail || u.email].filter(Boolean).map(esc).join(' · ');
    return `
      <h2>🔎 Quem é este olheiro</h2>
      <p>
        ${u.club ? `Clube / Empresa: <b>${esc(u.club)}</b> · ` : ''}
        ${u.scoutRole ? `Cargo: <b>${esc(u.scoutRole)}</b> · ` : ''}
        ${u.city ? `Base: <b>${esc(u.city)}${u.state ? '/' + esc(u.state) : ''}</b>` : ''}
      </p>
      <p>
        ${u.scoutRegions ? `Regiões que avalia: <b>${esc(u.scoutRegions)}</b> · ` : ''}
        ${u.scoutPositions ? `Posições que busca: <b>${esc(u.scoutPositions)}</b>` : ''}
      </p>
      ${mods.length ? `<p>Modalidades: ${mods.map(c => `<span class="pill">${esc(c)}</span>`).join(' ')}</p>` : ''}
      ${contato ? `<p>Contato: <b>${contato}</b></p>` : ''}
      ${u.bio ? `<h2>📖 Sobre</h2><p>${esc(u.bio)}</p>` : ''}`;
  }

  // jogador / goleiro
  const isGK = isGoalkeeper(u);
  return `
    <h2>📋 Dados do Atleta</h2>
    <p>
      ${u.age ? `Idade: <b>${u.age} anos</b> · ` : ''}
      ${u.height ? `Altura: <b>${u.height} cm</b> · ` : ''}
      ${u.weight ? `Peso: <b>${u.weight} kg</b> · ` : ''}
      ${u.foot ? `Perna boa: <b>${esc(u.foot)}</b> · ` : ''}
      ${u.fee ? `Cachê: <b>${esc(u.fee)}</b>` : ''}
    </p>
    <p>
      ${u.nationality ? `Nacionalidade: <b>${esc(u.nationality)}</b> · ` : ''}
      ${u.birthdate ? `Nascimento: <b>${fmtDateBR(u.birthdate)}</b> · ` : ''}
      ${u.club ? `Clube atual: <b>${esc(u.club)}</b> · ` : ''}
      ${u.shirtNumber ? `Camisa: <b>nº ${esc(u.shirtNumber)}</b>` : ''}
    </p>
    ${u.teams ? `<p>Times: <b>${esc(u.teams)}</b></p>` : ''}
    ${u.strengths ? `<p>Pontos fortes: <b>${esc(u.strengths)}</b></p>` : ''}
    ${u.bio ? `<h2>📖 História no Futebol</h2><p>${esc(u.bio)}</p>` : ''}
    <h2>📊 Estatísticas de Carreira</h2>
    ${table(['Jogos', isGK ? 'Defesas' : 'Gols', isGK ? 'Pênaltis Pegos' : 'Assistências', 'Títulos', 'Média ⭐', 'Seguidores'],
      [st.jogos || 0, isGK ? (st.defesas || 0) : (st.gols || 0), isGK ? (st.penaltisDefendidos || 0) : (st.assistencias || 0), st.titulos || 0, u.ratingAvg || '—', u.followers || 0])}`;
}

function resumeDocName(u) {
  const k = roleKind(u);
  return k === 'tecnico' ? 'Portfólio' : k === 'arbitro' ? 'Súmula do Árbitro' : k === 'olheiro' ? 'Cartão de Visita' : 'Currículo';
}

function openResumePdf() {
  const { user: u, achievements } = window._lastProfile || {};
  if (!u) return;
  const earned = (achievements || []).filter(a => a.earned);
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>${resumeDocName(u)} — ${esc(u.name)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; background: #fff; }
      .head { display: flex; gap: 22px; align-items: center; border-bottom: 4px solid #059669; padding-bottom: 18px; }
      .head img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid #fbbf24; }
      h1 { margin: 0; color: #059669; font-size: 28px; }
      .nick { color: #b45309; font-weight: bold; }
      .meta { color: #475569; font-size: 14px; margin-top: 4px; }
      h2 { color: #059669; font-size: 17px; border-bottom: 2px solid #fbbf24; padding-bottom: 4px; margin: 22px 0 8px; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; }
      td, th { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 14px; text-align: center; }
      th { background: #059669; color: #fff; }
      p { font-size: 14px; line-height: 1.5; color: #334155; }
      .pill { display: inline-block; background: #ecfdf5; border: 1px solid #059669; color: #059669; border-radius: 999px; padding: 3px 12px; font-size: 13px; margin: 2px; }
      .foot { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      @media print { .noprint { display: none; } }
    </style></head><body>
      <div class="head">
        <img src="${u.photo || '/img/logo.png'}">
        <div>
          <h1>${esc(u.name)} ${u.nickname ? `<span class="nick">"${esc(u.nickname)}"</span>` : ''}</h1>
          <div class="meta">${ROLES[u.role]?.label || ''} · ${esc(u.position || '')}${roleKind(u) === 'olheiro' ? '' : ` · ${roleKind(u) === 'jogador' ? 'Nota Geral OVR' : 'Nível'}: <b>${u.overall}</b>`}</div>
          <div class="meta">${u.city ? '📍 ' + esc(u.city) + '/' + esc(u.state || '') : ''} ${u.level ? '· Nível: ' + esc(u.level) : ''} · Contato: ${esc(u.email)}</div>
        </div>
      </div>
      ${resumeBodyHtml(u)}
      ${earned.length ? `<h2>🏅 Medalhas Conquistadas</h2><p>${earned.map(a => `<span class="pill">${a.emoji} ${esc(a.title)}</span>`).join(' ')}</p>` : ''}
      <div class="foot">${resumeDocName(u)} gerado pela plataforma Vitrine FC ⚽ · ${new Date().toLocaleDateString('pt-BR')}</div>
      <div class="noprint" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:10px 24px;font-size:16px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ Imprimir / Salvar em PDF</button></div>
    </body></html>`);
  w.document.close();
}

// Conexão e reconexão automática
window.addEventListener('online', async () => {
  toast('🟢 Conexão restabelecida! Atualizando dados...');
  if (TOKEN) {
    try {
      ME = await api('/me');
      if (currentTab === 'feed') loadFeed();
      else if (currentTab === 'events') loadEvents();
      else if (currentTab === 'chat') renderConvs();
    } catch (e) {}
  }
});

window.addEventListener('offline', () => {
  toast('📡 Você está offline. Seus dados locais continuam salvos no aparelho.');
});

// Inicia aplicação
window.addEventListener('DOMContentLoaded', init);
