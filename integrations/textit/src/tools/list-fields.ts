import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listFields = SlateTool.create(spec, {
  name: 'List Contact Fields',
  key: 'list_fields',
  description:
    'List custom contact fields to discover keys used in contact updates and campaign events.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fieldKey: z.string().optional().describe('Filter by contact field key.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      fields: z.array(z.object({ fieldKey: z.string(), name: z.string(), type: z.string() })),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listFields({
      key: ctx.input.fieldKey,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        fields: result.results.map(item => ({
          fieldKey: item.key,
          name: item.name,
          type: item.type
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** contact fields.`
    };
  })
  .build();
