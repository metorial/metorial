import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContext = SlateTool.create(spec, {
  name: 'Get Context',
  key: 'get_context',
  description: `Retrieve assembled context for a thread. Returns a context block combining semantic search, full-text search, and breadth-first search results from the user's knowledge graph, optimized for relevance to the current conversation. Supports custom context templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to retrieve context for'),
      templateId: z
        .string()
        .optional()
        .describe('Custom context template ID for customized context assembly')
    })
  )
  .output(
    z.object({
      context: z
        .string()
        .describe('Assembled context block ready for system prompt integration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getThreadContext(ctx.input.threadId, ctx.input.templateId);

    return {
      output: {
        context: result.context || ''
      },
      message: `Retrieved context for thread **${ctx.input.threadId}**${ctx.input.templateId ? ` using template **${ctx.input.templateId}**` : ''}.`
    };
  })
  .build();
