import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageServices = SlateTool.create(spec, {
  name: 'Manage Services',
  key: 'manage_services',
  description: `List or control services running on a server. View all services with their status and resource usage, or start, stop, restart, or reload individual services like Nginx, Apache, MySQL, PHP-FPM, Redis, etc.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      action: z
        .enum(['list', 'start', 'stop', 'restart', 'reload'])
        .describe('Action to perform'),
      service: z
        .string()
        .optional()
        .describe(
          'Service name for start/stop/restart/reload (e.g. nginx, apache2, mysql, mariadb, php8.2-fpm, redis, postfix, ssh, ufw)'
        )
    })
  )
  .output(
    z.object({
      services: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of services with status'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, action } = ctx.input;

    if (action === 'list') {
      let services = await client.listServices(orgId, serverId);
      return {
        output: { services, responseMessage: undefined },
        message: `Found **${services.length}** service(s) on server **${serverId}**.`
      };
    }

    if (!ctx.input.service)
      throw new Error('service name is required for start/stop/restart/reload actions');

    let result = await client.updateService(orgId, serverId, ctx.input.service, action);
    return {
      output: {
        responseMessage:
          ((result as Record<string, unknown>).message as string) ||
          `Service ${action} completed`,
        services: undefined
      },
      message: `Service **${ctx.input.service}** ${action}ed on server **${serverId}**.`
    };
  })
  .build();
