import { Client, type ClientConfig } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { organizationId?: string; projectId?: string };
}): Client => {
  let clientConfig: ClientConfig = {
    token: ctx.auth.token,
    organizationId: ctx.config.organizationId,
    projectId: ctx.config.projectId
  };
  return new Client(clientConfig);
};
