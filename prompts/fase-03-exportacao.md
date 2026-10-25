# Fase 3 — Exportação (PDF, ZIP de PNG, WhatsApp, copiar legenda)

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seção 7 (item 4), `PLANO_EXECUCAO.md` seção 3 (D10, D11) e `.agent/rules/pauta-pronta.md`.
O render já existe em `frontend/src/canvas/renderSlide.js` (fase 2). Reaproveite-o; não duplique lógica de desenho.

## Objetivo
Painel **Exportar** dentro da tela Revisão, gerando arquivos no navegador (nada vai para servidor).

## Fora do escopo
Upload, compartilhamento direto, publicação em rede social. Só as libs `jszip` e `jspdf`.

## Tarefas

1. Instale: `npm install jszip jspdf -w frontend`.
2. `frontend/src/canvas/exporters.js`:
   - `slugify(text)` → minúsculas, sem acento (`normalize('NFD')` + remover diacríticos), hífens, máx. 40 caracteres.
   - `renderToCanvas(content, index, profile, logoImg)` → cria canvas 1080×1350 fora da tela, chama `ensureFonts` e `renderSlide`.
   - `canvasToBlob(canvas, type = 'image/png', quality)` → `Promise<Blob>` via `canvas.toBlob`.
   - `downloadBlob(blob, filename)` → `URL.createObjectURL` + `<a download>` + `revokeObjectURL` depois.
   - `exportPngZip(content, profile, logoImg)` → ZIP `pauta-pronta-{slug}.zip` com `slide-01.png` … (PNG 1080×1350).
   - `exportPdf(content, profile, logoImg)` → PDF `pauta-pronta-{slug}.pdf`, uma página por slide:
     ```js
     import { jsPDF } from 'jspdf';
     const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350], hotfixes: ['px_scaling'], compress: true });
     // para cada slide i: if (i > 0) pdf.addPage([1080, 1350], 'portrait');
     // pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 1080, 1350);
     pdf.save(filename);
     ```
   - `exportWhatsappMosaic(content, profile, logoImg)` → um JPEG (qualidade 0.85) com os slides em grade de 2 colunas,
     cada um reduzido para 540×675, fundo `colors.bg`, largura 1080 e altura `675 * ceil(n/2)`.
     Arquivo `pauta-pronta-{slug}-whatsapp.jpg`.
   - `exportSingleSlide(content, index, profile, logoImg)` → PNG de um slide só (`slide-0N.png`).
   - `buildCaption(content, network)` → legenda da rede (`linkedin` | `instagram`) + linha em branco + CTA +
     linha em branco + hashtags separadas por espaço. Para LinkedIn, acrescente no fim "Fontes:" e `- título: url` por fonte.
   - `copyText(text)` → `navigator.clipboard.writeText`; se falhar, fallback com `<textarea>` + `document.execCommand('copy')`.
     Retorna `true/false`.
3. `frontend/src/components/ExportPanel.jsx` (dentro da Revisão, acima ou abaixo da grade de previews):
   - botões: **PDF (LinkedIn)**, **ZIP de imagens (Instagram)**, **Imagem para WhatsApp**,
     **Copiar legenda LinkedIn**, **Copiar legenda Instagram**;
   - cada slide no preview ganha um botão pequeno "Baixar PNG";
   - durante a exportação, o botão fica desabilitado com texto "Gerando…";
   - mensagem de confirmação curta ("Legenda copiada!", "PDF gerado") que some em 3 s;
   - se `validateContent` tiver **errors**, mostrar aviso "Há problemas no conteúdo; revise antes de publicar" mas **não**
     bloquear a exportação (a decisão é do usuário);
   - lembrete fixo em texto pequeno: "Revise o conteúdo e as fontes antes de publicar. A publicação é manual."
4. Teste `frontend/src/canvas/exporters.test.js`: `slugify('Inteligência Artificial: o que muda?')` →
   `'inteligencia-artificial-o-que-muda'`; `buildCaption` do fixture para `linkedin` contém o CTA, as hashtags e as duas URLs;
   para `instagram` não contém "Fontes:".

## Verificação (rode e mostre a saída)
1. `npm test` e `npm run build` sem erros.
2. No navegador do Antigravity, com o exemplo carregado, clique em cada botão de exportação e informe nome e tamanho
   dos arquivos baixados (procure na pasta de downloads).
3. Abra um PNG e confirme 1080×1350 (por exemplo com `node -e` lendo os bytes 16–23 do PNG, ou abrindo a imagem).
4. Cole o conteúdo da área de transferência em um campo de texto para provar o "copiar legenda".

## Validação humana
- Abrir o PDF: 5 páginas, nítido, sem cortes, fontes certas.
- Abrir o mosaico no celular (mande para você mesmo no WhatsApp): dá para ler?
- **Marco M1**: mostrar ao Lucivandro e anotar ajustes de visual em `PROGRESSO.md` (seção "Ajustes do M1").

## Commit
```bash
git add -A
git commit -m "fase 3: exportação PDF, ZIP, WhatsApp e cópia de legenda"
git tag fase-3
```

## Ao terminar
Marque as tarefas da F3 em `PROGRESSO.md`, resuma e PARE.
