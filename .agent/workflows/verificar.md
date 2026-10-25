---
description: Verifica o estado do projeto Pauta Pronta (testes, build, segredos, escopo)
---

Rode e mostre a saída de cada passo. Não corrija nada sem antes reportar.

1. `npm test` na raiz.
2. Se existir `frontend/package.json`: `npm run build`.
3. Procure segredos versionados: `git grep -n -I -E "AIza[0-9A-Za-z_-]{20,}"` e `git grep -n "GEMINI_API_KEY" -- frontend`.
   Os dois devem retornar vazio.
4. Confira que `worker/.dev.vars` e `frontend/.env.local` estão no `.gitignore`: `git check-ignore worker/.dev.vars frontend/.env.local`.
5. Liste as dependências de `package.json`, `frontend/package.json` e `worker/package.json` e compare com a lista permitida
   em `.agent/rules/pauta-pronta.md` (regra 7). Aponte qualquer extra.
6. `git status --short` para mostrar o que não foi commitado.
7. Compare o que existe com as tarefas da fase atual em `PROGRESSO.md` e liste o que falta.
8. Resuma em uma tabela: passo, resultado (OK/FALHOU), observação.
