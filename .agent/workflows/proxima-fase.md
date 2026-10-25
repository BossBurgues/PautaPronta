---
description: Executa a próxima fase pendente do plano do Pauta Pronta
---

1. Leia `PROGRESSO.md` e identifique a primeira fase cuja linha "Validação humana" ainda não está marcada com `[x]`.
   - Se a fase anterior tem tarefas `[x]` mas a validação humana está `[ ]`, PARE e peça ao usuário para validá-la primeiro.
2. Leia o arquivo de prompt dessa fase em `prompts/` (o nome está em `PROGRESSO.md`).
3. Leia `PLANO_EXECUCAO.md` seção 3 (Decisões técnicas) e `.agent/rules/pauta-pronta.md`.
4. Leia os arquivos existentes que o prompt manda alterar.
5. Gere o Implementation Plan seguindo **exatamente** a lista de tarefas do prompt. Espere aprovação.
6. Implemente.
7. Rode todos os passos de "Verificação" do prompt e mostre as saídas.
8. Atualize `PROGRESSO.md` marcando as tarefas concluídas.
9. Termine com: o que foi feito, saídas da verificação, o que o usuário precisa validar manualmente, e o comando de commit
   que está no prompt. Não comece a fase seguinte.
