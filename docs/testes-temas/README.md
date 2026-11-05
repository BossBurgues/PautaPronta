# Teste com os 5 temas do Lucivandro (Marco M2)

Data: 5 de novembro de 2026. Os 5 temas indicados na avaliação foram gerados pelo **modo assistido** do app, com o
Claude no papel do assistente de IA, porque a chave do Gemini ainda não foi criada. O fluxo testado foi o real:
aba Gerar → Usar modo assistido → colar a resposta → Usar resposta → aba Revisar → exportar o PDF de LinkedIn.

As fontes foram lidas nas páginas originais antes de escrever os slides. Cada dado nos slides traz o número da fonte
entre colchetes, no padrão do "artigo da semana" (CIS.IA Insights).

| # | Tema | Slides | Composições usadas | Fontes | Resultado |
|---|---|---|---|---|---|
| 1 | Agentes de IA nas empresas | 6 | texto, número em destaque (40%), passos | McKinsey (*The state of AI in 2026*), Gartner (jun/2025) | aceito, nada cortado |
| 2 | Como escolher um primeiro projeto de IA | 5 | texto, passos (4), número em destaque (60%) | Landing AI (*AI Transformation Playbook*), Gartner (fev/2025), NIST AI RMF | aceito, nada cortado |
| 3 | Diferenças entre automação e IA | 6 | texto, número em destaque (~130), passos | IBM (RPA), OCDE (definição de sistema de IA, 2023), Gartner (jun/2025) | aceito, nada cortado |
| 4 | Qualidade dos dados para projetos de IA | 5 | número em destaque (63%), texto, passos (4) | Gartner (fev/2025), NIST AI RMF | aceito, nada cortado |
| 5 | Gêmeos digitais: aplicações práticas | 6 | texto, passos (4), número em destaque (70%) | McKinsey (*What is digital-twin technology?*), IBM | aceito, nada cortado |

Em todos: o app aceitou a resposta sem pedir correção, abriu a aba Revisar, nenhum slide teve aviso de "texto não coube",
nenhuma regra de validação foi violada e o console do navegador não registrou erros.

## Arquivos

- `0N-*.json`: o conteúdo de cada carrossel (o que o assistente devolveu), versionado.
- `0N-*.pdf`: o PDF para LinkedIn gerado pelo exportador do app, com a identidade HOTMILK e o logo oficial.
  Fica só na máquina (o `.gitignore` não versiona PDFs).

## Ajustes feitos durante o teste

- Na conclusão, títulos de fonte longos eram cortados no meio sem aviso. Agora cada fonte usa até 2 linhas e termina em
  "…" se ainda não couber, sem invadir o rodapé.
- O guia de Andrew Ng é citado pelo endereço oficial da Landing AI.

## Pendente

- Repetir 1 ou 2 temas com a chave do Gemini (modo online), quando a conta do Lucivandro existir, para comparar com o
  modo assistido.
