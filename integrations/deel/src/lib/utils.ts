import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; refreshToken?: string; clientId?: string };
  config: { environment: 'production' | 'sandbox' };
}) => {
  return new Client({
    token: ctx.auth.token,
    refreshToken: ctx.auth.refreshToken,
    clientId: ctx.auth.clientId,
    environment: ctx.config.environment
  });
};
