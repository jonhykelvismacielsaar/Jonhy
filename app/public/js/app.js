/* ============================================================
   VITRINE FC — Aplicativo (frontend)
   ============================================================ */
const $ = s => document.querySelector(s);
const app = $('#app');
let TOKEN = localStorage.getItem('vfc_token') || null;
let ME = null;
let currentTab = 'feed';
let chatPoll = null, badgePoll = null, feedPoll = null;

const ROLES = {
  jogador: { emoji: '🏃', label: 'Jogador' },
  goleiro: { emoji: '🧤', label: 'Goleiro' },
  tecnico: { emoji: '📋', label: 'Técnico' },
  arbitro: { emoji: '🟨', label: 'Árbitro' },
  olheiro: { emoji: '🔎', label: 'Olheiro / Clube' }
};
const POSITIONS = ['Goleiro','Zagueiro','Lateral direito','Lateral esquerdo','Volante','Meia','Ponta direita','Ponta esquerda','Atacante','Centroavante','Técnico','Árbitro'];
const LEVELS = ['Várzea','Amador','Base','Semiprofissional','Profissional'];
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
  return `<span class="post-cat cat-${p.category === 'profissional' ? 'prof' : 'pelada'}">${c.emoji} ${c.label}</span>`;
}

// ---------- helpers ----------
async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (TOKEN) opts.headers['x-token'] = TOKEN;
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const r = await fetch('/api' + path, opts);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(); throw new Error('Sessão expirada'); }
  if (!r.ok) throw new Error(data.error || 'Erro no servidor');
  return data;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'agora';
  if (d < 3600000) return Math.floor(d / 60000) + ' min';
  if (d < 86400000) return Math.floor(d / 3600000) + ' h';
  return Math.floor(d / 86400000) + ' d';
}
function avatarHtml(u, cls = '') {
  if (u && u.photo) return `<img class="avatar ${cls}" src="${esc(u.photo)}" alt="">`;
  return `<div class="avatar avatar-ph ${cls}">${u ? (ROLES[u.role]?.emoji || '⚽') : '⚽'}</div>`;
}
function starsHtml(avg, count) {
  if (!count) return '<span class="stars" style="color:var(--muted)">Sem avaliações</span>';
  return `<span class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} ${avg} (${count})</span>`;
}
function logout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('vfc_token');
  clearInterval(chatPoll); clearInterval(badgePoll);
  renderSplash();
}

// ============================================================
// TELAS DE ENTRADA
// ============================================================
function renderSplash() {
  app.innerHTML = `
    <div class="splash">
      <img class="logo" src="/img/logo.png" alt="Vitrine FC">
      <h1>Vitrine FC</h1>
      <p class="tag">A vitrine onde jogadores, goleiros, técnicos e árbitros são descobertos por olheiros e clubes. 🇧🇷⚽</p>
      <div class="btns">
        <button class="btn btn-primary" onclick="renderRegister()">Criar minha conta</button>
        <button class="btn btn-outline" onclick="renderLogin()">Já tenho conta — Entrar</button>
      </div>
    </div>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="screen" style="padding-top:40px">
      <button class="back" onclick="renderSplash()">‹ Voltar</button>
      <h2>Entrar ⚽</h2>
      <p class="sub">Bom te ver de novo!</p>
      <label>E-mail</label>
      <input id="f-email" type="email" placeholder="seuemail@exemplo.com">
      <label>Senha</label>
      <input id="f-pass" type="password" placeholder="Sua senha">
      <div class="err" id="f-err"></div>
      <button class="btn btn-primary mt" onclick="doLogin()">Entrar</button>
    </div>`;
}
async function doLogin() {
  try {
    const { token, user } = await api('/login', { method: 'POST', body: { email: $('#f-email').value.trim(), password: $('#f-pass').value } });
    TOKEN = token; ME = user;
    localStorage.setItem('vfc_token', token);
    enterApp();
  } catch (e) { $('#f-err').textContent = e.message; }
}

let selRole = null;
function renderRegister() {
  selRole = null;
  app.innerHTML = `
    <div class="screen" style="padding-top:40px">
      <button class="back" onclick="renderSplash()">‹ Voltar</button>
      <h2>Criar conta 🇧🇷</h2>
      <p class="sub">Primeiro: o que você é no futebol?</p>
      <div class="role-grid">
        ${Object.entries(ROLES).map(([k, r]) => `
          <button class="role-card" data-role="${k}" onclick="pickRole('${k}')">
            <span class="emoji">${r.emoji}</span>${r.label}
            <small>${k === 'olheiro' ? 'Quero descobrir e contratar talentos' : 'Quero ser visto e contratado'}</small>
          </button>`).join('')}
      </div>
      <label>Nome completo</label>
      <input id="f-name" placeholder="Seu nome">
      <label>E-mail</label>
      <input id="f-email" type="email" placeholder="seuemail@exemplo.com">
      <label>Senha</label>
      <input id="f-pass" type="password" placeholder="Crie uma senha">
      <div class="err" id="f-err"></div>
      <button class="btn btn-primary mt" onclick="doRegister()">Criar conta e entrar</button>
    </div>`;
}
function pickRole(k) {
  selRole = k;
  document.querySelectorAll('.role-card').forEach(c => c.classList.toggle('sel', c.dataset.role === k));
}
async function doRegister() {
  try {
    if (!selRole) throw new Error('Escolha o que você é no futebol (toque em um cartão acima).');
    const { token, user } = await api('/register', { method: 'POST', body: {
      name: $('#f-name').value.trim(), email: $('#f-email').value.trim(),
      password: $('#f-pass').value, role: selRole } });
    TOKEN = token; ME = user;
    localStorage.setItem('vfc_token', token);
    if (ME.role !== 'olheiro') { renderEditProfile(true); } else { enterApp(); }
  } catch (e) { $('#f-err').textContent = e.message; }
}

// ============================================================
// ESTRUTURA PRINCIPAL (barra + abas)
// ============================================================
async function enterApp() {
  try { ME = await api('/me'); } catch { return; }
  currentTab = 'feed';
  renderShell();
  showTab('feed');
  clearInterval(badgePoll);
  badgePoll = setInterval(refreshBadges, 5000);
  refreshBadges();
}

function renderShell() {
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><img src="/img/logo.png" alt="">Vitrine FC</div>
      <button class="bell" onclick="showTab('notifs')">🔔<span class="badge" id="b-notif" style="display:none"></span></button>
    </div>
    <div class="screen" id="content"></div>
    <div class="nav">
      <button id="nav-feed" onclick="showTab('feed')"><span class="ico">🏟️</span>Feed</button>
      <button id="nav-reels" onclick="showTab('reels')"><span class="ico">🎬</span>Lances</button>
      <button id="nav-events" onclick="showTab('events')"><span class="ico">📍</span>Jogos</button>
      <button id="nav-search" onclick="showTab('search')"><span class="ico">🔎</span>Buscar</button>
      <button id="nav-chat" onclick="showTab('chat')"><span class="ico">💬</span>Chat<span class="badge" id="b-chat" style="display:none"></span></button>
      <button id="nav-profile" onclick="showTab('profile')"><span class="ico">👤</span>Perfil</button>
    </div>`;
}

async function refreshBadges() {
  if (!TOKEN) return;
  try {
    const b = await api('/badges');
    setBadge('b-chat', b.unreadMsgs + b.pendingProps); setBadge('b-notif', b.unreadNotifs);
  } catch {}
}
function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = n > 0 ? '' : 'none';
  el.textContent = n;
}

function showTab(tab) {
  currentTab = tab;
  clearInterval(chatPoll);
  clearInterval(feedPoll);
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
  const nb = document.getElementById('nav-' + tab);
  if (nb) nb.classList.add('on');
  if (tab === 'props') { document.getElementById('nav-chat')?.classList.add('on'); }
  ({ feed: renderFeed, reels: renderReels, events: renderEvents, search: renderSearch, props: renderProps, chat: renderConvs, profile: () => renderProfile(ME.id), notifs: renderNotifs })[tab]();
}

// ============================================================
// FEED
// ============================================================
async function renderFeed() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando o feed… ⚽</p>';
  const [posts, storyGroups, newUsers] = await Promise.all([api('/feed'), api('/stories'), api('/newusers')]);
  drawFeed(c, posts, storyGroups, newUsers);
  // FEED AO VIVO: atualiza sozinho quando entra post, story ou usuário novo
  let lastSig = feedSignature(posts, storyGroups, newUsers);
  clearInterval(feedPoll);
  feedPoll = setInterval(async () => {
    if (currentTab !== 'feed') { clearInterval(feedPoll); return; }
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return; // não interrompe quem digita
    try {
      const [p2, s2, n2] = await Promise.all([api('/feed'), api('/stories'), api('/newusers')]);
      const sig = feedSignature(p2, s2, n2);
      if (sig !== lastSig) {
        lastSig = sig;
        cachePosts(p2);
        window._storyGroups = s2;
        drawFeed(c, p2, s2, n2);
        toast('Feed atualizado! ⚽');
      }
    } catch {}
  }, 10000);
}
function feedSignature(posts, stories, users) {
  return posts.map(p => p.id + ':' + p.likes.length + ':' + p.comments.length + ':' + (p.starsCount || 0)).join('|')
    + '§' + stories.map(g => g.user.id + ':' + g.stories.length).join('|')
    + '§' + users.map(u => u.id).join('|');
}
function drawFeed(c, posts, storyGroups, newUsers) {
  cachePosts(posts);
  window._storyGroups = storyGroups;
  c.innerHTML = `
    <div class="stories-strip">
      ${ME.role !== 'olheiro' ? `
        <div class="story-add upload-btn">
          <div class="story-ring add">${avatarHtml(ME)}<span class="plus">+</span></div>
          <span>Seu story</span>
          <input type="file" accept="image/*,video/*" onchange="newStory(this)">
        </div>` : ''}
      ${storyGroups.map((g, i) => `
        <button class="story-item" onclick="openStories(${i})">
          <div class="story-ring ${g.seenAll ? 'seen' : ''}">${avatarHtml(g.user)}</div>
          <span>${esc((g.user.nickname || g.user.name).split(' ')[0])}</span>
        </button>`).join('')}
    </div>
    ${newUsers && newUsers.length ? `
    <div class="section" style="padding:12px 14px">
      <h4 style="color:var(--yellow);font-size:13px;margin-bottom:8px">🆕 Recém-chegados na Vitrine</h4>
      <div class="trend-strip" style="margin-bottom:0;padding-bottom:2px">
        ${newUsers.map(u => `
          <button class="trend-card" onclick="renderProfile('${u.id}')">
            ${avatarHtml(u)}
            <b>${esc((u.nickname || u.name).split(' ')[0])}</b>
            <span>${ROLES[u.role]?.emoji || ''} ${esc(u.position || ROLES[u.role]?.label || '')}</span>
          </button>`).join('')}
      </div>
    </div>` : ''}
    ${ME.role !== 'olheiro' ? `
      <div class="section" style="display:flex;gap:10px;align-items:center">
        ${avatarHtml(ME)}
        <button class="btn btn-green btn-sm upload-btn" style="flex:1;text-align:left;padding:12px 14px">
          📸🎥 Postar foto ou vídeo jogando…
          <input type="file" accept="image/*,video/*" onchange="newPost(this)">
        </button>
      </div>` : `<p class="sub">👀 Você é olheiro — veja os talentos se apresentando abaixo, toque no nome para ver o perfil completo.</p>`}
    <div id="feed-list">
      ${posts.length ? posts.map(postHtml).join('') : '<div class="empty"><span class="big">🏟️</span>Ainda não há publicações.<br>Seja o primeiro a postar um lance!</div>'}
    </div>`;
}

// ============================================================
// STORIES 📖
// ============================================================
async function newStory(input) {
  const file = input.files[0];
  if (!file) return;
  const caption = prompt('Legenda do story (opcional):') || '';
  const fd = new FormData();
  fd.append('file', file);
  fd.append('caption', caption);
  toast('Publicando story… ⏳');
  try {
    await api('/stories', { method: 'POST', body: fd });
    toast('Story no ar por 24 horas! 📖🔥');
    renderFeed();
  } catch (e) { toast('Erro: ' + e.message); }
}

let storyTimer = null;
function openStories(groupIdx, storyIdx = 0) {
  const groups = window._storyGroups || [];
  const g = groups[groupIdx];
  if (!g) return;
  const s = g.stories[storyIdx];
  if (!s) { closeStories(); return; }
  api(`/stories/${s.id}/view`, { method: 'POST' }).catch(() => {});
  let bg = document.getElementById('story-viewer');
  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'story-viewer';
    bg.className = 'story-viewer';
    document.body.appendChild(bg);
  }
  const next = () => { if (storyIdx + 1 < g.stories.length) openStories(groupIdx, storyIdx + 1); else if (groupIdx + 1 < groups.length) openStories(groupIdx + 1, 0); else closeStories(); };
  const prev = () => { if (storyIdx > 0) openStories(groupIdx, storyIdx - 1); else if (groupIdx > 0) openStories(groupIdx - 1, groups[groupIdx - 1].stories.length - 1); };
  bg.innerHTML = `
    <div class="sv-bars">${g.stories.map((_, i) => `<div class="sv-bar ${i < storyIdx ? 'done' : ''}"><div class="fill" id="sv-fill-${i}"></div></div>`).join('')}</div>
    <div class="sv-head">
      ${avatarHtml(g.user)}
      <div><b>${esc(g.user.name)}</b><span>${timeAgo(s.createdAt)} atrás</span></div>
      ${s.userId === ME.id ? `<button class="sv-del" onclick="delStory('${s.id}')">🗑️</button>` : ''}
      <button class="sv-close" onclick="closeStories()">✕</button>
    </div>
    ${s.type === 'video'
      ? `<video class="sv-media" src="${esc(s.url)}" autoplay playsinline id="sv-video"></video>`
      : `<img class="sv-media" src="${esc(s.url)}">`}
    ${s.caption ? `<div class="sv-caption">${esc(s.caption)}</div>` : ''}
    ${s.userId === ME.id ? `<div class="sv-views">👁️ ${s.viewers.length} visualizações</div>` : ''}
    <button class="sv-tap left"></button>
    <button class="sv-tap right"></button>`;
  bg.querySelector('.sv-tap.left').onclick = prev;
  bg.querySelector('.sv-tap.right').onclick = next;
  clearTimeout(storyTimer);
  const fill = document.getElementById('sv-fill-' + storyIdx);
  if (s.type === 'video') {
    const v = document.getElementById('sv-video');
    v.onended = next;
    v.ontimeupdate = () => { if (fill && v.duration) fill.style.width = (v.currentTime / v.duration * 100) + '%'; };
  } else {
    if (fill) { fill.style.transition = 'width 5s linear'; requestAnimationFrame(() => fill.style.width = '100%'); }
    storyTimer = setTimeout(next, 5000);
  }
}
function closeStories() {
  clearTimeout(storyTimer);
  document.getElementById('story-viewer')?.remove();
}
async function delStory(id) {
  if (!confirm('Excluir este story?')) return;
  await api('/stories/' + id, { method: 'DELETE' });
  closeStories();
  toast('Story excluído');
  renderFeed();
}
function postHtml(p) {
  const liked = p.likes.includes(ME.id);
  const lastComments = p.comments.slice(-2);
  return `
    <div class="post" id="post-${p.id}">
      <div class="head" onclick="renderProfile('${p.user.id}')" style="cursor:pointer">
        ${avatarHtml(p.user)}
        <div class="who">
          <b>${esc(p.user.name)} ${p.user.verified ? '✅' : ''}</b>
          <span>${ROLES[p.user.role]?.emoji || ''} ${esc(p.user.position || ROLES[p.user.role]?.label || '')} · ${esc(p.user.city || '')} · ${timeAgo(p.createdAt)}</span>
        </div>
      </div>
      ${p.type === 'video'
        ? `<video class="media" src="${esc(p.url)}" controls playsinline preload="metadata"></video>`
        : `<img class="media" src="${esc(p.url)}" alt="">`}
      <div class="body">
        <p class="caption">${esc(p.caption)}</p>
        ${postCategoryHtml(p)}
      </div>
      <div class="post-stars">
        <span class="ps-label">Avalie este lance:</span>
        <span class="ps-pick">${[1,2,3,4,5].map(i =>
          `<button class="ps-star ${p.myStars && i <= p.myStars ? 'on' : ''}" onclick="ratePost('${p.id}', ${i})">★</button>`).join('')}</span>
        ${p.starsCount ? `<span class="ps-avg">${p.starsAvg} ⭐ (${p.starsCount})</span>` : ''}
      </div>
      <div class="actions">
        <button class="${liked ? 'liked' : ''}" onclick="likePost('${p.id}')">${liked ? '💛' : '🤍'} ${p.likes.length}</button>
        <button onclick="toggleComments('${p.id}')">💬 ${p.comments.length}</button>
        <button onclick="openChat('${p.user.id}', '${esc(p.user.name)}')">✉️ Chamar</button>
        ${p.userId === ME.id ? `<button style="color:var(--danger)" onclick="delPost('${p.id}')">🗑️</button>` : ''}
      </div>
      <div class="comments" id="comments-${p.id}" data-open="0">
        ${p.comments.length > 2 ? `<button class="see-all" onclick="toggleComments('${p.id}')">Ver todos os ${p.comments.length} comentários</button>` : ''}
        <div class="c-list" id="clist-${p.id}">
          ${lastComments.map(commentHtml).join('')}
        </div>
        <div class="c-input">
          ${avatarHtml(ME, 'sm')}
          <input id="cin-${p.id}" placeholder="Comente este lance…" onkeydown="if(event.key==='Enter')sendComment('${p.id}')">
          <button onclick="sendComment('${p.id}')">➤</button>
        </div>
      </div>
    </div>`;
}
function commentHtml(c) {
  return `<div class="comment" id="c-${c.id}">
    <b onclick="renderProfile('${c.user.id}')">${esc(c.user?.name || '?')}</b> ${esc(c.text)}
    <span class="c-when">${timeAgo(c.createdAt)}${c.userId === ME.id ? ` · <a onclick="delComment('${c.id}')">excluir</a>` : ''}</span>
  </div>`;
}

const postCache = {};
function cachePosts(posts) { posts.forEach(p => postCache[p.id] = p); }
function mediaGridHtml(list) {
  return `<div class="media-grid">${list.map(p => `
    <button class="cell" onclick="openMedia('${esc(p.url)}', '${p.type}')">
      ${p.type === 'video' ? `<video src="${esc(p.url)}" preload="metadata"></video><span class="play">▶️</span>` : `<img src="${esc(p.url)}">`}
    </button>`).join('')}</div>`;
}

function toggleComments(id) {
  const box = document.getElementById('comments-' + id);
  const p = postCache[id];
  if (!box || !p) return;
  const open = box.dataset.open === '1';
  box.dataset.open = open ? '0' : '1';
  document.getElementById('clist-' + id).innerHTML =
    (open ? p.comments.slice(-2) : p.comments).map(commentHtml).join('');
  const seeAll = box.querySelector('.see-all');
  if (seeAll) seeAll.style.display = open ? '' : 'none';
  if (!open) document.getElementById('cin-' + id)?.focus();
}
async function sendComment(id) {
  const input = document.getElementById('cin-' + id);
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const c = await api(`/posts/${id}/comments`, { method: 'POST', body: { text } });
  const p = postCache[id];
  if (p) p.comments.push(c);
  document.getElementById('clist-' + id)?.insertAdjacentHTML('beforeend', commentHtml(c));
  toast('Comentário publicado! 💬');
}
async function delComment(cid) {
  await api('/comments/' + cid, { method: 'DELETE' });
  document.getElementById('c-' + cid)?.remove();
  Object.values(postCache).forEach(p => { p.comments = p.comments.filter(c => c.id !== cid); });
}
async function ratePost(id, stars) {
  const p = await api(`/posts/${id}/rate`, { method: 'POST', body: { stars } });
  postCache[id] = p;
  const el = document.getElementById('post-' + id);
  if (el) {
    const picks = el.querySelectorAll('.ps-star');
    picks.forEach((b, i) => b.classList.toggle('on', i < stars));
    const avg = el.querySelector('.ps-avg');
    const html = `${p.starsAvg} ⭐ (${p.starsCount})`;
    if (avg) avg.innerHTML = html;
    else el.querySelector('.post-stars').insertAdjacentHTML('beforeend', `<span class="ps-avg">${html}</span>`);
  }
  toast(`Você deu ${stars} estrela(s)! ⭐`);
}
async function likePost(id) {
  const p = await api(`/posts/${id}/like`, { method: 'POST' });
  const cached = postCache[id];
  if (cached) cached.likes = p.likes;
  const el = document.querySelector(`#post-${id} .actions button`) || document.querySelector(`#reel-${id} .r-like`);
  if (el) {
    const liked = p.likes.includes(ME.id);
    el.classList.toggle('liked', liked);
    el.innerHTML = el.classList.contains('r-like')
      ? `${liked ? '💛' : '🤍'}<i>${p.likes.length}</i>`
      : `${liked ? '💛' : '🤍'} ${p.likes.length}`;
  }
}
async function delPost(id) { if (confirm('Excluir esta publicação?')) { await api(`/posts/${id}`, { method: 'DELETE' }); renderFeed(); toast('Publicação excluída'); } }
function askPostCategory(cb) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>⚽ Onde foi esse lance?</h3>
      <p class="sub" style="margin-bottom:14px">Escolha a categoria da sua publicação:</p>
      <button class="btn btn-primary cat-opt" style="margin-bottom:10px" data-cat="profissional">🏆 Jogo profissional/campeonato</button>
      <button class="btn btn-green cat-opt" style="margin-bottom:10px" data-cat="pelada">🎉 Pelada/várzea</button>
      <button class="btn btn-outline mt" id="cat-cancel">Cancelar</button>
    </div>`;
  bg.querySelectorAll('.cat-opt').forEach(b => b.onclick = () => { bg.remove(); cb(b.dataset.cat); });
  bg.querySelector('#cat-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
}
async function newPost(input) {
  const file = input.files[0];
  if (!file) return;
  askPostCategory(async (category) => {
    const caption = prompt('Escreva uma legenda (ex: "Golaço no jogo de domingo!"):') || '';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    fd.append('category', category);
    toast('Enviando… aguarde ⏳');
    try {
      await api('/posts', { method: 'POST', body: fd });
      toast('Publicado! 🎉');
      renderFeed();
    } catch (e) { toast('Erro: ' + e.message); }
  });
}

// ============================================================
// REELS — LANCES 🎬 (vídeos em tela cheia, estilo Instagram)
// ============================================================
async function renderReels() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando lances… 🎬</p>';
  const reels = await api('/reels');
  cachePosts(reels);
  if (!reels.length) {
    c.innerHTML = `<div class="empty"><span class="big">🎬</span><b>Ainda não há vídeos de lances.</b><br><br>
      Os vídeos postados no Feed aparecem aqui em tela cheia, estilo Reels — a vitrine perfeita pros olheiros verem você jogando!<br><br>
      ${ME.role !== 'olheiro' ? 'Vá no Feed e poste seu primeiro vídeo! ⚽' : 'Avise os jogadores para postarem vídeos!'}</div>`;
    return;
  }
  c.innerHTML = `<div class="reels" id="reels">${reels.map(reelHtml).join('')}</div>`;
  // play/pause automático conforme o vídeo aparece na tela
  const vids = c.querySelectorAll('.reel video');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting && e.intersectionRatio > 0.6) { v.play().catch(() => {}); }
      else v.pause();
    });
  }, { threshold: [0.6] });
  vids.forEach(v => obs.observe(v));
}
function reelHtml(p) {
  const liked = p.likes.includes(ME.id);
  return `
    <div class="reel" id="reel-${p.id}">
      <video src="${esc(p.url)}" loop playsinline preload="metadata" onclick="this.paused ? this.play() : this.pause()"></video>
      <div class="r-side">
        <button class="r-like ${liked ? 'liked' : ''}" onclick="likePost('${p.id}')">${liked ? '💛' : '🤍'}<i>${p.likes.length}</i></button>
        <button onclick="openReelComments('${p.id}')">💬<i>${p.comments.length}</i></button>
        <button onclick="openReelStars('${p.id}')">⭐<i>${p.starsAvg ?? '—'}</i></button>
        <button onclick="openChat('${p.user.id}', '${esc(p.user.name)}')">✉️<i>chat</i></button>
      </div>
      <div class="r-info" onclick="renderProfile('${p.user.id}')">
        ${avatarHtml(p.user)}
        <div>
          <b>${esc(p.user.name)} ${p.user.verified ? '✅' : ''}</b>
          <span>${ROLES[p.user.role]?.emoji || ''} ${esc(p.user.position || '')}${p.user.city ? ' · ' + esc(p.user.city) : ''}</span>
          <p>${esc(p.caption)}</p>
          ${postCategoryHtml(p)}
        </div>
      </div>
    </div>`;
}
function openReelStars(id) {
  const p = postCache[id];
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>⭐ Avalie este lance</h3>
      <div class="star-pick">${[1,2,3,4,5].map(i => `<span data-s="${i}" class="${p.myStars && i <= p.myStars ? 'on' : ''}">⭐</span>`).join('')}</div>
      <p style="text-align:center;color:var(--muted);font-size:13px">${p.starsCount ? `Média: ${p.starsAvg} ⭐ (${p.starsCount} avaliações)` : 'Seja o primeiro a avaliar!'}</p>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelectorAll('.star-pick span').forEach(s => s.onclick = async () => {
    await ratePost(id, +s.dataset.s);
    bg.remove();
    const badge = document.querySelector(`#reel-${id} .r-side button:nth-child(3) i`);
    if (badge) badge.textContent = postCache[id].starsAvg;
  });
  document.body.appendChild(bg);
}
function openReelComments(id) {
  const p = postCache[id];
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>💬 Comentários (${p.comments.length})</h3>
      <div class="c-list" id="rc-list" style="max-height:45dvh;overflow-y:auto">
        ${p.comments.length ? p.comments.map(commentHtml).join('') : '<p style="color:var(--muted);font-size:14px">Nenhum comentário ainda. Comente primeiro!</p>'}
      </div>
      <div class="c-input" style="margin-top:12px">
        ${avatarHtml(ME, 'sm')}
        <input id="rc-in" placeholder="Comente este lance…">
        <button id="rc-send">➤</button>
      </div>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  const send = async () => {
    const text = bg.querySelector('#rc-in').value.trim();
    if (!text) return;
    bg.querySelector('#rc-in').value = '';
    const cm = await api(`/posts/${id}/comments`, { method: 'POST', body: { text } });
    p.comments.push(cm);
    bg.querySelector('#rc-list').insertAdjacentHTML('beforeend', commentHtml(cm));
    const badge = document.querySelector(`#reel-${id} .r-side button:nth-child(2) i`);
    if (badge) badge.textContent = p.comments.length;
  };
  bg.querySelector('#rc-send').onclick = send;
  bg.querySelector('#rc-in').onkeydown = e => { if (e.key === 'Enter') send(); };
  document.body.appendChild(bg);
}

// ============================================================
// PENEIRAS E JOGOS ABERTOS 📍
// ============================================================
let evMap = null, evView = 'list';
async function renderEvents() {
  const c = $('#content');
  c.innerHTML = `
    <h2>Peneiras & Jogos 📍</h2>
    <p class="sub">Peneiras, avaliações e jogos abertos perto de você. Divulgue o seu!</p>
    <div class="row2">
      <button class="btn btn-primary btn-sm" onclick="openNewEvent()">➕ Divulgar peneira/jogo</button>
      <button class="btn btn-green btn-sm" id="ev-toggle" onclick="toggleEvView()">${evView === 'list' ? '🗺️ Ver no mapa' : '📋 Ver lista'}</button>
    </div>
    <div class="filters mt">
      <input id="ev-city" placeholder="📍 Filtrar por cidade…" oninput="loadEvents()">
      <select id="ev-type" onchange="loadEvents()">
        <option value="">Peneiras e jogos</option>
        <option value="peneira">🥅 Só peneiras</option>
        <option value="jogo">⚽ Só jogos abertos</option>
      </select>
    </div>
    <div id="ev-map" style="display:${evView === 'map' ? 'block' : 'none'}"></div>
    <div id="ev-list"></div>`;
  loadEvents();
}
function toggleEvView() {
  evView = evView === 'list' ? 'map' : 'list';
  $('#ev-map').style.display = evView === 'map' ? 'block' : 'none';
  $('#ev-list').style.display = evView === 'map' ? 'none' : 'block';
  $('#ev-toggle').textContent = evView === 'list' ? '🗺️ Ver no mapa' : '📋 Ver lista';
  if (evView === 'map') setTimeout(() => { evMap && evMap.invalidateSize(); }, 100);
}
let evTimer = null;
function loadEvents() {
  clearTimeout(evTimer);
  evTimer = setTimeout(async () => {
    const params = new URLSearchParams();
    if ($('#ev-city')?.value) params.set('city', $('#ev-city').value);
    if ($('#ev-type')?.value) params.set('type', $('#ev-type').value);
    const events = await api('/events?' + params);
    window._events = events;
    renderEventList(events);
    renderEventMap(events);
  }, 250);
}
function eventCardHtml(ev) {
  const d = new Date(ev.date);
  const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="event-card">
      <div class="ev-top">
        <span class="pill ${ev.type === 'peneira' ? 'green' : ''}">${ev.type === 'peneira' ? '🥅 PENEIRA' : '⚽ JOGO ABERTO'}</span>
        <span class="ev-date">📅 ${dateStr}</span>
      </div>
      <b class="ev-title">${esc(ev.title)}</b>
      <p class="ev-desc">${esc(ev.description)}</p>
      <div class="ev-meta">
        📍 ${esc(ev.place ? ev.place + ' — ' : '')}${esc(ev.city)}${ev.state ? '/' + esc(ev.state) : ''}
        ${ev.fee ? ` · 💰 ${esc(ev.fee)}` : ''}
      </div>
      <div class="ev-meta">👤 Organizado por <b style="color:var(--yellow-soft);cursor:pointer" onclick="renderProfile('${ev.creator?.id}')">${esc(ev.creator?.name || '?')}</b> · 🙋 ${ev.participants.length} confirmado(s)</div>
      <div class="row2 mt" style="margin-top:10px">
        <button class="btn ${ev.joined ? 'btn-green' : 'btn-primary'} btn-sm" onclick="joinEvent('${ev.id}')">${ev.joined ? '✔️ Presença confirmada' : '🙋 Vou participar!'}</button>
        ${ev.userId === ME.id
          ? `<button class="btn btn-danger btn-sm" onclick="delEvent('${ev.id}')">🗑️ Excluir</button>`
          : `<button class="btn btn-green btn-sm" onclick="openChat('${ev.creator?.id}', '${esc(ev.creator?.name || '')}')">💬 Falar c/ organizador</button>`}
      </div>
    </div>`;
}
function renderEventList(events) {
  const el = $('#ev-list');
  if (!el) return;
  el.innerHTML = events.length ? events.map(eventCardHtml).join('')
    : '<div class="empty"><span class="big">📍</span>Nenhuma peneira ou jogo encontrado.<br>Divulgue o primeiro da sua cidade!</div>';
}
function renderEventMap(events) {
  const el = $('#ev-map');
  if (!el || typeof L === 'undefined') return;
  if (evMap) { evMap.remove(); evMap = null; }
  evMap = L.map('ev-map').setView([-14.2, -55.9], 4.5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(evMap);
  const withCoords = events.filter(e => e.lat && e.lng);
  withCoords.forEach(ev => {
    const m = L.marker([ev.lat, ev.lng]).addTo(evMap);
    m.bindPopup(`<b>${ev.type === 'peneira' ? '🥅' : '⚽'} ${esc(ev.title)}</b><br>${esc(ev.city)} · ${new Date(ev.date).toLocaleDateString('pt-BR')}<br><a href="#" onclick="evView='list';toggleEvView();return false">ver na lista</a>`);
  });
  if (withCoords.length) evMap.fitBounds(withCoords.map(e => [e.lat, e.lng]), { padding: [40, 40], maxZoom: 11 });
}
async function joinEvent(id) {
  const ev = await api(`/events/${id}/join`, { method: 'POST' });
  toast(ev.joined ? 'Presença confirmada! 🙋⚽' : 'Presença cancelada.');
  loadEvents();
}
async function delEvent(id) {
  if (!confirm('Excluir este evento?')) return;
  await api('/events/' + id, { method: 'DELETE' });
  toast('Evento excluído');
  loadEvents();
}
function openNewEvent() {
  let pick = null, pickMap = null, marker = null;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>➕ Divulgar peneira ou jogo</h3>
      <label>Tipo</label>
      <select id="ne-type">
        <option value="peneira">🥅 Peneira / avaliação de atletas</option>
        <option value="jogo">⚽ Jogo aberto (precisa de jogadores)</option>
      </select>
      <label>Título</label>
      <input id="ne-title" placeholder="Ex: Peneira Sub-17 / Precisa-se de goleiro domingo">
      <label>Descrição</label>
      <textarea id="ne-desc" rows="2" placeholder="Detalhes: o que levar, posições, horário…"></textarea>
      <div class="row2">
        <div><label>Cidade</label><input id="ne-city" value="${esc(ME.city || '')}"></div>
        <div><label>UF</label><input id="ne-state" value="${esc(ME.state || '')}" maxlength="2"></div>
      </div>
      <label>Local (campo, arena…)</label>
      <input id="ne-place" placeholder="Ex: Campo Municipal">
      <div class="row2">
        <div><label>Data e hora</label><input id="ne-date" type="datetime-local"></div>
        <div><label>Custo (opcional)</label><input id="ne-fee" placeholder="Gratuito / R$ 20"></div>
      </div>
      <label>📍 Toque no mapa para marcar o local (opcional)</label>
      <div id="ne-map"></div>
      <button class="btn btn-primary mt" id="ne-send">Publicar 📢</button>
      <button class="btn btn-outline mt" id="ne-cancel">Cancelar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#ne-cancel').onclick = () => bg.remove();
  document.body.appendChild(bg);
  setTimeout(() => {
    if (typeof L === 'undefined') return;
    pickMap = L.map('ne-map').setView([-14.2, -55.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(pickMap);
    pickMap.on('click', e => {
      pick = e.latlng;
      if (marker) marker.setLatLng(pick); else marker = L.marker(pick).addTo(pickMap);
    });
  }, 150);
  bg.querySelector('#ne-send').onclick = async () => {
    try {
      const dateVal = bg.querySelector('#ne-date').value;
      await api('/events', { method: 'POST', body: {
        type: bg.querySelector('#ne-type').value,
        title: bg.querySelector('#ne-title').value.trim(),
        description: bg.querySelector('#ne-desc').value.trim(),
        city: bg.querySelector('#ne-city').value.trim(),
        state: bg.querySelector('#ne-state').value.trim(),
        place: bg.querySelector('#ne-place').value.trim(),
        date: dateVal ? new Date(dateVal).getTime() : null,
        fee: bg.querySelector('#ne-fee').value.trim(),
        lat: pick?.lat, lng: pick?.lng
      } });
      bg.remove();
      toast('Publicado! 📢⚽');
      loadEvents();
    } catch (e) { toast('Erro: ' + e.message); }
  };
}

// ============================================================
// BUSCA
// ============================================================
async function renderSearch() {
  const c = $('#content');
  c.innerHTML = `
    <h2>Buscar talentos 🔎</h2>
    <p class="sub">Encontre talentos em todo o Brasil. Toque em 🆚 em dois jogadores para compará-los lado a lado!</p>
    <div id="trending"></div>
    <div class="filters">
      <input class="full" id="s-q" placeholder="🔎 Nome, apelido, time…" oninput="doSearch()">
      <select id="s-role" onchange="doSearch()">
        <option value="">Todos os tipos</option>
        <option value="jogador">🏃 Jogadores</option>
        <option value="goleiro">🧤 Goleiros</option>
        <option value="tecnico">📋 Técnicos</option>
        <option value="arbitro">🟨 Árbitros</option>
      </select>
      <select id="s-pos" onchange="doSearch()">
        <option value="">Todas as posições</option>
        ${POSITIONS.map(p => `<option>${p}</option>`).join('')}
      </select>
      <input id="s-city" placeholder="Cidade" oninput="doSearch()">
      <select id="s-level" onchange="doSearch()">
        <option value="">Todos os níveis</option>
        ${LEVELS.map(l => `<option>${l}</option>`).join('')}
      </select>
      <label class="check full" style="margin:0"><input type="checkbox" id="s-freela" onchange="doSearch()"> ⚡ Só disponíveis para jogo avulso (freela)</label>
    </div>
    <div id="s-results"></div>`;
  doSearch();
  loadTrending();
}

// ---------- Comparador 🆚 ----------
let compareSel = [];
function addCompare(id, name) {
  event.stopPropagation();
  if (compareSel.find(c => c.id === id)) { compareSel = compareSel.filter(c => c.id !== id); toast(`${name} removido do comparador`); return; }
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
  const rows = [
    ['Nota geral (OVR)', u1.overall, u2.overall],
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
    <div class="modal" style="border-radius:22px">
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
      <button class="btn btn-outline mt" id="vs-close">Fechar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#vs-close').onclick = () => bg.remove();
  document.body.appendChild(bg);
}
async function loadTrending() {
  try {
    const list = await api('/trending');
    const el = $('#trending');
    if (!el || !list.length) return;
    el.innerHTML = `
      <h4 style="color:var(--yellow);font-size:14px;margin-bottom:8px">🔥 Craques em alta</h4>
      <div class="trend-strip">
        ${list.map((u, i) => `
          <button class="trend-card" onclick="renderProfile('${u.id}')">
            <span class="rank">${['🥇','🥈','🥉'][i] || '#' + (i + 1)}</span>
            ${avatarHtml(u)}
            <b>${esc((u.nickname || u.name).split(' ')[0])}</b>
            <span>${esc(u.position || '')}</span>
          </button>`).join('')}
      </div>`;
  } catch {}
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
    if ($('#s-freela').checked) params.set('freela', '1');
    const users = await api('/search?' + params);
    $('#s-results').innerHTML = users.length ? users.map(u => `
      <div class="player-card" onclick="renderProfile('${u.id}')" style="cursor:pointer">
        ${avatarHtml(u)}
        <div class="info">
          <b>${esc(u.name)} ${u.verified ? '✅' : ''} <span class="ovr-mini">${u.overall}</span></b>
          <div class="meta">${ROLES[u.role]?.emoji || ''} ${esc(u.position || ROLES[u.role]?.label || '')}${u.level ? ' · ' + esc(u.level) : ''}${u.city ? ' · ' + esc(u.city) + '/' + esc(u.state || '') : ''}</div>
          <div style="margin-top:4px">${starsHtml(u.ratingAvg, u.ratingCount)}</div>
          <div style="margin-top:5px">
            ${u.availableHire ? '<span class="pill green">Disponível p/ contrato</span>' : ''}
            ${u.availableFreela ? '<span class="pill">⚡ Freela' + (u.fee ? ' · ' + esc(u.fee) : '') + '</span>' : ''}
          </div>
        </div>
        <button class="vs-btn" onclick="addCompare('${u.id}', '${esc(u.name.split(' ')[0])}')">🆚</button>
      </div>`).join('')
      : '<div class="empty"><span class="big">🥅</span>Nenhum talento encontrado com esses filtros.</div>';
  }, 250);
}

// ============================================================
// PERFIL
// ============================================================
async function renderProfile(userId) {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando perfil… ⚽</p>';
  const { user: u, posts, ratings, iFollow, achievements } = await api('/users/' + userId);
  window._lastProfile = { user: u, achievements: achievements || [] };
  cachePosts(posts);
  const mine = u.id === ME.id;
  const videos = posts.filter(p => p.type === 'video').length;
  const postsProf = posts.filter(p => p.category === 'profissional');
  const postsPelada = posts.filter(p => p.category !== 'profissional');
  const totalLikes = posts.reduce((s, p) => s + p.likes.length, 0);
  const earned = (achievements || []).filter(a => a.earned);
  c.innerHTML = `
    ${!mine ? `<button class="back" onclick="showTab('${currentTab === 'profile' ? 'search' : currentTab}')">‹ Voltar</button>` : ''}
    <div class="profile-head">
      ${u.role !== 'olheiro' ? `<div class="overall-badge"><b>${u.overall}</b><span>OVR</span></div>` : ''}
      ${mine ? `
        <div class="upload-btn" style="display:inline-block">
          ${avatarHtml(u, 'lg')}
          <input type="file" accept="image/*" onchange="newProfilePhoto(this)">
          <div style="font-size:11px;color:var(--muted);margin-top:4px">toque na foto para trocar</div>
        </div>` : avatarHtml(u, 'lg')}
      <h3>${esc(u.name)} ${u.verified ? '✅' : ''}</h3>
      ${u.nickname ? `<div class="nick">"${esc(u.nickname)}"</div>` : ''}
      <div class="loc">${ROLES[u.role]?.emoji || ''} ${esc(u.position || ROLES[u.role]?.label || '')}${u.positions2 ? ' · também: ' + esc(u.positions2) : ''}</div>
      <div class="loc">${u.city ? '📍 ' + esc(u.city) + '/' + esc(u.state || '') : ''} ${u.level ? ' · ' + esc(u.level) : ''}</div>
      <div style="margin-top:6px">${starsHtml(u.ratingAvg, u.ratingCount)}</div>
      <div class="follow-row">
        <span><b id="p-followers">${u.followers}</b> seguidores</span>
        <span><b>${u.following}</b> seguindo</span>
        <span><b>${totalLikes}</b> curtidas</span>
      </div>
      ${!mine ? `<button class="btn ${iFollow ? 'btn-green' : 'btn-primary'} btn-sm mt" id="p-follow" onclick="toggleFollow('${u.id}')">${iFollow ? '✔️ Seguindo' : '➕ Seguir'}</button>` : ''}
      <div style="margin-top:8px">
        ${u.availableHire ? '<span class="pill green">✅ Disponível p/ contratação</span>' : ''}
        ${u.availableFreela ? '<span class="pill">⚡ Freela' + (u.fee ? ' · ' + esc(u.fee) : '') + '</span>' : ''}
      </div>
    </div>

    ${u.role !== 'olheiro' ? `
    <div class="stat-grid">
      <div class="stat"><b>${u.age ?? '—'}</b><span>idade</span></div>
      <div class="stat"><b>${u.height ? u.height + ' cm' : '—'}</b><span>altura</span></div>
      <div class="stat"><b>${u.foot || '—'}</b><span>perna boa</span></div>
    </div>
    ${u.stats ? `
    <div class="section">
      <h4>📊 Estatísticas de carreira</h4>
      <div class="stat-grid" style="margin:6px 0 0">
        <div class="stat"><b>${u.stats.jogos || 0}</b><span>jogos</span></div>
        ${u.role === 'goleiro' || u.position === 'Goleiro' ? `
          <div class="stat"><b>${u.stats.defesas || 0}</b><span>defesas</span></div>
          <div class="stat"><b>${u.stats.penaltisDefendidos || 0}</b><span>pênaltis pegos</span></div>
          <div class="stat"><b>${u.stats.jogosSemSofrerGol || 0}</b><span>jogos s/ sofrer gol</span></div>
          <div class="stat"><b>${u.stats.gols || 0}</b><span>gols</span></div>` : `
          <div class="stat"><b>${u.stats.gols || 0}</b><span>gols</span></div>
          <div class="stat"><b>${u.stats.assistencias || 0}</b><span>assistências</span></div>`}
        <div class="stat"><b>${u.stats.titulos || 0}</b><span>títulos</span></div>
      </div>
    </div>` : ''}
    ${u.scoutViews ? `<div class="section" style="text-align:center"><p>👀 <b style="color:var(--yellow)">${u.scoutViews}</b> visita(s) de olheiros neste perfil</p></div>` : ''}` : ''}

    ${mine ? `
      <div class="row2">
        <button class="btn btn-green btn-sm" onclick="renderEditProfile()">✏️ Editar perfil</button>
        <button class="btn btn-primary btn-sm" onclick="shareProfile('${u.id}')">🔗 Compartilhar</button>
      </div>
      <button class="btn btn-danger btn-sm mt" style="width:100%" onclick="logout()">Sair da conta</button>` : `
      <div class="row2">
        <button class="btn btn-primary btn-sm" onclick="openProposal('${u.id}', '${esc(u.name)}')">🤝 Contratar / Chamar p/ jogo</button>
        <button class="btn btn-green btn-sm" onclick="openChat('${u.id}', '${esc(u.name)}')">💬 Conversar</button>
      </div>
      <button class="btn btn-outline btn-sm mt" style="width:100%" onclick="openRating('${u.id}', '${esc(u.name)}')">⭐ Avaliar</button>`}

    ${u.role !== 'olheiro' ? `
      <div class="row2 mt">
        <button class="btn btn-primary btn-sm" onclick="openFifaCard()">🃏 Card estilo FIFA</button>
        <button class="btn btn-green btn-sm" onclick="openResumePdf()">📄 Currículo em PDF</button>
      </div>` : ''}

    ${achievements && achievements.length ? `
    <div class="section mt">
      <h4>🏅 Conquistas (${earned.length}/${achievements.length})</h4>
      <div class="medal-grid">
        ${achievements.map(a => `
          <div class="medal ${a.earned ? 'earned' : 'locked'}" title="${esc(a.desc)}">
            <span class="m-emoji">${a.earned ? a.emoji : '🔒'}</span>
            <b>${esc(a.title)}</b>
            <span class="m-desc">${esc(a.desc)}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${u.bio ? `<div class="section mt"><h4>Sobre</h4><p>${esc(u.bio)}</p></div>` : ''}
    ${u.strengths ? `<div class="section"><h4>💪 Pontos fortes</h4><p>${u.strengths.split(',').map(s => '<span class="pill">' + esc(s.trim()) + '</span>').join('')}</p></div>` : ''}
    ${u.teams ? `<div class="section"><h4>🏆 Times por onde passou</h4><p>${esc(u.teams)}</p></div>` : ''}

    <div class="section">
      <h4>🎥 Mídia (${posts.length}) — ${videos} vídeo(s)</h4>
      <div class="gal-group">
        <h5>🏆 Lances em jogos profissionais (${postsProf.length})</h5>
        ${postsProf.length ? mediaGridHtml(postsProf)
          : `<p style="color:var(--muted);font-size:13.5px">${mine ? 'Ainda não postou lances em jogos profissionais. Poste no Feed! ⚽' : 'Nenhum lance em jogos profissionais ainda.'}</p>`}
      </div>
      <div class="gal-group">
        <h5>🎉 Lances de pelada/várzea (${postsPelada.length})</h5>
        ${postsPelada.length ? mediaGridHtml(postsPelada)
          : `<p style="color:var(--muted);font-size:13.5px">${mine ? 'Ainda não postou lances de pelada/várzea. Poste no Feed! ⚽' : 'Nenhum lance de pelada/várzea ainda.'}</p>`}
      </div>
    </div>

    ${ratings.length ? `<div class="section"><h4>⭐ Avaliações</h4>${ratings.map(r => `
      <p style="margin-bottom:8px"><b>${esc(r.from?.name || '')}</b> — <span class="stars">${'★'.repeat(r.stars)}</span><br><span style="color:var(--muted)">${esc(r.comment)}</span></p>`).join('')}</div>` : ''}`;
}

// ============================================================
// CARD ESTILO FUT/FIFA 🃏
// ============================================================
const POS_ABBR = { 'Goleiro': 'GOL', 'Zagueiro': 'ZAG', 'Lateral direito': 'LD', 'Lateral esquerdo': 'LE', 'Volante': 'VOL', 'Meia': 'MEI', 'Ponta direita': 'PD', 'Ponta esquerda': 'PE', 'Atacante': 'ATA', 'Centroavante': 'CA', 'Técnico': 'TEC', 'Árbitro': 'ARB' };

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
  const isGK = u.role === 'goleiro' || u.position === 'Goleiro';
  const st = u.stats || {};

  // fundo do card (dourado FUT)
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#f8e08e'); g.addColorStop(.45, '#e8c356'); g.addColorStop(1, '#b8860b');
  x.beginPath();
  x.moveTo(60, 30); x.lineTo(W - 60, 30); x.quadraticCurveTo(W - 30, 30, W - 30, 70);
  x.lineTo(W - 30, 700); x.quadraticCurveTo(W - 30, 760, W / 2, 870);
  x.quadraticCurveTo(30, 760, 30, 700); x.lineTo(30, 70); x.quadraticCurveTo(30, 30, 60, 30);
  x.closePath(); x.fillStyle = g; x.fill();
  x.lineWidth = 6; x.strokeStyle = '#8a6508'; x.stroke();

  // faixa Brasil
  x.fillStyle = 'rgba(10,92,54,.25)';
  x.fillRect(30, 430, W - 60, 6);

  const dark = '#3d2e05';
  // OVR + posição
  x.fillStyle = dark; x.textAlign = 'left';
  x.font = '900 110px Arial'; x.fillText(u.overall || 60, 65, 175);
  x.font = '900 44px Arial'; x.fillText(POS_ABBR[u.position] || (u.position || '?').slice(0, 3).toUpperCase(), 72, 228);
  x.font = '700 26px Arial'; x.fillText((u.state || 'BR'), 78, 268);

  // foto do jogador
  try {
    const img = await loadImg(u.photo || '/img/logo.png');
    x.save();
    x.beginPath(); x.arc(390, 250, 160, 0, Math.PI * 2); x.clip();
    const s = Math.max(320 / img.width, 320 / img.height);
    x.drawImage(img, 390 - img.width * s / 2, 250 - img.height * s / 2, img.width * s, img.height * s);
    x.restore();
    x.beginPath(); x.arc(390, 250, 160, 0, Math.PI * 2);
    x.lineWidth = 8; x.strokeStyle = '#8a6508'; x.stroke();
  } catch {}

  // logo
  try {
    const logo = await loadImg('/img/logo.png');
    x.drawImage(logo, 60, 300, 72, 72);
  } catch {}

  // nome
  x.textAlign = 'center'; x.fillStyle = dark;
  const name = (u.nickname || u.name || '').toUpperCase();
  x.font = `900 ${name.length > 14 ? 40 : 52}px Arial`;
  x.fillText(name, W / 2, 505);

  // estatísticas (6, estilo FUT)
  const stats = isGK ? [
    ['JOG', st.jogos || 0], ['DEF', st.defesas || 0], ['PEN', st.penaltisDefendidos || 0],
    ['SG', st.jogosSemSofrerGol || 0], ['TIT', st.titulos || 0], ['SEG', u.followers || 0]
  ] : [
    ['JOG', st.jogos || 0], ['GOL', st.gols || 0], ['ASS', st.assistencias || 0],
    ['TIT', st.titulos || 0], ['⭐', u.ratingAvg || '—'], ['SEG', u.followers || 0]
  ];
  x.textAlign = 'left';
  stats.forEach(([label, val], i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const sx = 105 + col * 260, sy = 585 + row * 62;
    x.font = '900 40px Arial'; x.fillStyle = dark;
    x.fillText(String(val), sx, sy);
    x.font = '700 26px Arial'; x.fillStyle = '#6b5104';
    x.fillText(label, sx + 105, sy);
  });
  // divisor central
  x.fillStyle = 'rgba(61,46,5,.35)'; x.fillRect(W / 2 - 1, 560, 2, 180);

  // rodapé
  x.textAlign = 'center'; x.font = '700 22px Arial'; x.fillStyle = '#6b5104';
  const medals = (achievements || []).filter(a => a.earned).slice(0, 5).map(a => a.emoji).join(' ');
  x.fillText(`${medals}  VITRINE FC  ⚽`, W / 2, 815);
  return cv;
}

async function openFifaCard() {
  const { user: u, achievements } = window._lastProfile || {};
  if (!u) return;
  toast('Gerando seu card… 🃏');
  const cv = await drawFifaCard(u, achievements);
  const url = cv.toDataURL('image/png');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.style.alignItems = 'center';
  bg.innerHTML = `
    <div class="modal" style="border-radius:22px;text-align:center">
      <h3>🃏 Card de ${esc(u.nickname || u.name)}</h3>
      <img src="${url}" style="width:100%;max-width:320px;border-radius:14px">
      <a class="btn btn-primary mt" style="display:block;text-decoration:none" href="${url}" download="card-vitrinefc-${esc((u.nickname || u.name).replace(/\s+/g, '-').toLowerCase())}.png">⬇️ Baixar card</a>
      <button class="btn btn-outline mt" id="fc-close">Fechar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#fc-close').onclick = () => bg.remove();
  document.body.appendChild(bg);
}

// ============================================================
// CURRÍCULO EM PDF 📄
// ============================================================
function openResumePdf() {
  const { user: u, achievements } = window._lastProfile || {};
  if (!u) return;
  const st = u.stats || {};
  const isGK = u.role === 'goleiro' || u.position === 'Goleiro';
  const earned = (achievements || []).filter(a => a.earned);
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>Currículo — ${esc(u.name)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1a2e22; margin: 32px; }
      .head { display: flex; gap: 22px; align-items: center; border-bottom: 4px solid #0a5c36; padding-bottom: 18px; }
      .head img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid #ffd700; }
      h1 { margin: 0; color: #0a5c36; font-size: 28px; }
      .nick { color: #b8860b; font-weight: bold; }
      .meta { color: #444; font-size: 14px; margin-top: 4px; }
      h2 { color: #0a5c36; font-size: 17px; border-bottom: 2px solid #ffd700; padding-bottom: 4px; margin: 22px 0 8px; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #ccc; padding: 8px 10px; font-size: 14px; text-align: center; }
      th { background: #0a5c36; color: #fff; }
      p { font-size: 14px; line-height: 1.5; }
      .pill { display: inline-block; background: #eef7f1; border: 1px solid #0a5c36; color: #0a5c36; border-radius: 999px; padding: 3px 12px; font-size: 13px; margin: 2px; }
      .foot { margin-top: 30px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      @media print { .noprint { display: none; } }
    </style></head><body>
    <div class="head">
      ${u.photo ? `<img src="${location.origin}${esc(u.photo)}">` : ''}
      <div>
        <h1>${esc(u.name)} ${u.verified ? '✔' : ''}</h1>
        ${u.nickname ? `<div class="nick">"${esc(u.nickname)}"</div>` : ''}
        <div class="meta">${esc(u.position || '')}${u.positions2 ? ' · ' + esc(u.positions2) : ''} · Nota geral: <b>${u.overall}</b></div>
        <div class="meta">${u.age ? u.age + ' anos · ' : ''}${u.height ? u.height + ' cm · ' : ''}${u.weight ? u.weight + ' kg · ' : ''}${esc(u.foot || '')}</div>
        <div class="meta">📍 ${esc(u.city || '')}${u.state ? '/' + esc(u.state) : ''} · ${esc(u.level || '')} · ✉️ ${esc(u.email || '')}</div>
      </div>
    </div>
    ${u.bio ? `<h2>Sobre</h2><p>${esc(u.bio)}</p>` : ''}
    <h2>Estatísticas de carreira</h2>
    <table><tr><th>Jogos</th>${isGK ? '<th>Defesas</th><th>Pênaltis defendidos</th><th>Jogos sem sofrer gol</th>' : '<th>Gols</th><th>Assistências</th>'}<th>Títulos</th></tr>
    <tr><td>${st.jogos || 0}</td>${isGK ? `<td>${st.defesas || 0}</td><td>${st.penaltisDefendidos || 0}</td><td>${st.jogosSemSofrerGol || 0}</td>` : `<td>${st.gols || 0}</td><td>${st.assistencias || 0}</td>`}<td>${st.titulos || 0}</td></tr></table>
    ${u.teams ? `<h2>Times por onde passou</h2><p>${esc(u.teams)}</p>` : ''}
    ${u.strengths ? `<h2>Pontos fortes</h2><p>${u.strengths.split(',').map(s => `<span class="pill">${esc(s.trim())}</span>`).join(' ')}</p>` : ''}
    ${earned.length ? `<h2>Conquistas no Vitrine FC</h2><p>${earned.map(a => `<span class="pill">${a.emoji} ${esc(a.title)}</span>`).join(' ')}</p>` : ''}
    <h2>Reputação na plataforma</h2>
    <p>⭐ Avaliação: <b>${u.ratingAvg ?? 'sem avaliações'}</b> (${u.ratingCount} avaliações) · 👥 ${u.followers} seguidores · 👀 ${u.scoutViews || 0} visitas de olheiros</p>
    <div class="foot">Currículo gerado pelo <b>Vitrine FC</b> ⚽ — a vitrine do futebol brasileiro · ${new Date().toLocaleDateString('pt-BR')}</div>
    <div class="noprint" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="background:#0a5c36;color:#fff;border:none;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer">🖨️ Imprimir / Salvar como PDF</button>
    </div>
    </body></html>`);
  w.document.close();
}

function shareProfile(id) {
  const url = location.origin + '/?perfil=' + id;
  if (navigator.share) { navigator.share({ title: 'Vitrine FC', text: 'Veja meu perfil no Vitrine FC! ⚽', url }).catch(() => {}); }
  else { navigator.clipboard?.writeText(url); toast('Link do perfil copiado! 🔗'); }
}

async function toggleFollow(id) {
  const r = await api(`/users/${id}/follow`, { method: 'POST' });
  const btn = document.getElementById('p-follow');
  if (btn) {
    btn.textContent = r.following ? '✔️ Seguindo' : '➕ Seguir';
    btn.className = `btn ${r.following ? 'btn-green' : 'btn-primary'} btn-sm mt`;
  }
  const f = document.getElementById('p-followers');
  if (f) f.textContent = r.followers;
  toast(r.following ? 'Você está seguindo! ➕' : 'Deixou de seguir.');
}

async function newProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  toast('Enviando foto… ⏳');
  ME = await api('/me/photo', { method: 'POST', body: fd });
  toast('Foto atualizada! 📸');
  renderProfile(ME.id);
}

function openMedia(url, type) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.style.alignItems = 'center';
  bg.innerHTML = type === 'video'
    ? `<video src="${url}" controls autoplay playsinline style="width:100%;max-width:480px;max-height:80dvh"></video>`
    : `<img src="${url}" style="width:100%;max-width:480px;max-height:80dvh;object-fit:contain">`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
}

// ---------- Editar perfil ----------
function renderEditProfile(first = false) {
  if (!$('#content')) { renderShell(); }
  const c = $('#content');
  const u = ME;
  c.innerHTML = `
    ${first ? '<h2>Complete seu perfil ⚽</h2><p class="sub">É isso que os olheiros vão ver. Capricha!</p>' : `<button class="back" onclick="showTab('profile')">‹ Voltar</button><h2>Editar perfil ✏️</h2>`}
    <label>Nome</label><input id="e-name" value="${esc(u.name)}">
    <label>Apelido / nome de campo</label><input id="e-nick" value="${esc(u.nickname || '')}" placeholder='Ex: "Foguinho", "Paredão"'>
    ${u.role !== 'olheiro' ? `
      <label>Posição principal</label>
      <select id="e-pos">${POSITIONS.map(p => `<option ${u.position === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <label>Outras posições que joga (opcional)</label><input id="e-pos2" value="${esc(u.positions2 || '')}" placeholder="Ex: Meia, Ponta esquerda">
      <label>Nível</label>
      <select id="e-level"><option value="">Selecione…</option>${LEVELS.map(l => `<option ${u.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="row2">
        <div><label>Idade</label><input id="e-age" type="number" value="${u.age ?? ''}" placeholder="22"></div>
        <div><label>Altura (cm)</label><input id="e-height" type="number" value="${u.height ?? ''}" placeholder="178"></div>
      </div>
      <div class="row2">
        <div><label>Peso (kg)</label><input id="e-weight" type="number" value="${u.weight ?? ''}" placeholder="72"></div>
        <div><label>Perna boa</label>
          <select id="e-foot"><option value="">—</option>${['Destro','Canhoto','Ambidestro'].map(f => `<option ${u.foot === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
        </div>
      </div>
      <label>Times por onde passou</label><input id="e-teams" value="${esc(u.teams || '')}" placeholder="Ex: Juína EC, Operário VG">
      <label>Pontos fortes (separados por vírgula)</label><input id="e-strengths" value="${esc(u.strengths || '')}" placeholder="Ex: velocidade, cabeceio, defesa de pênalti">
      <h2 style="font-size:16px;margin-top:18px">📊 Estatísticas de carreira</h2>
      <p class="sub" style="margin-bottom:2px">Seus números — os olheiros adoram isso!</p>
      <div class="row2">
        <div><label>Jogos disputados</label><input id="st-jogos" type="number" min="0" value="${u.stats?.jogos ?? ''}" placeholder="0"></div>
        <div><label>Gols marcados</label><input id="st-gols" type="number" min="0" value="${u.stats?.gols ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>Assistências</label><input id="st-assist" type="number" min="0" value="${u.stats?.assistencias ?? ''}" placeholder="0"></div>
        <div><label>Títulos</label><input id="st-titulos" type="number" min="0" value="${u.stats?.titulos ?? ''}" placeholder="0"></div>
      </div>
      <div class="row2">
        <div><label>🧤 Defesas (goleiro)</label><input id="st-defesas" type="number" min="0" value="${u.stats?.defesas ?? ''}" placeholder="0"></div>
        <div><label>🧤 Pênaltis defendidos</label><input id="st-pen" type="number" min="0" value="${u.stats?.penaltisDefendidos ?? ''}" placeholder="0"></div>
      </div>
      <label>🧤 Jogos sem sofrer gol</label><input id="st-clean" type="number" min="0" value="${u.stats?.jogosSemSofrerGol ?? ''}" placeholder="0">` : ''}
    <div class="row2">
      <div><label>Cidade</label><input id="e-city" value="${esc(u.city || '')}" placeholder="Juína"></div>
      <div><label>Estado (UF)</label><input id="e-state" value="${esc(u.state || '')}" placeholder="MT" maxlength="2"></div>
    </div>
    <label>Sobre você (bio)</label>
    <textarea id="e-bio" rows="3" placeholder="Conte sua história no futebol…">${esc(u.bio || '')}</textarea>
    ${u.role !== 'olheiro' ? `
      <label class="check mt"><input type="checkbox" id="e-hire" ${u.availableHire ? 'checked' : ''}> ✅ Disponível para contratação</label>
      <label class="check"><input type="checkbox" id="e-freela" ${u.availableFreela ? 'checked' : ''}> ⚡ Disponível para jogo avulso (freela)</label>
      <label>Cachê por jogo (opcional, p/ freela)</label><input id="e-fee" value="${esc(u.fee || '')}" placeholder="Ex: R$ 120/jogo">` : ''}
    <button class="btn btn-primary mt" onclick="saveProfile(${first})">💾 Salvar perfil</button>`;
}
async function saveProfile(first) {
  const body = {
    name: $('#e-name').value.trim(), nickname: $('#e-nick').value.trim(),
    city: $('#e-city').value.trim(), state: $('#e-state').value.trim().toUpperCase(),
    bio: $('#e-bio').value.trim()
  };
  if (ME.role !== 'olheiro') {
    Object.assign(body, {
      position: $('#e-pos').value, positions2: $('#e-pos2').value.trim(),
      level: $('#e-level').value, age: +$('#e-age').value || null,
      height: +$('#e-height').value || null, weight: +$('#e-weight').value || null,
      foot: $('#e-foot').value, teams: $('#e-teams').value.trim(),
      strengths: $('#e-strengths').value.trim(),
      availableHire: $('#e-hire').checked, availableFreela: $('#e-freela').checked,
      fee: $('#e-fee').value.trim(),
      stats: {
        jogos: $('#st-jogos').value, gols: $('#st-gols').value,
        assistencias: $('#st-assist').value, titulos: $('#st-titulos').value,
        defesas: $('#st-defesas').value, penaltisDefendidos: $('#st-pen').value,
        jogosSemSofrerGol: $('#st-clean').value
      }
    });
  }
  ME = await api('/me', { method: 'PUT', body });
  toast('Perfil salvo! ✅');
  if (first) enterApp(); else showTab('profile');
}

// ============================================================
// CHAT
// ============================================================
async function renderConvs() {
  const c = $('#content');
  c.innerHTML = `
    <h2>Mensagens 💬</h2>
    <div class="subtabs">
      <button class="on" onclick="showTab('chat')">💬 Conversas</button>
      <button onclick="showTab('props')">🤝 Propostas</button>
    </div>
    <p class="sub">Todas as suas conversas — olheiros, jogadores, técnicos e árbitros.</p>
    <div id="convs"></div>`;
  const load = async () => {
    const convs = await api('/conversations');
    const el = $('#convs');
    if (!el) return;
    el.innerHTML = convs.length ? convs.map(cv => `
      <div class="conv" onclick="openChat('${cv.user.id}', '${esc(cv.user.name)}')" style="cursor:pointer">
        ${avatarHtml(cv.user)}
        <div class="info">
          <b>${esc(cv.user.name)} ${cv.unread ? `<span class="badge" style="position:static">${cv.unread}</span>` : ''}</b>
          <span>${esc(cv.lastMessage.text)}</span>
        </div>
        <span style="font-size:11px;color:var(--muted)">${timeAgo(cv.lastMessage.createdAt)}</span>
      </div>`).join('')
      : '<div class="empty"><span class="big">💬</span>Nenhuma conversa ainda.<br>Encontre um talento na Busca e toque em "Conversar"!</div>';
  };
  load();
  chatPoll = setInterval(load, 4000);
}

async function openChat(otherId, otherName) {
  clearInterval(chatPoll);
  currentTab = 'chat';
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
  document.getElementById('nav-chat')?.classList.add('on');
  const c = $('#content');
  c.innerHTML = `
    <button class="back" onclick="showTab('chat')">‹ Conversas</button>
    <h2 style="font-size:18px">💬 ${esc(otherName)}</h2>
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
      <div class="bubble ${m.fromId === ME.id ? 'me' : 'them'}">${esc(m.text)}<span class="time">${new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('')
      : '<div class="empty">Comece a conversa! 👋</div>';
    if (atBottom) el.scrollTop = el.scrollHeight;
  };
  await load();
  $('#chat-msgs').scrollTop = $('#chat-msgs').scrollHeight;
  chatPoll = setInterval(load, 2500);
}
async function sendMsg(toId) {
  const input = $('#chat-text');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await api('/messages', { method: 'POST', body: { toId, text } });
  const el = $('#chat-msgs');
  el.insertAdjacentHTML('beforeend', `<div class="bubble me">${esc(text)}<span class="time">agora</span></div>`);
  el.scrollTop = el.scrollHeight;
}

// ============================================================
// PROPOSTAS
// ============================================================
function openProposal(toId, name) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>🤝 Proposta para ${esc(name)}</h3>
      <label>Tipo de proposta</label>
      <select id="p-type">
        <option value="contratacao">📋 Contratação (entrar pro time)</option>
        <option value="freela">⚡ Jogo avulso / freela (ex: goleiro pro domingo)</option>
      </select>
      <label>Mensagem</label>
      <textarea id="p-msg" rows="3" placeholder="Ex: Precisamos de um goleiro pro jogo de domingo às 15h no campo do bairro…"></textarea>
      <button class="btn btn-primary mt" id="p-send">Enviar proposta 📩</button>
      <button class="btn btn-outline mt" id="p-cancel">Cancelar</button>
    </div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#p-cancel').onclick = () => bg.remove();
  bg.querySelector('#p-send').onclick = async () => {
    await api('/proposals', { method: 'POST', body: { toId, type: $('#p-type').value, message: $('#p-msg').value.trim() } });
    bg.remove();
    toast('Proposta enviada! 📩');
  };
  document.body.appendChild(bg);
}

async function renderProps() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando… 🤝</p>';
  const props = await api('/proposals');
  c.innerHTML = `
    <h2>Mensagens 💬</h2>
    <div class="subtabs">
      <button onclick="showTab('chat')">💬 Conversas</button>
      <button class="on" onclick="showTab('props')">🤝 Propostas</button>
    </div>
    <p class="sub">Contratações e convites para jogos.</p>
    ${props.length ? props.map(p => {
      const received = p.toId === ME.id;
      const other = received ? p.from : p.to;
      return `
      <div class="prop">
        <div class="top">
          <b>${received ? '📥 De' : '📤 Para'}: ${esc(other?.name || '?')}</b>
          <span class="status ${p.status}">${p.status.toUpperCase()}</span>
        </div>
        <span class="pill">${p.type === 'freela' ? '⚡ Jogo avulso' : '📋 Contratação'}</span>
        <p>${esc(p.message || 'Sem mensagem.')}</p>
        ${received && p.status === 'pendente' ? `
          <div class="row">
            <button class="btn btn-primary btn-sm" onclick="answerProp('${p.id}', 'aceita')">✅ Aceitar</button>
            <button class="btn btn-danger btn-sm" onclick="answerProp('${p.id}', 'recusada')">❌ Recusar</button>
            <button class="btn btn-green btn-sm" onclick="openChat('${other.id}', '${esc(other.name)}')">💬</button>
          </div>` : `
          <button class="btn btn-green btn-sm" onclick="openChat('${other.id}', '${esc(other.name)}')">💬 Conversar</button>`}
      </div>`;
    }).join('') : '<div class="empty"><span class="big">🤝</span>Nenhuma proposta ainda.<br>Olheiros: busque talentos e envie propostas!<br>Jogadores: capriche no perfil e nos vídeos!</div>'}`;
}
async function answerProp(id, status) {
  await api('/proposals/' + id, { method: 'PUT', body: { status } });
  toast(status === 'aceita' ? 'Proposta aceita! 🎉 Combine no chat.' : 'Proposta recusada.');
  renderProps();
  refreshBadges();
}

// ============================================================
// AVALIAÇÕES
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
      <button class="btn btn-primary mt" id="r-send">Enviar avaliação</button>
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
    toast('Avaliação enviada! ⭐');
    renderProfile(toId);
  };
  document.body.appendChild(bg);
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
async function renderNotifs() {
  const c = $('#content');
  c.innerHTML = '<p class="empty">Carregando… 🔔</p>';
  const notifs = await api('/notifications');
  c.innerHTML = `
    <button class="back" onclick="showTab('feed')">‹ Voltar</button>
    <h2>Notificações 🔔</h2>
    ${notifs.length ? notifs.map(n => `
      <div class="notif ${n.read ? '' : 'unread'}">${esc(n.text)}<span class="when">${timeAgo(n.createdAt)} atrás</span></div>`).join('')
      : '<div class="empty"><span class="big">🔔</span>Nenhuma notificação ainda.</div>'}`;
  await api('/notifications/read', { method: 'POST' });
  refreshBadges();
}

// ============================================================
// INÍCIO
// ============================================================
(async () => {
  // registra o service worker (app instalável no celular)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (TOKEN) {
    try {
      await enterApp();
      // Link compartilhado: /?perfil=ID abre direto o perfil
      const pid = new URLSearchParams(location.search).get('perfil');
      if (pid) { history.replaceState({}, '', '/'); renderProfile(pid); }
      return;
    } catch {}
  }
  renderSplash();
})();
