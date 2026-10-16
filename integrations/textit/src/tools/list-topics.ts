import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listTopics = SlateTool.create(spec, {
  name: 'List Topics',
  key: 'list_topics',
  description: 'List ticket topics and their open and closed ticket counts.',
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
      topics: z.array(
        z.object({
          topicUuid: z.string(),
          name: z.string(),
          counts: z.object({ open: z.number(), closed: z.number() }),
          system: z.boolean(),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listTopics({ cursor: ctx.input.cursor });
    return {
      output: {
        topics: result.results.map(item => ({
          topicUuid: item.uuid,
          name: item.name,
          counts: item.counts,
          system: item.system,
          createdOn: item.created_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** topics.`
    };
  })
  .build();
