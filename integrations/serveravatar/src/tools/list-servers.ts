import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listServers = SlateTool.create(spec, {
  name: 'List Servers',
  key: 'list_servers',
  description: `List all servers within an organization, with pagination support. Returns server details including IP, OS, web server type, database type, and health status.
Optionally retrieve a single server's full details by providing a serverId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z
        .string()
        .optional()
        .describe('Specific server ID to retrieve detailed info for'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      servers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of servers'),
      server: z.record(z.string(), z.unknown()).optional().describe('Single server details'),
      pagination: z.record(z.string(), z.unknown()).optional().describe('Pagination info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    if (ctx.input.serverId) {
      let server = await client.getServer(orgId, ctx.input.serverId);
      return {
        output: { server, servers: undefined, pagination: undefined },
        message: `Retrieved details for server **${(server as Record<string, unknown>).name || ctx.input.serverId}**.`
      };
    }

    let result = await client.listServers(orgId, { page: ctx.input.page });
    return {
      output: {
        servers: result.servers,
        server: undefined,
        pagination: result.pagination
      },
      message: `Found **${result.servers.length}** server(s)${result.pagination.total ? ` (${result.pagination.total} total)` : ''}.`
    };
  })
  .build();
