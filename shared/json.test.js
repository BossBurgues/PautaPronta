import { describe, it, expect } from 'vitest';
import { extractJson } from './json.js';

describe('shared/json', () => {
  it('extrai objeto de JSON puro', () => {
    const raw = '{"topic":"IA","slides":[]}';
    const result = extractJson(raw);
    expect(result).toEqual({ topic: 'IA', slides: [] });
  });

  it('extrai objeto de bloco markdown ```json ... ```', () => {
    const raw = '```json\n{\n  "topic": "Segurança",\n  "ok": true\n}\n```';
    const result = extractJson(raw);
    expect(result).toEqual({ topic: 'Segurança', ok: true });
  });

  it('extrai objeto quando há texto explicativo antes e depois', () => {
    const raw = `Olá! Segue o carrossel solicitado:

\`\`\`json
{
  "topic": "Inovação",
  "slides": [1, 2, 3, 4]
}
\`\`\`

Espero que ajude!`;
    const result = extractJson(raw);
    expect(result).toEqual({ topic: 'Inovação', slides: [1, 2, 3, 4] });
  });

  it('extrai objeto com texto antes e depois sem bloco markdown', () => {
    const raw = 'Aqui está a resposta: {"status": "ok", "count": 5} confira acima.';
    const result = extractJson(raw);
    expect(result).toEqual({ status: 'ok', count: 5 });
  });

  it('lança erro em português quando não é string', () => {
    expect(() => extractJson(null)).toThrow('Resposta vazia.');
    expect(() => extractJson(undefined)).toThrow('Resposta vazia.');
    expect(() => extractJson(123)).toThrow('Resposta vazia.');
  });

  it('lança erro em português quando não encontra objeto JSON', () => {
    expect(() => extractJson('Nenhum dado aqui.')).toThrow(
      'Não encontrei um objeto JSON na resposta.',
    );
  });

  it('lança erro em português quando o JSON está malformado', () => {
    expect(() => extractJson('{"incompleto": }')).toThrow(
      /O JSON da resposta está mal formado:/,
    );
  });
});
