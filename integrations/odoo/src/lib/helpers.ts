import { OdooClient } from './client';

export interface OdooContext {
  config: { instanceUrl: string; database: string };
  auth: { token: string; username: string; uid: number };
}

export let createClient = (ctx: OdooContext): OdooClient => {
  return new OdooClient({
    instanceUrl: ctx.config.instanceUrl,
    database: ctx.config.database,
    uid: ctx.auth.uid,
    username: ctx.auth.username,
    token: ctx.auth.token
  });
};
