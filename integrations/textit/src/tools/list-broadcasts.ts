import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listBroadcasts = SlateTool.create(spec, {
  name: 'List Broadcasts',
  key: 'list_broadcasts',
  description:
    'List broadcasts and check their processing status without sending another message.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      broadcastUuid: z
        .string()
        .optional()
        .describe('Filter by broadcast UUID returned by send_broadcast.'),
      before: z
        .string()
        .optional()
        .describe('Return broadcasts created before this ISO 8601 datetime.'),
      after: z
        .string()
        .optional()
        .describe('Return broadcasts created after this ISO 8601 datetime.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      broadcasts: z.array(
        z.object({ broadcastUuid: z.string(), status: z.string(), createdOn: z.string() })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listBroadcasts({
      uuid: ctx.input.broadcastUuid,
      before: ctx.input.before,
      after: ctx.input.after,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        broadcasts: result.results.map(item => ({
          broadcastUuid: item.uuid,
          status: item.status,
          createdOn: item.created_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** broadcasts.`
    };
  })
  .build();
