import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let refreshDatasource = SlateTool.create(spec, {
  name: 'Refresh Data Sources',
  key: 'refresh_datasource',
  description: `Trigger an on-demand refresh for one or more data sources, or refresh a specific data source instance. Also supports enabling/disabling data sources.`,
  instructions: [
    'Provide datasource IDs to refresh them, or a single instance ID to refresh a specific instance.',
    'Use enable/disable to control whether a data source is actively refreshing.'
  ]
})
  .input(
    z.object({
      datasourceIds: z.array(z.string()).optional().describe('Data source IDs to refresh'),
      instanceId: z
        .string()
        .optional()
        .describe('Specific data source instance ID to refresh'),
      enable: z.string().optional().describe('Data source ID to enable'),
      disable: z.string().optional().describe('Data source ID to disable')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let actions: string[] = [];

    if (ctx.input.datasourceIds && ctx.input.datasourceIds.length > 0) {
      await client.refreshDatasources(ctx.input.datasourceIds);
      actions.push(`refreshed ${ctx.input.datasourceIds.length} data source(s)`);
    }

    if (ctx.input.instanceId) {
      await client.refreshDatasourceInstance(ctx.input.instanceId);
      actions.push(`refreshed instance \`${ctx.input.instanceId}\``);
    }

    if (ctx.input.enable) {
      await client.enableDatasource(ctx.input.enable);
      actions.push(`enabled data source \`${ctx.input.enable}\``);
    }

    if (ctx.input.disable) {
      await client.disableDatasource(ctx.input.disable);
      actions.push(`disabled data source \`${ctx.input.disable}\``);
    }

    return {
      output: { success: true },
      message: actions.length > 0 ? `${actions.join('; ')}.` : 'No actions performed.'
    };
  })
  .build();
