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

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
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

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db.tokens = db.tokens || {};
      db.comments = db.comments || [];
      db.postRatings = db.postRatings || [];
      db.follows = db.follows || [];
      db.stories = db.stories || [];
      db.events = db.events || [];
    }
  } catch (e) { console.error('Erro ao carregar DB', e); }
}
let saveTimer = null;
function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    ghScheduleSave();
  }, 150);
}

// ---------- Purga de dados de demonstração ----------
// Remove qualquer sobra de perfis/posts/stories/eventos demo (do db.json
// ou do backup do GitHub) para o site sempre começar sem contas demo.
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
  let admin = db.users.find(u => (u.email || '').toLowerCase() === adminEmail);
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
    if (admin.password !== passwordHash) {
      admin.password = passwordHash;
      changed = true;
    }
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

loadDB();
purgeDemoData();
ensureAdminUser();

// ============================================================
// BACKUP AUTOMÁTICO NO GITHUB (grátis e permanente)
// Ative com as variáveis de ambiente:
//   DB_GITHUB_TOKEN = token do GitHub (com permissão de repo)
//   DB_GITHUB_REPO  = usuario/nome-do-repo (ex: fulano/vitrinefc-dados)
// ============================================================
const GH_TOKEN = process.env.DB_GITHUB_TOKEN;
const GH_REPO = process.env.DB_GITHUB_REPO;
const GH_ON = !!(GH_TOKEN && GH_REPO);
let ghDbSha = null;
let ghSaveTimer = null;
let ghSaving = false;

async function ghApi(method, urlPath, body, raw) {
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/${urlPath}`, {
    method,
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Accept': raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'User-Agent': 'vitrinefc',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return r;
}

async function ghLoadDB() {
  if (!GH_ON) return;
  try {
    const meta = await ghApi('GET', 'contents/db.json');
    if (meta.status === 200) {
      const j = await meta.json();
      ghDbSha = j.sha;
      const rawRes = await ghApi('GET', 'contents/db.json', null, true);
      const text = await rawRes.text();
      db = JSON.parse(text);
      db.tokens = db.tokens || {};
      ['comments', 'postRatings', 'follows', 'stories', 'events'].forEach(k => { db[k] = db[k] || []; });
      purgeDemoData();
      ensureAdminUser();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      console.log('☁️  Banco restaurado do GitHub:', GH_REPO);
    } else {
      console.log('☁️  GitHub configurado — primeiro backup será criado ao salvar.');
    }
  } catch (e) { console.error('☁️  Erro ao carregar backup do GitHub:', e.message); }
}

function ghScheduleSave() {
  if (!GH_ON) return;
  clearTimeout(ghSaveTimer);
  ghSaveTimer = setTimeout(ghSaveDB, 4000);
}

async function ghSaveDB() {
  if (!GH_ON || ghSaving) { if (ghSaving) ghScheduleSave(); return; }
  ghSaving = true;
  try {
    const content = Buffer.from(JSON.stringify(db, null, 2)).toString('base64');
    let r = await ghApi('PUT', 'contents/db.json', {
      message: 'backup automático do Vitrine FC',
      content, ...(ghDbSha ? { sha: ghDbSha } : {})
    });
    if (r.status === 409 || r.status === 422) { // sha desatualizado
      const meta = await ghApi('GET', 'contents/db.json');
      if (meta.status === 200) ghDbSha = (await meta.json()).sha;
      r = await ghApi('PUT', 'contents/db.json', {
        message: 'backup automático do Vitrine FC',
        content, ...(ghDbSha ? { sha: ghDbSha } : {})
      });
    }
    if (r.ok) { ghDbSha = (await r.json()).content.sha; }
    else console.error('☁️  Backup falhou:', r.status, (await r.text()).slice(0, 120));
  } catch (e) { console.error('☁️  Backup falhou:', e.message); }
  ghSaving = false;
}

async function ghSaveUpload(filename) {
  if (!GH_ON) return;
  try {
    const fp = path.join(UPLOAD_DIR, filename);
    const size = fs.statSync(fp).size;
    if (size > 20 * 1024 * 1024) return; // acima de 20MB fica só local
    const content = fs.readFileSync(fp).toString('base64');
    await ghApi('PUT', `contents/uploads/${filename}`, {
      message: 'upload ' + filename, content
    });
  } catch (e) { console.error('☁️  Upload p/ GitHub falhou:', e.message); }
}

async function ghFetchUpload(filename) {
  if (!GH_ON) return false;
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
// uploads: se não achar localmente, busca no backup do GitHub
app.use('/uploads', (req, res, next) => {
  const name = decodeURIComponent(req.path.replace(/^\//, ''));
  if (!name || name.includes('..')) return next();
  const fp = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(fp)) return next();
  ghFetchUpload(name).then(() => next()).catch(() => next());
});
app.use('/uploads', express.static(UPLOAD_DIR));

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
  rest.isAdmin = !!(u.isAdmin || u.role === 'admin');
  return rest;
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (db.users.length === 1 && req.user && !req.user.isAdmin) {
      req.user.isAdmin = true;
      saveDB();
    }
    if (req.user && (req.user.isAdmin || req.user.role === 'admin')) {
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
function computeOverall(u) {
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
    + avgPost * 4                                  // até +20
    + avgProfile * 2                               // até +10
    + Math.min(6, likes)                           // até +6
    + Math.min(5, followers * 1.5)                 // até +5
    + Math.min(4, (st.jogos || 0) / 25)            // até +4
    + Math.min(3, ((st.gols || 0) + (st.defesas || 0) / 10) / 15); // até +3
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
  const eventos = db.events.filter(e => e.participants.includes(u.id)).length;
  const stories = db.stories.filter(s => s.userId === u.id).length;
  const st = u.stats || {};
  return [
    { id: 'estreia', emoji: '🎬', title: 'Estreia na Vitrine', desc: 'Postou o primeiro lance', earned: posts.length >= 1 },
    { id: 'midiatico', emoji: '📸', title: 'Midiático', desc: '5 ou mais publicações', earned: posts.length >= 5 },
    { id: 'craque5', emoji: '⭐', title: 'Craque 5 Estrelas', desc: '3 avaliações 5⭐ nos lances', earned: fiveStars >= 3 },
    { id: 'torcida', emoji: '💛', title: 'Queridinho da Torcida', desc: '10 curtidas nos posts', earned: likes >= 10 },
    { id: 'idolo', emoji: '👥', title: 'Ídolo Local', desc: '5 ou mais seguidores', earned: followers >= 5 },
    { id: 'namira', emoji: '👀', title: 'Na Mira dos Olheiros', desc: '5 visitas de olheiros', earned: (u.scoutViews || 0) >= 5 },
    { id: 'contratado', emoji: '🤝', title: 'Contratado!', desc: 'Teve proposta aceita', earned: propsAceitas >= 1 },
    { id: 'presente', emoji: '🙋', title: 'Presença VIP', desc: 'Confirmou presença em peneira/jogo', earned: eventos >= 1 },
    { id: 'storyteller', emoji: '📖', title: 'Sempre em Campo', desc: 'Publicou um story de jogo', earned: stories >= 1 },
    { id: 'artilheiro', emoji: '⚽', title: 'Artilheiro', desc: '25+ gols na carreira', earned: (st.gols || 0) >= 25 },
    { id: 'muralha', emoji: '🧱', title: 'Muralha', desc: '100+ defesas na carreira', earned: (st.defesas || 0) >= 100 },
    { id: 'pegapenalti', emoji: '🧤', title: 'Pega-Pênalti', desc: '10+ pênaltis defendidos', earned: (st.penaltisDefendidos || 0) >= 10 },
    { id: 'vencedor', emoji: '🏆', title: 'Vencedor', desc: 'Conquistou um título', earned: (st.titulos || 0) >= 1 },
    { id: 'garcom', emoji: '🍽️', title: 'Garçom', desc: '20+ assistências', earned: (st.assistencias || 0) >= 20 },
    { id: 'centenario', emoji: '💯', title: 'Centenário', desc: '100+ jogos disputados', earned: (st.jogos || 0) >= 100 }
  ];
}

// ============================================================
// API
// ============================================================

// ---- Cadastro ----
app.post('/api/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  const isFirstUser = db.users.length === 0;
  const isAdmin = isFirstUser || /admin/i.test(email) || role === 'admin';
  const user = {
    id: uid(), name, email, password: hash(password), role,
    nickname: '', position: role === 'goleiro' ? 'Goleiro' : (role === 'tecnico' ? 'Técnico' : (role === 'arbitro' ? 'Árbitro' : '')),
    positions2: '', level: '', city: '', state: '', age: null, height: null, weight: null,
    foot: '', teams: '', strengths: '', bio: '', availableHire: true, availableFreela: false,
    fee: '', photo: '', verified: false, isAdmin: !!isAdmin, createdAt: Date.now()
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
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || user.password !== hash(password || '')) return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
  const token = uid() + uid();
  db.tokens[token] = user.id;
  saveDB();
  res.json({ token, user: publicUser(user) });
});

// ---- Meu perfil ----
app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

app.put('/api/me', auth, (req, res) => {
  const allowed = ['name', 'nickname', 'position', 'positions2', 'level', 'city', 'state', 'age',
    'height', 'weight', 'foot', 'teams', 'strengths', 'bio', 'availableHire', 'availableFreela', 'fee'];
  allowed.forEach(k => { if (req.body[k] !== undefined) req.user[k] = req.body[k]; });
  if (req.body.stats && typeof req.body.stats === 'object') {
    const s = {};
    ['jogos', 'gols', 'assistencias', 'defesas', 'penaltisDefendidos', 'jogosSemSofrerGol', 'titulos'].forEach(k => {
      const v = parseInt(req.body.stats[k]);
      s[k] = isNaN(v) ? 0 : Math.max(0, v);
    });
    req.user.stats = s;
  }
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Foto de perfil ----
app.post('/api/me/photo', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  req.user.photo = '/uploads/' + req.file.filename;
  ghSaveUpload(req.file.filename);
  saveDB();
  res.json(publicUser(req.user));
});

// ---- Posts (fotos e videos no feed) ----
app.post('/api/posts', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const isVideo = /\.(mp4|mov|webm|mkv|avi|3gp)$/i.test(req.file.filename) || (req.file.mimetype || '').startsWith('video');
  const category = req.body.category === 'profissional' ? 'profissional' : 'pelada';
  const post = {
    id: uid(), userId: req.user.id, type: isVideo ? 'video' : 'photo',
    url: '/uploads/' + req.file.filename, caption: req.body.caption || '',
    category, likes: [], createdAt: Date.now()
  };
  db.posts.push(post);
  ghSaveUpload(req.file.filename);
  saveDB();
  res.json(post);
});

app.get('/api/feed', auth, (req, res) => {
  const posts = [...db.posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100)
    .map(p => decoratePost(p, req.user.id));
  res.json(posts);
});

// ---- Reels (so videos, estilo lances) ----
app.get('/api/reels', auth, (req, res) => {
  const posts = db.posts.filter(p => p.type === 'video')
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 50)
    .map(p => decoratePost(p, req.user.id));
  res.json(posts);
});

// ---- Comentarios ----
app.post('/api/posts/:id/comments', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comentário vazio.' });
  const c = { id: uid(), postId: post.id, userId: req.user.id, text, createdAt: Date.now() };
  db.comments.push(c);
  if (post.userId !== req.user.id)
    notify(post.userId, `💬 ${req.user.name} comentou: "${text.slice(0, 60)}"`);
  saveDB();
  res.json({ ...c, user: publicUser(req.user) });
});

app.delete('/api/comments/:id', auth, (req, res) => {
  const i = db.comments.findIndex(c => c.id === req.params.id && (c.userId === req.user.id || req.user.isAdmin || req.user.role === 'admin'));
  if (i < 0) return res.status(404).json({ error: 'Comentário não encontrado.' });
  db.comments.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ---- Avaliacao do post (1 a 5 estrelas) ----
app.post('/api/posts/:id/rate', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  const stars = Math.max(1, Math.min(5, +req.body.stars || 0));
  if (!stars) return res.status(400).json({ error: 'Escolha de 1 a 5 estrelas.' });
  let r = db.postRatings.find(x => x.postId === post.id && x.userId === req.user.id);
  if (r) { r.stars = stars; } else {
    db.postRatings.push({ id: uid(), postId: post.id, userId: req.user.id, stars, createdAt: Date.now() });
    if (post.userId !== req.user.id)
      notify(post.userId, `⭐ ${req.user.name} avaliou seu lance com ${stars} estrela(s)!`);
  }
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

// ---- Seguir / deixar de seguir ----
app.post('/api/users/:id/follow', auth, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const i = db.follows.findIndex(f => f.fromId === req.user.id && f.toId === target.id);
  let following;
  if (i >= 0) { db.follows.splice(i, 1); following = false; }
  else {
    db.follows.push({ id: uid(), fromId: req.user.id, toId: target.id, createdAt: Date.now() });
    notify(target.id, `➕ ${req.user.name} começou a seguir você!`);
    following = true;
  }
  saveDB();
  res.json({ following, followers: db.follows.filter(f => f.toId === target.id).length });
});

// ---- Craques em alta (ranking) ----
app.get('/api/trending', auth, (req, res) => {
  const score = u => {
    const likes = db.posts.filter(p => p.userId === u.id).reduce((s, p) => s + p.likes.length, 0);
    const stars = db.postRatings.filter(r => db.posts.find(p => p.id === r.postId && p.userId === u.id)).reduce((s, r) => s + r.stars, 0);
    const fols = db.follows.filter(f => f.toId === u.id).length;
    return likes * 2 + stars + fols * 3;
  };
  const list = db.users.filter(u => u.role !== 'olheiro')
    .map(u => ({ ...publicUser(u), score: score(u) }))
    .sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(list);
});

app.post('/api/posts/:id/like', auth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  const i = post.likes.indexOf(req.user.id);
  if (i >= 0) post.likes.splice(i, 1); else {
    post.likes.push(req.user.id);
    if (post.userId !== req.user.id) notify(post.userId, `❤️ ${req.user.name} curtiu sua publicação.`);
  }
  saveDB();
  res.json(post);
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const i = db.posts.findIndex(p => p.id === req.params.id && (p.userId === req.user.id || req.user.isAdmin || req.user.role === 'admin'));
  if (i < 0) return res.status(404).json({ error: 'Post não encontrado.' });
  const postId = db.posts[i].id;
  db.posts.splice(i, 1);
  db.comments = db.comments.filter(c => c.postId !== postId);
  db.postRatings = db.postRatings.filter(r => r.postId !== postId);
  saveDB();
  res.json({ ok: true });
});

// ---- Busca de talentos ----
app.get('/api/search', auth, (req, res) => {
  const { q, role, position, city, state, level, freela } = req.query;
  let users = db.users.filter(u => u.role !== 'olheiro');
  if (role) users = users.filter(u => u.role === role);
  if (position) users = users.filter(u =>
    (u.position || '').toLowerCase().includes(position.toLowerCase()) ||
    (u.positions2 || '').toLowerCase().includes(position.toLowerCase()));
  if (city) users = users.filter(u => (u.city || '').toLowerCase().includes(city.toLowerCase()));
  if (state) users = users.filter(u => (u.state || '').toLowerCase() === state.toLowerCase());
  if (level) users = users.filter(u => u.level === level);
  if (freela === '1') users = users.filter(u => u.availableFreela);
  if (q) {
    const s = q.toLowerCase();
    users = users.filter(u => [u.name, u.nickname, u.position, u.city, u.teams, u.strengths]
      .some(f => (f || '').toLowerCase().includes(s)));
  }
  res.json(users.map(publicUser));
});

// ---- Perfil de outro usuario ----
app.get('/api/users/:id', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const posts = db.posts.filter(p => p.userId === user.id).sort((a, b) => b.createdAt - a.createdAt)
    .map(p => decoratePost(p, req.user.id));
  const ratings = db.ratings.filter(r => r.toId === user.id).sort((a, b) => b.createdAt - a.createdAt)
    .map(r => ({ ...r, from: publicUser(db.users.find(u => u.id === r.fromId)) }));
  const iFollow = db.follows.some(f => f.fromId === req.user.id && f.toId === user.id);
  if (user.id !== req.user.id && req.user.role === 'olheiro') {
    user.scoutViews = (user.scoutViews || 0) + 1;
    notify(user.id, `👀 Um olheiro (${req.user.name}) visitou seu perfil!`);
    saveDB();
  }
  res.json({ user: publicUser(user), posts, ratings, iFollow, achievements: user.role !== 'olheiro' ? computeAchievements(user) : [] });
});

// ============================================================
// STORIES DE JOGO 📖 (somem em 24 horas)
// ============================================================
const STORY_TTL = 86400000;
app.post('/api/stories', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const isVideo = /\.(mp4|mov|webm|mkv|avi|3gp)$/i.test(req.file.filename) || (req.file.mimetype || '').startsWith('video');
  const story = {
    id: uid(), userId: req.user.id, type: isVideo ? 'video' : 'photo',
    url: '/uploads/' + req.file.filename, caption: req.body.caption || '',
    viewers: [], createdAt: Date.now()
  };
  db.stories.push(story);
  ghSaveUpload(req.file.filename);
  saveDB();
  res.json(story);
});

app.get('/api/stories', auth, (req, res) => {
  db.stories = db.stories.filter(s => Date.now() - s.createdAt < STORY_TTL);
  const groups = {};
  db.stories.sort((a, b) => a.createdAt - b.createdAt).forEach(s => {
    (groups[s.userId] = groups[s.userId] || []).push(s);
  });
  const list = Object.entries(groups).map(([userId, stories]) => ({
    user: publicUser(db.users.find(u => u.id === userId)),
    stories,
    seenAll: stories.every(s => s.viewers.includes(req.user.id))
  })).filter(g => g.user)
    .sort((a, b) => (a.user.id === req.user.id ? -1 : b.user.id === req.user.id ? 1 : a.seenAll - b.seenAll));
  res.json(list);
});

app.post('/api/stories/:id/view', auth, (req, res) => {
  const s = db.stories.find(x => x.id === req.params.id);
  if (s && !s.viewers.includes(req.user.id)) { s.viewers.push(req.user.id); saveDB(); }
  res.json({ ok: true });
});

app.delete('/api/stories/:id', auth, (req, res) => {
  const i = db.stories.findIndex(s => s.id === req.params.id && (s.userId === req.user.id || req.user.isAdmin || req.user.role === 'admin'));
  if (i < 0) return res.status(404).json({ error: 'Story não encontrado.' });
  db.stories.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// ============================================================
// PENEIRAS E JOGOS ABERTOS 📍 (com mapa)
// ============================================================
function publicEvent(ev, meId) {
  return {
    ...ev,
    creator: publicUser(db.users.find(u => u.id === ev.userId)),
    joined: ev.participants.includes(meId),
    participantUsers: ev.participants.slice(0, 20).map(id => publicUser(db.users.find(u => u.id === id))).filter(Boolean)
  };
}

app.post('/api/events', auth, (req, res) => {
  const { type, title, description, city, state, place, date, fee, lat, lng } = req.body;
  if (!type || !title || !city || !date) return res.status(400).json({ error: 'Preencha tipo, título, cidade e data.' });
  const ev = {
    id: uid(), userId: req.user.id, type: type === 'peneira' ? 'peneira' : 'jogo',
    title, description: description || '', city, state: (state || '').toUpperCase(),
    place: place || '', date: +date, fee: fee || '',
    lat: lat ? +lat : null, lng: lng ? +lng : null,
    participants: [], createdAt: Date.now()
  };
  db.events.push(ev);
  saveDB();
  res.json(publicEvent(ev, req.user.id));
});

app.get('/api/events', auth, (req, res) => {
  const { city, type } = req.query;
  let list = db.events.filter(ev => ev.date > Date.now() - 86400000); // futuros + últimas 24h
  if (city) list = list.filter(ev => (ev.city || '').toLowerCase().includes(city.toLowerCase()));
  if (type) list = list.filter(ev => ev.type === type);
  list.sort((a, b) => a.date - b.date);
  res.json(list.map(ev => publicEvent(ev, req.user.id)));
});

app.post('/api/events/:id/join', auth, (req, res) => {
  const ev = db.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });
  const i = ev.participants.indexOf(req.user.id);
  if (i >= 0) ev.participants.splice(i, 1);
  else {
    ev.participants.push(req.user.id);
    if (ev.userId !== req.user.id)
      notify(ev.userId, `🙋 ${req.user.name} confirmou presença em "${ev.title}"!`);
  }
  saveDB();
  res.json(publicEvent(ev, req.user.id));
});

app.delete('/api/events/:id', auth, (req, res) => {
  const i = db.events.findIndex(e => e.id === req.params.id && (e.userId === req.user.id || req.user.isAdmin || req.user.role === 'admin'));
  if (i < 0) return res.status(404).json({ error: 'Evento não encontrado.' });
  db.events.splice(i, 1);
  saveDB();
  res.json({ ok: true });
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
  const list = Object.entries(partners).map(([otherId, last]) => ({
    user: publicUser(db.users.find(u => u.id === otherId)),
    lastMessage: last,
    unread: mine.filter(m => m.fromId === otherId && m.toId === req.user.id && !m.read).length
  })).filter(c => c.user).sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
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

// ---- Propostas ----
app.post('/api/proposals', auth, (req, res) => {
  const { toId, type, message } = req.body; // type: contratacao | freela
  if (!toId) return res.status(400).json({ error: 'Destinatário obrigatório.' });
  const target = db.users.find(u => u.id === toId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const prop = {
    id: uid(), fromId: req.user.id, toId, type: type || 'contratacao',
    message: message || '', status: 'pendente', createdAt: Date.now()
  };
  db.proposals.push(prop);
  const label = prop.type === 'freela' ? 'te chamou para um jogo (freela)! ⚽' : 'quer te contratar! 📋';
  notify(toId, `🤝 ${req.user.name} ${label}`);
  db.messages.push({
    id: uid(), fromId: req.user.id, toId,
    text: `📩 PROPOSTA (${prop.type === 'freela' ? 'jogo avulso' : 'contratação'}): ${prop.message || 'Tenho interesse em você!'}`,
    read: false, createdAt: Date.now()
  });
  saveDB();
  res.json(prop);
});

app.get('/api/proposals', auth, (req, res) => {
  const list = db.proposals.filter(p => p.toId === req.user.id || p.fromId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(p => ({
      ...p,
      from: publicUser(db.users.find(u => u.id === p.fromId)),
      to: publicUser(db.users.find(u => u.id === p.toId))
    }));
  res.json(list);
});

app.put('/api/proposals/:id', auth, (req, res) => {
  const prop = db.proposals.find(p => p.id === req.params.id && p.toId === req.user.id);
  if (!prop) return res.status(404).json({ error: 'Proposta não encontrada.' });
  const { status } = req.body; // aceita | recusada
  if (!['aceita', 'recusada'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  prop.status = status;
  notify(prop.fromId, status === 'aceita'
    ? `✅ ${req.user.name} ACEITOU sua proposta! Combine os detalhes no chat.`
    : `❌ ${req.user.name} recusou sua proposta.`);
  saveDB();
  res.json(prop);
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
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)
    .map(publicUser);
  res.json(list);
});

// ============================================================
// PAINEL DO ADMINISTRADOR 🛡️
// ============================================================

// Ativar modo administrador na conta atual (se único usuário ou solicitado)
app.post('/api/admin/claim', auth, (req, res) => {
  req.user.isAdmin = true;
  saveDB();
  res.json({ ok: true, user: publicUser(req.user) });
});

// Estatísticas gerais para o painel admin
app.get('/api/admin/stats', adminAuth, (req, res) => {
  db.stories = db.stories.filter(s => Date.now() - s.createdAt < STORY_TTL);
  const usersByRole = {};
  db.users.forEach(u => { usersByRole[u.role] = (usersByRole[u.role] || 0) + 1; });
  const postsProf = db.posts.filter(p => p.category === 'profissional').length;
  const postsPelada = db.posts.filter(p => p.category !== 'profissional').length;
  const postsVideo = db.posts.filter(p => p.type === 'video').length;
  const postsPhoto = db.posts.filter(p => p.type !== 'video').length;
  const totalLikes = db.posts.reduce((s, p) => s + (p.likes?.length || 0), 0);
  const totalComments = db.comments.length;
  const totalStoryViews = db.stories.reduce((s, st) => s + (st.viewers?.length || 0), 0);
  const eventsPeneira = db.events.filter(e => e.type === 'peneira').length;
  const eventsJogo = db.events.filter(e => e.type !== 'peneira').length;
  const eventsJoined = db.events.reduce((s, e) => s + (e.participants?.length || 0), 0);

  res.json({
    users: {
      total: db.users.length,
      byRole: usersByRole,
      admins: db.users.filter(u => u.isAdmin || u.role === 'admin').length,
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
      peneiras: eventsPeneira,
      jogos: eventsJogo,
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

// 👥 Gerenciamento de Usuários
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

app.put('/api/admin/users/:id', adminAuth, (req, res) => {
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (target.email && target.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && req.body.isAdmin === false) {
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
  if (uidToDelete === req.user.id || (target.email && target.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
    return res.status(400).json({ error: 'Você não pode excluir a conta principal de administrador.' });
  }
  const idx = db.users.findIndex(u => u.id === uidToDelete);

  const userPosts = db.posts.filter(p => p.userId === uidToDelete);
  const userPostIds = new Set(userPosts.map(p => p.id));

  db.users.splice(idx, 1);
  db.posts = db.posts.filter(p => p.userId !== uidToDelete);
  db.stories = db.stories.filter(s => s.userId !== uidToDelete);
  db.events = db.events.filter(e => e.userId !== uidToDelete);
  db.events.forEach(e => {
    e.participants = e.participants.filter(pId => pId !== uidToDelete);
  });
  db.comments = db.comments.filter(c => c.userId !== uidToDelete && !userPostIds.has(c.postId));
  db.postRatings = db.postRatings.filter(r => r.userId !== uidToDelete && !userPostIds.has(r.postId));
  db.follows = db.follows.filter(f => f.fromId !== uidToDelete && f.toId !== uidToDelete);
  db.notifications = db.notifications.filter(n => n.userId !== uidToDelete);
  db.messages = db.messages.filter(m => m.fromId !== uidToDelete && m.toId !== uidToDelete);
  db.proposals = db.proposals.filter(p => p.fromId !== uidToDelete && p.toId !== uidToDelete);
  db.ratings = db.ratings.filter(r => r.fromId !== uidToDelete && r.toId !== uidToDelete);
  for (const token in db.tokens) {
    if (db.tokens[token] === uidToDelete) delete db.tokens[token];
  }
  saveDB();
  res.json({ ok: true });
});

// 📸 Gerenciamento de Posts
app.get('/api/admin/posts', adminAuth, (req, res) => {
  const posts = [...db.posts].sort((a, b) => b.createdAt - a.createdAt)
    .map(p => decoratePost(p, req.user.id));
  res.json(posts);
});

app.put('/api/admin/posts/:id', adminAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
  if (req.body.category) {
    post.category = req.body.category === 'profissional' ? 'profissional' : 'pelada';
  }
  if (req.body.caption !== undefined) post.caption = req.body.caption;
  saveDB();
  res.json(decoratePost(post, req.user.id));
});

app.delete('/api/admin/posts/:id', adminAuth, (req, res) => {
  const i = db.posts.findIndex(p => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Post não encontrado.' });
  const postId = db.posts[i].id;
  db.posts.splice(i, 1);
  db.comments = db.comments.filter(c => c.postId !== postId);
  db.postRatings = db.postRatings.filter(r => r.postId !== postId);
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
  db.events.splice(i, 1);
  saveDB();
  res.json({ ok: true });
});

// 📖 Gerenciamento de Stories
app.get('/api/admin/stories', adminAuth, (req, res) => {
  db.stories = db.stories.filter(s => Date.now() - s.createdAt < STORY_TTL);
  const list = db.stories.sort((a, b) => b.createdAt - a.createdAt).map(s => ({
    ...s,
    user: publicUser(db.users.find(u => u.id === s.userId)),
    viewersCount: s.viewers?.length || 0,
    viewerUsers: (s.viewers || []).map(id => publicUser(db.users.find(u => u.id === id))).filter(Boolean)
  }));
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
  const before = db.stories.length;
  db.stories = db.stories.filter(s => Date.now() - s.createdAt < STORY_TTL);
  const purged = before - db.stories.length;
  saveDB();
  res.json({ ok: true, purged, remaining: db.stories.length });
});

// ---- Download do aplicativo Android (.APK) ----
app.get('/baixar', (req, res) => {
  const apk = path.join(__dirname, '..', 'apk', 'VitrineFC.apk');
  if (!fs.existsSync(apk)) return res.status(404).send('APK não encontrado.');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="VitrineFC.apk"');
  fs.createReadStream(apk).pipe(res);
});

(async () => {
  await ghLoadDB(); // restaura o banco do GitHub, se configurado
  app.listen(PORT, '0.0.0.0', () => console.log(`⚽ Vitrine FC rodando na porta ${PORT}`));
})();
