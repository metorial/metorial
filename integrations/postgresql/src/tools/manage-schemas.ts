import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, escapeIdentifier } from '../lib/helpers';
import { spec } from '../spec';

export let manageSchemas = SlateTool.create(spec, {
  name: 'Manage Schemas',
  key: 'manage_schemas',
  description:
    'Create, rename, or drop PostgreSQL schemas. Schemas are namespaces for tables, views, functions, and other database objects.',
  instructions: [
    'Use create for a suite-owned or application-owned namespace before creating tables or views.',
    'Dropping a schema requires confirmDrop=true to avoid accidental removal of contained objects.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'rename', 'drop']).describe('Action to perform'),
      schemaName: z.string().describe('Schema name to create, rename, or drop'),
      authorizationRole: z
        .string()
        .optional()
        .describe('Role that should own the new schema (create only)'),
      newSchemaName: z.string().optional().describe('New schema name (rename only)'),
      ifNotExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF NOT EXISTS for create action'),
      ifExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF EXISTS for drop action'),
      cascade: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use CASCADE when dropping a schema'),
      confirmDrop: z
        .boolean()
        .optional()
        .default(false)
        .describe('Must be true for drop action')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement that was executed'),
      schemaName: z.string().describe('Schema affected by the operation'),
      newSchemaName: z.string().optional().describe('New schema name for rename action')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let sql: string;

    if (ctx.input.action === 'create') {
      if (/^pg_/i.test(ctx.input.schemaName)) {
        throw postgresServiceError(
          'Schema names beginning with "pg_" are reserved by PostgreSQL.'
        );
      }

      let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
      let authorization = ctx.input.authorizationRole
        ? ` AUTHORIZATION ${escapeIdentifier(ctx.input.authorizationRole)}`
        : '';
      sql = `CREATE SCHEMA ${ifNotExists}${escapeIdentifier(ctx.input.schemaName)}${authorization}`;
    } else if (ctx.input.action === 'rename') {
      if (!ctx.input.newSchemaName) {
        throw postgresServiceError('newSchemaName is required for rename action.');
      }

      if (/^pg_/i.test(ctx.input.newSchemaName)) {
        throw postgresServiceError(
          'Schema names beginning with "pg_" are reserved by PostgreSQL.'
        );
      }

      sql = `ALTER SCHEMA ${escapeIdentifier(ctx.input.schemaName)} RENAME TO ${escapeIdentifier(
        ctx.input.newSchemaName
      )}`;
    } else if (ctx.input.action === 'drop') {
      if (!ctx.input.confirmDrop) {
        throw postgresServiceError('confirmDrop must be true to drop a schema.');
      }

      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      let dropBehavior = ctx.input.cascade ? ' CASCADE' : ' RESTRICT';
      sql = `DROP SCHEMA ${ifExists}${escapeIdentifier(ctx.input.schemaName)}${dropBehavior}`;
    } else {
      throw postgresServiceError(`Unknown action: ${ctx.input.action}`);
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'rename'
          ? 'Renamed'
          : 'Dropped';

    return {
      output: {
        success: true,
        executedSql: sql,
        schemaName: ctx.input.schemaName,
        newSchemaName: ctx.input.newSchemaName
      },
      message: `${actionLabel} schema \`${ctx.input.schemaName}\`.`
    };
  })
  .build();
