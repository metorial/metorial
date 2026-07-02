import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; clientId?: string };
  config: { environment: 'production' | 'sandbox' };
}) => {
  return new Client({
    token: ctx.auth.token,
    clientId: ctx.auth.clientId,
    environment: ctx.config.environment
  });
};
