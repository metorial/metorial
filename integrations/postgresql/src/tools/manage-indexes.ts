import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let manageIndexes = SlateTool.create(spec, {
  name: 'Manage Indexes',
  key: 'manage_indexes',
  description: `Create or drop indexes on PostgreSQL tables. Supports B-tree, Hash, GIN, GiST, and other index types.
Can create unique indexes, partial indexes with WHERE conditions, and multi-column indexes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'drop']).describe('Action to perform'),
      indexName: z.string().describe('Name of the index'),
      tableName: z.string().optional().describe('Name of the table (required for create)'),
      schemaName: z.string().optional().describe('Schema containing the table'),

      // Create options
      columns: z
        .array(z.string())
        .optional()
        .describe('Column names to include in the index (required for create)'),
      unique: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to create a UNIQUE index'),
      method: z
        .enum(['btree', 'hash', 'gin', 'gist', 'spgist', 'brin'])
        .optional()
        .default('btree')
        .describe('Index access method'),
      where: z.string().optional().describe('WHERE condition for a partial index'),
      concurrently: z
        .boolean()
        .optional()
        .default(false)
        .describe('Create index concurrently (non-blocking)'),
      ifNotExists: z.boolean().optional().default(false).describe('Add IF NOT EXISTS clause'),

      // Drop options
      cascade: z.boolean().optional().default(false).describe('Use CASCADE when dropping'),
      ifExists: z.boolean().optional().default(false).describe('Add IF EXISTS clause for drop')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let sql: string;

    if (ctx.input.action === 'create') {
      if (!ctx.input.tableName) {
        throw postgresServiceError('tableName is required for create action');
      }
      if (!ctx.input.columns || ctx.input.columns.length === 0) {
        throw postgresServiceError('columns are required for create action');
      }

      let fullTableName = qualifiedTableName(ctx.input.tableName, schema);
      let unique = ctx.input.unique ? 'UNIQUE ' : '';
      let concurrently = ctx.input.concurrently ? 'CONCURRENTLY ' : '';
      let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
      let method = ctx.input.method !== 'btree' ? ` USING ${ctx.input.method}` : '';
      let columnList = ctx.input.columns.map(escapeIdentifier).join(', ');
      let where = ctx.input.where ? ` WHERE ${ctx.input.where}` : '';

      sql = `CREATE ${unique}INDEX ${concurrently}${ifNotExists}${escapeIdentifier(ctx.input.indexName)} ON ${fullTableName}${method} (${columnList})${where}`;
    } else {
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      let cascade = ctx.input.cascade ? ' CASCADE' : '';
      let fullIndexName = qualifiedTableName(ctx.input.indexName, schema);
      sql = `DROP INDEX ${ifExists}${fullIndexName}${cascade}`;
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    let actionLabel = ctx.input.action === 'create' ? 'Created' : 'Dropped';

    return {
      output: {
        success: true,
        executedSql: sql
      },
      message: `${actionLabel} index \`${ctx.input.indexName}\`.`
    };
  })
  .build();
