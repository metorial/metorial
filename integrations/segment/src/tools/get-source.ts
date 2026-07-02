import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieve detailed information about a specific source, including its connected destinations and warehouses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source to retrieve'),
      includeConnections: z
        .boolean()
        .optional()
        .describe('Also fetch connected destinations and warehouses')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source ID'),
      sourceName: z.string().optional().describe('Display name'),
      sourceSlug: z.string().optional().describe('URL-friendly slug'),
      enabled: z.boolean().optional().describe('Whether the source is enabled'),
      writeKeys: z.array(z.string()).optional().describe('Write keys'),
      metadataId: z.string().optional().describe('Catalog metadata ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      connectedDestinations: z
        .array(
          z.object({
            destinationId: z.string().describe('Destination ID'),
            destinationName: z.string().optional().describe('Destination name'),
            enabled: z.boolean().optional().describe('Whether enabled')
          })
        )
        .optional()
        .describe('Connected destinations'),
      connectedWarehouses: z
        .array(
          z.object({
            warehouseId: z.string().describe('Warehouse ID'),
            warehouseName: z.string().optional().describe('Warehouse name'),
            enabled: z.boolean().optional().describe('Whether enabled')
          })
        )
        .optional()
        .describe('Connected warehouses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);
    let source = await client.getSource(ctx.input.sourceId);

    let connectedDestinations:
      | Array<{ destinationId: string; destinationName?: string; enabled?: boolean }>
      | undefined;
    let connectedWarehouses:
      | Array<{ warehouseId: string; warehouseName?: string; enabled?: boolean }>
      | undefined;

    if (ctx.input.includeConnections) {
      let [destResult, whResult] = await Promise.all([
        client.listConnectedDestinationsFromSource(ctx.input.sourceId),
        client.listConnectedWarehousesFromSource(ctx.input.sourceId)
      ]);

      connectedDestinations = (destResult?.destinations ?? []).map((d: any) => ({
        destinationId: d.id,
        destinationName: d.name,
        enabled: d.enabled
      }));

      connectedWarehouses = (whResult?.warehouses ?? []).map((w: any) => ({
        warehouseId: w.id,
        warehouseName: w.name,
        enabled: w.enabled
      }));
    }

    return {
      output: {
        sourceId: source?.id ?? ctx.input.sourceId,
        sourceName: source?.name,
        sourceSlug: source?.slug,
        enabled: source?.enabled,
        writeKeys: source?.writeKeys ?? [],
        metadataId: source?.metadata?.id,
        createdAt: source?.createdAt,
        connectedDestinations,
        connectedWarehouses
      },
      message: `Source **${source?.name ?? ctx.input.sourceId}** (${source?.enabled ? 'enabled' : 'disabled'})`
    };
  })
  .build();
