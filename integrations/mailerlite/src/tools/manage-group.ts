import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Creates, updates, or deletes a subscriber group. Groups organize subscribers into lists. Provide a **groupId** to update or delete an existing group, or omit it to create a new group.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the group'),
      groupId: z.string().optional().describe('Group ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Group name (required for create and update, max 255 characters)')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional().describe('ID of the group'),
      name: z.string().optional().describe('Name of the group'),
      activeCount: z.number().optional().describe('Number of active subscribers in the group'),
      openRate: z.any().optional().describe('Open rate statistics'),
      clickRate: z.any().optional().describe('Click rate statistics'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Group name is required for create action');
      let result = await client.createGroup(ctx.input.name);
      let group = result.data;
      return {
        output: {
          groupId: group.id,
          name: group.name,
          activeCount: group.active_count,
          openRate: group.open_rate,
          clickRate: group.click_rate,
          success: true
        },
        message: `Group **${group.name}** created successfully.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.groupId) throw new Error('Group ID is required for update action');
      if (!ctx.input.name) throw new Error('Group name is required for update action');
      let result = await client.updateGroup(ctx.input.groupId, ctx.input.name);
      let group = result.data;
      return {
        output: {
          groupId: group.id,
          name: group.name,
          activeCount: group.active_count,
          openRate: group.open_rate,
          clickRate: group.click_rate,
          success: true
        },
        message: `Group **${group.name}** updated successfully.`
      };
    }

    if (!ctx.input.groupId) throw new Error('Group ID is required for delete action');
    await client.deleteGroup(ctx.input.groupId);
    return {
      output: {
        success: true
      },
      message: `Group **${ctx.input.groupId}** deleted successfully.`
    };
  })
  .build();
