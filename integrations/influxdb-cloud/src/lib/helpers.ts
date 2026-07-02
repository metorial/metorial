import { Client } from './client';

export let createClient = (ctx: {
  config: { baseUrl: string; orgId: string };
  auth: { token: string };
}) => {
  return new Client({
    baseUrl: ctx.config.baseUrl,
    token: ctx.auth.token,
    orgId: ctx.config.orgId
  });
};
