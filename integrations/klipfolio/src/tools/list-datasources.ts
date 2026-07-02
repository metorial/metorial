import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatasources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_datasources',
  description: `List data sources in your Klipfolio account. Filter by client and optionally include full details. Returns data source names, connectors, refresh intervals, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter data sources by client ID'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include full details (properties, share rights)'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      datasources: z.array(
        z.object({
          datasourceId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          connector: z.string().optional(),
          format: z.string().optional(),
          refreshInterval: z.number().optional(),
          disabled: z.boolean().optional(),
          dateCreated: z.string().optional(),
          dateLastRefresh: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDatasources({
      clientId: ctx.input.clientId,
      full: ctx.input.includeDetails,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let datasources = (result?.data || []).map((ds: any) => ({
      datasourceId: ds.id,
      name: ds.name,
      description: ds.description,
      connector: ds.connector,
      format: ds.format,
      refreshInterval: ds.refresh_interval,
      disabled: ds.disabled,
      dateCreated: ds.date_created,
      dateLastRefresh: ds.date_last_refresh
    }));

    return {
      output: {
        datasources,
        total: result?.meta?.total
      },
      message: `Found **${datasources.length}** data source(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
