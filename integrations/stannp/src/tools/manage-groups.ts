import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Group ID'),
  name: z.string().optional().describe('Group name'),
  recipientCount: z.number().optional().describe('Number of recipients in the group'),
  created: z.string().optional().describe('Creation timestamp')
});

let mapGroup = (g: any) => ({
  groupId: String(g.id),
  name: g.name,
  recipientCount: g.recipients != null ? Number(g.recipients) : undefined,
  created: g.created
});

// ---- List Groups ----

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve a paginated list of mailing groups (mailing lists) on the account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of groups to return')
    })
  )
  .output(
    z.object({
      groups: z.array(groupOutputSchema).describe('List of mailing groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.listGroups({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let groups = Array.isArray(result) ? result.map(mapGroup) : [];

    return {
      output: { groups },
      message: `Found **${groups.length}** groups.`
    };
  })
  .build();

// ---- Create Group ----

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new mailing group (mailing list) that recipients can be added to.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new mailing group')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the created group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.createGroup(ctx.input.name);
    let groupId = typeof result === 'object' ? String(result.id) : String(result);

    return {
      output: { groupId },
      message: `Group **"${ctx.input.name}"** created with ID **${groupId}**.`
    };
  })
  .build();

// ---- Delete Group ----

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a mailing group. Optionally delete all recipients in the group permanently.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to delete'),
      deleteRecipients: z
        .boolean()
        .optional()
        .describe('Also permanently delete all recipients in the group')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.deleteGroup(ctx.input.groupId, ctx.input.deleteRecipients);

    return {
      output: { success: result.success === true },
      message: `Group **${ctx.input.groupId}** deleted.`
    };
  })
  .build();

// ---- Add Recipients to Group ----

export let addRecipientsToGroup = SlateTool.create(spec, {
  name: 'Add Recipients to Group',
  key: 'add_recipients_to_group',
  description: `Add one or more existing recipients to a mailing group by their IDs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('Target group ID'),
      recipientIds: z.array(z.number()).describe('List of recipient IDs to add to the group')
    })
  )
  .output(
    z.object({
      addedCount: z.number().describe('Number of recipients added to the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.addRecipientsToGroup(ctx.input.groupId, ctx.input.recipientIds);
    let addedCount = typeof result === 'number' ? result : Number(result) || 0;

    return {
      output: { addedCount },
      message: `Added **${addedCount}** recipients to group **${ctx.input.groupId}**.`
    };
  })
  .build();

// ---- Remove Recipients from Group ----

export let removeRecipientsFromGroup = SlateTool.create(spec, {
  name: 'Remove Recipients from Group',
  key: 'remove_recipients_from_group',
  description: `Remove one or more recipients from a mailing group. Recipients remain on the account but are no longer part of this group.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('Group ID to remove recipients from'),
      recipientIds: z
        .array(z.number())
        .describe('List of recipient IDs to remove from the group')
    })
  )
  .output(
    z.object({
      removedCount: z.number().describe('Number of recipients removed from the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.removeRecipientsFromGroup(
      ctx.input.groupId,
      ctx.input.recipientIds
    );
    let removedCount = typeof result === 'number' ? result : Number(result) || 0;

    return {
      output: { removedCount },
      message: `Removed **${removedCount}** recipients from group **${ctx.input.groupId}**.`
    };
  })
  .build();
