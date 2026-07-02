import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, update, or delete a Google Workspace group. Groups can be used for email distribution, collaboration, and access control. Supports updating group name, description, and email.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageGroup)
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Action to perform on the group'),
      groupKey: z
        .string()
        .optional()
        .describe('Group email or ID (required for get, update, and delete)'),
      email: z
        .string()
        .optional()
        .describe('Email address for the group (required for create)'),
      name: z.string().optional().describe('Display name of the group'),
      description: z.string().optional().describe('Description of the group')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      directMembersCount: z.string().optional(),
      adminCreated: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.email) throw new Error('Email is required to create a group');
      let group = await client.createGroup({
        email: ctx.input.email,
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          groupId: group.id,
          email: group.email,
          name: group.name,
          description: group.description,
          directMembersCount: group.directMembersCount,
          adminCreated: group.adminCreated
        },
        message: `Created group **${group.email}**.`
      };
    }

    if (!ctx.input.groupKey) throw new Error('Group key is required for get/update/delete');

    if (ctx.input.action === 'get') {
      let group = await client.getGroup(ctx.input.groupKey);
      return {
        output: {
          groupId: group.id,
          email: group.email,
          name: group.name,
          description: group.description,
          directMembersCount: group.directMembersCount,
          adminCreated: group.adminCreated
        },
        message: `Retrieved group **${group.email}** with ${group.directMembersCount || 0} members.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.email) updateData.email = ctx.input.email;
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

      let group = await client.updateGroup(ctx.input.groupKey, updateData);
      return {
        output: {
          groupId: group.id,
          email: group.email,
          name: group.name,
          description: group.description,
          directMembersCount: group.directMembersCount,
          adminCreated: group.adminCreated
        },
        message: `Updated group **${group.email}**.`
      };
    }

    // delete
    await client.deleteGroup(ctx.input.groupKey);
    return {
      output: { deleted: true },
      message: `Deleted group **${ctx.input.groupKey}**.`
    };
  })
  .build();
