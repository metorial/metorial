import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('Group ID'),
  title: z.string().describe('Group title'),
  color: z.string().nullable().describe('Group color')
});

export let listGroupsTool = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve all groups from a board. Groups are sections that organize items within a board.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to list groups from')
    })
  )
  .output(
    z.object({
      groups: z.array(groupSchema).describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let groups = await client.getGroups(ctx.input.boardId);

    let mapped = groups.map((g: any) => ({
      groupId: g.id,
      title: g.title,
      color: g.color || null
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** group(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let createGroupTool = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group on a board. Groups are used to organize items into sections.`
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to create the group on'),
      groupName: z.string().describe('Name of the new group'),
      color: z.string().optional().describe('HEX color code with # symbol (e.g., #FF5733)')
    })
  )
  .output(groupSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let group = await client.createGroup(ctx.input.boardId, ctx.input.groupName, {
      color: ctx.input.color
    });

    return {
      output: {
        groupId: group.id,
        title: group.title,
        color: group.color || null
      },
      message: `Created group **${group.title}** on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let updateGroupTool = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update a group's properties (title or color), archive it, or delete it from a board.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID the group belongs to'),
      groupId: z.string().describe('ID of the group to update'),
      title: z.string().optional().describe('New title for the group'),
      color: z.string().optional().describe('New HEX color code with # symbol'),
      action: z
        .enum(['update', 'archive', 'delete'])
        .optional()
        .default('update')
        .describe('Action to perform')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'archive') {
      await client.archiveGroup(ctx.input.boardId, ctx.input.groupId);
      return {
        output: { groupId: ctx.input.groupId, success: true },
        message: `Archived group ${ctx.input.groupId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteGroup(ctx.input.boardId, ctx.input.groupId);
      return {
        output: { groupId: ctx.input.groupId, success: true },
        message: `Deleted group ${ctx.input.groupId}.`
      };
    }

    if (ctx.input.title) {
      await client.updateGroup(ctx.input.boardId, ctx.input.groupId, 'title', ctx.input.title);
    }
    if (ctx.input.color) {
      await client.updateGroup(ctx.input.boardId, ctx.input.groupId, 'color', ctx.input.color);
    }

    return {
      output: { groupId: ctx.input.groupId, success: true },
      message: `Updated group ${ctx.input.groupId}.`
    };
  })
  .build();
