import { WeaviateClient } from './client';

export let createClient = (ctx: {
  config: { instanceUrl: string };
  auth: { token?: string };
}) => {
  return new WeaviateClient({
    instanceUrl: ctx.config.instanceUrl,
    token: ctx.auth.token
  });
};
