# ⚽ VITRINE FC — DOCUMENTO COMPLETO DO APLICATIVO

## O QUE É
O Vitrine FC é uma rede social do futebol brasileiro que conecta jogadores,
goleiros, técnicos e árbitros a olheiros e clubes que querem contratar.
É um misto de Instagram com LinkedIn do futebol: o atleta se mostra em fotos,
vídeos e stories, e o olheiro descobre, avalia, compara e contrata.
Visual: verde e amarelo do Brasil, tema escuro. Funciona no navegador,
como PWA instalável e como aplicativo Android (.APK).

---

## TIPOS DE CONTA (4 papéis no cadastro)
1. 🏃 JOGADOR(A) — cria perfil, posta lances, recebe propostas.
   **Goleiro virou posição**: quem escolhe "Goleiro" na hora do cadastro passa
   a ter a ficha e os atributos FIFA de goleiro automaticamente.
2. 📋 TÉCNICO — perfil com licenças, categorias, estilo de jogo e números no banco
3. 🟨 ÁRBITRO / JUIZ — perfil com entidade, quadro, modalidades e números do apito
4. 🔎 OLHEIRO/CLUBE — cadastro rápido, perfil público com contatos, busca e contrata

## CADASTRO E LOGIN (assistente em 2 passos)
- **Passo 1 — "Qual é o seu papel no futebol?"**: 4 cartões coloridos
  (verde/ciano/dourado/rosa), um por papel, com indicador de progresso.
- **Passo 2 — dados do papel**: nome + e-mail + senha (com medidor de força e
  botão "mostrar senha") e **só mais uma escolha específica**:
  - Jogador → posição em chips agrupados (Goleiro / Defesa / Meio-campo / Ataque)
  - Técnico → função (Técnico principal, Auxiliar, Base, Goleiros, Físico…)
  - Árbitro → função (Central, Assistente, Quarto árbitro, Futsal, Society, VAR)
  - Olheiro → clube/empresa (opcional). Nada mais.
- Login: e-mail e senha (a conta fica salva permanentemente)

## FICHA DE PERFIL ESPECÍFICA POR PAPEL
Cada papel só vê (e só recebe no servidor) os campos que fazem sentido para ele.

- **Jogador/Goleiro**: posição, outras posições, nível, camisa, idade, altura,
  peso, perna boa, nacionalidade, nascimento, clube, times, pontos fortes,
  atributos FIFA (de linha **ou** de goleiro), números de carreira
  (jogos + gols/assistências **ou** jogos + defesas/pênaltis + títulos),
  disponibilidade e cachê.
- **Técnico**: função, categorias que treina, nível de atuação, anos de
  experiência, licença (CBF C/B/A/Pró/CONMEBOL), estilo de jogo, equipe atual,
  onde já trabalhou, metodologia, pontos fortes e **números no banco**
  (jogos, vitórias, empates, títulos, acessos e % de aproveitamento).
  Sem gols, sem assistências, sem peso/altura.
- **Árbitro**: função, quadro/nível, entidade (CBF, Federação, Liga…),
  anos de apito, modalidades que apita, região de atuação, pontos fortes e
  **números do apito** (jogos, amarelos, vermelhos, pênaltis marcados, finais).
- **Olheiro**: clube/empresa, cargo, cidade/UF, modalidades, posições que busca,
  regiões que avalia, **contatos públicos** (WhatsApp, Instagram, e-mail) e a
  chave "meu perfil aparece na busca de atletas". Ficha curta de propósito.

## PERFIL PÚBLICO DO OLHEIRO 🔎
- O olheiro **tem perfil**: cartão com clube, cargo, regiões, posições e
  modalidades + uma lista de contatos clicáveis (WhatsApp abre o `wa.me`,
  Instagram abre o perfil, e-mail abre o cliente de e-mail).
- Atletas encontram os olheiros na aba **Buscar → 🔎 Olheiros / Clubes**
  (filtro novo). Fora desse filtro os olheiros continuam escondidos.
- O botão do perfil muda para **"💬 Falar com o olheiro"**.
- O PDF deixa de ser "Currículo" e vira: **Currículo** (jogador),
  **Portfólio** (técnico), **Súmula do Árbitro** (árbitro) e
  **Cartão de Visita** (olheiro) — cada um com as seções do seu papel.
- As medalhas também são específicas: goleiro tem Muralha/Pega-Pênalti,
  técnico tem Estrategista/Acesso Garantido, árbitro tem Apito em Dia/Pulso
  Firme e olheiro tem Radar Ligado/Faro de Olheiro.

## PERFIL DO ATLETA (todos os campos)
- Nome completo e apelido/"nome de campo" (ex: "Foguinho", "Paredão")
- Foto de perfil
- Posição principal: Goleiro, Zagueiro, Lateral direito, Lateral esquerdo,
  Volante, Meia, Ponta direita, Ponta esquerda, Atacante, Centroavante,
  Técnico, Árbitro
- Posições secundárias (também joga de...)
- Nível: Várzea, Amador, Base, Semiprofissional, Profissional
- Idade, altura (cm), peso (kg)
- Perna boa: Destro, Canhoto, Ambidestro
- Cidade e estado (UF)
- Times por onde passou
- Pontos fortes (ex: velocidade, cabeceio, defesa de pênalti)
- Bio ("sobre você")
- ✅ Disponível para contratação (sim/não)
- ⚡ Disponível para jogo avulso/freela (sim/não) + cachê por jogo (ex: R$ 120/jogo)

## ESTATÍSTICAS DE CARREIRA
- Jogos disputados, Gols marcados, Assistências, Títulos
- Para goleiros: Defesas, Pênaltis defendidos, Jogos sem sofrer gol

## NOTA GERAL (OVR) ESTILO FIFA
- Nota de 52 a 99 calculada automaticamente com base em:
  avaliações dos lances (estrelas), avaliação do perfil, curtidas,
  seguidores e estatísticas de carreira
- Aparece no perfil, na busca e no card FIFA

---

## AS 7 ABAS DO APLICATIVO

### 🏟️ FEED
- Stories no topo (bolinhas com anel amarelo = não visto)
- Postar foto ou vídeo jogando, com legenda e categoria (🏆 Profissional × 🎉 Pelada)
- Curtir (💛), comentar (💬), avaliar o lance de 1 a 5 estrelas (⭐)
- Média de estrelas de cada post (ex: 4.5 ⭐ (12))
- Chamar o autor no chat direto do post
- Excluir os próprios posts e comentários (ou via administrador)

### 📖 STORIES DE JOGO (dentro do Feed)
- Foto ou vídeo que some em 24 horas, com legenda
- Visualizador em tela cheia com barras de progresso
- Toque à direita/esquerda para avançar/voltar, avanço automático
- Contador de visualizações do seu story
- Excluir o próprio story (ou via administrador)

### 🎬 LANCES (REELS)
- Todos os vídeos em tela cheia, rolagem vertical com encaixe
- Play/pause automático conforme desliza
- Botões flutuantes: curtir 💛, comentar 💬, avaliar ⭐, chat ✉️
- Toque no vídeo pausa/continua

### 📍 JOGOS (PENEIRAS & JOGOS ABERTOS)
- Lista e MAPA de verdade (OpenStreetMap) com marcadores
- Filtros: cidade e tipo (🥅 peneira / ⚽ jogo aberto)
- Divulgar evento: tipo, título, descrição, cidade, UF, local,
  data e hora, custo, e ponto exato tocando no mapa
- Botão "🙋 Vou participar!" (organizador recebe notificação)
- Contador de confirmados, falar com o organizador no chat
- Excluir o próprio evento (ou via administrador)

### 🔎 BUSCAR
- 🔥 Craques em alta: ranking top 10 (🥇🥈🥉) por curtidas,
  estrelas e seguidores
- Filtros: nome/apelido/time, tipo de conta, posição, cidade,
  nível, só disponíveis para freela
- Cards com foto, OVR, estrelas, disponibilidade e cachê
- 🆚 COMPARADOR: toque em 🆚 em dois jogadores e veja o duelo:
  os dois cards FIFA lado a lado + tabela comparando OVR, jogos,
  gols, assistências, defesas, pênaltis, títulos, média de estrelas,
  seguidores e visitas de olheiro (vencedor destacado em amarelo)

### 💬 CHAT (sub-abas: Conversas | Propostas)
- Conversas em tempo real entre qualquer usuário (olheiro↔jogador,
  olheiro↔técnico, jogador↔jogador...)
- Contador de mensagens não lidas
- PROPOSTAS: 📋 contratação ou ⚡ jogo avulso/freela, com mensagem
- Aceitar ✅ ou recusar ❌ propostas; tudo notificado

### 👤 PERFIL
- Foto, OVR, apelido, posições, cidade, nível
- Seguidores / seguindo / curtidas totais
- Botão ➕ Seguir / ✔️ Seguindo
- 🤝 Contratar / chamar para jogo · 💬 Conversar · ⭐ Avaliar (1 a 5 + comentário)
- 🃏 CARD ESTILO FIFA: card dourado gerado com foto, OVR, posição
  (ATA/GOL/MEI...), estado e 6 estatísticas — baixa em PNG para postar
- 📄 CURRÍCULO EM PDF: gerado com um botão (foto, dados, estatísticas,
  times, pontos fortes, conquistas, reputação)
- 🔗 Compartilhar link do perfil
- 👀 Contador de visitas de olheiros no perfil
- 🏅 Painel de estatísticas de carreira
- Galeria de todas as fotos e vídeos dividida por categoria (🏆 Profissional vs 🎉 Pelada)
- Avaliações recebidas com comentários
- Acesso rápido ao Painel do Administrador

### 🛡️ ADMIN (PAINEL DO ADMINISTRADOR)
- **Credenciais do Administrador:**
  - **E-mail:** `admin@vitrinefc.com`
  - **Senha:** `chefe2026`
- Acesso completo para moderação da plataforma
- **📊 Visão Geral**: indicadores em tempo real de usuários, publicações (profissionais vs pelada), eventos e stories ativos
- **👥 Gerenciamento de Usuários**: busca por nome/email/cidade, filtros por tipo (jogador, goleiro, técnico, árbitro, olheiro, admin, verificado), promoção/remoção de status de admin, concessão do selo verificado ✅ e exclusão completa com limpeza em cascata
- **📸 Gerenciamento de Posts**: moderação de todas as publicações, filtros por categoria (🏆 Profissional × 🎉 Pelada) e mídia (fotos/vídeos), troca de categoria em 1 clique, moderação de comentários individuais e exclusão de posts
- **📍 Gerenciamento de Eventos**: moderação de peneiras e jogos abertos, visualização da lista de participantes confirmados e cancelamento/exclusão de eventos
- **📖 Gerenciamento de Stories**: monitoramento de stories ativos das últimas 24h, lista de visualizadores, exclusão de stories e botão de limpeza de stories expirados
- Moderação direta no feed e lances: administradores contam com controle de exclusão instantâneo em publicações, comentários, stories e eventos em qualquer tela do app

---

## 🏅 AS 15 CONQUISTAS/MEDALHAS
1. 🎬 Estreia na Vitrine — postou o primeiro lance
2. 📸 Midiático — 5 ou mais publicações
3. ⭐ Craque 5 Estrelas — 3 avaliações 5⭐ nos lances
4. 💛 Queridinho da Torcida — 10 curtidas nos posts
5. 👥 Ídolo Local — 5 ou mais seguidores
6. 👀 Na Mira dos Olheiros — 5 visitas de olheiros
7. 🤝 Contratado! — teve proposta aceita
8. 🙋 Presença VIP — confirmou presença em peneira/jogo
9. 📖 Sempre em Campo — publicou um story de jogo
10. ⚽ Artilheiro — 25+ gols na carreira
11. 🧱 Muralha — 100+ defesas na carreira
12. 🧤 Pega-Pênalti — 10+ pênaltis defendidos
13. 🏆 Vencedor — conquistou um título
14. 🍽️ Garçom — 20+ assistências
15. 💯 Centenário — 100+ jogos disputados
(As não conquistadas aparecem bloqueadas com 🔒)

## 🔔 NOTIFICAÇÕES (sino no topo)
- "Um olheiro visitou seu perfil!"
- Curtida no post, comentário, avaliação do lance
- Novo seguidor
- Proposta recebida / aceita / recusada
- Presença confirmada no seu evento
- Contadores vermelhos nas abas de chat e no sino

---

## INFORMAÇÕES TÉCNICAS
- Servidor: Node.js + Express, porta 3000
- Banco de dados: arquivo JSON (app/data/db.json) — salvo permanentemente
- Uploads de fotos/vídeos: até 100 MB por arquivo (app/uploads/)
- Mapa: Leaflet + OpenStreetMap
- PWA: instalável pelo navegador (manifest + service worker)
- APLICATIVO ANDROID: apk/VitrineFC.apk
  - Pacote: br.com.vitrinefc, versão 1.0
  - Android 5.0 ou superior (minSdk 21)
  - WebView nativo com upload de fotos/vídeos e botão voltar
  - Tela embutida para trocar o endereço do servidor sem reinstalar
  - Assinado digitalmente (chave: apk/vitrine-key.pem — guardar!)
  - Download direto: [endereço do app]/baixar
- Projeto Android completo: apk/projeto-android/
- Assinador de APK em Python: apk/sign_apk.py
- Guia de nuvem + Play Store: GUIA-NUVEM-E-APK.md
- Documento da ideia: IDEIA-DO-APLICATIVO.md

## COMO GANHAR DINHEIRO (plano futuro)
- Plano grátis para jogadores; plano Pro com destaque nas buscas
- Plano para olheiros/clubes com busca avançada
- Taxa pequena em contratações freelancer
- Anúncios de lojas esportivas e escolinhas

## PRÓXIMO PASSO RECOMENDADO
Subir o servidor no Render.com (grátis, 24h no ar) e gerar o APK final
apontando para o endereço definitivo — depois publicar na Play Store
(conta de desenvolvedor: US$ 25 única vez).
