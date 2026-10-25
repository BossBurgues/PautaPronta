# Fase 6 — Perfil visual, Banco de ideias e Histórico

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seção 7 (itens 1 e 5), `docs/DIAGRAMAS.md` seções 5, 6 e 7 (modelo de dados e chaves do
`localStorage`), `PLANO_EXECUCAO.md` seção 3 e `.agent/rules/pauta-pronta.md`. Já existem: `useConfig` com `AccessForm`
(fase 5), `useDraft`, render com `profile` vindo do `App` (fase 2), tela Gerar com prop `initialTheme` (fase 5).

## Objetivo
O Lucivandro configura a identidade visual uma vez e ela aparece em todos os slides; guarda ideias para depois;
reabre gerações anteriores.

## Fora do escopo
Múltiplos perfis, sincronização entre dispositivos, backend para ideias. Tudo em `localStorage`.

## Tarefas

### 1. Tela Config completa — `frontend/src/components/Profile*.jsx` e `FeedsForm.jsx`
Organize a aba Config em três blocos: **Identidade visual**, **Fontes RSS**, **Acesso** (o `AccessForm` existente).

**Identidade visual (`ProfileForm.jsx`)**
- Logo: `<input type="file" accept="image/png,image/jpeg,image/svg+xml">`. Ao escolher, desenhe num canvas com **lado
  maior ≤ 400 px** (mantendo proporção, fundo transparente) e salve `canvas.toDataURL('image/png')` em `profile.logoDataUrl`.
  Botão "Remover logo". Se o `save` retornar `false` (cota do `localStorage`), mostre "Imagem muito grande; use um PNG menor."
- `@ do perfil` (`handle`, texto livre, máx. 40).
- Fonte: select com `FONT_OPTIONS` (cada opção escrita na própria fonte).
- Cores: 4 `<input type="color">` com rótulos **Fundo**, **Texto**, **Destaque**, **Secundária**
  (`bg`, `text`, `accent`, `muted`) + campo hex ao lado de cada.
- Aviso de contraste: se a razão de contraste WCAG entre `text` e `bg` for < 4.5, mostrar "Contraste baixo: o texto pode
  ficar difícil de ler." (função pura `contrastRatio(hex1, hex2)` em `frontend/src/state/color.js`, com teste).
- Pré-visualização ao vivo: `SlidePreview` da capa e do slide de conclusão do fixture com o perfil atual.
- Botão "Restaurar padrão".

**Fontes RSS (`FeedsForm.jsx`)**
- Lista com nome, URL, toggle ativo, remover. Formulário para adicionar (valida `http(s)://`). Máximo 8 ativos
  (mensagem se tentar ativar o 9º). Texto de ajuda: "Use feeds de fontes oficiais e confiáveis."

**Padrões de geração**: nº de slides, formatos e "buscar na web" padrão (preenchem a tela Gerar).

### 2. Aplicar perfil no render
- O `App` lê `config.profile` e carrega `logoImg` com `loadImage(profile.logoDataUrl)` (em `useEffect`, quando o dataURL mudar).
- Passe `profile` e `logoImg` para Revisão, previews e exportadores. Troque a fonte → `ensureFonts` antes de redesenhar.

### 3. Banco de ideias — `frontend/src/state/useIdeas.js` + `frontend/src/components/IdeaBank.jsx`
- Modelo: `{ id: crypto.randomUUID(), theme, notes, links: [], status: 'nova' | 'usada', createdAt: ISO }` em `pp:ideas`.
- Formulário: tema (obrigatório, 3–200), links (textarea, um por linha, só http/https), anotações.
- Lista (mais recentes primeiro), filtro por texto e por status, contadores "X novas · Y usadas".
- Ações por ideia: **Gerar a partir desta ideia** (vai para a aba Gerar com `initialTheme = theme + (notes ? ' — ' + notes : '')`
  e, se a geração der certo, marca a ideia como `usada`), **Editar** (inline), **Excluir** (com `window.confirm`).
- Na tela Gerar, botão **Salvar como ideia** (salva o tema atual sem gerar).

### 4. Histórico — `frontend/src/state/useHistory.js` + `frontend/src/components/HistoryList.jsx`
- Toda geração com sucesso (online **ou** assistida) adiciona `{ id, createdAt, theme, mode: 'online' | 'assistido', content }`
  no início de `pp:history`; mantém só os **20** mais recentes.
- Lista: tema, data/hora formatada em pt-BR, selo do modo, nº de slides.
- Ações: **Abrir na revisão** (substitui o rascunho atual após `confirm` se houver rascunho com alterações),
  **Excluir**, e no topo **Limpar histórico** (com confirmação).
- O histórico guarda a versão gerada; edições ficam no rascunho (`pp:draft`). Deixe isso escrito na tela em texto pequeno.

### 5. Testes
- `frontend/src/state/color.test.js`: preto×branco = 21; mesma cor = 1; `#777777` × branco ≈ 4.48.
- `frontend/src/state/history.test.js`: função pura `pushHistory(list, entry, max = 20)` mantém 20 e põe o novo primeiro.

## Verificação (rode e mostre a saída)
1. `npm test` e `npm run build` sem erros.
2. Config: subir um logo PNG grande (> 2 MB), trocar fonte para Montserrat e destaque para outra cor → previews e Revisão
   mudam. Recarregar a página → continua. Screenshot.
3. Escolher texto `#BBBBBB` sobre fundo `#FFFFFF` → aviso de contraste.
4. Ideias: criar 3, editar 1, excluir 1, "Gerar a partir desta ideia" → tela Gerar preenchida; após gerar, ideia vira "usada".
5. Histórico: após 2 gerações (pode ser pelo modo assistido com o fixture), aparecem 2 itens; "Abrir na revisão" funciona.
6. Exportar o PDF com o perfil novo e conferir logo, fonte e cores.

## Validação humana
- Aplicar a identidade real do Lucivandro (logo, cores, fonte, @) e exportar um carrossel completo.
- Conferir legibilidade no celular.

## Commit
```bash
git add -A
git commit -m "fase 6: perfil visual, banco de ideias e histórico"
git tag fase-6
```

## Ao terminar
Marque as tarefas da F6 em `PROGRESSO.md`, resuma e PARE.
