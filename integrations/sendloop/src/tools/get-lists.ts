import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Subscriber Lists',
  key: 'get_lists',
  description: `Retrieve all subscriber lists or a specific list by ID. Returns list details including name, subscriber count, and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z
        .string()
        .optional()
        .describe('Specific list ID to retrieve. If omitted, returns all lists.')
    })
  )
  .output(
    z.object({
      lists: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of subscriber list objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.listId) {
      let result = await client.getList(ctx.input.listId);
      let list = result.List || result;
      return {
        output: { lists: [list] },
        message: `Retrieved details for list **${ctx.input.listId}**.`
      };
    }

    let result = await client.getLists();
    let lists = result.Lists || result.Data || [];
    if (!Array.isArray(lists)) lists = [lists];

    return {
      output: { lists },
      message: `Retrieved **${lists.length}** subscriber list(s).`
    };
  })
  .build();
