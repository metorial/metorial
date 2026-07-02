import { SlateTool } from 'slates';
import { z } from 'zod';
import { mysqlServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, validateSqlOptionName } from '../lib/helpers';
import { spec } from '../spec';

export let manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description: `Create or drop MySQL databases. Supports IF NOT EXISTS for creation, IF EXISTS for drops, and optional default character set and collation settings.`,
  instructions: [
    'Use create to provision a database before creating tables.',
    'Use drop with confirmDrop set to true only when the database and all contained objects should be permanently removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'drop']).describe('Action to perform on the database'),
      databaseName: z.string().describe('Name of the database'),
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
      charset: z
        .string()
        .optional()
        .describe('Default character set for create action, such as utf8mb4'),
      collation: z
        .string()
        .optional()
        .describe('Default collation for create action, such as utf8mb4_0900_ai_ci'),
      confirmDrop: z
        .boolean()
        .optional()
        .default(false)
        .describe('Required confirmation for drop action')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      action: z.enum(['create', 'drop']).describe('Action that was performed'),
      databaseName: z.string().describe('Database name'),
      executedSql: z.string().describe('The SQL statement that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let sql: string;

    if (ctx.input.action === 'create') {
      let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
      sql = `CREATE DATABASE ${ifNotExists}${escapeIdentifier(ctx.input.databaseName)}`;

      if (ctx.input.charset) {
        sql += ` DEFAULT CHARACTER SET ${validateSqlOptionName(ctx.input.charset, 'charset')}`;
      }

      if (ctx.input.collation) {
        sql += ` COLLATE ${validateSqlOptionName(ctx.input.collation, 'collation')}`;
      }
    } else {
      if (!ctx.input.confirmDrop) {
        throw mysqlServiceError('confirmDrop must be true to drop a database.');
      }

      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      sql = `DROP DATABASE ${ifExists}${escapeIdentifier(ctx.input.databaseName)}`;
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    let actionLabel = ctx.input.action === 'create' ? 'Created' : 'Dropped';

    return {
      output: {
        success: true,
        action: ctx.input.action,
        databaseName: ctx.input.databaseName,
        executedSql: sql
      },
      message: `${actionLabel} database \`${ctx.input.databaseName}\`.`
    };
  })
  .build();
