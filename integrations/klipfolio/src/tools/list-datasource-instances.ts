import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export const listDatasourceInstances = SlateTool.create(spec, {
  key: 'list_datasource_instances',
  name: 'List Data Source Instances',
  description:
    'Discover stored data source instances and their refresh status. Dynamic data sources can have multiple instances; use instance IDs to download or refresh their content.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter by client account ID'),
      datasourceId: z.string().optional().describe('Filter by data source ID'),
      limit: z.number().optional().describe('Page size: an integer from 1 to 100; default 25'),
      offset: z.number().optional().describe('Zero-based page offset; default 0')
    })
  )
  .output(
    z.object({
      instances: z.array(
        z.object({
          instanceId: z.string(),
          datasourceId: z.string().optional(),
          datasourceName: z.string().optional(),
          refreshFailCount: z.number().optional(),
          dataSize: z.number().optional(),
          dateLastRefresh: z.string().optional()
        })
      ),
      total: z.number().optional(),
      nextOffset: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const result = await new Client({ token: ctx.auth.token }).listDatasourceInstances(
      ctx.input
    );
    const instances = result.data.map((item: any) => ({
      instanceId: item.id,
      datasourceId: item.datasource_id,
      datasourceName: item.datasource_name,
      refreshFailCount: item.refresh_fail_count,
      dataSize: item.data_size,
      dateLastRefresh: item.date_last_refresh
    }));
    const offset = ctx.input.offset ?? 0;
    const hasMore =
      result.data.length > 0 &&
      (typeof result.meta?.total === 'number'
        ? offset + instances.length < result.meta.total
        : instances.length === (ctx.input.limit ?? 25));
    return {
      output: {
        instances,
        total: result.meta?.total,
        hasMore,
        nextOffset: hasMore ? offset + instances.length : undefined
      },
      message: `Found ${instances.length} data source instance(s).`
    };
  })
  .build();
