import { OdooClient, type OdooTransport } from './client';

export interface OdooContext {
  config: { instanceUrl: string; database?: string };
  auth: {
    token: string;
    username: string;
    uid: number;
    /** Present on refreshed connections; legacy stored auth falls back to config. */
    instanceUrl?: string;
    database?: string;
    transport?: OdooTransport;
  };
}

export let createClient = (ctx: OdooContext): OdooClient => {
  let hasBoundAuthState = ctx.auth.transport !== undefined;

  return new OdooClient({
    instanceUrl: hasBoundAuthState ? (ctx.auth.instanceUrl ?? '') : ctx.config.instanceUrl,
    // A transport-bound JSON-2 connection may intentionally omit the database.
    // Only connections created before auth binding may inherit mutable config.
    database: hasBoundAuthState ? ctx.auth.database : ctx.config.database,
    uid: ctx.auth.uid,
    username: ctx.auth.username,
    token: ctx.auth.token,
    // Connections created before transport binding used JSON-RPC.
    transport: ctx.auth.transport ?? 'jsonrpc'
  });
};
