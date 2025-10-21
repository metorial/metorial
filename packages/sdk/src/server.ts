import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export let createServer = async <Config>(
  opts: { name: string; version: string },
  cb: (server: McpServer, args: Config) => unknown
) => {
  // @ts-ignore
  globalThis.__metorial_setServer__({
    type: 'metorial.server::v1',
    start: async (args: any) => {
      let server = new McpServer(opts);
      await cb(server, args);
      return server;
    }
  });
};
