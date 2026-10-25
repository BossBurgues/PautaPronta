# Regras do projeto Pauta Pronta (sempre ativas)

Você é o agente de código do projeto Pauta Pronta. Siga estas regras em toda conversa.

## Fonte da verdade
1. `PLANO_EXECUCAO.md` (seção 3, Decisões técnicas) > `BUILD_SPEC.md` > qualquer ideia sua.
2. O prompt da fase atual (`prompts/fase-XX-*.md`) define exatamente o que fazer. Faça **só** aquilo.
3. Antes de escrever código, leia: o prompt da fase, `PROGRESSO.md` e os arquivos existentes que vai alterar.

## Escopo
4. Trabalhe em **uma fase por conversa**. Ao terminar a fase, PARE e peça validação. Não comece a próxima.
5. Não crie telas, rotas, campos, libs ou arquivos que o prompt não pediu. Se achar que falta algo, escreva em
   "Sugestões" no resumo final em vez de implementar.
6. Não mude o contrato da API (`BUILD_SPEC.md` seção 4) nem o schema (`shared/schema.js`) sem pedido explícito.

## Dependências permitidas (lista fechada)
7. Só: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `jszip`, `jspdf`, `hono`, `wrangler`, `vitest`.
   Nada de Tailwind, UI kits, router, axios, lodash, date-fns, zod, libs de XML ou de estado. Precisa de outra? Pergunte.

## Segurança e custo zero
8. Nunca coloque chave de API, token ou segredo em código, em `frontend/`, em URL ou em commit.
   Segredos ficam só em `worker/.dev.vars` (local, ignorado pelo git) e `wrangler secret` (produção).
9. Nunca peça ao usuário para colar a chave do Gemini no chat. Ele mesmo edita `worker/.dev.vars` ou roda `wrangler secret put`.
10. Nunca ative billing, nunca sugira plano pago, nunca implemente publicação automática em redes sociais.
11. Não rode `wrangler deploy`, `wrangler pages deploy`, `wrangler login` ou `wrangler secret put` — esses são passos
    do usuário (fase 8). Você pode rodar `wrangler dev`.

## Código
12. JavaScript (ESM), sem TypeScript. React com componentes de função e hooks. CSS puro com variáveis em `frontend/src/styles.css`.
13. Código e nomes em inglês; textos da interface, mensagens de erro e comentários em **português do Brasil**.
14. Importe `shared/` por caminho relativo (`../../shared/schema.js`). Não duplique a lógica de validação ou de prompt.
15. Funções pequenas e puras onde der (facilita teste). Sem abstrações "para o futuro".
16. Trate erros com mensagem amigável em português na UI; nunca deixe a tela em branco.

## Verificação (obrigatória antes de dizer "pronto")
17. Rode `npm test` na raiz e cole o resultado resumido. Rode o build quando a fase mexer no front (`npm run build`).
18. Execute cada item de "Verificação" do prompt da fase e mostre a saída. Se algo falhar, conserte ou diga claramente o que falhou.
19. Use o navegador do Antigravity para abrir `http://localhost:5173` quando a fase tiver UI, e tire screenshot.
20. Atualize `PROGRESSO.md`: marque `[x]` só no que foi realmente verificado. Não marque a validação humana.

## Git (branches `dev` e `prod`)
21. Comece cada tarefa numa branch nova a partir de `dev` (`fix/...`, `feat/...`, `docs/...`). Nunca commite direto em
    `dev` nem em `prod`; nunca faça `push --force` nessas duas.
22. Commits pequenos com prefixo (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Antes de commitar: `npm test`, `npm run build`
    e `git diff --check`.
23. Merge em `dev` e em `prod` é feito pelo usuário via Pull Request. Você pode abrir o PR, não fazer o merge.

## Ambiente
24. Windows. Use comandos que funcionem no PowerShell ou no terminal integrado. Caminhos com `/` funcionam no Node.
25. Não rode comandos interativos que esperam resposta (geradores com perguntas). Crie os arquivos à mão.
