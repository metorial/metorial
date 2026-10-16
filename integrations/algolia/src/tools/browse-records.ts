import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let browseRecords = SlateTool.create(spec, {
  name: 'Browse Records',
  key: 'browse_records',
  description:
    'Retrieve a page of records from an Algolia index. Follow the returned cursor to continue beyond the search pagination limit.',
  instructions: [
    'Call manage_indices with action list to discover index names.',
    'For the first page, supply optional query, filters, and attributesToRetrieve. For later pages, pass the returned cursor.',
    'Each call retrieves up to 1000 records. A missing cursor means there are no more records.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      indexName: z
        .string()
        .describe('Index name. Call manage_indices with action list to discover indices.'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor returned by the previous browse_records call.'),
      query: z
        .string()
        .optional()
        .describe('Search text for the first page. Defaults to all records.'),
      filters: z.string().optional().describe('Filter expression for the first page.'),
      attributesToRetrieve: z
        .array(z.string())
        .optional()
        .describe('Record attributes to return.'),
      hitsPerPage: z.number().optional().describe('Records per page, up to 1000.')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      ...ctx.auth,
      analyticsRegion: ctx.config.analyticsRegion
    });
    let { indexName, cursor, ...params } = ctx.input;
    let result = await client.browse(indexName, cursor !== undefined ? { cursor } : params);
    return {
      output: result,
      message: `Retrieved ${result.hits?.length ?? 0} records from index "${indexName}"${result.cursor ? '; use the cursor to retrieve the next page' : ''}.`
    };
  })
  .build();
