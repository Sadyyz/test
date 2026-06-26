// api/_redis.js — inicialização compartilhada do Redis
// Importado por todos os endpoints com: import { redis, initError } from './_redis.js';

import { Redis } from '@upstash/redis';

const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

export let redis = null;
export let initError = null;

try {
  if (!REDIS_URL || !REDIS_TOKEN) {
    initError = 'Variáveis de ambiente do Redis não encontradas. Verifique em Settings > Environment Variables se existe KV_REST_API_URL/KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN, e se o banco está conectado a este projeto.';
  } else {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
} catch (err) {
  initError = String(err);
}
