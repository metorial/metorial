import { FinagoClient } from './client';

export let createClientFromContext = (ctx: {
  auth: { token: string; baseUrl?: string };
  config?: { baseUrl?: string };
}) =>
  new FinagoClient({
    token: ctx.auth.token,
    baseUrl: ctx.config?.baseUrl ?? ctx.auth.baseUrl
  });
