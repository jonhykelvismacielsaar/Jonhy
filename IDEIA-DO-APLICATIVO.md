# ⚽ Passa a Bola (nome provisório)
### A rede social que conecta jogadores de futebol a olheiros e clubes

---

## 1. A IDEIA EM UMA FRASE

Um aplicativo conectado à internet onde **jogadores, goleiros, técnicos e árbitros**
criam um perfil com fotos, vídeos e informações do que jogam — e **olheiros, clubes e
organizadores de jogos** encontram, avaliam e contratam essas pessoas.

É tipo um "LinkedIn + Instagram do futebol": o jogador se mostra, o olheiro descobre.

---

## 2. QUEM USA O APLICATIVO (tipos de conta)

| Tipo de conta | O que faz |
|---|---|
| 🏃 **Jogador** | Cria perfil, diz a posição (atacante, zagueiro, meia, lateral, volante...), posta fotos e vídeos jogando, recebe propostas |
| 🧤 **Goleiro** | Igual ao jogador, mas com destaque especial — inclusive pra **freelancer**: "preciso de um goleiro pro jogo de domingo", acha na hora |
| 📋 **Técnico** | Perfil com experiência, times que já treinou, vídeos de treinos |
| 🟨 **Árbitro/Juiz** | Perfil com categoria, jogos que já apitou, disponibilidade para apitar jogos |
| 🔎 **Olheiro/Contratante** | Busca jogadores por posição, idade, cidade; assiste os vídeos; manda proposta e conversa no chat |

---

## 3. O PERFIL DO JOGADOR (o coração do app)

**Informações pessoais:**
- Nome, apelido ("nome de campo"), foto de perfil
- Idade / data de nascimento
- Cidade e estado (para busca por região)
- Altura, peso, perna boa (destro/canhoto/ambidestro)

**Informações de jogo:**
- Posição principal (goleiro, zagueiro, lateral, volante, meia, ponta, atacante...)
- Posições secundárias (joga também de...)
- Nível: várzea / amador / semiprofissional / profissional / base
- Times por onde passou
- Pontos fortes (velocidade, cabeceio, defesa de pênalti, cruzamento...)

**Mídia (o mais importante):**
- 📸 Galeria de fotos
- 🎥 **Vídeos jogando** — lances, defesas, gols, melhores momentos
- O olheiro assiste o vídeo direto no app, tipo um feed

**Disponibilidade:**
- "Disponível para contratação" ✅
- "Disponível como freelancer" (ex: goleiro para jogo avulso) ✅
- Valor/cachê (opcional, para freelancer)

---

## 4. FUNCIONALIDADES PRINCIPAIS

1. **Cadastro e login** (e-mail/telefone) — escolhe o tipo de conta
2. **Feed de vídeos** — rolagem de lances dos jogadores (estilo rede social)
3. **Busca com filtros** — "goleiro, até 30 anos, em Curitiba, disponível domingo"
4. **Página de perfil completa** com fotos, vídeos e estatísticas
5. **Chat interno** — olheiro conversa com o jogador, negocia, combina teste/jogo
6. **Propostas** — botão "Quero contratar" / "Chamar para um jogo"
7. **Avaliações** — depois do jogo, quem contratou avalia (estrelas + comentário), gera reputação
8. **Notificações** — "Um olheiro visitou seu perfil", "Você recebeu uma proposta"
9. **Curtidas e seguidores** — jogadores populares aparecem mais

---

## 5. COMO FUNCIONA A COMUNICAÇÃO ENTRE CELULARES

O app instalado em cada celular se conecta a um **servidor central na internet
(backend + banco de dados na nuvem)**. É assim que WhatsApp, Instagram etc. funcionam:

```
Celular do Jogador  ──┐
Celular do Olheiro  ──┼──► SERVIDOR NA NUVEM ◄──┬── Celular do Técnico
Celular do Goleiro  ──┘   (perfis, vídeos,      └── Celular do Árbitro
                           chat, propostas)
```

- O jogador posta o vídeo → sobe pro servidor → qualquer olheiro no mundo vê
- O chat passa pelo servidor → mensagem chega em tempo real no outro celular
- Ninguém precisa estar na mesma rede/cidade: **tudo via internet**

---

## 6. COMO CHEGAR NO APK (plano de construção)

### Etapa 1 — Protótipo funcionando (dá pra fazer AGORA)
Construir o aplicativo como **app web (PWA)**: você abre no navegador do celular,
testa tudo — cadastro, perfil, vídeos, busca, chat. Já funciona na internet e
já pode ser "instalado" na tela inicial do celular.

### Etapa 2 — Backend real na nuvem
Colocar banco de dados e armazenamento de vídeos em um serviço na nuvem
(ex.: Supabase ou Firebase — têm plano gratuito para começar).

### Etapa 3 — Gerar o APK
Empacotar o app com **Capacitor** (ou construir em React Native/Expo), que
transforma o app em um **arquivo .APK de verdade** para instalar no Android —
e depois publicar na **Google Play Store** se quiser.

### Etapa 4 — Crescimento
Notificações push, verificação de perfil (selo azul), planos pagos para
olheiros/clubes (é daí que vem o dinheiro 💰), versão iPhone.

---

## 7. COMO O APP PODE GANHAR DINHEIRO (opcional)

- **Plano grátis** para jogadores (cadastro, perfil, alguns vídeos)
- **Plano Pro para jogadores**: mais vídeos, destaque nas buscas
- **Plano para olheiros/clubes**: busca avançada, contato ilimitado
- **Taxa pequena** em contratações freelancer (ex.: goleiro avulso)
- Anúncios de lojas de material esportivo, escolinhas etc.

---

## 8. SUGESTÕES DE NOME

- **Passa a Bola**
- **Peneira** (peneira digital!)
- **Craque App**
- **Olheiro**
- **Fut Contrato**
- **Vitrine FC**

---

## PRÓXIMO PASSO

Construir o **protótipo funcional (Etapa 1)** aqui mesmo: um app de verdade,
rodando na internet, que você já testa no celular pelo navegador — com cadastro,
perfis, posições, fotos, vídeos, busca e chat. Depois disso, empacotamos em APK.
