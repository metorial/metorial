import { SlateTool } from 'slates';
import { z } from 'zod';
import { SsbClient } from '../lib/client';
import { ssbServiceError } from '../lib/errors';
import {
  summarizeCodelist,
  summarizeMetadata,
  summarizeTable,
  summarizeTablesResponse
} from '../lib/metadata';
import { spec } from '../spec';

let languageSchema = z.enum(['en', 'no']);

let codelistSelectionSchema = z.object({
  variableCode: z.string().describe('Table variable code to apply a codelist to.'),
  codelistId: z.string().describe('SSB codelist id such as vs_Fylker or agg_KommSummer.')
});

export let getTables = SlateTool.create(spec, {
  name: 'Get Tables',
  key: 'get_tables',
  description:
    'Search Statbank Norway – SSB tables, inspect one table, retrieve compact metadata, or inspect a codelist.',
  instructions: [
    'Use search first to find table ids, then get_metadata to discover variable codes and value codes.',
    'Metadata values can be large; raise valueLimit only when you need more value codes.',
    'Use get_codelist for valuesets and groupings listed in table metadata.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['search', 'get_table', 'get_metadata', 'get_codelist'])
        .optional()
        .default('search')
        .describe('Operation to run.'),
      language: languageSchema.optional().default('en').describe('Response language.'),
      query: z
        .string()
        .optional()
        .describe(
          'Search query for tables. Searches table titles, variables, and values; supports SSB query syntax.'
        ),
      tableId: z
        .string()
        .optional()
        .describe('Five digit SSB Statbank table id for get_table or get_metadata.'),
      codelistId: z
        .string()
        .optional()
        .describe('SSB codelist id for get_codelist, such as vs_Fylker.'),
      codelists: z
        .array(codelistSelectionSchema)
        .optional()
        .describe('Optional codelists to apply when retrieving table metadata.'),
      pastDays: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Only return tables updated within this many past days.'),
      includeDiscontinued: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether discontinued tables should be included in table search.'),
      pageNumber: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe('Search page number.'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(20)
        .describe('Number of tables per search page.'),
      valueLimit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe('Maximum number of metadata or codelist values to include in output.')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Operation that was executed.'),
      language: z.string().optional().describe('Response language.'),
      page: z.any().optional().describe('Pagination metadata for table search.'),
      tables: z.array(z.any()).optional().describe('Matching table summaries.'),
      table: z.any().optional().describe('Single table summary.'),
      metadata: z.any().optional().describe('Compact table metadata.'),
      codelist: z.any().optional().describe('Compact codelist details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SsbClient();
    let action = ctx.input.action;

    if (action === 'search') {
      let response = await client.searchTables({
        language: ctx.input.language,
        query: ctx.input.query,
        pastDays: ctx.input.pastDays,
        includeDiscontinued: ctx.input.includeDiscontinued,
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      });
      let summary = summarizeTablesResponse(response);

      return {
        output: {
          action,
          language: summary.language,
          page: summary.page,
          tables: summary.tables
        },
        message: `Found **${summary.tables.length}** SSB table summaries.`
      };
    }

    if (action === 'get_table') {
      if (!ctx.input.tableId) {
        throw ssbServiceError('tableId is required for get_table.');
      }

      let response = await client.getTable(ctx.input.tableId, ctx.input.language);
      let table = summarizeTable(response);

      return {
        output: {
          action,
          language: ctx.input.language,
          table
        },
        message: `Retrieved SSB table **${table.id ?? ctx.input.tableId}**.`
      };
    }

    if (action === 'get_metadata') {
      if (!ctx.input.tableId) {
        throw ssbServiceError('tableId is required for get_metadata.');
      }

      let response = await client.getMetadata({
        tableId: ctx.input.tableId,
        language: ctx.input.language,
        codelists: ctx.input.codelists
      });

      return {
        output: {
          action,
          language: ctx.input.language,
          metadata: summarizeMetadata(response, ctx.input.valueLimit)
        },
        message: `Retrieved metadata for SSB table **${ctx.input.tableId}**.`
      };
    }

    if (!ctx.input.codelistId) {
      throw ssbServiceError('codelistId is required for get_codelist.');
    }

    let response = await client.getCodelist(ctx.input.codelistId, ctx.input.language);
    let codelist = summarizeCodelist(response, ctx.input.valueLimit);

    return {
      output: {
        action,
        language: ctx.input.language,
        codelist
      },
      message: `Retrieved SSB codelist **${codelist.id ?? ctx.input.codelistId}**.`
    };
  })
  .build();
