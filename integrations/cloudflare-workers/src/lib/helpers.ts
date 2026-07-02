import { CloudflareClient } from './client';

export let createClient = (ctx: {
  config: { accountId: string };
  auth: { token: string; email?: string; authType: 'api_token' | 'global_api_key' };
}) => {
  return new CloudflareClient({
    token: ctx.auth.token,
    email: ctx.auth.email,
    authType: ctx.auth.authType,
    accountId: ctx.config.accountId
  });
};
