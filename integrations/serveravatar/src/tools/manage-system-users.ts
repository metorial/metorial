import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageSystemUsers = SlateTool.create(spec, {
  name: 'Manage System Users',
  key: 'manage_system_users',
  description: `List or create system users on a server. System users control file ownership and permissions for applications. Each application runs under a system user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      action: z.enum(['list', 'create']).describe('Action to perform'),
      username: z.string().optional().describe('Username for new system user (for create)'),
      password: z.string().optional().describe('Password for new system user (for create)')
    })
  )
  .output(
    z.object({
      systemUsers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of system users'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, action } = ctx.input;

    if (action === 'list') {
      let systemUsers = await client.listSystemUsers(orgId, serverId);
      return {
        output: { systemUsers, responseMessage: undefined },
        message: `Found **${systemUsers.length}** system user(s) on server **${serverId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.username) throw new Error('username is required for create action');
      if (!ctx.input.password) throw new Error('password is required for create action');

      let result = await client.createSystemUser(orgId, serverId, {
        username: ctx.input.username,
        password: ctx.input.password
      });
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'System user created',
          systemUsers: undefined
        },
        message: `System user **${ctx.input.username}** created on server **${serverId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
