import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let updateSchema = z.object({
  updateId: z.string().describe('Update ID'),
  body: z.string().describe('Update body (HTML)'),
  textBody: z.string().nullable().describe('Plain text version of the body'),
  createdAt: z.string().describe('Creation timestamp'),
  creatorId: z.string().nullable().describe('Creator user ID'),
  creatorName: z.string().nullable().describe('Creator name'),
  replies: z
    .array(
      z.object({
        replyId: z.string().describe('Reply ID'),
        body: z.string().describe('Reply body (HTML)'),
        textBody: z.string().nullable().describe('Plain text reply'),
        createdAt: z.string().describe('Reply creation timestamp'),
        creatorId: z.string().nullable().describe('Reply creator user ID')
      })
    )
    .describe('Replies to this update')
});

export let listUpdatesTool = SlateTool.create(spec, {
  name: 'List Updates',
  key: 'list_updates',
  description: `Retrieve updates (comments/discussions) from an item or by update IDs. Updates include threaded replies.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      itemId: z.string().optional().describe('Item ID to get updates for'),
      updateIds: z.array(z.string()).optional().describe('Specific update IDs to retrieve'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of updates to return (default: 25, max: 100)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      updates: z.array(updateSchema).describe('List of updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let updates: any[];

    if (ctx.input.itemId) {
      updates = await client.getItemUpdates(ctx.input.itemId, ctx.input.limit);
    } else {
      updates = await client.getUpdates({
        ids: ctx.input.updateIds,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let mapped = updates.map((u: any) => ({
      updateId: String(u.id),
      body: u.body,
      textBody: u.text_body || null,
      createdAt: u.created_at,
      creatorId: u.creator_id
        ? String(u.creator_id)
        : u.creator?.id
          ? String(u.creator.id)
          : null,
      creatorName: u.creator?.name || null,
      replies: (u.replies || []).map((r: any) => ({
        replyId: String(r.id),
        body: r.body,
        textBody: r.text_body || null,
        createdAt: r.created_at,
        creatorId: r.creator_id ? String(r.creator_id) : null
      }))
    }));

    return {
      output: { updates: mapped },
      message: `Retrieved **${mapped.length}** update(s).`
    };
  })
  .build();

export let createUpdateTool = SlateTool.create(spec, {
  name: 'Create Update',
  key: 'create_update',
  description: `Post a new update (comment) on an item, or reply to an existing update by providing the parent update ID. Updates support HTML formatting.`
})
  .input(
    z.object({
      itemId: z.string().describe('Item ID to post the update on'),
      body: z.string().describe('Update body content (supports HTML)'),
      parentUpdateId: z.string().optional().describe('Parent update ID to reply to')
    })
  )
  .output(
    z.object({
      updateId: z.string().describe('ID of the created update'),
      body: z.string().describe('Update body'),
      textBody: z.string().nullable().describe('Plain text body'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let update = await client.createUpdate(
      ctx.input.itemId,
      ctx.input.body,
      ctx.input.parentUpdateId
    );

    let isReply = !!ctx.input.parentUpdateId;

    return {
      output: {
        updateId: String(update.id),
        body: update.body,
        textBody: update.text_body || null,
        createdAt: update.created_at
      },
      message: isReply
        ? `Posted reply (ID: ${update.id}) to update ${ctx.input.parentUpdateId}.`
        : `Posted update (ID: ${update.id}) on item ${ctx.input.itemId}.`
    };
  })
  .build();

export let deleteUpdateTool = SlateTool.create(spec, {
  name: 'Delete Update',
  key: 'delete_update',
  description: `Permanently delete an update (comment) from an item.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the update to delete')
    })
  )
  .output(
    z.object({
      updateId: z.string().describe('ID of the deleted update'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    await client.deleteUpdate(ctx.input.updateId);

    return {
      output: { updateId: ctx.input.updateId, success: true },
      message: `Deleted update ${ctx.input.updateId}.`
    };
  })
  .build();
