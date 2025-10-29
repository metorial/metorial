import { setCallbackHandler } from './callbacks.ts';
import { setOauthHandler } from './oauth.ts';
import { createServer } from './server.ts';

export * from '@modelcontextprotocol/sdk/server/index.js';
export * from '@modelcontextprotocol/sdk/server/mcp.js';

export * from 'zod';

export let metorial = {
  createServer,
  setOauthHandler,
  setCallbackHandler
};
