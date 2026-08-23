import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute Query',
  key: 'execute_query',
  description: `Execute an ad-hoc query or run a saved question's query against a connected database.
Supports native SQL queries and Metabase's structured query language (MBQL).
Returns query results including column metadata and row data.`,
  instructions: [
    'For ad-hoc native SQL: provide databaseId, set queryType to "native", and put your SQL in nativeQuery.',
    'For ad-hoc MBQL: provide databaseId, set queryType to "query", and provide the MBQL object in mbqlQuery.',
    'To run a saved question: provide the cardId instead. Parameters can be passed to customize the query.'
  ],
  constraints: [
    'Native SQL is executed with the connected database permissions and may modify data. Use a read-only database role and SELECT statements for read-only workflows.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      cardId: z
        .number()
        .optional()
        .describe(
          'ID of a saved question to execute. If provided, databaseId and queryType are not needed.'
        ),
      databaseId: z
        .number()
        .optional()
        .describe('ID of the database to query (required for ad-hoc queries)'),
      queryType: z
        .enum(['native', 'query'])
        .optional()
        .describe('Type of ad-hoc query: "native" for SQL or "query" for MBQL'),
      nativeQuery: z
        .string()
        .optional()
        .describe('SQL query string (when queryType is "native")'),
      mbqlQuery: z.any().optional().describe('MBQL query object (when queryType is "query")'),
      templateTags: z
        .any()
        .optional()
        .describe('Template tags for parameterized native queries'),
      parameters: z
        .array(z.any())
        .optional()
        .describe('Query parameters for saved questions or template-tag values')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Query execution status (e.g., "completed")'),
      rowCount: z.number().describe('Number of rows returned'),
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name'),
            displayName: z.string().optional().describe('Human-readable column name'),
            baseType: z.string().optional().describe('Data type of the column')
          })
        )
        .describe('Column metadata'),
      rows: z.array(z.array(z.any())).describe('Result rows as arrays of values'),
      databaseId: z.number().optional().describe('ID of the database queried'),
      runningTimeMs: z.number().optional().describe('Query execution time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let usesSavedQuestion = ctx.input.cardId !== undefined;
    let usesAdHocFields =
      ctx.input.databaseId !== undefined ||
      ctx.input.queryType !== undefined ||
      ctx.input.nativeQuery !== undefined ||
      ctx.input.mbqlQuery !== undefined ||
      ctx.input.templateTags !== undefined;
    if (usesSavedQuestion && usesAdHocFields) {
      throw createApiServiceError(
        'Provide cardId for a saved question, or the ad-hoc query fields, but not both.',
        { reason: 'metabase_query_mode_conflict' }
      );
    }
    if (!usesSavedQuestion && (ctx.input.databaseId === undefined || !ctx.input.queryType)) {
      throw createApiServiceError('Ad-hoc queries require databaseId and queryType.', {
        reason: 'metabase_query_input_missing'
      });
    }
    if (
      !usesSavedQuestion &&
      ctx.input.queryType === 'native' &&
      !ctx.input.nativeQuery?.trim()
    ) {
      throw createApiServiceError('Native queries require a non-empty nativeQuery.', {
        reason: 'metabase_native_query_missing'
      });
    }
    if (
      !usesSavedQuestion &&
      ctx.input.queryType === 'query' &&
      ctx.input.mbqlQuery === undefined
    ) {
      throw createApiServiceError('MBQL queries require mbqlQuery.', {
        reason: 'metabase_mbql_query_missing'
      });
    }

    let client = new MetabaseClient(ctx.auth);

    let result: any;

    if (usesSavedQuestion) {
      result = await client.executeCardQuery(ctx.input.cardId!, {
        parameters: ctx.input.parameters
      });
    } else {
      result = await client.executeQuery({
        databaseId: ctx.input.databaseId!,
        type: ctx.input.queryType!,
        nativeQuery: ctx.input.nativeQuery,
        mbqlQuery: ctx.input.mbqlQuery,
        parameters: ctx.input.parameters,
        templateTags: ctx.input.templateTags
      });
    }

    if (result.status && result.status !== 'completed') {
      throw createApiServiceError(
        `Metabase could not complete the query${result.error ? `: ${String(result.error)}` : '.'}`,
        { reason: 'metabase_query_failed' }
      );
    }

    let columns = (result.data?.cols || []).map((col: any) => ({
      name: col.name,
      displayName: col.display_name,
      baseType: col.base_type
    }));

    let rows = result.data?.rows || [];

    return {
      output: {
        status: result.status || 'completed',
        rowCount: result.row_count ?? rows.length,
        columns,
        rows,
        databaseId: result.database_id,
        runningTimeMs: result.running_time
      },
      message: `Query executed successfully — returned **${rows.length}** row(s) in ${result.running_time ?? '?'}ms`
    };
  })
  .build();
