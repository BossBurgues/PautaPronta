# Pauta Pronta — Build Spec (MVP)

> Documento de especificação para construir o MVP em um agente de código (Claude Code / Antigravity).
> Objetivo: ferramenta web que, a partir de um tema, pesquisa fontes confiáveis e gera um rascunho de
> carrossel (slides + legendas + fontes) no padrão visual do usuário, para revisão e exportação manual.
> Restrições inegociáveis: **custo em dinheiro = R$ 0** (serviços de nível gratuito, sem cartão) e
> **nenhuma publicação automática** nas redes.

---

## 1. Visão geral

**Fluxo do usuário:** tema/ideia → gerar → revisar/editar → exportar (PDF/PNG/WhatsApp) → publicar manualmente.

**Modos de geração:**
1. **Online (padrão):** backend chama a IA com busca na web + feeds RSS curados.
2. **Assistido (contingência, custo zero garantido):** o app monta um prompt pronto; o usuário cola em
   qualquer assistente gratuito (Gemini/ChatGPT), traz a resposta em JSON e o app renderiza. Garante que a
   ferramenta nunca para, mesmo se o nível gratuito da API mudar.

**Automação:** cron semanal (segunda) gera 2–3 sugestões de pauta e guarda como rascunho.

---

## 2. Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Vite + React + JavaScript | SPA simples; sem framework de UI pesado |
| Estilo | CSS puro ou Tailwind | à escolha do agente; manter leve |
| Render de slide | HTML Canvas API | desenha cada slide; `canvas.toBlob()` → PNG |
| Export | `jszip` (ZIP de PNGs), `jspdf` (PDF do carrossel) | libs MIT |
| Backend | Cloudflare Worker (+ `hono` opcional) | guarda a chave da IA; busca RSS; chama a IA |
| IA | Google Gemini API — modelo `gemini-2.5-flash` | structured output + Google Search grounding |
| Agendamento | Cloudflare Cron Trigger | 1 disparo semanal |
| Estado persistente | `localStorage` (MVP) + Cloudflare KV (rascunho do cron) | ideias, config, histórico |
| Hospedagem | Cloudflare Pages (frontend) + Workers (API) | plano gratuito |
| Acesso | token simples via querystring/header | protege a cota |

**Por que Cloudflare e não Vercel:** o plano Hobby da Vercel é não comercial e limita cron a 1×/dia.
O gratuito da Cloudflare não tem a cláusula não comercial e permite o cron semanal. (Confirmar termos vigentes.)

**Regra de custo zero:** a conta Gemini do usuário fica **sem billing/cartão**. Ao estourar a cota, a API
retorna erro de limite (429) e o app cai no modo assistido — nunca gera cobrança.

---

## 3. Arquitetura

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (Cloudflare Pages)│        │  Worker (Cloudflare)         │
│  - Banco de ideias          │ POST   │  /api/generate               │
│  - Form de tema             │ ─────▶ │   1. valida token + limite   │
│  - Canvas render dos slides │        │   2. busca feeds RSS (paralelo)
│  - Editor                   │ ◀───── │   3. chama Gemini (grounding)│
│  - Export PNG/ZIP/PDF       │  JSON  │   4. valida JSON, responde   │
│  - Config visual (perfil)   │        │  /api/suggestions (cron)     │
│  localStorage               │        │  KV: weekly_draft, limits    │
└─────────────────────────────┘        │  SECRET: GEMINI_API_KEY      │
                                       └──────────────────────────────┘
```

O Worker só busca e repassa (parse pesado de XML é no front, por causa do limite de 10ms de CPU do plano free).
Máximo ~8 subrequisições por geração (limite do plano é 50).

---

## 4. Contrato da API

### `POST /api/generate`
**Request**
```json
{
  "token": "string",
  "theme": "string",
  "formats": ["linkedin", "instagram"],
  "slideCount": 5,
  "tone": "profissional-didatico",
  "sources": ["https://feed1.xml", "https://feed2.xml"],
  "useWebSearch": true
}
```
**Response 200**
```json
{
  "ok": true,
  "content": { /* ver schema seção 5 */ },
  "usedSources": [{ "title": "...", "url": "..." }],
  "model": "gemini-2.5-flash"
}
```
**Response 429** `{ "ok": false, "error": "quota", "fallbackToAssisted": true }`

### `POST /api/assisted-parse`
Recebe o JSON colado pelo usuário (modo assistido), valida contra o schema e devolve `content`.

### `GET /api/suggestions`
Retorna o rascunho semanal do KV (gerado pelo cron). Vazio se não houver.

### Cron (weekly)
Segunda 09:00 UTC (06:00 BRT): gera 2–3 temas + rascunhos curtos e grava em KV `weekly_draft`.

---

## 5. Schema do conteúdo (structured output da IA)

```json
{
  "topic": "string",
  "slides": [
    { "n": 1, "role": "capa",        "title": "string", "body": "string" },
    { "n": 2, "role": "contexto",    "title": "string", "body": "string" },
    { "n": 3, "role": "ponto",       "title": "string", "body": "string" },
    { "n": 4, "role": "ponto",       "title": "string", "body": "string" },
    { "n": 5, "role": "conclusao",   "title": "string", "body": "string" }
  ],
  "caption_linkedin": "string",
  "caption_instagram": "string",
  "hashtags": ["#...", "..."],       // 3 a 5
  "cta": "string",                    // pergunta natural, não comercial
  "sources": [{ "title": "string", "url": "string" }]  // >= 2
}
```
Limites: título ≤ 60 caracteres; body ≤ 220; slides entre 4 e 7; hashtags 3–5; sources ≥ 2.
Validar no Worker; em JSON inválido, 1 retry; se falhar, erro amigável.

---

## 6. Prompt da IA (instruções fixas)

```
Você é um assistente de criação de conteúdo técnico para redes profissionais (LinkedIn e Instagram).
A partir do TEMA e das FONTES fornecidas, produza um carrossel.

Regras obrigatórias:
- Use SOMENTE informação presente nas fontes fornecidas/pesquisadas. Não invente dados.
- Cite ao menos 2 fontes, com título e URL reais retornados pela busca.
- Tom: profissional e tecnicamente consistente, porém didático e acessível. Nem acadêmico demais, nem informal.
- NÃO faça afirmações sem fonte. NÃO trate tendência/hipótese como fato consolidado.
- Proibido: conteúdo político-partidário, polêmico fora do tema, sensacionalista ou comercial/autopromocional.
- CTA final deve ser uma pergunta natural relacionada ao tema (ex.: "Como sua empresa lida com isso?"),
  nunca uma chamada de venda.
- Legenda do LinkedIn: mais analítica e contextualizada. Legenda do Instagram: mais direta e visual.
- 3 a 5 hashtags relevantes.
- Responda ESTRITAMENTE no schema JSON definido. Sem texto fora do JSON.

TEMA: {theme}
SLIDES: {slideCount}
FONTES: {lista de título + resumo + url}
```

Config da API: `responseMimeType: application/json`, `responseSchema` (seção 5),
`tools: [{ google_search: {} }]` quando `useWebSearch=true`.

---

## 7. Telas (frontend)

1. **Banco de ideias** — lista de temas/links salvos (localStorage). Botões: adicionar, gerar a partir de, excluir.
2. **Gerar** — campo tema, seletor de formato (LinkedIn/Instagram), nº de slides, toggle "buscar na web",
   botão Gerar. Estado de carregando. Fallback: botão "Modo assistido" que mostra o prompt para copiar e
   uma caixa para colar o JSON.
3. **Revisão** — preview dos slides renderizados no Canvas + campos editáveis (título/body por slide,
   legendas, CTA, hashtags). Edições refletem no canvas ao vivo.
4. **Exportar** — PDF (LinkedIn), PNGs 1080×1350 em ZIP (Instagram), imagem única p/ WhatsApp, copiar legenda.
5. **Config / Perfil visual** — logo (upload→dataURL), paleta (cores), fonte, lista de fontes RSS.
   Salvo em localStorage. (MVP: 1 perfil.)

**Render do slide (Canvas):** fundo claro, título forte no topo, body com quebra automática de linha,
numeração "n/total", logo no rodapé; slide final lista fontes + CTA. Tamanho base 1080×1350.

---

## 8. Estrutura de pastas

```
pauta-pronta/
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── state/            # ideias, config, histórico (localStorage)
│   │   ├── components/       # IdeaBank, GenerateForm, Review, Export, Profile
│   │   ├── canvas/           # renderSlide.js, exporters (png/zip/pdf)
│   │   └── api.js            # chamadas ao Worker
│   └── vite.config.js
├── worker/
│   ├── src/
│   │   ├── index.js          # rotas /api/*
│   │   ├── gemini.js         # chamada à API + schema
│   │   ├── rss.js            # fetch de feeds
│   │   └── validate.js       # valida o JSON de saída
│   ├── wrangler.toml         # bindings: KV, cron, secret
│   └── package.json
├── README.md                 # setup, deploy, troca de chave e fontes (entregável de manutenção)
└── .env.example
```

---

## 9. Variáveis e segredos

- `GEMINI_API_KEY` — secret do Worker (`wrangler secret put`). **Nunca no frontend.**
- `ACCESS_TOKEN` — token simples para proteger a API.
- `KV` binding — rascunho semanal e contador de uso diário.
- `.env.example` documenta tudo; chaves reais ficam no painel da Cloudflare / nome do usuário.

---

## 10. Plano de build por fases (tarefas para o agente)

**Fase 0 — Scaffold**
- [ ] Criar monorepo (frontend Vite+React, worker Wrangler). Deploy inicial vazio no Pages + Workers.

**Fase 1 — Backend núcleo**
- [ ] `rss.js`: buscar N feeds em paralelo, normalizar (título, resumo, link, data), dedup, cortar a 6 itens.
- [ ] `gemini.js`: chamada ao `gemini-2.5-flash` com responseSchema + grounding; montar prompt da seção 6.
- [ ] `validate.js`: validar schema (seção 5), 1 retry, tratar 429 → `fallbackToAssisted`.
- [ ] Rota `POST /api/generate`. Proteção por token + limite diário em KV.

**Fase 2 — Frontend núcleo**
- [ ] Tela Gerar → chama `/api/generate` → recebe JSON.
- [ ] `renderSlide.js`: desenha slide no Canvas (quebra de linha, numeração, logo).
- [ ] Tela Revisão com edição ao vivo.

**Fase 3 — Exportação**
- [ ] PNG por slide (`toBlob`), ZIP (jszip), PDF (jspdf), copiar legenda, imagem WhatsApp.

**Fase 4 — Perfil visual e banco de ideias**
- [ ] Config: logo/cores/fonte/fontes RSS em localStorage; aplicar no render.
- [ ] Banco de ideias (CRUD em localStorage) + "gerar a partir de".
- [ ] Histórico das últimas 20 gerações.

**Fase 5 — Modo assistido (contingência)**
- [ ] Botão que gera o prompt pronto para copiar.
- [ ] Caixa para colar JSON → `/api/assisted-parse` → render. (Garante custo zero absoluto.)

**Fase 6 — Automação**
- [ ] Cron semanal → `/api/suggestions` grava rascunho em KV.
- [ ] Front mostra "Sugestões da semana" ao abrir.

**Fase 7 — Entrega**
- [ ] README com setup, deploy, troca de chave e de fontes. Teste com 5–10 temas reais.

---

## 11. Critérios de aceitação (MVP pronto)

- Digitar um tema e receber carrossel de 4–7 slides + 2 legendas + 3–5 hashtags + ≥2 fontes citadas.
- Editar qualquer campo e ver refletir no slide.
- Exportar PDF e ZIP de PNGs 1080×1350 e copiar legenda.
- Perfil visual (logo/cores/fonte) aplicado ao render.
- Banco de ideias funcionando (salvar e gerar a partir de).
- Modo assistido gera conteúdo sem usar a API.
- Nenhuma chave exposta no frontend. Nenhuma conta com billing. Nenhuma publicação automática.

---

## 12. Como usar este spec nos dois agentes

**Claude Code:** salve este arquivo como `BUILD_SPEC.md` na raiz do projeto. Peça: "Leia o BUILD_SPEC.md e
implemente a Fase 0 e 1; não avance de fase sem eu validar." Trabalhe fase a fase, commitando a cada uma.

**Antigravity (Google):** abra o workspace, adicione este arquivo como contexto/artefato do plano e peça ao
agente para gerar o plano de tarefas a partir das Fases da seção 10. Use o modo de execução por passos e
revise cada fase antes de prosseguir. Por ser agent-first, deixe os critérios da seção 11 como checagem final.

**Em ambos:** o grounding do Gemini tem cota (2.5 Flash: ~500 buscas/dia grátis no free tier; muda sem aviso).
Comece com `useWebSearch=false` + RSS nos testes para não gastar cota, e ligue a busca só na validação final.
```
```
