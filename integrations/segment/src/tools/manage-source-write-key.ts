import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSourceWriteKey = SlateTool.create(spec, {
  name: 'Manage Source Write Key',
  key: 'manage_source_write_key',
  description: `Create or remove Segment source write keys. Use this to rotate Tracking API credentials for a source without recreating the source.`,
  instructions: [
    'To create a new write key, set action to "create" and provide sourceId.',
    'To remove an existing write key, set action to "remove" and provide sourceId and writeKey.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'remove']).describe('Operation to perform'),
      sourceId: z.string().describe('Source ID whose write keys should be managed'),
      writeKey: z
        .string()
        .optional()
        .describe('Write key to remove. Required when action is "remove".')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source ID'),
      writeKey: z.string().optional().describe('Created or removed write key'),
      created: z.boolean().optional().describe('Whether a write key was created'),
      removed: z.boolean().optional().describe('Whether a write key was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'create') {
      let result = await client.createSourceWriteKey(ctx.input.sourceId);
      let writeKey =
        result?.writeKey ??
        result?.writekey ??
        result?.source?.writeKey ??
        result?.source?.writeKeys?.at?.(-1);

      return {
        output: {
          sourceId: ctx.input.sourceId,
          writeKey,
          created: true
        },
        message: `Created a new write key for source \`${ctx.input.sourceId}\``
      };
    }

    if (!ctx.input.writeKey) {
      throw segmentServiceError('writeKey is required to remove a source write key');
    }

    await client.removeSourceWriteKey(ctx.input.sourceId, ctx.input.writeKey);

    return {
      output: {
        sourceId: ctx.input.sourceId,
        writeKey: ctx.input.writeKey,
        removed: true
      },
      message: `Removed write key from source \`${ctx.input.sourceId}\``
    };
  })
  .build();
