# ⚽ Vitrine FC

**A rede social do futebol brasileiro** — jogadores, goleiros, técnicos e árbitros
criam sua vitrine com fotos, vídeos, stories e estatísticas; olheiros e clubes
descobrem, comparam e contratam.

👉 Documentação completa: [DOCUMENTO-COMPLETO.md](DOCUMENTO-COMPLETO.md)

---

## 🌐 COLOCAR O SITE NO AR DE GRAÇA (vitrinefc.onrender.com)

### Passo 1 — Criar a conta grátis no Render
1. Acesse **https://render.com**
2. Clique em **Get Started** → **Sign in with GitHub** (entra com sua conta GitHub, sem cartão!)

### Passo 2 — Deploy com 1 clique
Clique neste botão:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jonhykelvismacielsaar/Jonhy)

- O Render lê o arquivo `render.yaml` e já configura tudo sozinho
- No campo do nome, deixe **vitrinefc** → seu site será **https://vitrinefc.onrender.com**
- Clique em **Apply/Deploy** e aguarde uns minutos

### Passo 3 — Pronto! 🎉
- Site no ar 24h: **https://vitrinefc.onrender.com**
- Qualquer pessoa com o link entra, se cadastra, posta e aparece no feed
  de todos os outros aparelhos (o feed atualiza sozinho a cada 10 segundos)

> ⚠️ **Plano grátis do Render:** o site "dorme" após 15 min sem visitas —
> o primeiro acesso depois disso demora ~50 segundos para acordar. Normal!

---

## ☁️ (Recomendado) Backup automático — nunca perder os cadastros

No plano grátis o disco zera quando o servidor reinicia. O Vitrine FC tem
backup automático no GitHub embutido. Para ativar:

1. Crie um repositório novo no seu GitHub chamado **vitrinefc-dados** (privado!)
2. Crie um token em https://github.com/settings/tokens → **Generate new token
   (classic)** → marque a permissão **repo** → copie o token
3. No painel do Render → seu serviço **vitrinefc** → **Environment** → adicione:
   - `DB_GITHUB_TOKEN` = o token que você copiou
   - `DB_GITHUB_REPO` = `seu-usuario/vitrinefc-dados`
4. Salve. O servidor reinicia e a partir daí **todo cadastro, post, foto e
   vídeo (até 20MB) é salvo no GitHub automaticamente** e restaurado sempre
   que o servidor reiniciar. Grátis para sempre. ✅

---

## 📱 Outras formas de usar
- **PWA:** abra o site no celular → menu ⋮ → *Adicionar à tela inicial*
- **APK Android:** [baixar VitrineFC.apk](https://github.com/jonhykelvismacielsaar/Jonhy/raw/main/apk/VitrineFC.apk)
  *(depois de instalar, se aparecer "Sem conexão", cole o endereço
  `https://vitrinefc.onrender.com` na tela do app — pronto, funciona para sempre)*
- Guia completo de nuvem + Play Store: [GUIA-NUVEM-E-APK.md](GUIA-NUVEM-E-APK.md)

## 🧪 Rodar no seu computador
```bash
cd app
npm install
node server.js
# abra http://localhost:3000
```

O site já começa zerado: basta criar sua conta na tela inicial.
