import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchema = SlateTool.create(spec, {
  name: 'Manage Schema',
  key: 'manage_schema',
  description: `Create, retrieve, list, or delete schemas within a Snowflake database. Schemas organize tables and other objects within a database. Provide the parent database name and the desired action.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      databaseName: z.string().describe('Parent database name'),
      schemaName: z
        .string()
        .optional()
        .describe('Schema name (required for get, create, delete)'),
      like: z.string().optional().describe('SQL LIKE pattern to filter schemas when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of schemas to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior for create action'),
      comment: z.string().optional().describe('Comment for the schema when creating'),
      dataRetentionTimeInDays: z
        .number()
        .optional()
        .describe('Time Travel retention period in days'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the schema does not exist')
    })
  )
  .output(
    z.object({
      schemas: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of schemas (for list action)'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schema details (for get/create actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the schema was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, databaseName, schemaName } = ctx.input;

    if (action === 'list') {
      let schemas = await client.listSchemas(databaseName, {
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { schemas },
        message: `Found **${schemas.length}** schema(s) in database **${databaseName}**`
      };
    }

    if (!schemaName) {
      throw new Error('schemaName is required for get, create, and delete actions');
    }

    if (action === 'get') {
      let schema = await client.getSchema(databaseName, schemaName);
      return {
        output: { schema },
        message: `Retrieved schema **${databaseName}.${schemaName}**`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = { name: schemaName };
      if (ctx.input.comment) body.comment = ctx.input.comment;
      if (ctx.input.dataRetentionTimeInDays !== undefined)
        body.data_retention_time_in_days = ctx.input.dataRetentionTimeInDays;

      let schema = await client.createSchema(databaseName, body, ctx.input.createMode);
      return {
        output: { schema },
        message: `Created schema **${databaseName}.${schemaName}**`
      };
    }

    if (action === 'delete') {
      await client.deleteSchema(databaseName, schemaName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted schema **${databaseName}.${schemaName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
