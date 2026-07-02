import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { subdomain: string; teamId?: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain,
    teamId: ctx.config.teamId
  });
};
