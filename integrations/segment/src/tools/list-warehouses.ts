import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let listWarehouses = SlateTool.create(spec, {
  name: 'List Warehouses',
  key: 'list_warehouses',
  description: `List all data warehouses in the workspace, optionally with connected sources and connection state for a specific warehouse.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      warehouseId: z
        .string()
        .optional()
        .describe(
          'If provided, retrieves detailed info for this warehouse including connected sources and connection state'
        ),
      count: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      warehouses: z
        .array(
          z.object({
            warehouseId: z.string().describe('Warehouse ID'),
            warehouseName: z.string().optional().describe('Name'),
            enabled: z.boolean().optional().describe('Whether enabled'),
            metadataId: z.string().optional().describe('Catalog metadata ID')
          })
        )
        .describe('List of warehouses'),
      connectedSources: z
        .array(
          z.object({
            sourceId: z.string().describe('Source ID'),
            sourceName: z.string().optional().describe('Source name')
          })
        )
        .optional()
        .describe('Connected sources (when querying a specific warehouse)'),
      connectionState: z
        .string()
        .optional()
        .describe('Connection state (when querying a specific warehouse)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.warehouseId) {
      let [wh, sourcesResult, stateResult] = await Promise.all([
        client.getWarehouse(ctx.input.warehouseId),
        client.listConnectedSourcesFromWarehouse(ctx.input.warehouseId),
        client.getWarehouseConnectionState(ctx.input.warehouseId).catch(() => null)
      ]);

      let connectedSources = (sourcesResult?.sources ?? []).map((s: any) => ({
        sourceId: s.id,
        sourceName: s.name
      }));

      return {
        output: {
          warehouses: [
            {
              warehouseId: wh?.id,
              warehouseName: wh?.name,
              enabled: wh?.enabled,
              metadataId: wh?.metadata?.id
            }
          ],
          connectedSources,
          connectionState: stateResult?.connectionState
        },
        message: `Warehouse **${wh?.name}** with ${connectedSources.length} connected sources`
      };
    }

    let result = await client.listWarehouses({ count: ctx.input.count });
    let warehouses = (result?.warehouses ?? []).map((w: any) => ({
      warehouseId: w.id,
      warehouseName: w.name,
      enabled: w.enabled,
      metadataId: w.metadata?.id
    }));

    return {
      output: { warehouses },
      message: `Found **${warehouses.length}** warehouses`
    };
  })
  .build();
