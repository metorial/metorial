import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchIntelligence = SlateTool.create(spec, {
  name: 'Search Intelligence',
  key: 'search_intelligence',
  description: `Search VirusTotal's entire dataset using advanced search modifiers. Find files, URLs, domains, and IP addresses matching specific criteria such as file type, detection count, behavioral attributes, submission metadata, and more. **Premium feature.**`,
  instructions: [
    'Use VirusTotal search modifiers like "type:pdf positives:5+" or "engines:"emotet"" for targeted results.',
    'Results include matching items with their attributes.'
  ],
  constraints: ['This feature requires a VirusTotal Premium API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'VirusTotal search query with optional modifiers (e.g. "type:pdf positives:5+")'
        ),
      limit: z.number().optional().default(10).describe('Maximum number of results to return'),
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      order: z
        .string()
        .optional()
        .describe('Sort order (e.g. "positives", "size", "first_submission_date")'),
      descriptorsOnly: z
        .boolean()
        .optional()
        .describe('If true, return only file descriptors (lighter response)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultId: z.string().describe('ID of the matching item'),
            resultType: z.string().optional().describe('Type of the matching item'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Attributes of the matching item')
          })
        )
        .describe('Matching search results'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchIntelligence(
      ctx.input.query,
      ctx.input.limit,
      ctx.input.cursor,
      ctx.input.order,
      ctx.input.descriptorsOnly
    );

    let results = (result?.data ?? []).map((item: any) => ({
      resultId: item.id ?? '',
      resultType: item.type,
      attributes: item.attributes
    }));

    return {
      output: {
        results,
        nextCursor: result?.meta?.cursor
      },
      message: `Found **${results.length}** results for query: \`${ctx.input.query}\`.`
    };
  })
  .build();
