import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversations = SlateTool.create(spec, {
  name: 'Get Conversations',
  key: 'get_conversations',
  description: `Retrieve LinkedIn conversations from your HeyReach unified inbox with advanced filtering. Returns paginated conversation data with messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Number of conversations to return (default: 50)'),
      offset: z.number().optional().default(0).describe('Pagination offset (default: 0)'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Advanced filter options for querying conversations')
    })
  )
  .output(
    z.object({
      conversations: z.array(z.any()).describe('Array of conversation objects with messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getConversations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: ctx.input.filters
    });

    let conversations = Array.isArray(result) ? result : (result?.data ?? result?.items ?? []);

    return {
      output: { conversations },
      message: `Retrieved **${conversations.length}** conversation(s).`
    };
  })
  .build();
