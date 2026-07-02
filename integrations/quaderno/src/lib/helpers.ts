import { Client, type ClientConfig } from './client';

export let createClient = (ctx: {
  auth: { token: string; authMethod?: string };
  config: { accountName: string };
}): Client => {
  return new Client({
    token: ctx.auth.token,
    accountName: ctx.config.accountName,
    authMethod: (ctx.auth.authMethod as ClientConfig['authMethod']) || 'api_key'
  });
};
