import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDatasource = SlateTool.create(spec, {
  name: 'Manage Data Source',
  key: 'manage_datasource',
  description: `Create, update, or delete a data source. When creating, specify a connector type and optional properties. Supports connectors like \`simple_rest\`, \`facebook\`, \`google_analytics\`, \`salesforce\`, and many more.`,
  instructions: [
    'Use action "create" to create a new data source, "update" to modify, or "delete" to remove.',
    'Common connectors: simple_rest, facebook, google_analytics, google_spreadsheets, salesforce, hubspot, shopify, db, ftp.',
    'Properties vary by connector type. For simple_rest, typical properties include endpoint_url, method, parameters.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      datasourceId: z
        .string()
        .optional()
        .describe('Data source ID (required for update and delete)'),
      name: z.string().optional().describe('Data source name (required for create)'),
      description: z.string().optional().describe('Data source description'),
      connector: z
        .string()
        .optional()
        .describe('Connector type (required for create, e.g., "simple_rest")'),
      format: z.string().optional().describe('Data format (e.g., "json", "xml", "csv")'),
      refreshInterval: z.number().optional().describe('Refresh interval in seconds'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Connector-specific properties'),
      clientId: z.string().optional().describe('Client ID (for create only)')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required when creating a data source');
      if (!ctx.input.connector)
        throw new Error('Connector is required when creating a data source');

      let result = await client.createDatasource({
        name: ctx.input.name,
        description: ctx.input.description,
        connector: ctx.input.connector,
        format: ctx.input.format,
        refreshInterval: ctx.input.refreshInterval,
        properties: ctx.input.properties,
        clientId: ctx.input.clientId
      });

      let location = result?.meta?.location;
      let datasourceId = location ? location.split('/').pop() : undefined;

      return {
        output: { datasourceId, success: true },
        message: `Created data source **${ctx.input.name}** (connector: ${ctx.input.connector})${datasourceId ? ` with ID \`${datasourceId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.datasourceId) throw new Error('datasourceId is required when updating');

      if (
        ctx.input.name !== undefined ||
        ctx.input.description !== undefined ||
        ctx.input.refreshInterval !== undefined
      ) {
        await client.updateDatasource(ctx.input.datasourceId, {
          name: ctx.input.name,
          description: ctx.input.description,
          refreshInterval: ctx.input.refreshInterval
        });
      }

      if (ctx.input.properties) {
        await client.updateDatasourceProperties(ctx.input.datasourceId, ctx.input.properties);
      }

      return {
        output: { datasourceId: ctx.input.datasourceId, success: true },
        message: `Updated data source \`${ctx.input.datasourceId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.datasourceId) throw new Error('datasourceId is required when deleting');
      await client.deleteDatasource(ctx.input.datasourceId);

      return {
        output: { datasourceId: ctx.input.datasourceId, success: true },
        message: `Deleted data source \`${ctx.input.datasourceId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
