import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Add or remove tags from one or more files in bulk. Supports adding custom tags, removing custom tags, and removing AI-generated tags.`,
  constraints: ['Maximum 50 files per request'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['add', 'remove', 'remove_ai'])
        .describe(
          '"add" to add tags, "remove" to remove tags, "remove_ai" to remove AI-generated tags'
        ),
      fileIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('File IDs to apply the tag operation to (max 50)'),
      tags: z.array(z.string()).min(1).describe('Tags to add or remove')
    })
  )
  .output(
    z.object({
      successfulFileIds: z
        .array(z.string())
        .describe('File IDs that were successfully updated'),
      unconfirmedFileIds: z
        .array(z.string())
        .optional()
        .describe('Requested IDs whose update was not confirmed'),
      errors: z
        .array(z.object({ fileId: z.string(), error: z.string() }))
        .optional()
        .describe('Per-file failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    const result =
      ctx.input.operation === 'add'
        ? await client.addTags(ctx.input.fileIds, ctx.input.tags)
        : ctx.input.operation === 'remove'
          ? await client.removeTags(ctx.input.fileIds, ctx.input.tags)
          : await client.removeAITags(ctx.input.fileIds, ctx.input.tags);

    let opLabel = ctx.input.operation === 'add' ? 'Added' : 'Removed';
    let tagType = ctx.input.operation === 'remove_ai' ? 'AI tags' : 'tags';

    return {
      output: {
        successfulFileIds: result.successfulFileIds,
        unconfirmedFileIds: result.unconfirmedFileIds,
        errors: result.errors
      },
      message: `${opLabel} ${tagType} on **${result.successfulFileIds.length}** file(s); **${result.unconfirmedFileIds.length}** requested file(s) remain unconfirmed.`
    };
  })
  .build();
