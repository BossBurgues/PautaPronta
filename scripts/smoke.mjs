import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:8787';

function loadAccessToken() {
  const varsPath = path.resolve('worker/.dev.vars');
  if (!fs.existsSync(varsPath)) {
    throw new Error('Arquivo worker/.dev.vars não encontrado. Veja docs/SETUP_CONTAS.md');
  }

  const content = fs.readFileSync(varsPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('ACCESS_TOKEN=')) {
      const token = trimmed.slice('ACCESS_TOKEN='.length).trim();
      return token.replace(/^["']|["']$/g, '');
    }
  }

  throw new Error('ACCESS_TOKEN não definido no worker/.dev.vars');
}

async function run() {
  const isReal = process.argv.includes('--real');
  const token = loadAccessToken();

  let passedCount = 0;
  let totalCount = isReal ? 7 : 6;

  console.log(`\nIniciando Smoke Tests em ${BASE_URL}...\n`);

  // Caso 1: GET /api/health -> 200
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.ok === true) {
      console.log('✅ Caso 1: GET /api/health -> 200 OK');
      passedCount++;
    } else {
      console.log(`❌ Caso 1: esperado 200, recebido ${res.status}`);
    }
  } catch (err) {
    console.log(`❌ Caso 1 falhou: ${err.message}`);
  }

  // Caso 2: POST /api/generate sem token -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'Inteligência Artificial' }),
    });
    if (res.status === 401) {
      console.log('✅ Caso 2: POST /api/generate sem token -> 401 Unauthorized');
      passedCount++;
    } else {
      console.log(`❌ Caso 2: esperado 401, recebido ${res.status}`);
    }
  } catch (err) {
    console.log(`❌ Caso 2 falhou: ${err.message}`);
  }

  // Caso 3: POST /api/generate com theme: 'x' -> 400
  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ theme: 'x' }),
    });
    if (res.status === 400) {
      console.log('✅ Caso 3: POST /api/generate com tema curto ("x") -> 400 Bad Request');
      passedCount++;
    } else {
      console.log(`❌ Caso 3: esperado 400, recebido ${res.status}`);
    }
  } catch (err) {
    console.log(`❌ Caso 3 falhou: ${err.message}`);
  }

  // Caso 4: POST /api/assisted-parse com { content: <fixture> } -> 200 e ok: true
  try {
    const fixturePath = path.resolve('shared/fixtures/exemplo.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const res = await fetch(`${BASE_URL}/api/assisted-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: fixture }),
    });
    const data = await res.json();
    if (res.status === 200 && data.ok === true && Array.isArray(data.content.slides)) {
      console.log('✅ Caso 4: POST /api/assisted-parse com objeto fixture -> 200 OK');
      passedCount++;
    } else {
      console.log(`❌ Caso 4: esperado 200 ok: true, recebido ${res.status}`, data);
    }
  } catch (err) {
    console.log(`❌ Caso 4 falhou: ${err.message}`);
  }

  // Caso 5: POST /api/assisted-parse com { text: 'sem json' } -> 422
  try {
    const res = await fetch(`${BASE_URL}/api/assisted-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: 'sem json' }),
    });
    if (res.status === 422) {
      console.log('✅ Caso 5: POST /api/assisted-parse com texto inválido -> 422 Unprocessable Entity');
      passedCount++;
    } else {
      console.log(`❌ Caso 5: esperado 422, recebido ${res.status}`);
    }
  } catch (err) {
    console.log(`❌ Caso 5 falhou: ${err.message}`);
  }

  // Caso 6: GET /api/suggestions com token -> 200 e 2–3 sugestões
  try {
    const res = await fetch(`${BASE_URL}/api/suggestions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (
      res.status === 200 &&
      data.ok === true &&
      Array.isArray(data.suggestions) &&
      data.suggestions.length >= 2 &&
      data.suggestions.length <= 3
    ) {
      console.log(
        `✅ Caso 6: GET /api/suggestions -> 200 OK (${data.suggestions.length} sugestões)`,
      );
      passedCount++;
    } else {
      console.log(
        `❌ Caso 6: esperado 200 com 2-3 sugestões, recebido status ${res.status}`,
        data,
      );
    }
  } catch (err) {
    console.log(`❌ Caso 6 falhou: ${err.message}`);
  }

  // Caso 7: Geração real (--real)
  if (isReal) {
    console.log('\nExecutando Caso 7 (Geração real via Gemini)...');
    try {
      const feeds = [
        'https://www.technologyreview.com/feed/',
        'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
      ];

      const res = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme: 'Inteligência artificial na gestão pública',
          slideCount: 5,
          useWebSearch: false,
          sources: feeds,
        }),
      });

      const data = await res.json();
      if (res.status === 200 && data.ok === true) {
        console.log('✅ Caso 6: Geração real concluída com sucesso!');
        console.log(`- Modelo: ${data.model}`);
        console.log(`- Slides gerados (${data.content.slides.length}):`);
        for (const s of data.content.slides) {
          console.log(`   [Slide ${s.n} - ${s.role}] ${s.title}`);
        }
        console.log(`- Fontes citadas:`);
        for (const src of data.content.sources) {
          console.log(`   * ${src.title} (${src.url}) [verified: ${src.verified}]`);
        }
        if (data.warnings?.length > 0) {
          console.log(`- Avisos (${data.warnings.length}):`, data.warnings);
        }
        if (data.feedErrors?.length > 0) {
          console.log(`- Erros em feeds (${data.feedErrors.length}):`, data.feedErrors);
        }
        passedCount++;
      } else {
        console.log(`❌ Caso 6 falhou: status ${res.status}`, data);
      }
    } catch (err) {
      console.log(`❌ Caso 6 falhou com exceção: ${err.message}`);
    }
  }

  console.log(`\nResultado: ${passedCount}/${totalCount} casos aprovados.\n`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
