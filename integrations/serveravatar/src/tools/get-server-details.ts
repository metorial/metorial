import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let getServerDetails = SlateTool.create(spec, {
  name: 'Get Server Details',
  key: 'get_server_details',
  description: `Retrieve comprehensive details about a server including resource usage (CPU, RAM, disk), running services and their status, and server logs.
Specify which details to include using the include parameter.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      include: z
        .array(z.enum(['usage', 'services', 'logs', 'summary']))
        .optional()
        .describe('What details to include. Defaults to all.')
    })
  )
  .output(
    z.object({
      server: z.record(z.string(), z.unknown()).describe('Server basic info'),
      resourceUsage: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('CPU, RAM, disk usage'),
      services: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Running services and their status'),
      logs: z.record(z.string(), z.unknown()).optional().describe('Server logs'),
      summary: z.record(z.string(), z.unknown()).optional().describe('Server summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId } = ctx.input;
    let include = ctx.input.include || ['usage', 'services', 'logs', 'summary'];

    let server = await client.getServer(orgId, serverId);

    let resourceUsage: Record<string, unknown> | undefined;
    let services: Record<string, unknown>[] | undefined;
    let logs: Record<string, unknown> | undefined;
    let summary: Record<string, unknown> | undefined;

    let promises: Promise<void>[] = [];

    if (include.includes('usage')) {
      promises.push(
        client.getServerResourceUsage(orgId, serverId).then(data => {
          resourceUsage = data;
        })
      );
    }
    if (include.includes('services')) {
      promises.push(
        client.listServices(orgId, serverId).then(data => {
          services = data;
        })
      );
    }
    if (include.includes('logs')) {
      promises.push(
        client.getServerLogs(orgId, serverId).then(data => {
          logs = data;
        })
      );
    }
    if (include.includes('summary')) {
      promises.push(
        client.getServerSummary(orgId, serverId).then(data => {
          summary = data;
        })
      );
    }

    await Promise.all(promises);

    return {
      output: { server, resourceUsage, services, logs, summary },
      message: `Retrieved details for server **${(server as Record<string, unknown>).name || serverId}** (includes: ${include.join(', ')}).`
    };
  })
  .build();
