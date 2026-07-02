import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchPipedrive = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across Pipedrive entities including deals, leads, persons, organizations, products, and files. Returns matching items with their type, title, and key details.
Supports filtering by item type and exact matching.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      term: z.string().describe('Search term to look for'),
      itemTypes: z
        .array(z.enum(['deal', 'lead', 'person', 'organization', 'product', 'file']))
        .optional()
        .describe('Limit search to specific entity types'),
      fields: z
        .enum(['custom_fields', 'email', 'notes', 'phone', 'title', 'name'])
        .optional()
        .describe('Search within specific field type only'),
      exactMatch: z
        .boolean()
        .optional()
        .describe('Use exact match instead of partial matching'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultType: z
              .string()
              .describe('Type of result (deal, person, organization, etc.)'),
            resultId: z.number().describe('ID of the matched item'),
            title: z.string().describe('Title or name of the matched item'),
            resultScore: z.number().optional().describe('Search relevance score'),
            status: z.string().optional().nullable().describe('Status if applicable'),
            visibleTo: z.number().optional().describe('Visibility level'),
            customFields: z
              .array(z.string())
              .optional()
              .describe('Matching custom field values'),
            notes: z.array(z.string()).optional().describe('Matching notes')
          })
        )
        .describe('Search results'),
      totalCount: z.number().optional().describe('Total number of matching results'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.search({
      term: ctx.input.term,
      item_types: ctx.input.itemTypes?.join(','),
      fields: ctx.input.fields,
      exact_match: ctx.input.exactMatch,
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = result?.data?.items || [];
    let results = items.map((item: any) => {
      let resultItem = item.item;
      return {
        resultType:
          item.result_type ?? item.type ?? resultItem?.type ?? resultItem?.item_type ?? '',
        resultId: resultItem?.id,
        title: resultItem?.title || resultItem?.name || '',
        resultScore: item.result_score,
        status: resultItem?.status,
        visibleTo: resultItem?.visible_to,
        customFields: resultItem?.custom_fields,
        notes: resultItem?.notes
      };
    });

    return {
      output: {
        results,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.term}".`
    };
  });
