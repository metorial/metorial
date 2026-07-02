import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `List and search content records in a DatoCMS project. Filter by model type, text query, or specific record IDs. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelIdOrApiKey: z.string().optional().describe('Filter by model ID or model API key'),
      query: z.string().optional().describe('Text search query to filter records'),
      recordIds: z.string().optional().describe('Comma-separated list of record IDs to fetch'),
      version: z
        .enum(['current', 'published'])
        .optional()
        .describe(
          'Record version to retrieve. "current" includes drafts, "published" only returns published records.'
        ),
      locale: z
        .string()
        .optional()
        .describe('Locale for filtering and searching (e.g. "en", "it")'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Sort field and direction, e.g. "title_ASC" or "updated_at_DESC". Requires modelIdOrApiKey to be set.'
        ),
      nested: z
        .boolean()
        .optional()
        .describe('When true, block fields return full objects instead of IDs'),
      pageOffset: z
        .number()
        .optional()
        .describe('Zero-based offset for pagination (default: 0)'),
      pageLimit: z.number().optional().describe('Max records per page (default: 30, max: 500)')
    })
  )
  .output(
    z.object({
      records: z.array(z.any()).describe('Array of record objects'),
      totalCount: z.number().describe('Total number of records matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listRecords({
      filterType: ctx.input.modelIdOrApiKey,
      filterQuery: ctx.input.query,
      filterIds: ctx.input.recordIds,
      version: ctx.input.version,
      locale: ctx.input.locale,
      orderBy: ctx.input.orderBy,
      nested: ctx.input.nested,
      pageOffset: ctx.input.pageOffset,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        records: result.data,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** records (returned ${result.data.length} in this page).`
    };
  })
  .build();
