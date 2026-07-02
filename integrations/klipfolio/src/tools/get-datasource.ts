import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDatasource = SlateTool.create(spec, {
  name: 'Get Data Source',
  key: 'get_datasource',
  description: `Retrieve detailed information about a specific data source, including its connector configuration, properties, refresh status, and share rights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasourceId: z.string().describe('ID of the data source to retrieve'),
      includeProperties: z.boolean().optional().describe('Include connector properties'),
      includeShareRights: z.boolean().optional().describe('Include share rights')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      connector: z.string().optional(),
      format: z.string().optional(),
      refreshInterval: z.number().optional(),
      disabled: z.boolean().optional(),
      isDynamic: z.boolean().optional(),
      createdBy: z.string().optional(),
      dateCreated: z.string().optional(),
      dateLastRefresh: z.string().optional(),
      properties: z.any().optional(),
      shareRights: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ds = await client.getDatasource(ctx.input.datasourceId, true);

    let output: any = {
      datasourceId: ds?.id,
      name: ds?.name,
      description: ds?.description,
      connector: ds?.connector,
      format: ds?.format,
      refreshInterval: ds?.refresh_interval,
      disabled: ds?.disabled,
      isDynamic: ds?.is_dynamic,
      createdBy: ds?.created_by,
      dateCreated: ds?.date_created,
      dateLastRefresh: ds?.date_last_refresh
    };

    if (ctx.input.includeProperties) {
      let properties = await client.getDatasourceProperties(ctx.input.datasourceId);
      output.properties = properties;
    }

    if (ctx.input.includeShareRights) {
      let shareRights = await client.getDatasourceShareRights(ctx.input.datasourceId);
      output.shareRights = shareRights;
    }

    return {
      output,
      message: `Retrieved data source **${ds?.name || ctx.input.datasourceId}** (connector: ${ds?.connector || 'unknown'}).`
    };
  })
  .build();
