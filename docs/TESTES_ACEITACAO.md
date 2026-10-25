# Roteiro de testes de aceitação (MVP)

Baseado na seção 11 do `BUILD_SPEC.md`. Rodar na versão **publicada** (fase 8), de preferência junto com o Lucivandro.
Marque `[x]` e anote observações.

## A. Geração

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| A1 | Gerar um tema com busca **desligada**, 5 slides | Carrossel com 5 slides, 2 legendas, 3–5 hashtags, CTA em forma de pergunta, ≥ 2 fontes | [ ] | |
| A2 | Gerar um tema com busca **ligada**, 7 slides | Igual a A1 com 7 slides; fontes com URLs reais | [ ] | |
| A3 | Gerar com 4 slides | Exatamente 4 | [ ] | |
| A4 | Abrir cada URL de fonte de A1 e A2 | Todas existem; as com selo "verificar" foram conferidas | [ ] | |
| A5 | Ler os textos | Sem dado inventado, sem tom comercial, sem política partidária, português correto | [ ] | |
| A6 | Token errado na Config | Mensagem "Token inválido" | [ ] | |

## B. Revisão e edição

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| B1 | Editar título, corpo, legendas, CTA e hashtags | Slide muda na hora | [ ] | |
| B2 | Título com 80 caracteres | Contador vermelho, aviso, texto reduz e não sai do slide | [ ] | |
| B3 | Adicionar e remover slides | Respeita 4–7, numeração `n/total` correta | [ ] | |
| B4 | Fechar e reabrir o navegador | Rascunho continua | [ ] | |

## C. Exportação

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| C1 | PDF (LinkedIn) | Uma página por slide, 1080×1350, nítido | [ ] | |
| C2 | ZIP (Instagram) | PNGs `slide-01.png`… em 1080×1350 | [ ] | |
| C3 | WhatsApp | Mosaico legível no celular | [ ] | |
| C4 | Copiar legenda LinkedIn e Instagram | Texto + CTA + hashtags (+ fontes no LinkedIn) | [ ] | |
| C5 | Subir um PDF de teste no LinkedIn (rascunho, **sem publicar**) | Aceita como documento/carrossel | [ ] | |

## D. Perfil visual

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| D1 | Logo, cores, fonte e @ do Lucivandro | Aplicados no preview e nos arquivos exportados | [ ] | |
| D2 | Recarregar | Configuração mantida | [ ] | |

## E. Banco de ideias e histórico

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| E1 | Salvar 3 ideias | Aparecem na lista | [ ] | |
| E2 | "Gerar a partir desta ideia" | Tela Gerar preenchida; após gerar, ideia vira "usada" | [ ] | |
| E3 | Histórico | Últimas gerações listadas; "Abrir na revisão" funciona | [ ] | |

## F. Contingência e custo zero

| # | Passo | Esperado | OK | Obs. |
|---|---|---|---|---|
| F1 | Modo assistido com o Gemini gratuito (app) | Prompt copiado → resposta colada → carrossel renderizado | [ ] | |
| F2 | Modo assistido com o ChatGPT gratuito | Idem | [ ] | |
| F3 | Simular cota esgotada (`DAILY_LIMIT=0` e redeploy, depois voltar) | Aviso + modo assistido abre sozinho | [ ] | |
| F4 | Sugestões da semana | Card com 2–3 sugestões; "Gerar agora" e "Salvar como ideia" funcionam | [ ] | |
| F5 | `git grep` por chaves e conferência dos painéis | Nenhuma chave no código; AI Studio sem billing; Cloudflare Free | [ ] | |
| F6 | Procurar qualquer botão de "publicar" | Não existe; publicação é manual | [ ] | |

## G. Temas reais (5 a 10)

| # | Tema | Modo | Tempo até o rascunho | Ajustes necessários na revisão | Nota do Lucivandro (1–5) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

Meta do planejamento: tirar o trabalho de 1–3 h por post e deixar só a revisão e aprovação.
Use a coluna de tempo como evidência para o relatório da prática.
