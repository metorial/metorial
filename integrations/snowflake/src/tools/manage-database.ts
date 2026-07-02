import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description: `Create, retrieve, list, or delete Snowflake databases. Use the **action** field to specify the operation. When listing, optionally filter by pattern. When creating, provide the database name and optional settings like comment, data retention, etc.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      databaseName: z
        .string()
        .optional()
        .describe('Name of the database (required for get, create, delete)'),
      like: z
        .string()
        .optional()
        .describe('SQL LIKE pattern to filter databases when listing (e.g. "MY_%")'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of databases to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior for create action'),
      comment: z.string().optional().describe('Comment for the database when creating'),
      dataRetentionTimeInDays: z
        .number()
        .optional()
        .describe('Time Travel retention period in days when creating'),
      kind: z
        .enum(['transient', 'permanent'])
        .optional()
        .describe('Database type when creating'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the database does not exist')
    })
  )
  .output(
    z.object({
      databases: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of databases (for list action)'),
      database: z
        .record(z.string(), z.any())
        .optional()
        .describe('Database details (for get/create actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the database was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, databaseName } = ctx.input;

    if (action === 'list') {
      let databases = await client.listDatabases({
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { databases },
        message: `Found **${databases.length}** database(s)`
      };
    }

    if (!databaseName) {
      throw new Error('databaseName is required for get, create, and delete actions');
    }

    if (action === 'get') {
      let database = await client.getDatabase(databaseName);
      return {
        output: { database },
        message: `Retrieved database **${databaseName}**`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = { name: databaseName };
      if (ctx.input.comment) body.comment = ctx.input.comment;
      if (ctx.input.dataRetentionTimeInDays !== undefined)
        body.data_retention_time_in_days = ctx.input.dataRetentionTimeInDays;
      if (ctx.input.kind) body.kind = ctx.input.kind;

      let database = await client.createDatabase(body, ctx.input.createMode);
      return {
        output: { database },
        message: `Created database **${databaseName}**`
      };
    }

    if (action === 'delete') {
      await client.deleteDatabase(databaseName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted database **${databaseName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
