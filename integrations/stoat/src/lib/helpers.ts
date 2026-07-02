import { Client } from './client';

export let createClient = (ctx: {
  config: { baseUrl: string };
  auth: { token: string; authType: 'bot' | 'session' };
}) => {
  return new Client({
    token: ctx.auth.token,
    authType: ctx.auth.authType,
    baseUrl: ctx.config.baseUrl
  });
};
