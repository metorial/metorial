import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatasources = SlateTool.create(spec, {
  name: 'List Datasources',
  key: 'list_datasources',
  description: `List all datasources configured in a workspace. Datasources represent connections to databases (PostgreSQL, MySQL, MongoDB, etc.) and APIs (REST, GraphQL) used by applications. Credentials are never exposed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list datasources for.')
    })
  )
  .output(
    z.object({
      datasources: z
        .array(
          z.object({
            datasourceId: z.string().describe('Unique datasource identifier.'),
            name: z.string().describe('Datasource name.'),
            pluginName: z
              .string()
              .optional()
              .describe('The plugin/connector type (e.g. PostgreSQL, REST API, MongoDB).'),
            pluginId: z.string().optional().describe('Plugin identifier.'),
            isValid: z
              .boolean()
              .optional()
              .describe('Whether the datasource connection is valid.'),
            isConfigured: z
              .boolean()
              .optional()
              .describe('Whether the datasource has been configured.')
          })
        )
        .describe('List of datasources.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let datasources = await client.listDatasources(ctx.input.workspaceId);

    let mapped = datasources.map((ds: any) => ({
      datasourceId: ds.id ?? '',
      name: ds.name ?? '',
      pluginName: ds.pluginName,
      pluginId: ds.pluginId,
      isValid: ds.isValid,
      isConfigured: ds.isConfigured
    }));

    return {
      output: { datasources: mapped },
      message: `Found **${mapped.length}** datasource(s) in workspace.`
    };
  })
  .build();
