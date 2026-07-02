import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Creates, retrieves, or deletes a subscriber group. Groups function as mailing lists in Sender. You can create a new group, get details of an existing one, or delete a group by ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('Action to perform on the group'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for "get" and "delete" actions)'),
      title: z.string().optional().describe('Group title (required for "create" action)')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional().describe('Group ID'),
      title: z.string().optional().describe('Group title'),
      recipientCount: z.number().optional().describe('Total subscriber count in the group'),
      activeSubscribers: z.number().optional().describe('Number of active subscribers'),
      opensRate: z.number().optional().describe('Open rate for campaigns sent to this group'),
      clickRate: z.number().optional().describe('Click rate for campaigns sent to this group'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the group was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) {
        throw new Error('Title is required when creating a group');
      }
      let result = await client.createGroup(ctx.input.title);
      let group = result.data;
      return {
        output: {
          groupId: group.id,
          title: group.title,
          recipientCount: group.recipient_count,
          activeSubscribers: group.active_subscribers,
          opensRate: group.opens_rate,
          clickRate: group.click_rate,
          createdAt: group.created
        },
        message: `Group **${group.title}** created with ID \`${group.id}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.groupId) {
        throw new Error('Group ID is required when getting a group');
      }
      let result = await client.getGroup(ctx.input.groupId);
      let group = result.data;
      return {
        output: {
          groupId: group.id,
          title: group.title,
          recipientCount: group.recipient_count,
          activeSubscribers: group.active_subscribers,
          opensRate: group.opens_rate,
          clickRate: group.click_rate,
          createdAt: group.created
        },
        message: `Group **${group.title}** has **${group.active_subscribers}** active subscriber(s).`
      };
    }

    // delete
    if (!ctx.input.groupId) {
      throw new Error('Group ID is required when deleting a group');
    }
    await client.deleteGroup(ctx.input.groupId);
    return {
      output: {
        groupId: ctx.input.groupId,
        deleted: true
      },
      message: `Group \`${ctx.input.groupId}\` deleted successfully.`
    };
  })
  .build();
