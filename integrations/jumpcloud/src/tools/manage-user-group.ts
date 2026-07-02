import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserGroup = SlateTool.create(spec, {
  name: 'Manage User Group',
  key: 'manage_user_group',
  description: `Create, update, or delete a JumpCloud user group. User groups are the primary way to organize users and control access to systems, applications, RADIUS servers, and directories. Provide a name at minimum when creating.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      groupId: z.string().optional().describe('Group ID (required for update and delete)'),
      name: z.string().optional().describe('Group name (required for create)'),
      description: z.string().optional().describe('Group description'),
      email: z.string().optional().describe('Group email address')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID'),
      name: z.string().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      type: z.string().optional().describe('Group type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let group: any;
    let actionMessage: string;

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      group = await client.createUserGroup({
        name: ctx.input.name,
        description: ctx.input.description,
        email: ctx.input.email
      });
      actionMessage = `Created user group **${group.name}**`;
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.groupId) throw new Error('groupId is required for update action');
      let data: Record<string, any> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.email !== undefined) data.email = ctx.input.email;
      group = await client.updateUserGroup(ctx.input.groupId, data);
      actionMessage = `Updated user group **${group.name}**`;
    } else {
      if (!ctx.input.groupId) throw new Error('groupId is required for delete action');
      let existing = await client.getUserGroup(ctx.input.groupId);
      await client.deleteUserGroup(ctx.input.groupId);
      group = existing;
      actionMessage = `Deleted user group **${group.name}**`;
    }

    return {
      output: {
        groupId: group.id,
        name: group.name,
        description: group.description,
        type: group.type
      },
      message: actionMessage
    };
  })
  .build();
