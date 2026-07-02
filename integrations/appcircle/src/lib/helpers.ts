import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { apiBaseUrl: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    apiBaseUrl: ctx.config.apiBaseUrl
  });
};
