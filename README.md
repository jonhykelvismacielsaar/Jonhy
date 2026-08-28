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

## ☁️ (OBRIGATÓRIO na nuvem) Backup automático — nunca perder os cadastros

> ⚠️ **Leia isto se o site "resetou sozinho".** No plano grátis do Render o disco
> é apagado a cada reinício ou novo deploy. Sem o backup abaixo, **todos os
> cadastros somem**. Com ele configurado, nada mais se perde.

1. Crie um repositório novo no seu GitHub chamado **vitrinefc-dados** (privado!)
2. Crie um token em https://github.com/settings/tokens → **Generate new token
   (classic)** → marque a permissão **repo** → copie o token
3. No painel do Render → seu serviço **vitrinefc** → **Environment** → adicione:
   - `DB_GITHUB_TOKEN` = o token que você copiou
   - `DB_GITHUB_REPO` = `seu-usuario/vitrinefc-dados`
   *(Alternativamente: acesse a aba **🛡️ Admin** no próprio app, faça login como `admin@vitrinefc.com` e digite o Token e Repositório na caixa **Sincronização em Nuvem**).*
4. Salve. O servidor reinicia e a partir daí **todo cadastro, post, foto e
   vídeo (até 20MB) é salvo no GitHub automaticamente** e restaurado sempre
   que o servidor reiniciar. Grátis para sempre. ✅

### Como conferir se o backup está mesmo funcionando
Acesse **https://seu-site.onrender.com/api/health**. Você verá algo assim:

```json
{ "ready": true, "origemDosDados": "nuvem", "backupNuvem": "ativo", "backupLiberado": true }
```

- `backupNuvem: "ativo"` → tudo certo, seus dados estão protegidos.
- `backupNuvem: "desligado"` → **as variáveis acima não foram configuradas** e
  os dados vão sumir no próximo reinício.
- `backupNuvem: "erro: ..."` → token errado/expirado ou nome do repositório
  incorreto. Nesse caso o app **trava o backup de propósito**, para nunca
  apagar os dados bons que já estão salvos na nuvem.

### Proteções contra perda de dados (já embutidas)
- O site só começa a atender visitas **depois** de restaurar o backup da nuvem.
- Nunca envia backup por cima da nuvem sem antes saber o que existe lá.
- Se o banco ficar sem nenhum usuário, o backup é **bloqueado** automaticamente.
- Gravação atômica do `db.json` (nada de arquivo pela metade).
- Ao reiniciar/desligar, salva tudo e envia o último backup antes de encerrar.
- Quedas de internet **não deslogam mais** você: o app espera o servidor acordar.

### Alternativa: disco persistente
Se você usar um plano com disco (Render Disk, VPS, etc.), basta apontar a
variável `DATA_DIR` para o caminho do disco — ex.: `DATA_DIR=/var/data`.
Os dados e uploads passam a viver lá e nunca são apagados nos deploys.


---

## 📱 Outras formas de usar
- **PWA:** abra o site no celular → menu ⋮ → *Adicionar à tela inicial*
- **APK Android:** [baixar VitrineFC.apk](https://github.com/jonhykelvismacielsaar/Jonhy/raw/main/apk/VitrineFC.apk)
  *(já vem com o endereço definitivo **https://vitrinefc.onrender.com** de fábrica —
  era um endereço antigo de teste que fazia o app "começar de novo".
  Se aparecer "Sem conexão", é só o site ainda não estar publicado: faça o
  deploy acima primeiro. Se um dia o endereço mudar, cole o novo na tela do
  app, sem precisar reinstalar.)*
- Guia completo de nuvem + Play Store: [GUIA-NUVEM-E-APK.md](GUIA-NUVEM-E-APK.md)

### ❓ Por que o site "resetava" quando trocava de rede?
O app estava sendo aberto por um **endereço temporário de desenvolvimento**
(`https://3000-….e2b.app`), que só existia enquanto aquele servidor de teste
estava ligado. Em rede nova, celular novo ou sessão nova, esse endereço
morria — e parecia que o site tinha "voltado ao início", porque o banco de
dados vivia naquele servidor temporário.

**A cura definitiva** (uma vez só):
1. Publique o site no Render pelo botão acima → endereço fixo
   **https://vitrinefc.onrender.com** acessível do mundo inteiro;
2. Configure o backup no GitHub (`DB_GITHUB_TOKEN` + `DB_GITHUB_REPO`) →
   os cadastros sobrevivem a qualquer reinício, de qualquer rede, para sempre.

A partir daí: qualquer celular, em qualquer rede, em qualquer país, vê o
**mesmo** banco de dados e os mesmos perfis.

## 🧪 Rodar no seu computador
```bash
cd app
npm install
node server.js
# abra http://localhost:3000
```

- **Base zerada:** O site começa limpo sem perfis demo.
- **Conta do Administrador:**
  - **E-mail:** `admin@vitrinefc.com`
  - **Senha:** `chefe2026`
  - Dá acesso total à aba **🛡️ Admin** e moderação geral do app.
- **Categorias de post:** Escolha entre **🏆 Jogo profissional/campeonato** ou **🎉 Pelada/várzea** ao postar fotos e vídeos.
- **Cadastro em 2 passos:** primeiro você escolhe o seu papel — **🏃 Jogador(a)**,
  **📋 Técnico(a)**, **🟨 Árbitro/Juiz** ou **🔎 Olheiro/Clube** — e o formulário
  muda inteiro conforme a escolha. *Goleiro é uma posição do jogador*, não um papel à parte.
- **Ficha específica por papel:** jogador tem atributos FIFA e gols; técnico tem
  licenças, estilo de jogo e vitórias; árbitro tem entidade, quadro e cartões;
  olheiro cadastra só o essencial (clube, o que procura e contatos públicos).
- **Perfil do olheiro:** aparece na busca (filtro **🔎 Olheiros / Clubes**) com
  WhatsApp, Instagram e e-mail clicáveis para o atleta falar direto.
- **Painel do Administrador (🛡️ Aba Admin):** Permite gerenciar usuários (promover/remover admin, selo verificado, excluir contas em cascata), posts (trocar categoria profissional/pelada, moderar comentários e excluir publicações), eventos (peneiras e jogos) e stories (com lista de visualizadores e limpeza de expirados).

## 🆕 Novidades desta versão

- **🔎 Busca só com vinculados:** na aba Buscar só aparece quem marcou no perfil
  **✅ Disponível para contratação** e/ou **⚡ Aceita jogo avulso (freela)**.
  Quem não marcou nenhuma das duas não aparece em hipótese nenhuma. É possível
  filtrar só contratação ou só freela.
- **🏆 Dois rankings na busca:** um p/ **Contratação** e outro p/ **Freela**
  (1º 🥇, 2º 🥈, 3º 🥉…), com miniatura e nome clicáveis que entram direto
  no perfil da pessoa.
- **🖼️ Resultados em miniatura:** a lista de resultados virou linhas compactas
  com uma miniaturinha do perfil — toque no nome ou na miniatura e entra no
  perfil. O card mostra ✅ e/ou ⚡ conforme o que a pessoa marcou.
- **🗺️ Mapa por cidade na busca:** digitou o nome da cidade, o mapa já vai até
  ela e mostra os pontos próximos com jogos cadastrados (até 60 km de raio).
- **⏰ Eventos auto-expiram:** ao criar um jogo a data já vem preenchida com
  **hoje**; depois que o dia e o horário do jogo passam, o evento sai da lista
  sozinho (e a lista se atualiza a cada 30s).
- **💬 Aceitou, conversou:** no momento em que o organizador **aceita** a
  proposta/candidatura, a conversa abre automaticamente no chat com o jogador
  (e o jogador recebe a mensagem de aceite). Recusar continua possível.
