import { setOauthHandler } from './oauth.ts';
import { createServer } from './server.ts';

export * from '@modelcontextprotocol/sdk/server/index.js';
export * from '@modelcontextprotocol/sdk/server/mcp.js';
// export * from '@modelcontextprotocol/sdk/types.js';

export * from 'zod';

export let metorial = {
  setOauthHandler,
  createServer
};
