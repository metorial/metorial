import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { environment: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    environment: ctx.config.environment
  });
};
