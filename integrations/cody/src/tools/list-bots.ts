import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { botSchema, pageSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Retrieve all AI bots configured in your Cody account. Bots are AI assistants set up with access to specific knowledge base folders and customized behavior. Optionally filter by name keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Filter bots by partial name match'),
      page: pageSchema
    })
  )
  .output(z.object({ bots: z.array(botSchema), pagination: paginationSchema }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBots({
      keyword: ctx.input.keyword,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.bots.length}** bot(s)${result.pagination.total > result.bots.length ? ` (${result.pagination.total} total)` : ''}.`
    };
  });
