# Setup de contas e chaves (passos manuais)

Estes passos são **seus** (ou do Lucivandro), não do agente. O agente nunca deve ver nem pedir as chaves.
Contas **em nome do Lucivandro** (ver planejamento da prática, item 3.3), **sem cartão cadastrado**.

Só são necessárias a partir da **Fase 4**. As fases 0 a 3 rodam sem nenhuma conta.

---

## 1. Chave do Gemini (Google AI Studio)

1. Entrar em https://aistudio.google.com com a conta Google do Lucivandro.
2. Aceitar os termos (ele mesmo).
3. **Get API key → Create API key** (num projeto novo, ex.: `pauta-pronta`).
4. **Não** clicar em "Set up billing" / "Upgrade". Sem billing, ao passar da cota a API responde 429 e nada é cobrado.
5. Na lista de modelos do AI Studio, anotar o nome do modelo **Flash** gratuito atual. Se não for `gemini-2.5-flash`,
   trocar `GEMINI_MODEL` em `worker/wrangler.toml`.
6. Copiar a chave **direto** para o arquivo local (não cole no chat do agente):
   - copie `worker/.dev.vars.example` para `worker/.dev.vars`;
   - cole a chave em `GEMINI_API_KEY=`.

## 2. Token de acesso

Gere um token longo e aleatório e cole em `ACCESS_TOKEN=` no `worker/.dev.vars`:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Guarde esse token num gerenciador de senhas: ele é digitado na aba **Config** do app.

## 3. Cloudflare (só na Fase 8)

1. Criar conta em https://dash.cloudflare.com/sign-up com o e-mail do Lucivandro. Plano **Free**. Não cadastrar cartão.
2. No terminal do projeto, `npx wrangler login` abre o navegador para autorizar. Quem autoriza é o dono da conta.
3. O resto (KV, secrets, deploy) está em `prompts/fase-08-deploy-entrega.md`, Parte B.

## 4. Checklist de custo zero (rever na entrega)

- [ ] AI Studio: projeto sem billing account vinculada.
- [ ] Cloudflare: plano Workers **Free**, nenhum método de pagamento.
- [ ] Nenhuma chave em arquivos versionados (`git grep -n -I -E "AIza[0-9A-Za-z_-]{20,}"` vazio).
- [ ] `worker/.dev.vars` fora do git (`git check-ignore worker/.dev.vars` mostra o caminho).

## 5. Limites gratuitos para ter em mente (confira os valores atuais; mudam sem aviso)

| Serviço | O que limita | Efeito no app |
|---|---|---|
| Gemini API (free tier) | requisições por minuto/dia e buscas com grounding por dia | 429 → modo assistido |
| Cloudflare Workers Free | 100 mil requisições/dia, 10 ms de CPU por requisição, 50 subrequisições | app usa poucas; parse leve |
| Cloudflare KV Free | 100 mil leituras e 1 mil escritas por dia | ~1 escrita por geração + 1 por semana |
| `DAILY_LIMIT` do app | gerações por dia (padrão 20) | protege a cota; 429 → modo assistido |
