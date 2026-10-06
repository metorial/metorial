import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assetsSchema, metadataSchema } from '../lib/schemas';
import { spec } from '../spec';

export let editUpdateTool = SlateTool.create(spec, {
  name: 'Edit Update',
  key: 'edit_update',
  description: `Edit an existing unpublished update or draft. Omitted content, assets and scheduling are preserved. now publishes immediately. Current API assets: [] clears files; saveToDraft keeps the post unpublished.`,
  tags: { readOnly: false },
  constraints: [
    'Buffer controls which post states are editable. A successful publishing request cannot necessarily be undone.'
  ]
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the update to edit'),
      saveToDraft: z
        .boolean()
        .optional()
        .describe(
          'Current API only: save as an unpublished draft. Omit to preserve existing status.'
        ),
      assets: assetsSchema.optional(),
      metadata: metadataSchema.optional(),
      text: z.string().optional().describe('New text content for the update'),
      scheduledAt: z.string().optional().describe('New ISO 8601 timestamp for scheduling'),
      now: z
        .boolean()
        .optional()
        .describe('Set to true to share the update immediately after editing'),
      utc: z.boolean().optional().describe('Set to true if scheduledAt is in UTC'),
      media: z
        .object({
          link: z.string().optional().describe('URL of a link attachment'),
          title: z.string().optional().describe('Title for the link attachment'),
          description: z.string().optional().describe('Description for the link attachment'),
          picture: z.string().optional().describe('URL of a preview image for the link'),
          photo: z.string().optional().describe('URL of a photo to attach'),
          thumbnail: z.string().optional().describe('URL of a thumbnail image')
        })
        .optional()
        .describe('Updated media attachments')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was edited successfully'),
      updateId: z.string().describe('ID of the edited update'),
      text: z.string().describe('Updated text content'),
      status: z.string().describe('Current status of the update'),
      dueAt: z
        .number()
        .optional()
        .describe('Unix seconds when scheduled; omitted if unscheduled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.editUpdate(ctx.input.updateId, {
      text: ctx.input.text,
      scheduledAt: ctx.input.scheduledAt,
      now: ctx.input.now,
      utc: ctx.input.utc,
      media: ctx.input.media,
      saveToDraft: ctx.input.saveToDraft,
      assets: ctx.input.assets,
      metadata: ctx.input.metadata
    });

    let update = result.update;

    return {
      output: {
        success: result.success,
        updateId: update.id,
        text: update.text,
        status: update.status,
        dueAt: update.dueAt
      },
      message: `Successfully edited update **${update.id}**.`
    };
  })
  .build();
