import { Client } from './client';

export let createClient = (ctx: {
  config: { siteUrl: string };
  auth: {
    token: string;
    secretKey?: string;
    authMethod: 'api_key' | 'hmac' | 'basic';
  };
}): Client => {
  return new Client({
    siteUrl: ctx.config.siteUrl,
    auth: {
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey,
      authMethod: ctx.auth.authMethod
    }
  });
};
