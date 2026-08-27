// Script único: adiciona posts/comentários/avaliações/follows de demonstração
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DB = path.join(__dirname, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
const uid = () => crypto.randomBytes(8).toString('hex');
const byEmail = e => db.users.find(u => u.email === e);
const t = byEmail('thiago@demo.com'), g = byEmail('carlao@demo.com'), a = byEmail('ana@demo.com');
db.comments = db.comments || [];
db.postRatings = db.postRatings || [];
db.follows = db.follows || [];
if (t && g && a) {
  if (!db.posts.some(p => p.url.includes('lance-atacante'))) {
    db.posts.push(
      { id: uid(), userId: t.id, type: 'video', url: '/img/demo/lance-atacante.mp4', caption: 'Aquecendo pro jogo de domingo! Olheiros, tô pronto 🔥⚽', likes: [g.id, a.id], createdAt: Date.now() - 7200000 },
      { id: uid(), userId: g.id, type: 'video', url: '/img/demo/lance-goleiro.mp4', caption: 'Paredão em ação 🧤 Disponível pra freela no fim de semana!', likes: [t.id], createdAt: Date.now() - 3600000 }
    );
  }
  const vt = db.posts.find(p => p.url.includes('lance-atacante'));
  const vg = db.posts.find(p => p.url.includes('lance-goleiro'));
  if (!db.comments.length) {
    db.comments.push(
      { id: uid(), postId: vt.id, userId: g.id, text: 'Tá voando, Thiaguinho! 🔥', createdAt: Date.now() - 7000000 },
      { id: uid(), postId: vt.id, userId: a.id, text: 'Craque demais! Sucesso 👏⚽', createdAt: Date.now() - 6800000 },
      { id: uid(), postId: vg.id, userId: t.id, text: 'Esse pega até pensamento 🧤😂', createdAt: Date.now() - 3000000 }
    );
  }
  if (!db.postRatings.length) {
    db.postRatings.push(
      { id: uid(), postId: vt.id, userId: g.id, stars: 5, createdAt: Date.now() },
      { id: uid(), postId: vt.id, userId: a.id, stars: 4, createdAt: Date.now() },
      { id: uid(), postId: vg.id, userId: t.id, stars: 5, createdAt: Date.now() }
    );
  }
  if (!db.follows.length) {
    db.follows.push(
      { id: uid(), fromId: g.id, toId: t.id, createdAt: Date.now() },
      { id: uid(), fromId: a.id, toId: t.id, createdAt: Date.now() },
      { id: uid(), fromId: t.id, toId: g.id, createdAt: Date.now() }
    );
  }
}
fs.writeFileSync(DB, JSON.stringify(db, null, 2));
console.log('OK:', db.posts.length, 'posts,', db.comments.length, 'comentários,', db.follows.length, 'follows');
