import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comment threads for a Webflow site. Use this to inspect unresolved design/content feedback connected to a site.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of comments to return')
    })
  )
  .output(
    z.object({
      comments: z.array(z.any()).describe('Comment threads returned by Webflow'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listComments(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let comments = data.commentThreads ?? data.comments ?? data.threads ?? [];

    return {
      output: { comments, pagination: data.pagination },
      message: `Found **${comments.length}** comment thread(s) on site **${ctx.input.siteId}**.`
    };
  })
  .build();
