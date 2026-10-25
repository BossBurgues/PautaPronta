# Pauta Pronta — Diagramas

Todos em Mermaid. Renderizam no Antigravity, no GitHub e no VS Code (com extensão de preview Mermaid).

---

## 1. Arquitetura (componentes)

```mermaid
flowchart LR
    subgraph Navegador["Navegador do Lucivandro"]
        UI["React SPA<br/>Gerar · Revisão · Ideias · Histórico · Config"]
        CV["Canvas<br/>renderSlide.js"]
        EX["Exportadores<br/>PNG · ZIP · PDF · WhatsApp"]
        LS[("localStorage<br/>pp:config · pp:ideas<br/>pp:history · pp:draft")]
        SH1["shared/<br/>schema · prompt · json"]
        UI --> CV --> EX
        UI <--> LS
        UI --> SH1
    end

    subgraph CF["Cloudflare (plano Free)"]
        PG["Pages<br/>arquivos estáticos"]
        subgraph WK["Worker pauta-pronta-api (Hono)"]
            R1["GET /api/health"]
            R2["POST /api/generate"]
            R3["POST /api/assisted-parse"]
            R4["GET /api/suggestions"]
            CR["scheduled()<br/>cron seg 09:00 UTC"]
            SH2["shared/<br/>schema · prompt · json"]
        end
        KV[("KV<br/>weekly_draft<br/>usage:AAAA-MM-DD")]
        SEC{{"Secrets<br/>GEMINI_API_KEY<br/>ACCESS_TOKEN"}}
    end

    subgraph EXT["Serviços externos (grátis)"]
        GM["Gemini API<br/>+ Google Search grounding"]
        RSS["Feeds RSS<br/>fontes confiáveis"]
        AI["Qualquer IA gratuita<br/>(modo assistido)"]
    end

    PG -.->|serve| UI
    UI -->|fetch + Bearer token| R2
    UI -->|fetch + Bearer token| R3
    UI -->|fetch + Bearer token| R4
    R2 --> RSS
    R2 --> GM
    CR --> RSS
    CR --> GM
    CR --> KV
    R4 --> KV
    R2 --> KV
    WK -.->|lê| SEC
    UI -.->|usuário copia e cola| AI
```

---

## 2. Sequência — geração online (caminho feliz)

```mermaid
sequenceDiagram
    autonumber
    actor U as Lucivandro
    participant F as Frontend
    participant W as Worker
    participant K as KV
    participant R as Feeds RSS
    participant G as Gemini

    U->>F: digita tema, escolhe slides, clica Gerar
    F->>W: POST /api/generate (Bearer token, tema, feeds, useWebSearch)
    W->>W: valida token e body
    W->>K: get usage:hoje
    alt passou do DAILY_LIMIT
        W-->>F: 429 {error:"daily_limit", fallbackToAssisted:true}
    end
    par até 8 feeds, timeout 5 s cada
        W->>R: GET feed
        R-->>W: XML (truncado em 200 KB)
    end
    W->>W: parse leve, dedup, 6 itens mais recentes
    W->>W: buildPrompt(tema, slides, itens)
    alt useWebSearch = true
        W->>G: generateContent + tools google_search (sem responseSchema)
    else useWebSearch = false
        W->>G: generateContent + responseSchema JSON
    end
    G-->>W: texto JSON + groundingMetadata
    W->>W: extractJson, normalizeContent, validateContent
    opt JSON inválido
        W->>G: 1 retry com a lista de erros
        G-->>W: novo JSON
    end
    W->>W: verifySources (marca verified true/false)
    W->>K: put usage:hoje +1 (TTL 2 dias)
    W-->>F: 200 {ok, content, usedSources, model}
    F->>F: salva em pp:draft e pp:history
    F->>U: abre Revisão com slides renderizados
```

---

## 3. Sequência — cota esgotada e modo assistido

```mermaid
sequenceDiagram
    autonumber
    actor U as Lucivandro
    participant F as Frontend
    participant W as Worker
    participant A as IA gratuita (Gemini app, ChatGPT...)

    F->>W: POST /api/generate
    W-->>F: 429 {fallbackToAssisted:true}
    F->>U: aviso "Cota do dia acabou. Use o modo assistido."
    F->>F: buildAssistedPrompt(tema, slides, feeds)  [shared/prompt.js]
    U->>F: clica "Copiar prompt"
    U->>A: cola o prompt
    A-->>U: resposta em JSON
    U->>F: cola a resposta e clica "Usar resposta"
    F->>F: extractJson + normalizeContent + validateContent (no navegador)
    alt válido
        F->>U: abre Revisão (todas as fontes com selo "verificar")
    else inválido
        F->>U: lista de erros em português + botão "Copiar pedido de correção"
    end
```

O endpoint `POST /api/assisted-parse` existe (para cumprir o contrato do spec), mas o front valida localmente
com o mesmo código de `shared/`, então o modo assistido funciona **mesmo com o Worker fora do ar**.

---

## 4. Sequência — cron semanal

```mermaid
sequenceDiagram
    autonumber
    participant C as Cron Trigger (seg 09:00 UTC)
    participant W as Worker scheduled()
    participant R as Feeds RSS (DEFAULT_FEEDS)
    participant G as Gemini
    participant K as KV
    participant F as Frontend

    C->>W: dispara
    W->>R: busca feeds padrão
    W->>G: buildSuggestionsPrompt(TOPICS, itens) com responseSchema
    G-->>W: 2 a 3 sugestões {theme, angle, sources}
    W->>K: put weekly_draft {generatedAt, suggestions}
    Note over F: mais tarde, ao abrir o app
    F->>W: GET /api/suggestions
    W->>K: get weekly_draft
    W-->>F: {ok, generatedAt, suggestions}
    F->>F: card "Sugestões da semana" com botão Gerar e Salvar ideia
```

---

## 5. Fluxo do usuário

```mermaid
flowchart TD
    A([Abre o app]) --> B{Token configurado?}
    B -->|não| C[Config: token, URL da API,<br/>logo, cores, fonte, feeds]
    C --> D
    B -->|sim| D[Tela Gerar<br/>+ Sugestões da semana]
    I[Banco de ideias] -->|Gerar a partir desta ideia| D
    D -->|Salvar como ideia| I
    D --> E{Gerar online}
    E -->|sucesso| F[Revisão]
    E -->|429 ou erro de rede| G[Modo assistido<br/>copiar prompt, colar JSON]
    G --> F
    F --> H[Editar títulos, textos,<br/>legendas, CTA, hashtags]
    H --> F
    F --> X[Painel Exportar]
    X --> X1[PDF LinkedIn]
    X --> X2[ZIP PNG Instagram]
    X --> X3[Mosaico WhatsApp]
    X --> X4[Copiar legenda]
    X1 --> P([Publica manualmente<br/>nas redes])
    X2 --> P
    X3 --> P
    X4 --> P
    J[Histórico 20 últimos] -->|Abrir| F
```

---

## 6. Mapa de telas e componentes

```mermaid
flowchart TB
    App["App.jsx<br/>abas via useState"] --> T1
    App --> T2
    App --> T3
    App --> T4
    App --> T5
    T1["Gerar"] --> G1[SuggestionsCard]
    T1 --> G2[GenerateForm]
    T1 --> G3[AssistedPanel]
    T2["Revisão"] --> R1["SlidePreview x N<br/>(canvas)"]
    T2 --> R2["SlideEditor x N"]
    T2 --> R3[CaptionEditor]
    T2 --> R4[SourcesList]
    T2 --> R5[ExportPanel]
    T3["Ideias"] --> I1[IdeaBank]
    T4["Histórico"] --> H1[HistoryList]
    T5["Config"] --> C1[ProfileForm]
    T5 --> C2[FeedsForm]
    T5 --> C3[AccessForm]
```

---

## 7. Modelo de dados

```mermaid
classDiagram
    class Content {
        string topic
        Slide[] slides
        string caption_linkedin
        string caption_instagram
        string[] hashtags
        string cta
        Source[] sources
    }
    class Slide {
        int n
        string role
        string title
        string body
    }
    class Source {
        string title
        string url
        bool verified
    }
    class Config {
        string apiUrl
        string token
        Profile profile
        Feed[] feeds
        Defaults defaults
    }
    class Profile {
        string logoDataUrl
        string handle
        string fontFamily
        Colors colors
    }
    class Colors {
        string bg
        string text
        string accent
        string muted
    }
    class Feed {
        string name
        string url
        bool enabled
    }
    class Idea {
        string id
        string theme
        string notes
        string[] links
        string status
        string createdAt
    }
    class HistoryEntry {
        string id
        string createdAt
        string theme
        string mode
        Content content
    }
    class WeeklyDraft {
        string generatedAt
        Suggestion[] suggestions
    }
    class Suggestion {
        string theme
        string angle
        Source[] sources
    }
    Content "1" *-- "4..7" Slide
    Content "1" *-- "2..*" Source
    Config *-- Profile
    Profile *-- Colors
    Config *-- "*" Feed
    HistoryEntry *-- Content
    WeeklyDraft *-- "2..3" Suggestion
```

Limites: `slides` 4 a 7 · `title` até 60 caracteres · `body` até 220 · `hashtags` 3 a 5 · `sources` 2 ou mais.
`role` ∈ `capa | contexto | ponto | conclusao` · `status` da ideia ∈ `nova | usada` · `mode` ∈ `online | assistido`.
`verified` é preenchido pelo app (D8), não pela IA.

Onde cada coisa fica:

| Chave | Onde | Conteúdo |
|---|---|---|
| `pp:config` | localStorage | `Config` |
| `pp:ideas` | localStorage | `Idea[]` |
| `pp:history` | localStorage | `HistoryEntry[]` (máx. 20, mais recente primeiro) |
| `pp:draft` | localStorage | `Content` em edição (salvo a cada mudança, debounce 500 ms) |
| `weekly_draft` | KV | `WeeklyDraft` |
| `usage:AAAA-MM-DD` | KV | número de gerações no dia (TTL 172800 s) |

---

## 8. Estados da tela Gerar

```mermaid
stateDiagram-v2
    [*] --> Ocioso
    Ocioso --> Gerando: clica Gerar (tema válido)
    Gerando --> Sucesso: 200
    Gerando --> CotaEsgotada: 429
    Gerando --> Erro: rede / 5xx / 401
    Sucesso --> [*]: abre Revisão
    CotaEsgotada --> Assistido: abre painel automaticamente
    Erro --> Ocioso: tentar de novo
    Erro --> Assistido: botão "Usar modo assistido"
    Ocioso --> Assistido: botão "Modo assistido"
    Assistido --> Sucesso: JSON colado é válido
    Assistido --> Assistido: JSON inválido (mostra erros)
```

---

## 9. Layout do slide (1080 × 1350)

```text
┌──────────────────────────────────────────┐ ← faixa de destaque (accent), 16 px
│                                          │
│  margem 96 px                            │
│  ┌────────────────────────────────────┐  │
│  │ TÍTULO (bold, 64 px → mín. 44 px)  │  │  capa: título 84 px, centralizado na vertical
│  │ até 3 linhas                       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Corpo (regular, 40 px → mín. 30 px)│  │  conclusão: corpo + caixa de CTA
│  │ quebra automática, line-height 1.4 │  │  + lista de fontes (26 px, cor muted)
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [logo máx. 72 px de altura]  @perfil  3/5│ ← rodapé, 64 px da borda
└──────────────────────────────────────────┘
```

---

## 10. Dependência entre fases

```mermaid
flowchart LR
    F0[F0 Scaffold] --> F1[F1 Contrato<br/>shared/]
    F1 --> F2[F2 Render<br/>+ Revisão]
    F2 --> F3[F3 Exportação]
    F3 --> M1{{M1 Demo visual}}
    F1 --> F4[F4 Worker API]
    F3 --> F5[F5 Integração<br/>+ Assistido]
    F4 --> F5
    F5 --> M2{{M2 MVP local}}
    M2 --> F6[F6 Perfil · Ideias<br/>· Histórico]
    F6 --> F7[F7 Cron]
    F7 --> F8[F8 Deploy<br/>+ Entrega]
    F8 --> M3{{M3 Entregue}}
```

F2–F3 e F4 podem andar em paralelo (conversas separadas no Antigravity), desde que F1 esteja pronta.

---

## 11. Cronograma (estimativa)

```mermaid
gantt
    title Pauta Pronta — desenvolvimento (~65 h)
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m
    section Base
    F0 Scaffold                 :f0, 2026-10-19, 1d
    F1 Contrato compartilhado   :f1, after f0, 2d
    section Visual
    F2 Render + Revisão         :f2, after f1, 4d
    F3 Exportação               :f3, after f2, 2d
    M1 Demo com Lucivandro      :milestone, m1, after f3, 0d
    section Backend
    F4 Worker API               :f4, after f1, 4d
    F5 Integração + Assistido   :f5, after f3, 3d
    M2 Testes com temas reais   :milestone, m2, after f5, 0d
    section Completo
    F6 Perfil Ideias Histórico  :f6, after f5, 3d
    F7 Cron                     :f7, after f6, 1d
    F8 Deploy + Entrega         :f8, after f7, 3d
    M3 Entrega                  :milestone, m3, after f8, 0d
```

Ajuste as datas para a sua agenda; o que importa é a ordem.
