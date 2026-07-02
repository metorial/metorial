import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

export let getConnectionSchema = SlateTool.create(spec, {
  name: 'Get Connection Schema',
  key: 'get_connection_schema',
  description: `Retrieve the schema configuration for a connection, including which schemas, tables, and columns are enabled or disabled for syncing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection')
    })
  )
  .output(
    z.object({
      schemaChangeHandling: z
        .string()
        .optional()
        .describe(
          'How new schema changes are handled: ALLOW_ALL, ALLOW_COLUMNS, or BLOCK_ALL'
        ),
      schemas: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schema configuration map with enabled/disabled tables and columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let schema = await client.getConnectionSchema(ctx.input.connectionId);

    return {
      output: {
        schemaChangeHandling: schema?.schema_change_handling,
        schemas: schema?.schemas
      },
      message: `Retrieved schema configuration for connection ${ctx.input.connectionId}.`
    };
  })
  .build();

export let updateConnectionSchema = SlateTool.create(spec, {
  name: 'Update Connection Schema',
  key: 'update_connection_schema',
  description: `Update the schema configuration for a connection. Enable or disable specific schemas, tables, and columns for syncing. You can also change how new schema changes are handled.`,
  instructions: [
    'Set schemaChangeHandling to "ALLOW_ALL" to auto-include new schemas/tables/columns.',
    'Set schemaChangeHandling to "BLOCK_ALL" to exclude all new schemas/tables/columns by default.',
    'The schemas object should follow Fivetran\'s nested format: { "schema_name": { "enabled": true, "tables": { "table_name": { "enabled": true } } } }.'
  ]
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection'),
      schemaChangeHandling: z
        .enum(['ALLOW_ALL', 'ALLOW_COLUMNS', 'BLOCK_ALL'])
        .optional()
        .describe('How to handle new schema elements'),
      schemas: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Schema configuration object with enabled/disabled schemas, tables, and columns'
        )
    })
  )
  .output(
    z.object({
      schemaChangeHandling: z
        .string()
        .optional()
        .describe('Updated schema change handling mode'),
      schemas: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated schema configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.schemaChangeHandling)
      body.schema_change_handling = ctx.input.schemaChangeHandling;
    if (ctx.input.schemas) body.schemas = ctx.input.schemas;

    let schema = await client.updateConnectionSchema(ctx.input.connectionId, body);

    return {
      output: {
        schemaChangeHandling: schema?.schema_change_handling,
        schemas: schema?.schemas
      },
      message: `Updated schema configuration for connection ${ctx.input.connectionId}.`
    };
  })
  .build();

export let reloadConnectionSchema = SlateTool.create(spec, {
  name: 'Reload Connection Schema',
  key: 'reload_connection_schema',
  description: `Reload the schema configuration from the source for a connection. This refreshes the available schemas, tables, and columns from the data source.`
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection'),
      excludeMode: z
        .enum(['EXCLUDE', 'PRESERVE'])
        .optional()
        .describe('EXCLUDE disables all new items by default, PRESERVE keeps current settings')
    })
  )
  .output(
    z.object({
      schemaChangeHandling: z.string().optional().describe('Schema change handling mode'),
      schemas: z
        .record(z.string(), z.any())
        .optional()
        .describe('Reloaded schema configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let schema = await client.reloadConnectionSchema(
      ctx.input.connectionId,
      ctx.input.excludeMode
    );

    return {
      output: {
        schemaChangeHandling: schema?.schema_change_handling,
        schemas: schema?.schemas
      },
      message: `Reloaded schema for connection ${ctx.input.connectionId}${ctx.input.excludeMode ? ` with ${ctx.input.excludeMode} mode` : ''}.`
    };
  })
  .build();
