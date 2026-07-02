import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchIntent = SlateTool.create(spec, {
  name: 'Search Intent',
  key: 'search_intent',
  description: `Search for companies and contacts showing buyer intent signals for specific topics. Returns companies that are actively researching topics your organization subscribes to, along with signal scores and recommended contacts. Use this to identify accounts that are in-market for your solution.`,
  instructions: [
    'Intent topics must be configured in the ZoomInfo platform before querying via the API.',
    'Custom topics can be defined with specific keywords aligned to your business.'
  ],
  constraints: ['Only returns intent data for topics your organization is subscribed to.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      topicId: z.string().optional().describe('ZoomInfo intent topic ID to search for'),
      topicName: z.string().optional().describe('Intent topic name'),
      companyId: z.number().optional().describe('Filter by specific ZoomInfo company ID'),
      companyName: z.string().optional().describe('Filter by company name'),
      country: z.string().optional().describe('Filter by country'),
      state: z.string().optional().describe('Filter by state'),
      signalScoreMin: z.number().optional().describe('Minimum signal score'),
      audienceStrengthMin: z.number().optional().describe('Minimum audience strength'),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.any()))
        .describe('Intent search results with company and signal data'),
      totalResults: z.number().optional().describe('Total matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchIntent(searchParams, page, pageSize);

    let results = result.data || result.result || [];
    let totalResults = result.meta?.totalResults ?? result.totalResults;

    return {
      output: { results, totalResults },
      message: `Found **${totalResults ?? results.length}** intent signal(s).`
    };
  })
  .build();
