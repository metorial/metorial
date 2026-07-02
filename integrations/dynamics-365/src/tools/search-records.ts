import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../lib/client';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Perform a full-text relevance search across multiple Dynamics 365 Dataverse tables using the Dataverse Search API. Returns results ranked by relevance, useful for finding records when you do not know the exact table or field to query.`,
  instructions: [
    'Optionally narrow results by specifying entity names to search within.',
    'The search uses Lucene query syntax. Wrap phrases in quotes for exact matching.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z.string().describe('Full-text search query'),
      entities: z
        .array(z.string())
        .optional()
        .describe(
          'Backward-compatible table logical names to search, for example ["account", "contact"]'
        ),
      searchEntities: z
        .array(
          z.object({
            name: z.string().describe('Table logical name'),
            selectColumns: z.array(z.string()).optional().describe('Columns to include'),
            searchColumns: z.array(z.string()).optional().describe('Columns to search')
          })
        )
        .optional()
        .describe('Dataverse Search table descriptors with optional selected/search columns'),
      filter: z.string().optional().describe('OData filter to further narrow results'),
      top: z.number().optional().describe('Maximum number of results to return'),
      skip: z.number().int().nonnegative().optional().describe('Number of results to skip'),
      facets: z.array(z.string()).optional().describe('Facet expressions')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            entityName: z.string().describe('Logical name of the entity'),
            recordId: z.string().describe('GUID of the matching record'),
            score: z.number().describe('Relevance score'),
            highlights: z
              .record(z.string(), z.array(z.string()))
              .describe('Highlighted matching fields'),
            attributes: z.record(z.string(), z.any()).describe('Record attributes')
          })
        )
        .describe('Search results ranked by relevance'),
      totalCount: z.number().describe('Total number of matching records'),
      rawResponse: z
        .any()
        .optional()
        .describe('Raw Dataverse Search response for compatibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let searchResponse = await client.searchRecords({
      search: ctx.input.searchTerm,
      entities: ctx.input.searchEntities ?? ctx.input.entities?.map(name => ({ name })),
      filter: ctx.input.filter,
      top: ctx.input.top,
      skip: ctx.input.skip,
      facets: ctx.input.facets
    });

    let response =
      typeof searchResponse === 'object' && searchResponse !== null
        ? (searchResponse as Record<string, any>)
        : {};
    let values = response.Value || response.value || [];
    let results = values.map((item: any) => ({
      entityName: item.EntityName || item.entityName || item.entityname || '',
      recordId: item.Id || item.id || item.ObjectId || item.objectId || item.objectid || '',
      score: item.Score || item.score || 0,
      highlights: item.Highlights || item.highlights || {},
      attributes: item.Attributes || item.attributes || {}
    }));
    let totalCount =
      response.Count ?? response.count ?? response.totalrecordcount ?? results.length;

    return {
      output: {
        results,
        totalCount:
          typeof totalCount === 'number' && totalCount >= 0 ? totalCount : results.length,
        rawResponse: searchResponse
      },
      message: `Found **${results.length}** results for "${ctx.input.searchTerm}".`
    };
  })
  .build();
