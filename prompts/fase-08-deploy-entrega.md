# Fase 8 — Deploy, README e entrega

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seções 2, 9 e 11, `docs/SETUP_CONTAS.md`, `docs/TESTES_ACEITACAO.md` e `.agent/rules/pauta-pronta.md`.
**Regra 11:** você **não** roda `wrangler login`, `wrangler deploy`, `wrangler pages deploy` nem `wrangler secret put`.
Você prepara tudo e escreve os comandos; o usuário executa e cola a saída para você conferir.

## Objetivo
App publicado no Cloudflare (Pages + Worker) no plano Free, com README de manutenção e roteiro de aceitação cumprido.

## Tarefas

### Parte A — você (agente)
1. `package.json` da raiz, scripts:
   ```json
   "deploy:worker": "npm run deploy -w worker",
   "deploy:front": "npm run build && npx wrangler pages deploy frontend/dist --project-name pauta-pronta --branch prod"
   ```
2. `frontend/.env.production.example` com `VITE_API_URL=https://pauta-pronta-api.<subdominio>.workers.dev`
   (o usuário copia para `frontend/.env.production` com a URL real — não é segredo, é só o endereço público da API).
   Confirme que `.env.production` **não** está no `.gitignore` ou explique a escolha (é público; pode versionar).
3. `worker/wrangler.toml`: comentário acima de `ALLOWED_ORIGIN` explicando que em produção ele deve conter a URL do Pages
   (`https://pauta-pronta.pages.dev`) e, separado por vírgula, `http://localhost:5173` se quiser testar local.
4. **`README.md` final** (português, para o Lucivandro e para quem for manter), com as seções:
   1. O que é e o que não faz (sem publicação automática, revisão humana obrigatória);
   2. Como usar (fluxo: tema → gerar → revisar → exportar → publicar manualmente) com os 5 botões de exportação;
   3. Modo assistido passo a passo (quando usar, como copiar/colar);
   4. Custos: por que é R$ 0 (planos gratuitos, sem cartão; ao estourar a cota retorna 429 e o app cai no modo assistido);
   5. Rodar localmente (`npm install`, `.dev.vars`, `npm run dev:worker`, `npm run dev:front`);
   6. Deploy (os comandos da Parte B);
   7. **Manutenção**: trocar a chave do Gemini (`wrangler secret put GEMINI_API_KEY`), trocar o modelo (`GEMINI_MODEL`),
      trocar o token, mudar feeds padrão do cron (`DEFAULT_FEEDS`), mudar temas (`TOPICS`), mudar limite diário,
      ajustar o prompt (`shared/prompt.js`), onde ficam os dados (localStorage do navegador — limpar o navegador apaga
      ideias e histórico; sugerir exportar antes);
   8. Solução de problemas (401, 429, 502, feed não lido, fonte com selo "verificar", texto cortado no slide);
   9. Estrutura de pastas (curta) e link para `PLANO_EXECUCAO.md` e `docs/DIAGRAMAS.md`.
5. Rode `/verificar` (workflow) e corrija o que falhar.
6. Execute os itens de `docs/TESTES_ACEITACAO.md` que dá para fazer localmente e registre o resultado lá.

### Parte B — usuário (escreva estes passos no final da sua resposta, na ordem, e espere ele colar as saídas)
Todos dentro de `worker/` ou na raiz, conforme indicado. Conta Cloudflare **do Lucivandro**, plano Free.
```bash
npx wrangler login
npx wrangler kv namespace create KV
```
→ copiar o `id` retornado para `worker/wrangler.toml` (substituir `local-dev-placeholder`).
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ACCESS_TOKEN
npm run deploy:worker
```
→ anotar a URL `https://pauta-pronta-api.<subdominio>.workers.dev`, criar `frontend/.env.production` com ela.
```bash
npx wrangler pages project create pauta-pronta --production-branch prod
npm run deploy:front
```
→ anotar a URL do Pages, colocar em `ALLOWED_ORIGIN` no `wrangler.toml` e rodar `npm run deploy:worker` de novo.
→ abrir a URL do Pages, ir em Config, preencher URL da API e token, "Testar conexão".

### Parte C — conferência pós-deploy (você, com as saídas do usuário)
- `curl.exe https://<worker>/api/health` → ok.
- Smoke contra produção: `scripts/smoke.mjs` aceitar `--base <url>` e ler o token de uma variável de ambiente
  `PP_TOKEN` (o usuário define no terminal dele; você não vê o valor). Casos 1–5.
- Lembrar o usuário de conferir no painel do Google AI Studio que o projeto está **sem billing** e no Cloudflare que o plano é **Free**.

## Validação humana (entrega)
- Roteiro completo de `docs/TESTES_ACEITACAO.md` com 5–10 temas reais, junto com o Lucivandro.
- Treinamento: ele mesmo gera, edita, exporta e usa o modo assistido uma vez.
- Coletar evidências (prints, PDF gerado) para a prática extensionista.

## Commit
```bash
git add -A
git commit -m "fase 8: deploy, README de manutenção e aceitação"
git tag v1.0.0
```

## Ao terminar
Marque as tarefas da F8 em `PROGRESSO.md` e resuma o que ficou para o usuário fazer.
