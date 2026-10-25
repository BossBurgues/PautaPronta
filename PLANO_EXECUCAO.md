# Pauta Pronta — Plano de Execução

> Plano passo a passo para construir o MVP do **Pauta Pronta** usando o **Google Antigravity** com um modelo
> **Gemini Flash** como agente de código.
> Fonte da verdade do produto: [`BUILD_SPEC.md`](BUILD_SPEC.md). Este plano detalha **como** e **em que ordem** construir.
> Quando este plano e o spec divergirem, vale o que está na seção **3. Decisões técnicas** deste arquivo (são correções
> deliberadas, cada uma com motivo).

---

## Mapa dos arquivos

| Arquivo | Para que serve |
|---|---|
| [`PLANO_EXECUCAO.md`](PLANO_EXECUCAO.md) | Este arquivo: MVP, decisões, fases, marcos, riscos |
| [`BUILD_SPEC.md`](BUILD_SPEC.md) | Spec original do produto (contrato da API, schema, prompt, telas) |
| [`PROGRESSO.md`](PROGRESSO.md) | Checklist vivo; o agente marca o que terminou e você valida |
| [`docs/DIAGRAMAS.md`](docs/DIAGRAMAS.md) | Arquitetura, sequências, fluxo do usuário, telas, dados, estados, cronograma |
| [`docs/SETUP_CONTAS.md`](docs/SETUP_CONTAS.md) | Passos manuais **seus** (contas, chaves, login no Cloudflare) |
| [`docs/TESTES_ACEITACAO.md`](docs/TESTES_ACEITACAO.md) | Roteiro de teste manual final (critérios da seção 11 do spec) |
| [`prompts/`](prompts/) | Um prompt por fase, para colar no Antigravity |
| [`.agent/rules/pauta-pronta.md`](.agent/rules/pauta-pronta.md) | Regras permanentes do agente (o Antigravity carrega sozinho) |
| [`.agent/workflows/`](.agent/workflows/) | Atalhos `/proxima-fase` e `/verificar` |

---

## 1. Como rodar no Antigravity (leia primeiro)

1. Abra a pasta `Lucivandro` como workspace no Antigravity.
2. Confira se as regras foram carregadas: **Customizations → Rules** deve listar `pauta-pronta`.
   Se não aparecer, crie uma regra de workspace e cole o conteúdo de `.agent/rules/pauta-pronta.md`.
3. Escolha o modelo Gemini Flash e o modo **Planning** (não use o modo Fast para as fases; ele pula o plano).
4. Para cada fase, **uma conversa nova**:
   - digite `/proxima-fase` **ou** cole o conteúdo de `prompts/fase-XX-*.md`;
   - leia o *Implementation Plan* que o agente gerar **antes** de aprovar. Se ele inventar telas, libs ou
     mudar o contrato, recuse e mande seguir o prompt;
   - ao final, rode `/verificar` e confira você mesmo os itens "Validação humana" do prompt;
   - só então faça o commit (o prompt já traz o comando) e marque a fase no `PROGRESSO.md`.
5. Nunca peça duas fases na mesma conversa. Modelos Flash rendem muito melhor com contexto curto e objetivo.

**Por que tão picado?** O Flash é rápido e barato, mas perde o fio em tarefas longas e tende a "completar" coisas
que ninguém pediu. Cada prompt deste plano tem: objetivo, arquivos exatos, trechos de código para as partes
traiçoeiras, comandos de verificação e um ponto de parada. Isso compensa a diferença de raciocínio.

---

## 2. O MVP

### 2.1 Problema
O Lucivandro gasta de 1 a 3 h por publicação pesquisando, validando fontes, resumindo e montando o visual.
O gargalo é o fluxo inteiro, não a escrita.

### 2.2 Proposta
Uma ferramenta web onde ele digita um tema e recebe um **rascunho de carrossel** (4 a 7 slides, legendas LinkedIn e
Instagram, hashtags, CTA e fontes citadas) já no padrão visual dele, para **revisar, aprovar e exportar**.
A publicação continua manual.

### 2.3 O que entra no MVP (escopo fechado)

| # | Funcionalidade | Fase |
|---|---|---|
| 1 | Gerar carrossel a partir de um tema (RSS + IA, busca web opcional) | F4, F5 |
| 2 | Render dos slides 1080×1350 no padrão visual | F2 |
| 3 | Edição de todos os campos com reflexo ao vivo no slide | F2 |
| 4 | Exportar PDF, ZIP de PNGs, imagem para WhatsApp e copiar legenda | F3 |
| 5 | Perfil visual: logo, cores, fonte, @ do perfil, fontes RSS | F6 |
| 6 | Banco de ideias (CRUD) + "gerar a partir desta ideia" | F6 |
| 7 | Histórico das últimas 20 gerações | F6 |
| 8 | Modo assistido (prompt para colar em qualquer IA gratuita + colar JSON de volta) | F5 |
| 9 | Sugestões semanais automáticas (cron de segunda) | F7 |
| 10 | Token de acesso + limite diário de uso | F4 |

### 2.4 Fora do escopo (não deixe o agente fazer)
Publicação automática; geração de imagens por IA; login/contas de usuário; banco de dados; múltiplos perfis visuais;
editor drag-and-drop; agendamento de posts; analytics; i18n; PWA; testes E2E automatizados.

### 2.5 Marcos (o que mostrar ao Lucivandro e quando)

| Marco | Depois da fase | O que existe | Uso |
|---|---|---|---|
| **M1 — Demo visual offline** | F3 | Carrossel de exemplo renderizado, editável e exportável, sem IA | Validar o **visual** com ele cedo, antes de gastar tempo com IA |
| **M2 — MVP funcional local** | F5 | Gera de verdade (online e assistido) rodando na sua máquina | Testar temas reais e ajustar o prompt |
| **M3 — MVP entregue** | F8 | Publicado no Cloudflare, com perfil, ideias, histórico e cron | Entrega, capacitação e Feedback da Comunidade |

### 2.6 Critérios de pronto
Os da seção 11 do spec, transformados em roteiro em [`docs/TESTES_ACEITACAO.md`](docs/TESTES_ACEITACAO.md).

---

## 3. Decisões técnicas (correções ao spec)

Leia antes de começar. Os prompts já seguem estas decisões.

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Ordem das fases mudou**: o front (render, edição, export) vem **antes** do backend, usando um JSON de exemplo (fixture). | Valida o visual com o cliente no Marco 1 sem chave de API; o front não fica travado esperando o Worker. |
| D2 | Pasta **`shared/`** com o schema, o validador e o construtor de prompt, importada pelo front **e** pelo Worker. | O modo assistido valida no navegador com as mesmas regras do servidor e usa **o mesmo prompt**. Uma fonte só, sem divergência. |
| D3 | Monorepo com **npm workspaces** na raiz da pasta `Lucivandro` (`frontend/`, `worker/`, `shared/`). Os docs do plano ficam junto. | Um `npm install` só; o Vite resolve `../shared` sem configuração extra; `vitest` roda na raiz. |
| D4 | Com **busca web ligada**, a chamada ao Gemini **não** usa `responseSchema`: pede JSON no prompt, extrai e valida. Sem busca, usa `responseSchema`. | Vários modelos Gemini não aceitam *structured output* junto com a ferramenta `google_search` (retornam 400). Assim funciona em qualquer modelo. |
| D5 | O nome do modelo vem da variável **`GEMINI_MODEL`** (padrão `gemini-2.5-flash`). | Os modelos gratuitos mudam. Trocar de modelo vira mudar uma variável, sem código. Confira o nome atual no AI Studio. |
| D6 | O Worker faz um **parse leve de RSS por regex**, com o XML truncado em 200 KB e 6 itens no total. | O navegador não consegue buscar RSS de outros sites (CORS). Parse por regex de texto truncado cabe nos 10 ms de CPU do plano grátis (espera de rede não conta como CPU). |
| D7 | O token vai no header **`Authorization: Bearer <token>`**, não no body nem na URL. O usuário digita o token na tela Config; ele fica no `localStorage`, nunca no código. | Token na URL vaza em histórico/logs; token no build vaza no bundle. |
| D8 | Fontes citadas são **verificadas**: cada URL da IA é comparada com os links do RSS e os domínios do grounding. As que não batem aparecem com selo **"verificar"** na revisão. | A IA pode inventar URL. Atende a regra de veracidade do planejamento sem bloquear o fluxo. |
| D9 | O cron gera só **2–3 temas sugeridos com ângulo e fontes**, não carrosséis completos. Os feeds do cron vêm da variável `DEFAULT_FEEDS` do Worker. | Gasta 1 chamada de IA por semana. O cron não tem acesso ao `localStorage` do navegador. |
| D10 | "Exportar" é um **painel dentro da tela Revisão**, não uma tela separada. Navegação por abas com `useState`, **sem router**. | Menos cliques, menos código. |
| D11 | Versão WhatsApp = **mosaico JPEG** (slides em grade de 2 colunas, 540×675 cada) + o PDF também serve como documento. | WhatsApp recompacta imagens; um arquivo só é mais prático. Ajustar com o Lucivandro no M1. |
| D12 | Sem framework de UI e sem Tailwind: **CSS puro com variáveis**. Dependências permitidas: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `jszip`, `jspdf`, `hono`, `wrangler`, `vitest`. Nada além disso sem sua aprovação. | Flash tende a instalar libs à toa; lista fechada evita isso. |

---

## 4. Fases

Visão geral (horas são estimativa de trabalho seu revisando + agente executando, alinhadas às etapas 3 a 6 do
planejamento da PUCPR):

| Fase | Nome | Entrega verificável | Depende de | Horas | Prompt |
|---|---|---|---|---|---|
| F0 | Scaffold | `npm run dev:front` e `npm run dev:worker` sobem; `npm test` roda | — | 3 | [fase-00](prompts/fase-00-scaffold.md) |
| F1 | Contrato compartilhado | `shared/` com schema, validador, prompt, fixture; testes verdes | F0 | 5 | [fase-01](prompts/fase-01-contrato-compartilhado.md) |
| F2 | Render + Revisão | Fixture aparece como 5 slides; editar reflete ao vivo | F1 | 12 | [fase-02](prompts/fase-02-render-revisao.md) |
| F3 | Exportação | PDF, ZIP, mosaico WhatsApp e copiar legenda funcionando | F2 | 6 | [fase-03](prompts/fase-03-exportacao.md) |
| — | **Marco M1** | Mostrar o visual ao Lucivandro e ajustar | F3 | — | — |
| F4 | Worker (API) | `/api/health`, `/api/generate`, `/api/assisted-parse` via curl | F1 | 12 | [fase-04](prompts/fase-04-worker-api.md) |
| F5 | Integração + modo assistido | Tela Gerar chama a API; 429 cai no modo assistido | F3, F4 | 8 | [fase-05](prompts/fase-05-integracao-assistido.md) |
| — | **Marco M2** | 5 temas reais gerados localmente; ajustar prompt | F5 | — | — |
| F6 | Perfil, ideias, histórico | Config visual aplicada no render; CRUD de ideias; histórico | F5 | 8 | [fase-06](prompts/fase-06-perfil-ideias-historico.md) |
| F7 | Automação semanal | Cron grava em KV; front mostra "Sugestões da semana" | F6 | 4 | [fase-07](prompts/fase-07-cron-sugestoes.md) |
| F8 | Deploy + entrega | Publicado no Cloudflare; README; roteiro de aceitação passado | F7 | 7 | [fase-08](prompts/fase-08-deploy-entrega.md) |

O grafo de dependências e o cronograma estão em [`docs/DIAGRAMAS.md`](docs/DIAGRAMAS.md).

### Antes da F0 — pré-requisitos (você, não o agente)
- [ ] Node 20+ instalado (você tem o 24) e Git configurado.
- [ ] Levantamento presencial feito: logo (PNG fundo transparente), 2–4 cores (hex), fonte preferida, @ do perfil,
      5–10 fontes confiáveis (sites/feeds), temas de interesse, tom de voz.
- [ ] Contas criadas **em nome do Lucivandro, sem cartão**: siga [`docs/SETUP_CONTAS.md`](docs/SETUP_CONTAS.md).
      Só são necessárias a partir da F4; a F0–F3 roda sem nenhuma conta.

### Resumo de cada fase

**F0 — Scaffold.** Git, workspaces, `frontend/` (Vite + React criado à mão, sem gerador interativo), `worker/`
(Hono + Wrangler), `shared/` vazio, `.gitignore`, `.env.example`, `.dev.vars.example`, rota `/api/health`.

**F1 — Contrato compartilhado.** `shared/schema.js` (limites, `validateContent`, `normalizeContent`, schema do Gemini),
`shared/prompt.js` (`buildPrompt`, `buildAssistedPrompt`), `shared/json.js` (`extractJson`),
`shared/fixtures/exemplo.json`. Testes com `vitest`.

**F2 — Render + Revisão.** `frontend/src/canvas/renderSlide.js` (quebra de linha, redução automática de fonte,
layouts de capa / conteúdo / conclusão, numeração, logo), `SlidePreview`, tela Revisão com edição ao vivo,
contadores de caracteres, adicionar/remover slide, rascunho salvo automaticamente.

**F3 — Exportação.** `canvas/exporters.js`: PNG por slide, ZIP, PDF 1080×1350, mosaico WhatsApp, copiar legenda.

**F4 — Worker.** `rss.js`, `gemini.js`, `sources.js` (verificação de fontes), `limits.js` (token + limite diário em KV),
rotas `/api/generate`, `/api/assisted-parse`, CORS. Testes de unidade para `rss.js` e `sources.js`.

**F5 — Integração + modo assistido.** `api.js`, tela Gerar (tema, formatos, nº de slides, busca web, loading,
erros), fallback automático em 429, painel do modo assistido (copiar prompt, colar JSON, validar no navegador).

**F6 — Perfil, ideias, histórico.** Tela Config (logo → dataURL redimensionado, cores, fonte, @, feeds, token,
URL da API), aplicação no render, Banco de ideias, Histórico (20 últimos).

**F7 — Cron.** Handler `scheduled`, gravação em KV `weekly_draft`, `GET /api/suggestions`, card no topo da tela Gerar.

**F8 — Deploy e entrega.** KV real, secrets, deploy do Worker e do Pages, `ALLOWED_ORIGIN` de produção, README de
manutenção, execução do roteiro de aceitação com 5–10 temas reais.

---

## 5. Pontos de validação humana (não pule)

| Quando | O que você confere |
|---|---|
| Fim de cada fase | Itens "Validação humana" do prompt + `npm test` verde + commit feito |
| M1 (após F3) | Abrir com o Lucivandro: cores, fonte, tamanho de texto, legibilidade no celular, formato WhatsApp |
| Após F4 | `git grep -n "AIza"` e `git grep -n GEMINI_API_KEY frontend/` não acham nada (nenhuma chave no código) |
| M2 (após F5) | 5 temas reais: as fontes existem? Algum dado inventado? Tom certo? Ajustar `shared/prompt.js` |
| F8 | Conta Google AI Studio **sem billing**; Cloudflare no plano Free; roteiro de aceitação completo |

---

## 6. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Cota grátis do Gemini muda ou acaba | Média | Alto | Modo assistido (F5) cobre 100% do fluxo sem API; erro 429 cai nele automaticamente |
| Modelo `gemini-2.5-flash` descontinuado | Média | Médio | Variável `GEMINI_MODEL` (D5); trocar e testar com `curl` |
| IA inventa dados ou URLs | Alta | Alto | Prompt restritivo + verificação de fontes (D8) + revisão humana obrigatória |
| Agente Flash foge do escopo / instala libs | Alta | Médio | Regras em `.agent/rules`, lista fechada de deps (D12), uma fase por conversa, revisar o plano antes de aprovar |
| Texto estoura o slide | Alta | Médio | Limites no schema + redução automática de fonte no render + contador de caracteres no editor |
| Feeds RSS fora do ar ou lentos | Média | Baixo | Timeout de 5 s por feed, `Promise.allSettled`, gerar mesmo com 0 feeds se a busca web estiver ligada |
| `localStorage` cheio por causa do logo | Baixa | Médio | Redimensionar logo para no máx. 400 px antes de salvar |
| CPU de 10 ms do Worker grátis | Baixa | Médio | Parse leve (D6), sem libs de XML, nada pesado no Worker |
| Chave vazada | Baixa | Alto | Chave só em `wrangler secret`/`.dev.vars` (gitignored); checagem com `git grep` |

---

## 7. Fluxo de Git sugerido

```bash
git add -A
git commit -m "fase N: <resumo>"
git tag fase-N
```

Se uma fase sair muito errada, é mais barato descartar e refazer do que pedir ao agente para consertar em cima.
Para voltar ao fim da fase anterior **descartando** o que não foi commitado (irreversível, confira antes com `git status`):

```bash
git reset --hard fase-N
```
