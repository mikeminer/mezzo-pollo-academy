import { ArcadeError, digest } from './arcade-config.mjs';

/** Every credit lives in Postgres, including spent credits. No TTL or cache fallback. */
export class PostgresStore {
  constructor(sql) { this.sql = sql; }
  async query(query, params = []) {
    try { return await this.sql.query(query, params, { fetchOptions: { signal: AbortSignal.timeout(8000) } }); }
    catch { throw new ArcadeError('storage_unavailable', 503); }
  }
  async get(id) {
    return (await this.query('SELECT record FROM public.mezzopollo_arcade_intents WHERE intent_id = $1::uuid', [id]))[0]?.record || null;
  }
  async getByRequest(requestId) {
    return (await this.query('SELECT record FROM public.mezzopollo_arcade_intents WHERE request_hash = $1', [digest(requestId)]))[0]?.record || null;
  }
  async create(requestId, record) {
    const rows = await this.query(`INSERT INTO public.mezzopollo_arcade_intents (intent_id, request_hash, record)
      VALUES ($1::uuid, $2, $3::jsonb)
      ON CONFLICT (request_hash) DO UPDATE SET request_hash = EXCLUDED.request_hash RETURNING record`,
    [record.intentId, digest(requestId), JSON.stringify(record)]);
    return rows[0].record;
  }
  async transition(id, action, data) {
    const rows = await this.query('SELECT public.mezzopollo_arcade_transition($1::uuid, $2::text, $3::jsonb) AS result', [id, action, JSON.stringify(data)]);
    const result = rows[0]?.result;
    if (!result) throw new ArcadeError('storage_unavailable', 503);
    if (result.error) throw new ArcadeError(result.error, result.error === 'intent_not_found' ? 404 : 409);
    return result;
  }
  async rateLimit(identifier, limit = 90) {
    const rows = await this.query(`INSERT INTO public.mezzopollo_arcade_rate (key_hash, window_start, count)
      VALUES ($1, now(), 1) ON CONFLICT (key_hash) DO UPDATE SET
      count = CASE WHEN mezzopollo_arcade_rate.window_start < now() - interval '1 minute' THEN 1 ELSE mezzopollo_arcade_rate.count + 1 END,
      window_start = CASE WHEN mezzopollo_arcade_rate.window_start < now() - interval '1 minute' THEN now() ELSE mezzopollo_arcade_rate.window_start END
      RETURNING count`, [digest(identifier)]);
    if (!Number.isSafeInteger(rows[0]?.count) || rows[0].count > limit) throw new ArcadeError('rate_limited', 429);
  }
  async ready() {
    const rows = await this.query(`SELECT 1 AS ready FROM pg_catalog.pg_proc
      WHERE oid = to_regprocedure('public.mezzopollo_arcade_transition(uuid,text,jsonb)')`);
    if (rows[0]?.ready !== 1) throw new ArcadeError('storage_unavailable', 503);
  }
}
