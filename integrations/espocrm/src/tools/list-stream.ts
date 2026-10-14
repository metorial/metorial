import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listStream = SlateTool.create(spec, {
  name: 'List Stream',
  key: 'list_stream',
  description:
    "Read notes and activity updates from the authenticated user's EspoCRM stream, or from a specific record's stream.",
  instructions: [
    'Provide both entityType and recordId for a record stream. Omit both to read your user stream.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      entityType: z
        .string()
        .optional()
        .describe('Record entity type, such as Account, Contact, or Case; requires recordId'),
      recordId: z.string().optional().describe('Record ID; requires entityType'),
      maxSize: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum notes to return, from 1 to 200 (default 20)'),
      offset: z.number().int().min(0).optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      notes: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Stream notes including IDs, content, authors, and activity details'),
      total: z
        .number()
        .describe(
          'Total notes; -1 means another page exists and -2 means the last page when counting is disabled'
        ),
      hasMore: z.boolean().describe('Whether another page is available')
    })
  )
  .handleInvocation(async ctx => {
    if (Boolean(ctx.input.entityType) !== Boolean(ctx.input.recordId)) {
      throw createApiServiceError(
        'Provide both entityType and recordId, or omit both to read the user stream.'
      );
    }
    let offset = ctx.input.offset ?? 0;
    let result = await createClient(ctx).listStream({
      entityType: ctx.input.entityType,
      recordId: ctx.input.recordId,
      offset,
      maxSize: ctx.input.maxSize ?? 20
    });
    return {
      output: {
        notes: result.list ?? undefined,
        total: result.total ?? undefined,
        hasMore:
          result.total === -1 ||
          (result.total >= 0 && offset + result.list.length < result.total)
      },
      message: `Retrieved **${result.list.length}** stream notes.`
    };
  })
  .build();
