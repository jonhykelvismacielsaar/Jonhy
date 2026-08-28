// ============================================================
// VITRINE FC - Servidor (backend)
// Conecta todos os celulares pela internet: perfis, videos,
// busca, chat, propostas e avaliacoes.
// ============================================================
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite apontar os dados para um disco persistente (Render Disk, volume, etc.)
// Ex.: DATA_DIR=/var/data  →  /var/data/db.json e /var/data/uploads
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || (process.env.DATA_DIR ? path.join(DATA_DIR, 'uploads') : path.join(__dirname, 'uploads'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Banco de dados (arquivo JSON simples p/ prototipo) ----------
let db = {
  users: [],
  posts: [],
  messages: [],
  proposals: [],
  ratings: [],
  notifications: [],
  comments: [],
  postRatings: [],
  follows: [],
  stories: [],
  events: [],
  tokens: {}
};

function dbCounts(d) {
  return {
    users: (d.users || []).length,
    posts: (d.posts || []).length,
    events: (d.events || []).length,
    messages: (d.messages || []).length,
    stories: (d.stories || []).length
  };
}
function countsTotal(c) { return c.users + c.posts + c.events + c.messages + c.stories; }

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      if (raw.trim()) {
        db = JSON.parse(raw);
        normalizeDB();
        console.log('💾 Banco local carregado:', JSON.stringify(dbCounts(db)));
      }
    }
  } catch (e) {
    console.error('Erro ao carregar DB', e);
    // Nunca continua com o banco vazio por cima de um arquivo quebrado:
    // guarda o arquivo corrompido para análise em vez de sobrescrevê-lo.
    try {
      fs.copyFileSync(DB_FILE, DB_FILE + '.corrompido-' + Date.now());
      console.error('⚠️  Arquivo corrompido salvo como backup local.');
    } catch {}
  }
}

function normalizeDB() {
  db.tokens = db.tokens || {};
  ['users', 'posts', 'comments', 'postRatings', 'follows', 'stories', 'events', 'proposals', 'messages', 'ratings', 'notifications']
    .forEach(k => { db[k] = Array.isArray(db[k]) ? db[k] : []; });
}

let saveTimer = null;
let savePending = false;
function saveDB() {
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { flushDB(); }, 150);
}

function flushDB() {
  clearTimeout(saveTimer);
  if (!savePending) return;
  savePending = false;
  try {
    // Escrita atômica: grava num arquivo temporário e só depois renomeia.
    // Se o servidor cair no meio da gravação, o db.json antigo continua íntegro.
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) { console.error('Erro ao gravar DB', e); }
  ghScheduleSave();
}


// ---------- Purga de dados de demonstração ----------
function purgeDemoData() {
  const demoUsers = db.users.filter(u => u.demo || /@demo\.com$/i.test(u.email || ''));
  const demoUserIds = new Set(demoUsers.map(u => u.id));
  const demoPosts = db.posts.filter(p => p.demo || demoUserIds.has(p.userId) || (p.url || '').startsWith('/img/demo/'));
  const demoPostIds = new Set(demoPosts.map(p => p.id));
  const before = db.users.length + db.posts.length + db.stories.length + db.events.length;
  db.users = db.users.filter(u => !demoUserIds.has(u.id));
  db.posts = db.posts.filter(p => !demoPostIds.has(p.id));
  db.stories = db.stories.filter(s => !s.demo && !demoUserIds.has(s.userId) && !(s.url || '').startsWith('/img/demo/'));
  db.events = db.events.filter(e => !e.demo && !demoUserIds.has(e.userId));
  db.comments = db.comments.filter(c => !demoUserIds.has(c.userId) && !demoPostIds.has(c.postId));
  db.postRatings = db.postRatings.filter(r => !demoUserIds.has(r.userId) && !demoPostIds.has(r.postId));
  db.follows = db.follows.filter(f => !demoUserIds.has(f.fromId) && !demoUserIds.has(f.toId));
  db.notifications = db.notifications.filter(n => !demoUserIds.has(n.userId));
  db.messages = db.messages.filter(m => !demoUserIds.has(m.fromId) && !demoUserIds.has(m.toId));
  db.proposals = db.proposals.filter(p => !demoUserIds.has(p.fromId) && !demoUserIds.has(p.toId));
  db.ratings = db.ratings.filter(r => !demoUserIds.has(r.fromId) && !demoUserIds.has(r.toId));
  const after = db.users.length + db.posts.length + db.stories.length + db.events.length;
  if (before !== after) {
    saveDB();
    console.log('🧹 Dados de demonstração removidos.');
  }
}

// ---------- Credenciais padrão do Administrador ----------
const DEFAULT_ADMIN_EMAIL = 'admin@vitrinefc.com';
const DEFAULT_ADMIN_PASS = 'chefe2026';

function ensureAdminUser() {
  const adminEmail = DEFAULT_ADMIN_EMAIL.toLowerCase();
  let admin = db.users.find(u => u.id === 'admin_vitrine') || db.users.find(u => (u.email || '').toLowerCase() === adminEmail);
  const passwordHash = hash(DEFAULT_ADMIN_PASS);

  if (!admin) {
    admin = {
      id: 'admin_vitrine',
      name: 'Administrador Vitrine FC',
      email: DEFAULT_ADMIN_EMAIL,
      password: passwordHash,
      role: 'admin',
      nickname: 'Admin Vitrine',
      position: 'Administrador',
      positions2: '',
      level: 'Oficial',
      city: 'Brasil',
      state: 'BR',
      age: null,
      height: null,
      weight: null,
      foot: '',
      teams: 'Vitrine FC',
      strengths: 'Gestão e Moderação da Plataforma',
      bio: 'Conta oficial de administração do Vitrine FC.',
      nationality: 'Brasil',
      birthdate: '',
      club: 'Vitrine FC',
      shirtNumber: null,
      fifa: {},
      availableHire: false,
      availableFreela: false,
      fee: '',
      photo: '',
      verified: true,
      isAdmin: true,
      createdAt: Date.now()
    };
    db.users.unshift(admin);
    saveDB();
    console.log(`🛡️ Administrador oficial configurado: ${DEFAULT_ADMIN_EMAIL}`);
  } else {
    let changed = false;
    if (!admin.isAdmin) {
      admin.isAdmin = true;
      changed = true;
    }
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      changed = true;
    }
    if (!admin.verified) {
      admin.verified = true;
      changed = true;
    }
    if (changed) {
      saveDB();
      console.log(`🛡️ Administrador oficial sincronizado: ${DEFAULT_ADMIN_EMAIL}`);
    }
  }
}

// A inicialização real (carregar backup da nuvem → limpar demo → garantir admin)
// acontece em boot(), no final do arquivo, ANTES de o servidor aceitar visitas.
// Assim o site nunca começa a atender com o banco vazio nem sobrescreve o backup.

// ============================================================
// BACKUP AUTOMÁTICO NO GITHUB (CENTRAL DE DADOS NA NUVEM)
// ============================================================
const CLOUD_CONFIG_FILE = path.join(DATA_DIR, 'cloud-config.json');

function ghGetConfig() {
  let token = process.env.DB_GITHUB_TOKEN || '';
  let repo = process.env.DB_GITHUB_REPO || '';

  if ((!token || !repo) && fs.existsSync(CLOUD_CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CLOUD_CONFIG_FILE, 'utf8'));
      if (cfg && typeof cfg === 'object') {
        if (!token && cfg.token) token = cfg.token;
        if (!repo && cfg.repo) repo = cfg.repo;
      }
    } catch (e) {}
  }
  token = String(token || '').trim();
  repo = String(repo || '').trim();
  return { token, repo, enabled: !!(token && repo) };
}

let ghDbSha = null;
let ghSaveTimer = null;
let ghSaving = false;
// 🔒 TRAVA DE SEGURANÇA: só é liberada quando sabemos com certeza o que existe
// na nuvem (backup restaurado OU confirmado que ainda não existe backup).
// Enquanto estiver falsa, NADA é enviado ao GitHub.
let ghCanSave = false;
let ghLastCounts = null;
let ghRestoreTries = 0;

const BOOT_STATUS = { ready: false, source: 'local', cloud: ghGetConfig().enabled ? 'conectando' : 'desligado', message: '' };

async function ghApi(method, urlPath, body, raw) {
  const cfg = ghGetConfig();
  if (!cfg.enabled) {
    throw new Error('Sincronização na nuvem desligada (falta DB_GITHUB_TOKEN ou DB_GITHUB_REPO).');
  }
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}/${urlPath}`, {
    method,
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'User-Agent': 'vitrinefc',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return r;
}

async function ghLoadDB() {
  const cfg = ghGetConfig();
  if (!cfg.enabled) {
    BOOT_STATUS.cloud = 'desligado';
    return { ok: false, error: 'Token ou repositório não configurados' };
  }
  try {
    const meta = await ghApi('GET', 'contents/db.json');

    if (meta.status === 200) {
      const j = await meta.json();
      const rawRes = await ghApi('GET', 'contents/db.json', null, true);
      if (!rawRes.ok) throw new Error('HTTP ' + rawRes.status + ' ao baixar o backup');
      const text = await rawRes.text();
      const cloud = JSON.parse(text);
      if (!cloud || typeof cloud !== 'object' || !Array.isArray(cloud.users)) {
        throw new Error('backup da nuvem está em formato inválido');
      }

      const localCounts = dbCounts(db);
      const cloudCounts = dbCounts(cloud);

      // Se por algum motivo o arquivo local tiver MAIS dados que a nuvem, o local vence e é reenviado.
      if (countsTotal(localCounts) > countsTotal(cloudCounts)) {
        console.log('☁️  Backup da nuvem está atrás do arquivo local — mantendo o local e reenviando.',
          'nuvem:', JSON.stringify(cloudCounts), 'local:', JSON.stringify(localCounts));
        BOOT_STATUS.source = 'local (mais recente que a nuvem)';
      } else {
        db = cloud;
        normalizeDB();
        BOOT_STATUS.source = 'nuvem';
        console.log('☁️  Banco restaurado do GitHub:', cfg.repo, JSON.stringify(dbCounts(db)));
      }

      ghDbSha = j.sha;
      ghLastCounts = dbCounts(db);
      ghCanSave = true;
      BOOT_STATUS.cloud = 'ativo';
      return { ok: true, source: BOOT_STATUS.source, counts: dbCounts(db) };
    }

    if (meta.status === 404) {
      // Ainda não existe backup: pode criar o primeiro com segurança.
      ghDbSha = null;
      ghLastCounts = dbCounts(db);
      ghCanSave = true;
      BOOT_STATUS.cloud = 'ativo (primeiro backup pendente)';
      console.log('☁️  GitHub configurado — primeiro backup será criado ao salvar.');
      await ghSaveDB();
      return { ok: true, source: 'local (criou primeiro backup na nuvem)', counts: dbCounts(db) };
    }

    throw new Error('HTTP ' + meta.status + ' — verifique DB_GITHUB_TOKEN e DB_GITHUB_REPO');
  } catch (e) {
    ghCanSave = false;
    BOOT_STATUS.cloud = 'erro: ' + e.message;
    console.error('☁️  Erro ao carregar backup do GitHub:', e.message);
    if (ghRestoreTries++ < 30) setTimeout(ghLoadDB, 60000);
    return { ok: false, error: e.message };
  }
}

function ghScheduleSave() {
  const cfg = ghGetConfig();
  if (!cfg.enabled) return;
  clearTimeout(ghSaveTimer);
  ghSaveTimer = setTimeout(ghSaveDB, 3000);
}

async function ghSaveDB() {
  const cfg = ghGetConfig();
  if (!cfg.enabled || ghSaving) { if (ghSaving) ghScheduleSave(); return; }

  // 🔒 Trava: nunca sobrescrever o backup antes de saber o que há na nuvem.
  if (!ghCanSave) {
    console.warn('☁️  Backup adiado: ainda não confirmamos o estado da nuvem.');
    return;
  }

  // 🔒 Proteção anti-zeramento: se o banco encolheu de forma absurda
  const now = dbCounts(db);
  if (ghLastCounts && now.users === 0 && ghLastCounts.users > 0) {
    console.error('☁️  BACKUP BLOQUEADO: banco ficou sem usuários (antes:', ghLastCounts.users + ').');
    return;
  }

  ghSaving = true;
  try {
    const content = Buffer.from(JSON.stringify(db, null, 2)).toString('base64');
    let r = await ghApi('PUT', 'contents/db.json', {
      message: 'backup automático do Vitrine FC',
      content, ...(ghDbSha ? { sha: ghDbSha } : {})
    });

    if (r.status === 409 || r.status === 422) {
      const meta = await ghApi('GET', 'contents/db.json');
      if (meta.status === 200) ghDbSha = (await meta.json()).sha;
      r = await ghApi('PUT', 'contents/db.json', {
        message: 'backup automático do Vitrine FC',
        content, ...(ghDbSha ? { sha: ghDbSha } : {})
      });
    }
    if (r.ok) {
      ghDbSha = (await r.json()).content.sha;
      ghLastCounts = now;
      BOOT_STATUS.cloud = 'ativo';
    } else {
      console.error('☁️  Backup falhou:', r.status, (await r.text()).slice(0, 120));
      ghScheduleSave();
    }
  } catch (e) {
    console.error('☁️  Backup falhou:', e.message);
    ghScheduleSave();
  }
  ghSaving = false;
}

// Checa periodicamente se outro dispositivo/servidor atualizou a nuvem
async function checkCloudUpdates() {
  const cfg = ghGetConfig();
  if (!cfg.enabled || !ghCanSave || ghSaving) return;
  try {
    const meta = await ghApi('GET', 'contents/db.json');
    if (meta.status === 200) {
      const j = await meta.json();
      if (j.sha && j.sha !== ghDbSha) {
        console.log('☁️ Detectada alteração na nuvem (outro dispositivo/Wi-Fi salvou). Sincronizando...');
        const rawRes = await ghApi('GET', 'contents/db.json', null, true);
        if (rawRes.ok) {
          const text = await rawRes.text();
          const cloud = JSON.parse(text);
          if (cloud && Array.isArray(cloud.users)) {
            db = cloud;
            normalizeDB();
            ghDbSha = j.sha;
            ghLastCounts = dbCounts(db);
            const tmp = DB_FILE + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
            fs.renameSync(tmp, DB_FILE);
            console.log('✅ Banco local sincronizado com a nuvem:', JSON.stringify(dbCounts(db)));
          }
        }
      }
    }
  } catch (e) {}
}
setInterval(checkCloudUpdates, 30000);

async function ghSaveUpload(filename) {
  const cfg = ghGetConfig();
  if (!cfg.enabled) return;
  try {
    const fp = path.join(UPLOAD_DIR, filename);
    const size = fs.statSync(fp).size;
    if (size > 20 * 1024 * 1024) return;
    const content = fs.readFileSync(fp).toString('base64');
    await ghApi('PUT', `contents/uploads/${filename}`, {
      message: 'upload ' + filename, content
    });
  } catch (e) { console.error('☁️  Upload p/ GitHub falhou:', e.message); }
}

async function ghFetchUpload(filename) {
  const cfg = ghGetConfig();
  if (!cfg.enabled) return false;
  try {
    const r = await ghApi('GET', `contents/uploads/${encodeURIComponent(filename)}`, null, true);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
    return true;
  } catch { return false; }
}

// ---------- Helpers ----------
function hash(pw) { return crypto.createHash('sha256').update('vitrine' + pw).digest('hex'); }
function uid() { return crypto.randomBytes(8).toString('hex'); }

// ---------- Uploads (fotos e videos) ----------
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, uid() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ---------- Middlewares ----------
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', (req, res, next) => {
  const name = decodeURIComponent(req.path.replace(/^\//, ''));
  if (!name || name.includes('..')) return next();
  const fp = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(fp)) return next();
  ghFetchUpload(name).then(() => next()).catch(() => next());
});
app.use('/uploads', express.static(UPLOAD_DIR));

// Diagnóstico: mostra se o backup na nuvem está funcionando de verdade.
// Útil para descobrir por que dados sumiriam. Acesse /api/health
app.get('/api/health', (req, res) => {
  const cfg = ghGetConfig();
  res.json({
    ok: true,
    ready: BOOT_STATUS.ready,
    origemDosDados: BOOT_STATUS.source,
    backupNuvem: BOOT_STATUS.cloud,
    backupLiberado: ghCanSave,
    conteudo: dbCounts(db),
    aviso: cfg.enabled ? null : 'Backup na nuvem desligado: em hospedagem grátis os dados somem a cada reinício. Configure DB_GITHUB_TOKEN e DB_GITHUB_REPO.'
  });
});


function auth(req, res, next) {
  const token = req.headers['x-token'];
  const userId = db.tokens[token];
  if (!userId) return res.status(401).json({ error: 'Faça login novamente.' });
  req.user = db.users.find(u => u.id === userId);
  if (!req.user) return res.status(401).json({ error: 'Usuário não encontrado.' });
  next();
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  const ratings = db.ratings.filter(r => r.toId === u.id);
  rest.ratingAvg = ratings.length ? +(ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : null;
  rest.ratingCount = ratings.length;
  rest.followers = db.follows.filter(f => f.toId === u.id).length;
  rest.following = db.follows.filter(f => f.fromId === u.id).length;
  rest.overall = computeOverall(u);
  rest.isAdmin = !!(u.isAdmin || u.id === 'admin_vitrine');
  return rest;
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user && (req.user.isAdmin === true || req.user.id === 'admin_vitrine')) {
      return next();
    }
    return res.status(403).json({ error: 'Acesso negado: privilégios de administrador necessários.' });
  });
}

function decoratePost(p, meId) {
  const prs = db.postRatings.filter(r => r.postId === p.id);
  const myR = prs.find(r => r.userId === meId);
  const comments = db.comments.filter(c => c.postId === p.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(c => ({ ...c, user: publicUser(db.users.find(u => u.id === c.userId)) }));
  return {
    ...p,
    user: publicUser(db.users.find(u => u.id === p.userId)),
    starsAvg: prs.length ? +(prs.reduce((s, r) => s + r.stars, 0) / prs.length).toFixed(1) : null,
    starsCount: prs.length,
    myStars: myR ? myR.stars : null,
    comments
  };
}

function notify(userId, text, link) {
  db.notifications.push({ id: uid(), userId, text, link: link || null, read: false, createdAt: Date.now() });
  saveDB();
}

// ---------- Nota geral (overall) estilo FIFA ----------
function isGoalkeeper(u) {
  return u.role === 'goleiro' || u.position === 'Goleiro';
}

function computeOverall(u) {
  const f = u.fifa || {};
  const gk = isGoalkeeper(u);
  const fifaKeys = gk
    ? ['mergulho', 'manejo', 'chute', 'reflexos', 'velocidade', 'posicionamento']
    : ['ritmo', 'finalizacao', 'passe', 'drible', 'defesa', 'fisico'];
  const hasFifa = fifaKeys.some(k => typeof f[k] === 'number');

  // Se o atleta definiu seus atributos FIFA, o OVR é calculado a partir deles
  if (hasFifa) {
    let overall;
    if (gk) {
      overall = (f.mergulho || 60) * 0.25 + (f.manejo || 60) * 0.15 + (f.chute || 60) * 0.10
        + (f.reflexos || 60) * 0.25 + (f.velocidade || 60) * 0.10 + (f.posicionamento || 60) * 0.15;
    } else {
      overall = (f.ritmo || 60) * 0.15 + (f.finalizacao || 60) * 0.20 + (f.passe || 60) * 0.20
        + (f.drible || 60) * 0.20 + (f.defesa || 60) * 0.10 + (f.fisico || 60) * 0.15;
    }
    // Bônus de experiência na carreira (até +4)
    const st = u.stats || {};
    overall += Math.min(4, ((st.jogos || 0) / 50) + ((st.titulos || 0) / 4));
    return Math.min(99, Math.max(45, Math.round(overall)));
  }

  // Sem atributos FIFA definidos: nota de reputação/engajamento (comportamento anterior)
  const posts = db.posts.filter(p => p.userId === u.id);
  const postIds = posts.map(p => p.id);
  const prs = db.postRatings.filter(r => postIds.includes(r.postId));
  const avgPost = prs.length ? prs.reduce((s, r) => s + r.stars, 0) / prs.length : 0;
  const likes = posts.reduce((s, p) => s + p.likes.length, 0);
  const followers = db.follows.filter(f => f.toId === u.id).length;
  const ratings = db.ratings.filter(r => r.toId === u.id);
  const avgProfile = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
  const st = u.stats || {};
  let score = 58
    + avgPost * 4
    + avgProfile * 2
    + Math.min(6, likes)
    + Math.min(5, followers * 1.5)
    + Math.min(4, (st.jogos || 0) / 25)
    + Math.min(3, ((st.gols || 0) + (st.defesas || 0) / 10) / 15);
  return Math.min(99, Math.max(52, Math.round(score)));
}

// ---------- Conquistas / medalhas 🏅 ----------
function computeAchievements(u) {
  const posts = db.posts.filter(p => p.userId === u.id);
  const postIds = posts.map(p => p.id);
  const likes = posts.reduce((s, p) => s + p.likes.length, 0);
  const fiveStars = db.postRatings.filter(r => postIds.includes(r.postId) && r.stars === 5).length;
  const followers = db.follows.filter(f => f.toId === u.id).length;
  const propsAceitas = db.proposals.filter(p => p.toId === u.id && p.status === 'aceita').length;
  const eventos = db.events.filter(e => (e.participants || []).includes(u.id)).length;
  const stories = db.stories.filter(s => s.userId === u.id).length;
  const st = u.stats || {};
  const gk = isGoalkeeper(u);

  // Medalhas em comum: valem para qualquer tipo de perfil
  const social = [
    { id: 'estreia', emoji: '🎬', title: 'Estreia na Vitrine', desc: 'Postou o primeiro lance', earned: posts.length >= 1 },
    { id: 'midiatico', emoji: '📸', title: 'Midiático', desc: '5 ou mais publicações', earned: posts.length >= 5 },
    { id: 'craque5', emoji: '⭐', title: 'Craque 5 Estrelas', desc: '3 avaliações 5⭐ nos lances', earned: fiveStars >= 3 },
    { id: 'torcida', emoji: '💛', title: 'Queridinho da Torcida', desc: '10 curtidas nos posts', earned: likes >= 10 },
    { id: 'idolo', emoji: '👥', title: 'Ídolo Local', desc: '5 ou mais seguidores', earned: followers >= 5 },
    { id: 'presente', emoji: '🙋', title: 'Escalado no Time', desc: 'Confirmado em jogo/peneira', earned: eventos >= 1 },
    { id: 'storyteller', emoji: '📖', title: 'Sempre em Campo', desc: 'Publicou um story de jogo', earned: stories >= 1 }
  ];

  // Medalhas específicas do atleta (jogador e goleiro)
  const atleta = [
    { id: 'namira', emoji: '👀', title: 'Na Mira dos Olheiros', desc: '5 visitas de olheiros', earned: (u.scoutViews || 0) >= 5 },
    { id: 'contratado', emoji: '🤝', title: 'Contratado!', desc: 'Teve proposta aceita', earned: propsAceitas >= 1 },
    ...(gk ? [
      { id: 'muralha', emoji: '🧱', title: 'Muralha', desc: '100+ defesas na carreira', earned: (st.defesas || 0) >= 100 },
      { id: 'pegapenalti', emoji: '🧤', title: 'Pega-Pênalti', desc: '10+ pênaltis defendidos', earned: (st.penaltisDefendidos || 0) >= 10 }
    ] : [
      { id: 'artilheiro', emoji: '⚽', title: 'Artilheiro', desc: '25+ gols na carreira', earned: (st.gols || 0) >= 25 },
      { id: 'garcom', emoji: '🍽️', title: 'Garçom', desc: '20+ assistências', earned: (st.assistencias || 0) >= 20 }
    ]),
    { id: 'vencedor', emoji: '🏆', title: 'Vencedor', desc: 'Conquistou um título', earned: (st.titulos || 0) >= 1 },
    { id: 'centenario', emoji: '💯', title: 'Centenário', desc: '100+ jogos disputados', earned: (st.jogos || 0) >= 100 }
  ];

  // Medalhas do treinador
  const tecnico = [
    { id: 'chamado', emoji: '🤝', title: 'Chamado p/ Comando', desc: 'Teve proposta aceita', earned: propsAceitas >= 1 },
    { id: 'estrategista', emoji: '📋', title: 'Estrategista', desc: '50+ jogos no comando', earned: (st.jogos || 0) >= 50 },
    { id: 'campeao', emoji: '🏆', title: 'Campeão', desc: 'Conquistou um título', earned: (st.titulos || 0) >= 1 },
    { id: 'acesso', emoji: '📈', title: 'Acesso Garantido', desc: 'Levou o time a subir de divisão', earned: (st.acessos || 0) >= 1 },
    { id: 'veterano', emoji: '🎓', title: 'Veterano da Prancheta', desc: '10+ anos de estrada', earned: (u.experienceYears || 0) >= 10 }
  ];

  // Medalhas do árbitro
  const arbitro = [
    { id: 'apito', emoji: '🟨', title: 'Apito em Dia', desc: '20+ jogos apitados', earned: (st.jogos || 0) >= 20 },
    { id: 'rigor', emoji: '🟥', title: 'Pulso Firme', desc: '50+ cartões aplicados', earned: ((st.amarelos || 0) + (st.vermelhos || 0)) >= 50 },
    { id: 'finalista', emoji: '🏆', title: 'Apitou Final', desc: 'Esteve em uma decisão', earned: (st.finais || 0) >= 1 },
    { id: 'penaltimarcado', emoji: '📣', title: 'Pênalti Marcado', desc: '5+ pênaltis assinalados', earned: (st.penaltisMarcados || 0) >= 5 },
    { id: 'veteranoapito', emoji: '🎓', title: 'Veterano do Apito', desc: '10+ anos de arbitragem', earned: (u.experienceYears || 0) >= 10 }
  ];

  // Medalhas do olheiro
  const olheiro = [
    { id: 'radar', emoji: '📡', title: 'Radar Ligado', desc: 'Visitou 5 perfis de atletas', earned: (u.scoutViewsGiven || 0) >= 5 },
    { id: 'negociador', emoji: '🤝', title: 'Negociador', desc: 'Proposta aceita por um atleta', earned: propsAceitas >= 1 },
    { id: 'olhofaro', emoji: '👁️', title: 'Faro de Olheiro', desc: 'Avaliou 3 atletas com nota', earned: db.ratings.filter(r => r.fromId === u.id).length >= 3 },
    { id: 'peneira', emoji: '🥅', title: 'Organizador de Peneira', desc: 'Criou um jogo ou peneira', earned: db.events.filter(e => e.userId === u.id).length >= 1 },
    { id: 'conectado', emoji: '🔗', title: 'Bem Conectado', desc: '5+ conversas abertas', earned: db.messages.filter(m => m.fromId === u.id).length >= 5 }
  ];

  if (u.role === 'tecnico') return [...social, ...tecnico];
  if (u.role === 'arbitro') return [...social, ...arbitro];
  if (u.role === 'olheiro') return [...social.slice(0, 5), ...olheiro];
  return [...social, ...atleta];
}

// ============================================================
// API
// ============================================================

// ---- Cadastro ----
// Cada tipo de usuário nasce apenas com o que faz sentido para ele:
//  jogador/goleiro -> ficha de atleta + atributos FIFA + estatísticas de jogo
//  tecnico         -> licenças, categorias, estilo de jogo e números de banco
//  arbitro         -> entidade, quadro, modalidades e números de apito
//  olheiro         -> poucas informações: identidade, clube e contatos públicos
const ROLE_DEFAULT_POSITION = {
  goleiro: 'Goleiro',
  tecnico: 'Técnico',
  arbitro: 'Árbitro Central'
};

app.post('/api/register', (req, res) => {
  const { name, email, password, role, position, club, specialty } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
  if (db.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase().trim()))
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });

  const validRoles = ['jogador', 'goleiro', 'tecnico', 'arbitro', 'olheiro'];
  let cleanRole = validRoles.includes(role) ? role : 'jogador';
  // "Jogador" que escolhe a posição Goleiro passa a ser goleiro (mantém os atributos FIFA de GK)
  const cleanPosition = String(position || '').trim();
  if (cleanRole === 'jogador' && cleanPosition === 'Goleiro') cleanRole = 'goleiro';

  const isPlayer = cleanRole === 'jogador' || cleanRole === 'goleiro';

  const user = {
    id: uid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hash(password),
    role: cleanRole,
    nickname: '',
    position: cleanPosition || ROLE_DEFAULT_POSITION[cleanRole] || '',
    positions2: '',
    level: '',
    city: '',
    state: '',
    age: null,
    height: null,
    weight: null,
    foot: '',
    teams: '',
    strengths: '',
    bio: '',
    nationality: '',
    birthdate: '',
    club: String(club || '').trim(),
    shirtNumber: null,
    fifa: {},
    stats: {},
    // Campos específicos por tipo de usuário (vazios até o perfil ser completado)
    modality: isPlayer ? '' : '',
    licenses: '',            // técnico: CBF Pró / A / B / C
    coachCategories: '',     // técnico: Sub-15, Sub-17, Profissional…
    experienceYears: null,   // técnico e árbitro: anos de atuação
    playstyle: '',           // técnico: estilo de jogo
    methodology: '',         // técnico: formação / metodologia
    refEntity: '',           // árbitro: federação / liga / entidade
    refRegions: '',          // árbitro e olheiro: região de atuação
    scoutRole: String(specialty || '').trim(), // olheiro: cargo (Olheiro, Coordenador…)
    scoutPositions: '',      // olheiro: posições que procura
    contactPhone: '',        // olheiro: WhatsApp público
    contactInstagram: '',    // olheiro: @ do Instagram
    contactEmail: '',        // olheiro: e-mail público de contato
    publicProfile: true, // olheiro escolhe depois se quer sumir da busca
    availableHire: isPlayer,
    availableFreela: false,
    fee: '',
    photo: '',
    verified: false,
    isAdmin: false, // Usuários comuns nunca são admin no cadastro
    createdAt: Date.now()
  };
  db.users.push(user);
  const token = uid() + uid();
  db.tokens[token] = user.id;
  saveDB();
  res.json({ token, user: publicUser(user) });
});

// ---- Login ----
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase().trim());
  if (!user || user.password !== hash(password || '')) return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
  const token = uid() + uid();
  db.tokens[token] = user.id;
  saveDB();
  res.json({ token, user: publicUser(user) });
});

// ---- Meu perfil ----
app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

// ---- E-mail e senha (exige a senha atual) ----
app.put('/api/me/security', auth, (req, res) => {
  const current = req.body.currentPassword || '';
  if (!current || req.user.password !== hash(current)) {
    return res.status(400).json({ error: 'A senha atual está incorreta.' });
  }
  const email = req.body.email === undefined ? req.user.email : String(req.body.email).trim().toLowerCase();
  const password = req.body.password === undefined ? null : String(req.body.password);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  const other = db.users.find(u => u.id !== req.user.id && (u.email || '').toLowerCase() === email);
  if (other) return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  req.user.email = email;
  if (password && password.length >= 4) {
    req.user.password = hash(password);
  }
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Upload de foto de perfil ----
app.post('/api/me/photo', auth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  req.user.photo = '/uploads/' + req.file.filename;
  saveDB();
  ghSaveUpload(req.file.filename);
  res.json({ photo: req.user.photo });
});

// ---- Editar perfil ----
// Campos liberados por tipo de usuário: cada perfil só recebe o que pertence a ele.
const PROFILE_FIELDS = {
  comum: ['name', 'nickname', 'city', 'state', 'bio', 'photo'],
  jogador: ['position', 'positions2', 'level', 'age', 'height', 'weight', 'foot', 'teams',
    'strengths', 'nationality', 'birthdate', 'club', 'shirtNumber', 'modality',
    'availableHire', 'availableFreela', 'fee'],
  tecnico: ['position', 'level', 'club', 'teams', 'strengths', 'licenses', 'coachCategories',
    'experienceYears', 'playstyle', 'methodology', 'nationality', 'birthdate', 'modality',
    'availableHire', 'availableFreela', 'fee'],
  arbitro: ['position', 'level', 'refEntity', 'refRegions', 'experienceYears', 'modalities',
    'nationality', 'birthdate', 'club', 'strengths', 'availableHire', 'availableFreela', 'fee'],
  olheiro: ['club', 'scoutRole', 'scoutRegions', 'scoutPositions', 'modalities', 'position',
    'contactPhone', 'contactInstagram', 'contactEmail', 'publicProfile', 'level']
};

function profileFieldsFor(u) {
  const role = u.role === 'goleiro' ? 'jogador' : u.role;
  return [...PROFILE_FIELDS.comum, ...(PROFILE_FIELDS[role] || [])];
}

app.put('/api/me/profile', auth, (req, res) => {
  profileFieldsFor(req.user).forEach(k => {
    if (req.body[k] === undefined) return;
    let v = req.body[k];
    if (k === 'experienceYears' || k === 'age' || k === 'height' || k === 'weight' || k === 'shirtNumber') {
      v = v === '' || v === null ? null : Math.max(0, parseInt(v, 10) || 0);
    }
    if (k === 'modalities' || k === 'coachCategories') {
      v = Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : v;
    }
    if (k === 'publicProfile' || k === 'availableHire' || k === 'availableFreela') v = !!v;
    if (typeof v === 'string') v = v.trim();
    req.user[k] = v;
  });
  // Jogador que troca a posição para Goleiro (ou sai dela) ajusta o papel automaticamente
  if (req.user.role === 'jogador' || req.user.role === 'goleiro') {
    req.user.role = req.user.position === 'Goleiro' ? 'goleiro' : 'jogador';
  }
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Estatísticas de carreira ----
// Números específicos: jogador (gols/assistências/defesas), técnico (vitórias/acessos),
// árbitro (jogos apitados/cartões) e nada disso para o olheiro.
const STATS_FIELDS = {
  jogador: ['jogos', 'gols', 'assistencias', 'defesas', 'penaltisDefendidos', 'titulos', 'melhorJogador'],
  tecnico: ['jogos', 'vitorias', 'empates', 'titulos', 'acessos'],
  arbitro: ['jogos', 'amarelos', 'vermelhos', 'penaltisMarcados', 'finais', 'titulos']
};

app.put('/api/me/stats', auth, (req, res) => {
  const role = req.user.role === 'goleiro' ? 'jogador' : req.user.role;
  const allowed = STATS_FIELDS[role] || [];
  if (!allowed.length) return res.status(400).json({ error: 'Este tipo de perfil não usa estatísticas de carreira.' });
  req.user.stats = req.user.stats || {};
  allowed.forEach(k => {
    if (req.body[k] !== undefined) req.user.stats[k] = Math.max(0, parseInt(req.body[k], 10) || 0);
  });
  // Limpa números que não pertencem mais ao tipo de perfil
  Object.keys(req.user.stats).forEach(k => { if (!allowed.includes(k)) delete req.user.stats[k]; });
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Atributos FIFA (1 a 99) que compõem o card e o overall ----
app.put('/api/me/fifa', auth, (req, res) => {
  const allowed = ['ritmo','finalizacao','passe','drible','defesa','fisico','mergulho','manejo','chute','reflexos','velocidade','posicionamento'];
  req.user.fifa = req.user.fifa || {};
  allowed.forEach(k => {
    if (req.body[k] !== undefined && req.body[k] !== null && req.body[k] !== '') {
      req.user.fifa[k] = Math.max(1, Math.min(99, parseInt(req.body[k], 10) || 0));
    }
  });
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Feed & Posts ----
app.post('/api/posts', auth, upload.single('media'), (req, res) => {
  const { title, description, category, modality } = req.body;
  if (!title) return res.status(400).json({ error: 'Adicione um título/legenda.' });
  if (!req.file) return res.status(400).json({ error: 'Selecione uma foto ou vídeo.' });

  const isVideo = req.file.mimetype.startsWith('video/');
  const post = {
    id: uid(),
    userId: req.user.id,
    type: isVideo ? 'video' : 'photo',
    url: '/uploads/' + req.file.filename,
    title,
    description: description || '',
    category: category === 'profissional' ? 'profissional' : 'pelada',
    modality: ['campo', 'society', 'quadra'].includes(modality) ? modality : 'campo',
    likes: [],
    createdAt: Date.now()
  };
  db.posts.unshift(post);
  saveDB();
  ghSaveUpload(req.file.filename);
  res.json(decoratePost(post, req.user.id));
});

app.put('/api/posts/:id', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  if (post.userId !== req.user.id && !req.user.isAdmin && req.user.id !== 'admin_vitrine') return res.status(403).json({ error: 'Você só pode editar seus próprios posts.' });
  if (req.body.title !== undefined) post.title = String(req.body.title).trim();
  if (req.body.description !== undefined) post.description = String(req.body.description).trim();
  if (req.body.category !== undefined) post.category = req.body.category === 'profissional' ? 'profissional' : 'pelada';
  if (req.body.modality !== undefined && ['campo','society','quadra'].includes(req.body.modality)) post.modality = req.body.modality;
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

app.get('/api/posts', auth, (req, res) => {
  const { userId, role, position, city, type, category, modality } = req.query;
  let list = [...db.posts];
  if (category) list = list.filter(p => (p.category || 'pelada') === category);
  if (modality) list = list.filter(p => (p.modality || 'campo') === modality);
  if (userId) list = list.filter(p => p.userId === userId);
  if (type) list = list.filter(p => p.type === type);
  if (role || position || city) {
    list = list.filter(p => {
      const u = db.users.find(x => x.id === p.userId);
      if (!u) return false;
      if (role && u.role !== role) return false;
      if (position && u.position !== position && !(u.positions2 || '').includes(position)) return false;
      if (city && !(u.city || '').toLowerCase().includes(city.toLowerCase())) return false;
      return true;
    });
  }
  res.json(list.map(p => decoratePost(p, req.user.id)));
});

// ---- Curtir post ----
app.post('/api/posts/:id/like', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  const i = post.likes.indexOf(req.user.id);
  if (i >= 0) post.likes.splice(i, 1);
  else {
    post.likes.push(req.user.id);
    if (post.userId !== req.user.id)
      notify(post.userId, `⚽ ${req.user.name} curtiu seu lance "${post.title}"!`);
  }
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

// ---- Avaliar lance com estrelas (1 a 5) ----
app.post('/api/posts/:id/rate', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  if (post.userId === req.user.id) return res.status(400).json({ error: 'Você não pode avaliar o próprio lance.' });
  const stars = Math.max(1, Math.min(5, parseInt(req.body.stars, 10) || 0));
  if (!stars) return res.status(400).json({ error: 'Nota inválida.' });

  const existing = db.postRatings.find(r => r.postId === post.id && r.userId === req.user.id);
  if (existing) {
    existing.stars = stars;
    existing.updatedAt = Date.now();
  } else {
    db.postRatings.push({ id: uid(), postId: post.id, userId: req.user.id, stars, createdAt: Date.now() });
    notify(post.userId, `⭐ ${req.user.name} avaliou seu lance "${post.title}" com ${stars} estrela(s)!`);
  }
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

// ---- Comentar no post ----
app.post('/api/posts/:id/comments', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comentário vazio.' });
  const comment = { id: uid(), postId: post.id, userId: req.user.id, text, createdAt: Date.now() };
  db.comments.push(comment);
  if (post.userId !== req.user.id)
    notify(post.userId, `💬 ${req.user.name} comentou no seu lance: "${text.slice(0, 40)}"`);
  saveDB();
  res.json({ ...comment, user: publicUser(req.user) });
});

// ---- Excluir comentário ----
app.delete('/api/comments/:id', auth, (req, res) => {
  const i = db.comments.findIndex(c => c.id === req.params.id && (c.userId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (i < 0) return res.status(404).json({ error: 'Comentário não encontrado.' });
  db.comments.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ---- Seguir / Deixar de seguir ----
app.post('/api/users/:id/follow', auth, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const idx = db.follows.findIndex(f => f.fromId === req.user.id && f.toId === target.id);
  let following = false;
  if (idx >= 0) {
    db.follows.splice(idx, 1);
  } else {
    db.follows.push({ id: uid(), fromId: req.user.id, toId: target.id, createdAt: Date.now() });
    following = true;
    notify(target.id, `👥 ${req.user.name} começou a seguir você!`);
  }
  saveDB();
  res.json({ following, followers: db.follows.filter(f => f.toId === target.id).length });
});

app.get('/api/users/:id/is-following', auth, (req, res) => {
  const isF = db.follows.some(f => f.fromId === req.user.id && f.toId === req.params.id);
  res.json({ following: isF });
});

// ---- Excluir post ----
app.delete('/api/posts/:id', auth, (req, res) => {
  const i = db.posts.findIndex(p => p.id === req.params.id && (p.userId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (i < 0) return res.status(404).json({ error: 'Post não encontrado.' });
  db.comments = db.comments.filter(c => c.postId !== req.params.id);
  db.postRatings = db.postRatings.filter(r => r.postId !== req.params.id);
  db.posts.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ============================================================
// STORIES (expiram em 24h) 📖
// ============================================================
const STORY_TTL = 24 * 60 * 60 * 1000;

function cleanExpiredStories() {
  const now = Date.now();
  const before = db.stories.length;
  db.stories = db.stories.filter(s => (now - s.createdAt) < STORY_TTL);
  if (before !== db.stories.length) saveDB();
}

app.post('/api/stories', auth, upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Selecione uma foto ou vídeo.' });
  cleanExpiredStories();
  const isVideo = req.file.mimetype.startsWith('video/');
  const story = {
    id: uid(),
    userId: req.user.id,
    type: isVideo ? 'video' : 'photo',
    url: '/uploads/' + req.file.filename,
    caption: (req.body.caption || '').trim(),
    viewers: [],
    createdAt: Date.now()
  };
  db.stories.push(story);
  saveDB();
  ghSaveUpload(req.file.filename);
  res.json({ ...story, user: publicUser(req.user) });
});

app.get('/api/stories', auth, (req, res) => {
  cleanExpiredStories();
  const userMap = {};
  db.stories.forEach(s => {
    if (!userMap[s.userId]) {
      const u = publicUser(db.users.find(x => x.id === s.userId));
      if (u) userMap[s.userId] = { user: u, stories: [], hasUnseen: false, latest: s.createdAt };
    }
    if (userMap[s.userId]) {
      const seen = (s.viewers || []).includes(req.user.id);
      if (!seen && s.userId !== req.user.id) userMap[s.userId].hasUnseen = true;
      if (s.createdAt > userMap[s.userId].latest) userMap[s.userId].latest = s.createdAt;
      userMap[s.userId].stories.push({
        ...s,
        seen,
        viewersCount: (s.viewers || []).length
      });
    }
  });
  const list = Object.values(userMap).sort((a, b) => {
    if (a.user.id === req.user.id) return -1;
    if (b.user.id === req.user.id) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return b.latest - a.latest;
  });
  res.json(list);
});

app.post('/api/stories/:id/view', auth, (req, res) => {
  const story = db.stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story não encontrado.' });
  story.viewers = story.viewers || [];
  if (!story.viewers.includes(req.user.id)) {
    story.viewers.push(req.user.id);
    saveDB();
  }
  res.json({ ok: true, viewersCount: story.viewers.length });
});

app.delete('/api/stories/:id', auth, (req, res) => {
  const i = db.stories.findIndex(s => s.id === req.params.id && (s.userId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (i < 0) return res.status(404).json({ error: 'Story não encontrado.' });
  db.stories.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ============================================================
// PENEIRAS E JOGOS ABERTOS 📍 (CAMPO, SOCIETY, QUADRA)
// ============================================================
function publicEvent(ev, meId) {
  const proposals = db.proposals.filter(p => p.eventId === ev.id);
  const myProposal = proposals.find(p => p.fromId === meId);
  const me = db.users.find(u => u.id === meId);
  const isOwner = ev.userId === meId || !!(me && (me.isAdmin || me.id === 'admin_vitrine'));

  const participants = Array.isArray(ev.participants) ? ev.participants : [];
  const participantUsers = participants
    .map(id => publicUser(db.users.find(u => u.id === id)))
    .filter(Boolean);

  return {
    ...ev,
    modality: ev.modality || 'campo',
    neededPositions: Array.isArray(ev.neededPositions) ? ev.neededPositions : [],
    participants,
    participantUsers,
    creator: publicUser(db.users.find(u => u.id === ev.userId)),
    isOwner: ev.userId === meId,
    joined: participants.includes(meId),
    myProposal: myProposal ? {
      id: myProposal.id,
      status: myProposal.status,
      message: myProposal.message,
      position: myProposal.position || '',
      createdAt: myProposal.createdAt
    } : null,
    proposalsCount: proposals.length,
    pendingProposalsCount: proposals.filter(p => p.status === 'pendente').length,
    proposals: isOwner ? proposals.map(p => ({
      ...p,
      from: publicUser(db.users.find(u => u.id === p.fromId))
    })).sort((a, b) => b.createdAt - a.createdAt) : []
  };
}

app.post('/api/events', auth, (req, res) => {
  const { type, modality, title, description, neededPositions, city, state, place, address, date, fee, lat, lng } = req.body;
  if (!title || !city || !date) return res.status(400).json({ error: 'Preencha título, cidade e data.' });
  // Evento com data/hora que já passou não pode ser criado: assim que o
  // horário do jogo passa, ele sai da lista sozinho (ver GET /api/events).
  if (!date || +date < Date.now()) {
    return res.status(400).json({ error: 'A data/hora do jogo já passou. Escolha uma data futura — depois do horário marcado o evento sai da lista automaticamente.' });
  }

  let positions = [];
  if (Array.isArray(neededPositions)) {
    positions = neededPositions.map(p => String(p).trim()).filter(Boolean);
  } else if (typeof neededPositions === 'string') {
    positions = neededPositions.split(',').map(p => p.trim()).filter(Boolean);
  }

  const validModality = ['campo', 'society', 'quadra'].includes(modality) ? modality : 'campo';

  const ev = {
    id: uid(),
    userId: req.user.id,
    type: type === 'peneira' ? 'peneira' : 'jogo',
    modality: validModality,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    neededPositions: positions,
    city: String(city).trim(),
    state: (state || '').toUpperCase().trim(),
    place: place ? String(place).trim() : '',
    address: address ? String(address).trim() : '',
    date: +date,
    fee: fee ? String(fee).trim() : '',
    lat: lat ? +lat : null,
    lng: lng ? +lng : null,
    participants: [], // Inicia vazio: apenas o organizador pode aceitar candidaturas
    createdAt: Date.now()
  };
  db.events.push(ev);
  saveDB();
  res.json(publicEvent(ev, req.user.id));
});

app.get('/api/events', auth, (req, res) => {
  const { city, type, modality, position, myEvents } = req.query;
  // ⏰ Auto-expiração: passou o dia e o horário do jogo, o evento sai da
  // lista sozinho — sem precisar que o organizador apague nada.
  let list = db.events.filter(ev => ev.date > Date.now());
  if (city) list = list.filter(ev => (ev.city || '').toLowerCase().includes(city.toLowerCase()));
  if (type) list = list.filter(ev => ev.type === type);
  if (modality) list = list.filter(ev => (ev.modality || 'campo') === modality);
  if (position) {
    list = list.filter(ev => (ev.neededPositions || []).some(pos => pos.toLowerCase().includes(position.toLowerCase())));
  }
  if (myEvents === '1' || myEvents === 'true') {
    list = list.filter(ev => ev.userId === req.user.id);
  }
  list.sort((a, b) => a.date - b.date);
  res.json(list.map(ev => publicEvent(ev, req.user.id)));
});

app.get('/api/events/:id', auth, (req, res) => {
  const ev = db.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });
  res.json(publicEvent(ev, req.user.id));
});

app.delete('/api/events/:id', auth, (req, res) => {
  const i = db.events.findIndex(e => e.id === req.params.id && (e.userId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (i < 0) return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
  db.proposals = db.proposals.filter(p => p.eventId !== req.params.id);
  db.events.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// Remover participante escalado (apenas organizador ou admin)
app.delete('/api/events/:id/participants/:userId', auth, (req, res) => {
  const ev = db.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });
  if (ev.userId !== req.user.id && !req.user.isAdmin && req.user.id !== 'admin_vitrine') {
    return res.status(403).json({ error: 'Apenas o organizador pode gerenciar a lista de escalados.' });
  }
  ev.participants = (ev.participants || []).filter(id => id !== req.params.userId);
  const prop = db.proposals.find(p => p.eventId === ev.id && p.fromId === req.params.userId && p.status === 'aceita');
  if (prop) prop.status = 'recusada';

  notify(req.params.userId, `ℹ️ Você foi removido da escalação do jogo "${ev.title}".`);
  saveDB();
  res.json(publicEvent(ev, req.user.id));
});

// ---- Chat ----
app.post('/api/messages', auth, (req, res) => {
  const { toId, text } = req.body;
  if (!toId || !text) return res.status(400).json({ error: 'Mensagem vazia.' });
  if (!db.users.find(u => u.id === toId)) return res.status(404).json({ error: 'Destinatário não encontrado.' });
  const msg = { id: uid(), fromId: req.user.id, toId, text, read: false, createdAt: Date.now() };
  db.messages.push(msg);
  saveDB();
  res.json(msg);
});

app.get('/api/conversations', auth, (req, res) => {
  const mine = db.messages.filter(m => m.fromId === req.user.id || m.toId === req.user.id);
  const partners = {};
  mine.forEach(m => {
    const other = m.fromId === req.user.id ? m.toId : m.fromId;
    if (!partners[other] || partners[other].createdAt < m.createdAt) partners[other] = m;
  });
  const list = Object.entries(partners).map(([otherId, last]) => {
    const user = publicUser(db.users.find(u => u.id === otherId));
    const unread = db.messages.filter(m => m.fromId === otherId && m.toId === req.user.id && !m.read).length;
    return { user, lastMessage: last, unread };
  }).filter(c => c.user).sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  res.json(list);
});

app.get('/api/messages/:otherId', auth, (req, res) => {
  const msgs = db.messages.filter(m =>
    (m.fromId === req.user.id && m.toId === req.params.otherId) ||
    (m.fromId === req.params.otherId && m.toId === req.user.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  msgs.forEach(m => { if (m.toId === req.user.id) m.read = true; });
  saveDB();
  res.json(msgs);
});

// ---- Propostas & Candidaturas ----
app.post('/api/proposals', auth, (req, res) => {
  const { toId, type, message, eventId, position } = req.body;
  let targetId = toId;
  let ev = null;
  if (eventId) {
    ev = db.events.find(e => e.id === eventId);
    if (ev && !targetId) targetId = ev.userId;
  }
  if (!targetId) return res.status(400).json({ error: 'Destinatário obrigatório.' });
  const target = db.users.find(u => u.id === targetId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (targetId === req.user.id) return res.status(400).json({ error: 'Você não pode enviar proposta para o seu próprio evento ou perfil.' });

  if (eventId) {
    const existing = db.proposals.find(p => p.eventId === eventId && p.fromId === req.user.id && p.status === 'pendente');
    if (existing) {
      return res.status(400).json({ error: 'Você já enviou uma proposta para este jogo. Aguarde a resposta do organizador.' });
    }
  }

  const prop = {
    id: uid(),
    fromId: req.user.id,
    toId: targetId,
    eventId: eventId || null,
    type: eventId ? 'evento_candidatura' : (type || 'freela'),
    position: position ? String(position).trim() : (req.user.position || ''),
    message: message ? String(message).trim() : '',
    status: 'pendente',
    createdAt: Date.now()
  };
  db.proposals.push(prop);

  const modalityNames = { campo: 'Futebol de Campo', society: 'Society (Fut 7)', quadra: 'Futsal / Quadra' };
  const modalityLabel = ev ? (modalityNames[ev.modality] || 'Jogo') : '';
  const label = ev
    ? `enviou uma proposta/candidatura para o seu jogo "${ev.title}" (${modalityLabel})! ⚽`
    : (prop.type === 'freela' ? 'te chamou para um jogo (freela)! ⚽' : 'quer te contratar! 📋');

  notify(targetId, `🤝 ${req.user.name} ${label}`, `/events`);

  const posText = prop.position ? ` [Posição: ${prop.position}]` : '';
  db.messages.push({
    id: uid(),
    fromId: req.user.id,
    toId: targetId,
    text: `📩 CANDIDATURA / PROPOSTA ${ev ? 'PARA O JOGO "' + ev.title + '"' : '(' + (prop.type === 'freela' ? 'jogo avulso' : 'contratação') + ')'}${posText}: ${prop.message || 'Tenho interesse em jogar no seu time!'}`,
    read: false,
    createdAt: Date.now()
  });

  saveDB();
  res.json(prop);
});

app.get('/api/proposals', auth, (req, res) => {
  const list = db.proposals.filter(p => p.toId === req.user.id || p.fromId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(p => ({
      ...p,
      event: p.eventId ? db.events.find(e => e.id === p.eventId) : null,
      from: publicUser(db.users.find(u => u.id === p.fromId)),
      to: publicUser(db.users.find(u => u.id === p.toId))
    }));
  res.json(list);
});

app.put('/api/proposals/:id', auth, (req, res) => {
  const prop = db.proposals.find(p => p.id === req.params.id && (p.toId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada ou sem permissão.' });
  const { status } = req.body;
  if (!['aceita', 'recusada'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  
  prop.status = status;
  
  let eventText = '';
  if (prop.eventId) {
    const ev = db.events.find(e => e.id === prop.eventId);
    if (ev) {
      eventText = ` para o jogo "${ev.title}"`;
      if (!Array.isArray(ev.participants)) ev.participants = [];
      if (status === 'aceita') {
        if (!ev.participants.includes(prop.fromId)) {
          ev.participants.push(prop.fromId);
        }
      } else if (status === 'recusada') {
        ev.participants = ev.participants.filter(id => id !== prop.fromId);
      }
    }
  }

  notify(prop.fromId, status === 'aceita'
    ? `✅ ${req.user.name} ACEITOU sua proposta${eventText}! Você foi escalado no time. Combine no chat.`
    : `❌ ${req.user.name} recusou sua proposta${eventText}.`,
    '/events'
  );

  // 💬 Ao ACEITAR, já abre automaticamente a conversa entre organizador e
  // candidato: a mensagem abaixo ancora o chat dos dois lados.
  if (status === 'aceita') {
    db.messages.push({
      id: uid(),
      fromId: req.user.id,
      toId: prop.fromId,
      text: `✅ Proposta ACEITA${eventText}! Bora combinar os detalhes por aqui. ⚽`,
      read: false,
      createdAt: Date.now()
    });
  }

  saveDB();
  res.json(prop);
});

app.delete('/api/proposals/:id', auth, (req, res) => {
  const i = db.proposals.findIndex(p => p.id === req.params.id && (p.fromId === req.user.id || p.toId === req.user.id || req.user.isAdmin || req.user.id === 'admin_vitrine'));
  if (i < 0) return res.status(404).json({ error: 'Proposta não encontrada.' });
  const prop = db.proposals[i];
  if (prop.eventId && prop.status === 'aceita') {
    const ev = db.events.find(e => e.id === prop.eventId);
    if (ev && Array.isArray(ev.participants)) {
      ev.participants = ev.participants.filter(id => id !== prop.fromId);
    }
  }
  db.proposals.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ---- Avaliacoes ----
app.post('/api/ratings', auth, (req, res) => {
  const { toId, stars, comment } = req.body;
  if (!toId || !stars) return res.status(400).json({ error: 'Avaliação incompleta.' });
  if (toId === req.user.id) return res.status(400).json({ error: 'Você não pode se autoavaliar.' });
  db.ratings.push({ id: uid(), fromId: req.user.id, toId, stars: Math.max(1, Math.min(5, +stars)), comment: comment || '', createdAt: Date.now() });
  notify(toId, `⭐ ${req.user.name} avaliou você com ${stars} estrela(s).`);
  saveDB();
  res.json({ ok: true });
});

// ---- Notificacoes ----
app.get('/api/notifications', auth, (req, res) => {
  const list = db.notifications.filter(n => n.userId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  res.json(list);
});
app.post('/api/notifications/read', auth, (req, res) => {
  db.notifications.forEach(n => { if (n.userId === req.user.id) n.read = true; });
  saveDB();
  res.json({ ok: true });
});

// ---- Badge (contadores p/ abas) ----
app.get('/api/badges', auth, (req, res) => {
  const unreadMsgs = db.messages.filter(m => m.toId === req.user.id && !m.read).length;
  const unreadNotifs = db.notifications.filter(n => n.userId === req.user.id && !n.read).length;
  const pendingProps = db.proposals.filter(p => p.toId === req.user.id && p.status === 'pendente').length;
  res.json({ unreadMsgs, unreadNotifs, pendingProps });
});

// ---- Novos usuários (vitrine de recém-chegados) ----
app.get('/api/newusers', auth, (req, res) => {
  const list = db.users.filter(u => u.role !== 'olheiro')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map(publicUser);
  res.json(list);
});

// ---- Perfil de outro usuário ----
app.get('/api/users/:id', auth, (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (req.user.role === 'olheiro' && req.user.id !== u.id) {
    u.scoutViews = (u.scoutViews || 0) + 1;
    req.user.scoutViewsGiven = (req.user.scoutViewsGiven || 0) + 1;
    saveDB();
  }
  const ratings = db.ratings.filter(r => r.toId === u.id).map(r => ({
    ...r, from: publicUser(db.users.find(x => x.id === r.fromId))
  }));
  const achievements = computeAchievements(u);
  res.json({ user: publicUser(u), ratings, achievements });
});

// ---- Busca de talentos ----
// Regra da aba de busca: SÓ aparece quem se vinculou no perfil como
// "Disponível para contratação" e/ou "Aceita jogo avulso (freela)".
// Quem não marcou nenhuma das duas não aparece em nada aqui.
// Olheiros continuam aparecendo quando buscados de propósito (perfil público).
app.get('/api/search', auth, (req, res) => {
  const { q, role, position, city, level, availableFreela, availableHire, availability, scouts } = req.query;
  const wantScouts = role === 'olheiro' || scouts === '1';
  let list = db.users.filter(u => {
    if (u.role === 'olheiro') return wantScouts && u.publicProfile !== false;
    if (u.isAdmin || u.id === 'admin_vitrine' || u.role === 'admin') return false;
    return !!(u.availableHire || u.availableFreela);
  });
  if (q) {
    const s = q.toLowerCase();
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(s) ||
      (u.nickname || '').toLowerCase().includes(s) ||
      (u.teams || '').toLowerCase().includes(s) ||
      (u.club || '').toLowerCase().includes(s) ||
      (u.refEntity || '').toLowerCase().includes(s) ||
      (u.scoutPositions || '').toLowerCase().includes(s) ||
      (u.strengths || '').toLowerCase().includes(s));
  }
  if (role === 'goleiro') list = list.filter(u => u.role === 'goleiro' || u.position === 'Goleiro');
  else if (role) list = list.filter(u => u.role === role);
  if (position) list = list.filter(u => u.position === position || (u.positions2 || '').includes(position));
  if (city) list = list.filter(u => (u.city || '').toLowerCase().includes(city.toLowerCase()));
  if (level) list = list.filter(u => u.level === level);
  // Filtro de disponibilidade: contratacao / freela / (vazio = os dois)
  let avail = availability || '';
  if (!avail && (availableFreela === '1' || availableFreela === 'true')) avail = 'freela';
  if (!avail && (availableHire === '1' || availableHire === 'true')) avail = 'contratacao';
  if (avail === 'contratacao') list = list.filter(u => u.availableHire);
  else if (avail === 'freela') list = list.filter(u => u.availableFreela);
  res.json(list.map(publicUser));
});

// ---- Rankings da busca (contratação e freela) ----
// Três listas separadas: geral, disponíveis p/ contratação e freela,
// ordenadas pela nota geral (OVR) — o "1º, 2º, 3º lugar" da aba de busca.
app.get('/api/trending', auth, (req, res) => {
  const base = db.users.filter(u => u.role !== 'olheiro' && u.role !== 'admin' && !u.isAdmin && u.id !== 'admin_vitrine');
  const byOvr = arr => arr.map(publicUser).sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 10);
  res.json({
    geral: byOvr(base),
    contratacao: byOvr(base.filter(u => u.availableHire)),
    freela: byOvr(base.filter(u => u.availableFreela))
  });
});

// ============================================================
// PAINEL DO ADMINISTRADOR 🛡️
// ============================================================

// ☁️ Gerenciamento de Sincronização em Nuvem (Admin)
app.get('/api/admin/cloud-status', adminAuth, (req, res) => {
  const cfg = ghGetConfig();
  res.json({
    enabled: cfg.enabled,
    repo: cfg.repo || '',
    hasToken: !!cfg.token,
    bootStatus: BOOT_STATUS,
    canSave: ghCanSave,
    dbCounts: dbCounts(db)
  });
});

app.post('/api/admin/cloud-config', adminAuth, async (req, res) => {
  const token = String(req.body.token || '').trim();
  const repo = String(req.body.repo || '').trim();

  if (!token || !repo) {
    return res.status(400).json({ error: 'Informe o Token e o Repositório do GitHub (ex: usuario/vitrinefc-dados).' });
  }

  try {
    const testRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'vitrinefc'
      }
    });

    if (testRes.status === 401 || testRes.status === 403) {
      return res.status(400).json({ error: 'Token do GitHub inválido ou sem permissão de acesso ao repositório.' });
    }
    if (testRes.status === 404) {
      return res.status(400).json({ error: `Repositório "${repo}" não foi encontrado. Verifique o usuário e o nome do repositório.` });
    }
    if (!testRes.ok) {
      return res.status(400).json({ error: `Erro HTTP ${testRes.status} ao validar repositório no GitHub.` });
    }

    fs.writeFileSync(CLOUD_CONFIG_FILE, JSON.stringify({ token, repo }, null, 2));

    const result = await ghLoadDB();
    if (!result.ok) {
      return res.status(400).json({ error: 'Credenciais válidas, mas erro ao sincronizar o banco: ' + result.error });
    }

    if (ghCanSave) {
      await ghSaveDB();
    }

    res.json({
      ok: true,
      message: 'Sincronização em Nuvem ATIVADA com sucesso! Todos os dados estão compartilhados.',
      counts: dbCounts(db)
    });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao conectar com o GitHub: ' + e.message });
  }
});

app.post('/api/admin/cloud-sync-now', adminAuth, async (req, res) => {
  const cfg = ghGetConfig();
  if (!cfg.enabled) {
    return res.status(400).json({ error: 'Sincronização em nuvem não está configurada.' });
  }
  try {
    await ghLoadDB();
    savePending = true;
    await ghSaveDB();
    res.json({ ok: true, message: 'Sincronização com a nuvem realizada com sucesso!', counts: dbCounts(db) });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao sincronizar: ' + e.message });
  }
});

app.get('/api/admin/backup-download', adminAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="vitrinefc-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/admin/backup-upload', adminAuth, (req, res) => {
  const newDb = req.body;
  if (!newDb || typeof newDb !== 'object' || !Array.isArray(newDb.users)) {
    return res.status(400).json({ error: 'Arquivo de backup inválido. É necessário ser um JSON válido do Vitrine FC.' });
  }
  try {
    db = newDb;
    normalizeDB();
    ensureAdminUser();
    flushDB();
    res.json({ ok: true, message: 'Banco de dados restaurado com sucesso!', counts: dbCounts(db) });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao aplicar o backup: ' + e.message });
  }
});

// Desabilitar reivindicação de admin aberta
app.post('/api/admin/claim', auth, (req, res) => {
  return res.status(403).json({ error: 'Operação desativada. Apenas administradores existentes podem gerenciar privilégios.' });
});

// Estatísticas gerais para o painel admin
app.get('/api/admin/stats', adminAuth, (req, res) => {
  cleanExpiredStories();
  const usersByRole = {};
  db.users.forEach(u => { usersByRole[u.role] = (usersByRole[u.role] || 0) + 1; });
  const postsProf = db.posts.filter(p => p.category === 'profissional').length;
  const postsPelada = db.posts.filter(p => p.category !== 'profissional').length;
  const postsVideo = db.posts.filter(p => p.type === 'video').length;
  const postsPhoto = db.posts.filter(p => p.type !== 'video').length;
  const totalLikes = db.posts.reduce((s, p) => s + (p.likes?.length || 0), 0);
  const totalComments = db.comments.length;
  const totalStoryViews = db.stories.reduce((s, st) => s + (st.viewers?.length || 0), 0);
  const eventsCampo = db.events.filter(e => (e.modality || 'campo') === 'campo').length;
  const eventsSociety = db.events.filter(e => e.modality === 'society').length;
  const eventsQuadra = db.events.filter(e => e.modality === 'quadra').length;
  const eventsJoined = db.events.reduce((s, e) => s + (e.participants?.length || 0), 0);

  res.json({
    users: {
      total: db.users.length,
      byRole: usersByRole,
      admins: db.users.filter(u => u.isAdmin || u.id === 'admin_vitrine').length,
      verified: db.users.filter(u => u.verified).length
    },
    posts: {
      total: db.posts.length,
      profissional: postsProf,
      pelada: postsPelada,
      video: postsVideo,
      photo: postsPhoto,
      likes: totalLikes,
      comments: totalComments
    },
    events: {
      total: db.events.length,
      campo: eventsCampo,
      society: eventsSociety,
      quadra: eventsQuadra,
      peneiras: db.events.filter(e => e.type === 'peneira').length,
      jogos: db.events.filter(e => e.type !== 'peneira').length,
      joined: eventsJoined
    },
    stories: {
      total: db.stories.length,
      views: totalStoryViews
    },
    messages: {
      total: db.messages.length
    },
    proposals: {
      total: db.proposals.length
    }
  });
});

// 👥 Gerenciamento de Usuários (Apenas Admin)
app.get('/api/admin/users', adminAuth, (req, res) => {
  const list = db.users.map(u => {
    const pub = publicUser(u);
    return {
      ...pub,
      email: u.email,
      postsCount: db.posts.filter(p => p.userId === u.id).length,
      storiesCount: db.stories.filter(s => s.userId === u.id).length,
      eventsCount: db.events.filter(e => e.userId === u.id).length
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// Conceder / remover privilégios de Admin e Verificado
app.put('/api/admin/users/:id', adminAuth, (req, res) => {
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if ((target.id === 'admin_vitrine' || (target.email && target.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) && req.body.isAdmin === false) {
    return res.status(400).json({ error: 'Não é permitido remover o privilégio da conta principal de administrador.' });
  }
  if (req.body.isAdmin !== undefined) target.isAdmin = !!req.body.isAdmin;
  if (req.body.verified !== undefined) target.verified = !!req.body.verified;
  if (req.body.role !== undefined) target.role = req.body.role;
  saveDB();
  res.json(publicUser(target));
});

app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
  const uidToDelete = req.params.id;
  const target = db.users.find(u => u.id === uidToDelete);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (uidToDelete === req.user.id || uidToDelete === 'admin_vitrine' || (target.email && target.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
    return res.status(400).json({ error: 'Você não pode excluir a conta principal de administrador.' });
  }

  const idx = db.users.findIndex(u => u.id === uidToDelete);
  if (idx < 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const userPosts = db.posts.filter(p => p.userId === uidToDelete);
  const userPostIds = new Set(userPosts.map(p => p.id));

  db.users.splice(idx, 1);
  db.posts = db.posts.filter(p => p.userId !== uidToDelete);
  db.stories = db.stories.filter(s => s.userId !== uidToDelete);
  db.events = db.events.filter(e => e.userId !== uidToDelete);
  db.events.forEach(e => {
    e.participants = (e.participants || []).filter(pId => pId !== uidToDelete);
  });
  db.comments = db.comments.filter(c => c.userId !== uidToDelete && !userPostIds.has(c.postId));
  db.postRatings = db.postRatings.filter(r => r.userId !== uidToDelete && !userPostIds.has(r.postId));
  db.follows = db.follows.filter(f => f.fromId !== uidToDelete && f.toId !== uidToDelete);
  db.notifications = db.notifications.filter(n => n.userId !== uidToDelete);
  db.messages = db.messages.filter(m => m.fromId !== uidToDelete && m.toId !== uidToDelete);
  db.proposals = db.proposals.filter(p => p.fromId !== uidToDelete && p.toId !== uidToDelete);
  db.ratings = db.ratings.filter(r => r.fromId !== uidToDelete && r.toId !== uidToDelete);

  saveDB();
  res.json({ ok: true });
});

// 📸 Gerenciamento de Posts
app.get('/api/admin/posts', adminAuth, (req, res) => {
  const list = db.posts.map(p => decoratePost(p, req.user.id));
  res.json(list);
});

app.put('/api/admin/posts/:id', adminAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  if (req.body.category) post.category = req.body.category === 'profissional' ? 'profissional' : 'pelada';
  if (req.body.modality && ['campo','society','quadra'].includes(req.body.modality)) post.modality = req.body.modality;
  if (req.body.title) post.title = String(req.body.title).trim();
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

app.delete('/api/admin/posts/:id', adminAuth, (req, res) => {
  const i = db.posts.findIndex(p => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Post não encontrado.' });
  db.comments = db.comments.filter(c => c.postId !== req.params.id);
  db.postRatings = db.postRatings.filter(r => r.postId !== req.params.id);
  db.posts.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

app.delete('/api/admin/comments/:id', adminAuth, (req, res) => {
  const i = db.comments.findIndex(c => c.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Comentário não encontrado.' });
  db.comments.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// 📍 Gerenciamento de Eventos
app.get('/api/admin/events', adminAuth, (req, res) => {
  const list = [...db.events].sort((a, b) => b.createdAt - a.createdAt)
    .map(ev => publicEvent(ev, req.user.id));
  res.json(list);
});

app.delete('/api/admin/events/:id', adminAuth, (req, res) => {
  const i = db.events.findIndex(e => e.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Evento não encontrado.' });
  db.proposals = db.proposals.filter(p => p.eventId !== req.params.id);
  db.events.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// 📖 Gerenciamento de Stories
app.get('/api/admin/stories', adminAuth, (req, res) => {
  cleanExpiredStories();
  const list = db.stories.map(s => ({
    ...s,
    user: publicUser(db.users.find(u => u.id === s.userId)),
    viewersCount: (s.viewers || []).length,
    viewerUsers: (s.viewers || []).slice(0, 20).map(id => publicUser(db.users.find(u => u.id === id))).filter(Boolean)
  })).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.delete('/api/admin/stories/:id', adminAuth, (req, res) => {
  const i = db.stories.findIndex(s => s.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Story não encontrado.' });
  db.stories.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

app.post('/api/admin/stories/purge-expired', adminAuth, (req, res) => {
  const now = Date.now();
  const before = db.stories.length;
  db.stories = db.stories.filter(s => (now - s.createdAt) < STORY_TTL);
  const purged = before - db.stories.length;
  if (purged > 0) saveDB();
  res.json({ ok: true, purged, remaining: db.stories.length });
});

// ============================================================
// INICIALIZAÇÃO SEGURA DO SERVIDOR
// Ordem obrigatória: carrega local → restaura nuvem → limpa demo →
// garante admin → SÓ ENTÃO abre o site. Nada de atender visitas com
// o banco vazio (era isso que fazia o site "resetar sozinho").
// ============================================================
async function boot() {
  loadDB();
  await ghLoadDB();
  purgeDemoData();
  ensureAdminUser();
  flushDB();
  BOOT_STATUS.ready = true;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Vitrine FC rodando na porta ${PORT}`);
    console.log(`📱 Abra no navegador: http://localhost:${PORT}`);
    console.log(`💾 Dados em: ${DB_FILE}`);
    console.log(`📦 Conteúdo: ${JSON.stringify(dbCounts(db))} | origem: ${BOOT_STATUS.source} | nuvem: ${BOOT_STATUS.cloud}`);
    if (!ghGetConfig().enabled) {
      console.log('⚠️  BACKUP NA NUVEM DESLIGADO! Em hospedagens de plano grátis o disco é apagado');
      console.log('⚠️  a cada reinício/deploy e TODOS os cadastros somem. Configure as variáveis');
      console.log('⚠️  DB_GITHUB_TOKEN e DB_GITHUB_REPO para nunca mais perder os dados.');
    }
  });

  // Salvamento periódico de segurança (a cada 5 min, só se houver mudança pendente)
  setInterval(() => { if (savePending) flushDB(); }, 5 * 60 * 1000);
}

// Ao reiniciar/desligar (deploy, dormir no plano grátis…) o Render manda SIGTERM.
// Gravamos tudo e mandamos o último backup antes de morrer.
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n⏹️  ${signal} recebido — salvando dados antes de desligar…`);
  try {
    savePending = true;
    clearTimeout(saveTimer);
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
    savePending = false;
    clearTimeout(ghSaveTimer);
    await ghSaveDB();
    console.log('✅ Dados salvos com segurança.');
  } catch (e) { console.error('Erro ao salvar no desligamento:', e.message); }
  process.exit(0);
}
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => gracefulShutdown(sig)));

// Um erro solto nunca deve derrubar o servidor e levar dados junto.
process.on('uncaughtException', e => console.error('❌ Erro não tratado:', e));
process.on('unhandledRejection', e => console.error('❌ Promessa rejeitada:', e));

boot();

