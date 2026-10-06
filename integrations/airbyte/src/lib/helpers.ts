import { Client } from './client';
export let createClient = (ctx: {
  auth: { token: string; baseUrl: string };
  config?: { baseUrl?: string };
}): Client =>
  new Client({
    token: ctx.auth.token,
    baseUrl: ctx.auth.baseUrl || ctx.config?.baseUrl || 'https://api.airbyte.com/v1'
  });
