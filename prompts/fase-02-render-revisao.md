# Fase 2 — Render dos slides (Canvas) + tela Revisão

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seção 7, `docs/DIAGRAMAS.md` seções 6, 7 e 9 (layout do slide), `PLANO_EXECUCAO.md` seção 3
e `.agent/rules/pauta-pronta.md`. Ainda **não existe backend**: a tela usa `shared/fixtures/exemplo.json`.

## Objetivo
Renderizar cada slide em um `<canvas>` 1080×1350 e permitir editar todos os campos com reflexo ao vivo.

## Fora do escopo
Exportação (fase 3), chamada de API (fase 5), tela Config completa (fase 6). Não instale dependências.

## Tarefas

### 1. Estado e persistência — `frontend/src/state/`
- `storage.js`: `load(key, fallback)` e `save(key, value)` com `try/catch` (JSON inválido → fallback;
  `QuotaExceededError` → `save` retorna `false`). Prefixo das chaves: `pp:`.
- `defaults.js`:
  ```js
  export const DEFAULT_PROFILE = {
    logoDataUrl: '',
    handle: '',
    fontFamily: 'Inter',
    colors: { bg: '#F7F7F5', text: '#1A1A1A', accent: '#0B5FFF', muted: '#6B7280' },
  };
  export const FONT_OPTIONS = ['Inter', 'Montserrat', 'Poppins', 'Lora', 'Merriweather'];
  ```
- `useDraft.js`: hook que guarda o `content` em edição, carrega de `pp:draft` (ou `null`), e salva com debounce de 500 ms.
  Expõe `content`, `setContent`, `updateSlide(index, patch)`, `updateField(name, value)`, `addSlide()`, `removeSlide(index)`.
  As edições ficam em funções puras em `state/draftOps.js` (com teste). **Não** passe as edições por
  `normalizeContent`: ele apara espaços e descarta fontes sem URL, o que impede digitar e adicionar fonte.
  Use `normalizeContent` só em `setContent` (conteúdo vindo da API, do modo assistido ou do histórico);
  nas edições, apenas renumere `n` ao adicionar/remover slide e normalize as hashtags quando vierem como texto.
  `addSlide` insere um slide `ponto` vazio antes da conclusão; bloqueia acima de 7. `removeSlide` bloqueia abaixo de 4.

### 2. Render — `frontend/src/canvas/renderSlide.js`

Use estas funções puras (copie e mantenha os nomes):

```js
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

// Quebra texto em linhas que cabem em maxWidth. measure(str) => largura em px. Respeita \n e quebra palavras gigantes.
export function wrapText(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of String(text || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const tentative = line ? line + ' ' + word : word;
      if (measure(tentative) <= maxWidth) { line = tentative; continue; }
      if (line) lines.push(line);
      if (measure(word) <= maxWidth) { line = word; continue; }
      let chunk = '';
      for (const ch of word) {
        if (measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ch; } else chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

// Reduz a fonte de maxSize até minSize (passo 2) até o texto caber em maxHeight.
// measureAt(size) => (str) => largura. Retorna { size, lines, overflow }.
export function fitText({ text, maxWidth, maxHeight, maxSize, minSize, lineHeight, measureAt }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrapText(text, maxWidth, measureAt(size));
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines, overflow: false };
  }
  const lines = wrapText(text, maxWidth, measureAt(minSize));
  return { size: minSize, lines, overflow: true };
}
```

E implemente:
- `ensureFonts(fontFamily)`: `await Promise.all([document.fonts.load(\`700 64px "${fontFamily}"\`), document.fonts.load(\`400 40px "${fontFamily}"\`)])`
  com `try/catch` (se falhar, segue com a fonte de fallback). **Sem isso o primeiro render sai com a fonte errada.**
- `renderSlide(ctx, { slide, index, total, content, profile, logoImg })` seguindo o layout de `docs/DIAGRAMAS.md` seção 9:
  - fundo `colors.bg`; faixa de 16 px no topo em `colors.accent`; margem lateral 96 px;
  - **capa** (`role === 'capa'`): título bold 84→56 px centralizado na vertical, corpo 40→30 px logo abaixo, em `muted`;
  - **contexto/ponto**: título bold 64→44 px a partir de y=180, até 3 linhas; corpo 40→30 px abaixo do título (gap 48 px);
  - **conclusao**: título + corpo + caixa arredondada com o `content.cta` (fundo `accent` com 10% de opacidade, borda
    `accent`), depois "Fontes:" e a lista de `content.sources` (`título — domínio`, 26 px, `muted`, máx. 4 linhas);
  - rodapé a 64 px da borda: logo (`logoImg`, máx. 72 px de altura, proporção mantida) à esquerda, `profile.handle` ao lado,
    `"{index+1}/{total}"` à direita;
  - use `fitText` para título e corpo; `lineHeight` 1.2 no título e 1.4 no corpo;
  - fonte: `` `700 ${size}px "${profile.fontFamily}", sans-serif` `` (e 400 para o corpo).
- `loadImage(dataUrl)` → `Promise<HTMLImageElement | null>` (null se vazio ou erro).

### 3. Componentes — `frontend/src/components/`
- `SlidePreview.jsx`: recebe `{ content, index, profile, logoImg }`; `<canvas width=1080 height=1350>` exibido com
  CSS `width: 100%; max-width: 320px; aspect-ratio: 1080/1350`; redesenha em `useEffect` quando as props mudam
  (aguarde `ensureFonts` antes do primeiro desenho).
- `SlideEditor.jsx`: para um slide: número, select de `role`, input do título e textarea do corpo, cada um com contador
  `atual/limite` que fica vermelho acima do limite (`LIMITS` de `shared/schema.js`), botão "Remover slide".
- `CaptionEditor.jsx`: textareas `caption_linkedin` e `caption_instagram` (com contadores), input `cta`,
  input de hashtags (texto separado por espaço; ao sair do campo, normaliza).
- `SourcesList.jsx`: lista editável (título, URL, botão remover, botão "Adicionar fonte"). Se `verified === false`,
  mostra selo amarelo **"verificar"** com `title="Esta URL não foi encontrada nas fontes consultadas. Confira antes de publicar."`.
- `Review.jsx`: layout em duas colunas (empilha abaixo de 900 px): à esquerda os editores (slides, legendas, fontes),
  à direita a grade de `SlidePreview`. No topo: título do tema, contagem de slides, botão "Adicionar slide",
  e um bloco com os `warnings`/`errors` de `validateContent` (lista em português). Se `content` for `null`:
  mensagem "Nenhum carrossel em edição" e botão **"Carregar exemplo"** (carrega o fixture).

### 4. `App.jsx`
A aba **Revisão** renderiza `<Review />` usando `useDraft` e `DEFAULT_PROFILE`. As outras abas continuam "Em construção".
Deixe `profile` e `logoImg` como props vindas do `App` (na fase 6 virão da Config).

### 5. Teste — `frontend/src/canvas/renderSlide.test.js`
Com `measure = (s) => s.length * 10`:
- `wrapText('a b c', 30, measure)` → `['a b', 'c']`;
- texto com `\n` gera quebra;
- palavra de 10 letras com `maxWidth` 50 → quebrada em pedaços de 5;
- `fitText` reduz o tamanho quando não cabe e marca `overflow: true` quando nem o mínimo cabe.
(Use `measureAt = (size) => (s) => s.length * size * 0.5`.)

## Verificação (rode e mostre a saída)
1. `npm test` e `npm run build` sem erros.
2. `npm run dev:front`; no navegador do Antigravity: aba Revisão → "Carregar exemplo" → screenshot com os 5 slides.
3. Edite o título do slide 2 para um texto de 80 caracteres → contador vermelho, warning listado, slide reduz a fonte
   sem sair da área. Screenshot.
4. Recarregue a página (F5): a edição continua lá (`pp:draft`).
5. "Adicionar slide" até 7 e "Remover slide" até 4: os limites são respeitados e a numeração `n/total` se atualiza.

## Validação humana
- O slide fica legível no tamanho real? Abra um canvas em nova aba (botão direito → abrir imagem) e veja em 100%.
- Capa, slide de conteúdo e conclusão estão visualmente diferentes e com boa hierarquia?

## Commit
```bash
git add -A
git commit -m "fase 2: render canvas dos slides e tela de revisão com edição ao vivo"
git tag fase-2
```

## Ao terminar
Marque as tarefas da F2 em `PROGRESSO.md`, resuma e PARE.
