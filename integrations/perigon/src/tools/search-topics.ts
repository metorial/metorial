import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

export let searchTopics = SlateTool.create(spec, {
  name: 'Search Topics',
  key: 'search_topics',
  description: `Browse available news topics and categories supported by Perigon. Use this to discover valid topic names that can be passed as filters to the Search Articles and Search Stories tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of available topics'),
      topics: z.array(z.string()).describe('List of topic names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchTopics({
      page: ctx.input.page,
      size: ctx.input.size
    });

    let topics = (result.results || []).map(t => t.name);

    return {
      output: {
        numResults: result.numResults || 0,
        topics
      },
      message: `Found **${result.numResults || 0}** topics (showing ${topics.length}).`
    };
  })
  .build();
