import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, pagination, records } from '../lib/client';
import { spec } from '../spec';

export let searchIntent = SlateTool.create(spec, {
  name: 'Search Intent',
  key: 'search_intent',
  description: `Search buyer intent signals across companies for topics your organization subscribes to. Returns company information, topics and signal scores. Use this to identify accounts researching relevant subjects.`,
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
      topicName: z.string().optional().describe('Intent topic name from Lookup Data'),
      topics: z
        .array(z.string())
        .optional()
        .describe('Current GTM topic names/IDs from Lookup Data; 1–50 entries'),
      audienceStrengthMinimum: z
        .enum(['A', 'B', 'C', 'D', 'E'])
        .optional()
        .describe('Current GTM minimum audience-strength level; A is strongest'),
      companyId: z
        .number()
        .optional()
        .describe(
          'Legacy company filter; current GTM connections use Enrich Intent for a specific company'
        ),
      companyName: z
        .string()
        .optional()
        .describe(
          'Legacy company filter; current GTM connections use Enrich Intent for a specific company'
        ),
      country: z.string().optional().describe('Filter by country'),
      state: z.string().optional().describe('Filter by state'),
      signalScoreMin: z.number().optional().describe('Minimum signal score'),
      audienceStrengthMin: z
        .number()
        .optional()
        .describe(
          'Legacy numeric audience strength; current GTM connections use audienceStrengthMinimum'
        ),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Intent search results with company and signal data'),
      totalResults: z.number().optional().describe('Total matching results'),
      currentPage: z.number().optional().describe('Provider current page'),
      totalPages: z.number().optional().describe('Provider total pages'),
      returnedCount: z.number().optional().describe('Number of records in this response')
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchIntent(searchParams, page, pageSize);

    const results = records(result);
    const { totalResults, currentPage, totalPages } = pagination(result);

    return {
      output: {
        results,
        totalResults,
        currentPage,
        totalPages,
        returnedCount: results.length
      },
      message: `Found **${totalResults ?? results.length}** intent signal(s).`
    };
  })
  .build();
