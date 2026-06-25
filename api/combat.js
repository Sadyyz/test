// api/combat.js
// GET  /api/combat   -> retorna o estado atual do combate
// POST /api/combat   -> mestre atualiza o estado completo (body = objeto combat:state)

import { Redis } from '@upstash/redis';

const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
let initError = null;
try {
  if (!REDIS_URL || !REDIS_TOKEN) {
    initError = 'Variáveis de ambiente do Redis não encontradas. Verifique em Settings > Environment Variables se existe KV_REST_API_URL/KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN, e se o banco está conectado a este projeto.';
  } else {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
} catch (err) {
  initError = String(err);
}

const KEY = 'combat:state';

// Limite de 256KB — estado de combate é leve (lista de criaturas), nunca deve chegar perto disso
const MAX_SIZE = 256 * 1024;

function blankState() {
  return {
    ativo: false,
    sessao: null,
    rodada: 1,
    turnoAtual: null,
    iniciativa: []
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (initError) {
    return res.status(500).json({ error: 'Falha ao conectar no banco de dados', details: initError });
  }

  // ── GET: retorna estado atual ─────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await redis.get(KEY);
      return res.status(200).json(data || blankState());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar estado de combate', details: String(err) });
    }
  }

  // ── POST: mestre atualiza o estado completo ───────────
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Corpo da requisição inválido' });
      }

      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_SIZE) {
        return res.status(413).json({
          error: `Estado de combate muito grande. Tamanho atual: ${Math.round(serialized.length / 1024)}KB. Máximo permitido: ${MAX_SIZE / 1024}KB.`
        });
      }

      const novo = {
        ativo: Boolean(body.ativo),
        sessao: body.sessao ?? null,
        rodada: Number.isFinite(body.rodada) ? body.rodada : 1,
        turnoAtual: body.turnoAtual ?? null,
        iniciativa: Array.isArray(body.iniciativa) ? body.iniciativa : [],
        // Sinal de fim de conto: preservado se presente
        ...(body.contoEncerrado != null && { contoEncerrado: body.contoEncerrado }),
        ...(body.contoNome != null && { contoNome: String(body.contoNome) }),
        // Sinal de boss atualizado: invalida cache do players.html
        ...(body.bossUpdatedAt != null && { bossUpdatedAt: body.bossUpdatedAt }),
        // Sinal de fundo da arena atualizado
        ...(body.arenaBgUpdatedAt != null && { arenaBgUpdatedAt: body.arenaBgUpdatedAt }),
      };

      await redis.set(KEY, novo);
      return res.status(200).json({ ok: true, state: novo });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar estado de combate', details: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
