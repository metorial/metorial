import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { organizationName: string; baseUrl: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    baseUrl: ctx.config.baseUrl,
    organizationName: ctx.config.organizationName
  });
};
