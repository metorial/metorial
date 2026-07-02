import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageCronJobs = SlateTool.create(spec, {
  name: 'Manage Cron Jobs',
  key: 'manage_cron_jobs',
  description: `List, create, or delete cron jobs on a server. Cron jobs run commands on a schedule for tasks like backups, cache clearing, or maintenance scripts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      action: z.enum(['list', 'create', 'destroy']).describe('Action to perform'),
      cronJobId: z.string().optional().describe('Cron job ID (for destroy)'),
      page: z.number().optional().describe('Page number (for list)'),
      name: z.string().optional().describe('Cron job name (for create)'),
      command: z.string().optional().describe('Command to execute (for create)'),
      systemUser: z
        .string()
        .optional()
        .describe('System user to run the command as (for create)'),
      schedule: z.string().optional().describe('Predefined schedule (for create)'),
      customScheduling: z.string().optional().describe('Custom cron expression (for create)')
    })
  )
  .output(
    z.object({
      cronJobs: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of cron jobs'),
      pagination: z.record(z.string(), z.unknown()).optional().describe('Pagination info'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listCronJobs(orgId, serverId, ctx.input.page);
      return {
        output: {
          cronJobs: result.cronJobs,
          pagination: result.pagination,
          responseMessage: undefined
        },
        message: `Found **${result.cronJobs.length}** cron job(s) on server **${serverId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.command) throw new Error('command is required for create action');
      if (!ctx.input.systemUser) throw new Error('systemUser is required for create action');

      let result = await client.createCronJob(orgId, serverId, {
        name: ctx.input.name,
        command: ctx.input.command,
        systemUser: ctx.input.systemUser,
        schedule: ctx.input.schedule,
        customScheduling: ctx.input.customScheduling
      });
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Cron job created',
          cronJobs: undefined,
          pagination: undefined
        },
        message: `Cron job **${ctx.input.name}** created on server **${serverId}**.`
      };
    }

    if (action === 'destroy') {
      if (!ctx.input.cronJobId) throw new Error('cronJobId is required for destroy action');

      let result = await client.destroyCronJob(orgId, serverId, ctx.input.cronJobId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Cron job deleted',
          cronJobs: undefined,
          pagination: undefined
        },
        message: `Cron job **${ctx.input.cronJobId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
