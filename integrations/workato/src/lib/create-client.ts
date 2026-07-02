import { WorkatoClient } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { dataCenter: string };
}) => {
  return new WorkatoClient({
    token: ctx.auth.token,
    dataCenter: ctx.config.dataCenter
  });
};
