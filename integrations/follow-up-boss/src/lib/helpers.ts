import { Client } from './client';

export interface ContextLike {
  auth: {
    token: string;
    authMethod?: 'oauth' | 'api_key';
  };
  config: {
    xSystem: string;
    xSystemKey: string;
  };
}

export let createClient = (ctx: ContextLike): Client => {
  return new Client({
    token: ctx.auth.token,
    authMethod: ctx.auth.authMethod || 'api_key',
    xSystem: ctx.config.xSystem,
    xSystemKey: ctx.config.xSystemKey
  });
};
