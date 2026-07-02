import { Client } from './client';

export let makeClient = (ctx: {
  config: { baseUrl: string };
  auth: { token: string };
}): Client => {
  return new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
};
