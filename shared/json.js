// Extrai o primeiro objeto JSON de um texto de IA (com ou sem ```json, com texto antes/depois).
export function extractJson(text) {
  if (typeof text !== 'string') throw new Error('Resposta vazia.');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Não encontrei um objeto JSON na resposta.');
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    throw new Error('O JSON da resposta está mal formado: ' + e.message);
  }
}
