import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Perform a full-text relevance search across multiple Dynamics 365 entities using the Dataverse Search API. Returns results ranked by relevance, useful for finding records when you don't know the exact entity or field to query.`,
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
          'Limit search to specific entity logical names (e.g., ["account", "contact"])'
        ),
      filter: z.string().optional().describe('OData filter to further narrow results'),
      top: z.number().optional().describe('Maximum number of results to return')
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
      totalCount: z.number().describe('Total number of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let searchResponse = await client.search(ctx.input.searchTerm, {
      entities: ctx.input.entities,
      filter: ctx.input.filter,
      top: ctx.input.top
    });

    let values = searchResponse.Value || searchResponse.value || [];
    let results = values.map((item: any) => ({
      entityName: item.EntityName || item.entityName || item.entityname || '',
      recordId: item.Id || item.id || item.ObjectId || item.objectId || item.objectid || '',
      score: item.Score || item.score || 0,
      highlights: item.Highlights || item.highlights || {},
      attributes: item.Attributes || item.attributes || {}
    }));
    let totalCount =
      searchResponse.Count ??
      searchResponse.count ??
      searchResponse.totalrecordcount ??
      results.length;

    return {
      output: {
        results,
        totalCount:
          typeof totalCount === 'number' && totalCount >= 0 ? totalCount : results.length
      },
      message: `Found **${results.length}** results for "${ctx.input.searchTerm}".`
    };
  })
  .build();
