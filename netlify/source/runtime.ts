import { getStore } from '@netlify/blobs';
import { DB } from './database';
export const files = () => getStore({ name: 'detal-images', consistency: 'strong' });
export const BUCKET = {
  async get(key: string) {
    const value = await files().getWithMetadata(key, { type: 'stream' });
    if (!value) return null;
    return { body: value.data, httpMetadata: value.metadata,
      json: async () => new Response(value.data).json() };
  },
  head: (key: string) => files().getMetadata(key),
  put: (key: string, value: any, options?: any) => files().set(key, value, { metadata: options?.httpMetadata }),
};
export const env = new Proxy({ DB, BUCKET }, {
  get(target, key: string) { return key in target ? target[key as keyof typeof target] : process.env[key]; },
});
