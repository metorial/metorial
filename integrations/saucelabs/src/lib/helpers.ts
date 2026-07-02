import { SauceLabsClient } from './client';

export let createClient = (ctx: {
  auth: { username: string; token: string };
  config: { dataCenter: string };
}) => {
  return new SauceLabsClient({
    username: ctx.auth.username,
    token: ctx.auth.token,
    dataCenter: ctx.config.dataCenter
  });
};
