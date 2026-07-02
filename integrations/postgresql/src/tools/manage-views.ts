import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

let normalizeViewQuery = (query: string | undefined, allowTableQuery: boolean) => {
  if (!query?.trim()) {
    throw postgresServiceError('query is required for create action.');
  }

  let sql = query.trim().replace(/;\s*$/, '');
  if (sql.includes(';') || sql.includes('\0')) {
    throw postgresServiceError(
      'View query must be a single SELECT, WITH, VALUES, or TABLE statement.'
    );
  }

  let allowedPattern = allowTableQuery
    ? /^(SELECT|WITH|VALUES|TABLE)\b/i
    : /^(SELECT|WITH|VALUES)\b/i;
  if (!allowedPattern.test(sql)) {
    throw postgresServiceError(
      allowTableQuery
        ? 'Materialized view query must start with SELECT, WITH, VALUES, or TABLE.'
        : 'View query must start with SELECT, WITH, or VALUES.'
    );
  }

  return sql;
};

export let manageViews = SlateTool.create(spec, {
  name: 'Manage Views',
  key: 'manage_views',
  description:
    'Create and drop PostgreSQL views or materialized views, and refresh materialized views.',
  instructions: [
    'Use regular views for reusable read queries that should always reflect current base-table data.',
    'Use materialized views when the query result should be persisted and refreshed on demand.',
    'Dropping a view requires confirmDrop=true to avoid accidentally removing dependent read models.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'drop', 'refresh']).describe('Action to perform'),
      viewType: z
        .enum(['view', 'materialized_view'])
        .optional()
        .default('view')
        .describe('Whether to manage a regular view or materialized view'),
      viewName: z.string().describe('View name'),
      schemaName: z.string().optional().describe('Schema containing the view'),

      // Create options
      query: z
        .string()
        .optional()
        .describe('SELECT query used to define the view (create only)'),
      columns: z
        .array(z.string())
        .optional()
        .describe('Optional output column names for the view'),
      orReplace: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use CREATE OR REPLACE VIEW (regular views only)'),
      ifNotExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use IF NOT EXISTS for materialized view creation'),
      checkOption: z
        .enum(['local', 'cascaded'])
        .optional()
        .describe('WITH LOCAL/CASCADED CHECK OPTION for updatable regular views'),
      withData: z
        .boolean()
        .optional()
        .default(true)
        .describe('Populate a materialized view during create/refresh'),

      // Drop/refresh options
      ifExists: z.boolean().optional().default(false).describe('Use IF EXISTS for drop'),
      cascade: z.boolean().optional().default(false).describe('Use CASCADE for drop'),
      confirmDrop: z.boolean().optional().default(false).describe('Must be true for drop'),
      concurrently: z
        .boolean()
        .optional()
        .default(false)
        .describe('Refresh materialized view without blocking concurrent reads')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement that was executed'),
      viewName: z.string().describe('View affected by the operation'),
      schemaName: z.string().describe('Schema containing the view'),
      viewType: z.enum(['view', 'materialized_view']).describe('Type of view')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let fullViewName = qualifiedTableName(ctx.input.viewName, schema);
    let columnList = ctx.input.columns?.length
      ? ` (${ctx.input.columns.map(escapeIdentifier).join(', ')})`
      : '';
    let sql: string;

    if (ctx.input.action === 'create') {
      let query = normalizeViewQuery(
        ctx.input.query,
        ctx.input.viewType === 'materialized_view'
      );

      if (ctx.input.viewType === 'view') {
        if (ctx.input.ifNotExists) {
          throw postgresServiceError('ifNotExists is only supported for materialized views.');
        }

        let orReplace = ctx.input.orReplace ? 'OR REPLACE ' : '';
        let checkOption = ctx.input.checkOption
          ? ` WITH ${ctx.input.checkOption.toUpperCase()} CHECK OPTION`
          : '';
        sql = `CREATE ${orReplace}VIEW ${fullViewName}${columnList} AS ${query}${checkOption}`;
      } else {
        if (ctx.input.orReplace) {
          throw postgresServiceError('orReplace is not supported for materialized views.');
        }

        if (ctx.input.checkOption) {
          throw postgresServiceError('checkOption is only supported for regular views.');
        }

        let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
        let withData = ctx.input.withData ? 'WITH DATA' : 'WITH NO DATA';
        sql = `CREATE MATERIALIZED VIEW ${ifNotExists}${fullViewName}${columnList} AS ${query} ${withData}`;
      }
    } else if (ctx.input.action === 'drop') {
      if (!ctx.input.confirmDrop) {
        throw postgresServiceError('confirmDrop must be true to drop a view.');
      }

      let objectKeyword = ctx.input.viewType === 'view' ? 'VIEW' : 'MATERIALIZED VIEW';
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      let dropBehavior = ctx.input.cascade ? ' CASCADE' : ' RESTRICT';
      sql = `DROP ${objectKeyword} ${ifExists}${fullViewName}${dropBehavior}`;
    } else if (ctx.input.action === 'refresh') {
      if (ctx.input.viewType !== 'materialized_view') {
        throw postgresServiceError('Only materialized views can be refreshed.');
      }

      if (ctx.input.concurrently && !ctx.input.withData) {
        throw postgresServiceError(
          'concurrently cannot be used when withData is false for REFRESH MATERIALIZED VIEW.'
        );
      }

      let concurrently = ctx.input.concurrently ? 'CONCURRENTLY ' : '';
      let withData = ctx.input.withData ? 'WITH DATA' : 'WITH NO DATA';
      sql = `REFRESH MATERIALIZED VIEW ${concurrently}${fullViewName} ${withData}`;
    } else {
      throw postgresServiceError(`Unknown action: ${ctx.input.action}`);
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'drop'
          ? 'Dropped'
          : 'Refreshed';

    return {
      output: {
        success: true,
        executedSql: sql,
        viewName: ctx.input.viewName,
        schemaName: schema,
        viewType: ctx.input.viewType
      },
      message: `${actionLabel} ${ctx.input.viewType === 'view' ? 'view' : 'materialized view'} \`${schema}.${ctx.input.viewName}\`.`
    };
  })
  .build();
