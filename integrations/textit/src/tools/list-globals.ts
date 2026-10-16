import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listGlobals = SlateTool.create(spec, {
  name: 'List Globals',
  key: 'list_globals',
  description: 'List shared global variables and their current values.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      globals: z.array(
        z.object({
          globalKey: z.string(),
          name: z.string(),
          value: z.string(),
          modifiedOn: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listGlobals({ cursor: ctx.input.cursor });
    return {
      output: {
        globals: result.results.map(item => ({
          globalKey: item.key,
          name: item.name,
          value: item.value,
          modifiedOn: item.modified_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** globals.`
    };
  })
  .build();
