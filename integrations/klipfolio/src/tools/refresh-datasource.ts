import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let refreshDatasource = SlateTool.create(spec, {
  name: 'Refresh Data Sources',
  key: 'refresh_datasource',
  description: `Trigger an on-demand refresh for one or more data sources, or refresh a specific data source instance. Also supports enabling/disabling data sources.`,
  instructions: [
    'Provide datasource IDs to refresh them, or a single instance ID to refresh a specific instance.',
    'Use enable/disable to control whether a data source is actively refreshing. Refresh is queued; read the instance refresh time to verify completion.'
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
    validateInput(ctx.input);
    if (
      !ctx.input.datasourceIds?.length &&
      !ctx.input.instanceId &&
      !ctx.input.enable &&
      !ctx.input.disable
    )
      throw createApiServiceError(
        'Provide at least one refresh, enable or disable operation.',
        { reason: 'invalid_input' }
      );
    if (ctx.input.enable && ctx.input.enable === ctx.input.disable)
      throw createApiServiceError(
        'The same data source cannot be enabled and disabled in one request.',
        { reason: 'invalid_input' }
      );
    let client = new Client({ token: ctx.auth.token });
    let actions: string[] = [];

    if (ctx.input.datasourceIds && ctx.input.datasourceIds.length > 0) {
      await client.refreshDatasources(ctx.input.datasourceIds);
      actions.push(`queued refresh for ${ctx.input.datasourceIds.length} data source(s)`);
    }

    if (ctx.input.instanceId) {
      await client.refreshDatasourceInstance(ctx.input.instanceId);
      actions.push(`queued refresh for instance \`${ctx.input.instanceId}\``);
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
