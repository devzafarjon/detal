import { neon } from '@neondatabase/serverless';

// Keep the Cloudflare routes unchanged; translate their small SQLite dialect at this boundary.
export function postgresSQL(sql: string) {
  let index = 0;
  return sql
    .replace(/json_array_length\(j\.value,'\$\.parts'\)/g, "jsonb_array_length(j.value->'parts')")
    .replace(/json_extract\(j\.value,'\$\.id'\)/g, "(j.value->>'id')::bigint")
    .replace(/json_extract\(j\.value,'\$\.name'\)/g, "j.value->>'name'")
    .replace(/json_each\(c\.data\) j/g, 'jsonb_array_elements(c.data::jsonb) AS j(value)')
    .replace(/j\.value AS data/g, 'j.value::text AS data')
    .replace(/AS partCount/g, 'AS "partCount"')
    .replace(/SET count=count\+1 WHERE count<10/g, 'SET count=ai_scan_usage.count+1 WHERE ai_scan_usage.count<10')
    .replace(/\?/g, () => `$${++index}`);
}
export type Executor = (sql: string, params: any[]) => Promise<any[]>;
const execute: Executor = async (sql, params) => {
  if (!process.env.DATABASE_URL) throw Error('Database is not configured');
  const rows = await neon(process.env.DATABASE_URL).query(sql, params) as any[];
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k, ['id','created_at','updated_at','n'].includes(k) && typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v])));
};
export function createDatabase(query: Executor = execute) {
  return { prepare(sql: string) {
    const statement = (params: any[] = []) => ({
      bind: (...values: any[]) => statement(values),
      async all() { return { results: await query(postgresSQL(sql), params) }; },
      async first<T = any>(): Promise<T | null> { return (await query(postgresSQL(sql), params))[0] ?? null; },
      async run() { await query(postgresSQL(sql), params); return { success: true }; },
    });
    return statement();
  }};
}
export const DB = createDatabase();
