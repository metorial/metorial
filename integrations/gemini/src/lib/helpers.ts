import { Client, type ClientConfig } from './client';

export let sleep = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

export let createClient = (ctx: {
  auth: { token: string };
  config: { apiVersion: string };
}): Client => {
  let clientConfig: ClientConfig = {
    token: ctx.auth.token,
    apiVersion: ctx.config.apiVersion
  };
  return new Client(clientConfig);
};
