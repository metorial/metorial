import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description:
    'List message labels and their message counts before filtering messages or updating a label.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      labelUuid: z.string().optional().describe('Filter by label UUID.'),
      name: z.string().optional().describe('Filter by label name.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      labels: z.array(
        z.object({ labelUuid: z.string(), name: z.string(), count: z.number() })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listLabels({
      uuid: ctx.input.labelUuid,
      name: ctx.input.name,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        labels: result.results.map(item => ({
          labelUuid: item.uuid,
          name: item.name,
          count: item.count
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** labels.`
    };
  })
  .build();
