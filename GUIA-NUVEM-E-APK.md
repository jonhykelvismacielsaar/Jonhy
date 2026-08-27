# 🌐 Vitrine FC — Guia: Colocar na Nuvem 24h + Gerar o APK

Este guia mostra o caminho para o Vitrine FC sair do protótipo e virar um app
de verdade, no ar 24 horas, instalado no celular de qualquer pessoa.

---

## PARTE 1 — Colocar o servidor na nuvem (24h no ar) ☁️

O app inteiro é um servidor Node.js (pasta `app/`). Qualquer serviço que rode
Node serve. Os mais fáceis e com plano gratuito:

### Opção A — Render.com (recomendada, grátis)
1. Crie conta em https://render.com (pode entrar com GitHub)
2. **New → Web Service** → conecte este repositório
3. Configure:
   - **Root Directory:** `app`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Clique em **Deploy**. Pronto! Você ganha um endereço tipo
   `https://vitrinefc.onrender.com` — funcionando 24h, de qualquer celular.

### Opção B — Railway.app / Fly.io
Mesma ideia: conecta o GitHub, aponta pra pasta `app`, comando `node server.js`.

### ⚠️ Importante para produção de verdade
- **Banco de dados:** hoje é um arquivo JSON (`data/db.json`) — perfeito para
  protótipo. Com muitos usuários, migrar para **PostgreSQL** (Render/Railway
  dão grátis) ou **Supabase**.
- **Vídeos/fotos:** hoje ficam na pasta `uploads/`. Com muitos usuários,
  migrar para **Cloudflare R2** ou **Supabase Storage** (barato/grátis).
- **Domínio próprio:** comprar `vitrinefc.com.br` (~R$ 40/ano no Registro.br)
  e apontar para o serviço.

---

## PARTE 2 — Instalar no celular JÁ, sem APK (PWA) 📲

O app já é um **PWA instalável** (tem manifest + service worker):

1. Abra o endereço do app no **Chrome do Android**
2. Menu ⋮ → **"Adicionar à tela inicial"** (ou o aviso "Instalar app")
3. Vira um ícone na tela inicial, abre em tela cheia como app de verdade ⚽

Isso já resolve 90% dos casos enquanto o APK não sai!

---

## PARTE 3 — Gerar o APK de verdade 📦

Depois que o servidor estiver na nuvem (Parte 1), há dois caminhos:

### Caminho A — Bubblewrap/TWA (mais simples, é o PWA empacotado)
No seu computador, com Node instalado:
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://SEU-ENDERECO.onrender.com/manifest.json
bubblewrap build
```
Sai um **app-release-signed.apk** pronto para instalar e até publicar na
Play Store. (O Bubblewrap baixa sozinho o JDK e o Android SDK.)

### Caminho B — Capacitor (app híbrido, mais controle)
```bash
npm i -g @capacitor/cli
npx cap init "Vitrine FC" br.com.vitrinefc --web-dir=public
npx cap add android
# aponte o app para o servidor na nuvem em capacitor.config.json:
#   "server": { "url": "https://SEU-ENDERECO.onrender.com" }
npx cap open android   # abre no Android Studio → Build → Build APK
```
Com o Capacitor dá para adicionar depois: **notificações push, câmera nativa,
GPS para o mapa de peneiras**, etc.

### Publicar na Play Store 🏪
1. Conta de desenvolvedor Google Play: US$ 25 (paga uma vez só)
2. Sobe o APK/AAB, preenche ficha (nome, descrição, screenshots)
3. Revisão do Google: 1 a 7 dias → **Vitrine FC na loja!** 🎉

---

## Resumo do caminho completo

| Etapa | O quê | Custo |
|---|---|---|
| 1 | Servidor no Render (24h no ar) | Grátis |
| 2 | Testar como PWA instalado no celular | Grátis |
| 3 | Gerar APK com Bubblewrap | Grátis |
| 4 | Conta Google Play + publicar | US$ 25 (única vez) |
| 5 | Domínio próprio .com.br (opcional) | ~R$ 40/ano |
| 6 | Migrar banco/vídeos p/ escala (quando crescer) | Grátis → conforme uso |

---

## ✅ ATUALIZAÇÃO — APK JÁ GERADO!

O APK foi construído e assinado dentro deste projeto: **`apk/VitrineFC.apk`**
(também disponível para download na tela inicial do app: botão "📦 Baixar o app Android").

- Pacote: `br.com.vitrinefc` · versão 1.0 · Android 5.0+ (minSdk 21)
- Feito com WebView nativo + suporte a envio de fotos/vídeos + botão voltar
- Se o endereço do servidor mudar, o próprio app mostra uma tela para trocar
  o endereço **sem reinstalar** (aparece quando não conecta)
- Chave de assinatura: `apk/vitrine-key.pem` (guarde! é ela que permite
  publicar atualizações do app)
- Projeto Android completo em `apk/projeto-android/` e assinador em `apk/sign_apk.py`

### Como instalar no celular
1. Abra o app no navegador do celular e toque em **📦 Baixar o app Android**
2. O Android vai avisar sobre "fonte desconhecida" → **Permitir**
3. Instalar → pronto, ícone do Vitrine FC na tela! ⚽
