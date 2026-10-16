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
      name: z.string().optional().describe('Exact or partial topic name'),
      category: z.string().optional().describe('Filter by parent category'),
      subcategory: z.string().optional().describe('Filter by subcategory'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of available topics'),
      topics: z.array(z.string()).describe('List of topic names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchTopics({
      name: ctx.input.name,
      category: ctx.input.category,
      subcategory: ctx.input.subcategory,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let topics = result.data.flatMap(t => (t.name == null ? [] : [t.name]));

    return {
      output: {
        raw: result,
        numResults: result.total,
        topics
      },
      message: `Found **${result.total}** topics (showing ${topics.length}).`
    };
  })
  .build();
