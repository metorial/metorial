import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageWarehouse = SlateTool.create(spec, {
  name: 'Manage Warehouse',
  key: 'manage_warehouse',
  description: `Create, update, delete, or manage source connections for data warehouses. Warehouses like BigQuery, Snowflake, and Redshift receive synced data from Segment sources.`,
  instructions: [
    'To create a warehouse, provide metadataId (from catalog) and optionally settings/name.',
    'To update, provide warehouseId and fields to change.',
    'To delete, set action to "delete" with warehouseId.',
    'To connect/disconnect a source, use "add_source" or "remove_source" with warehouseId and sourceId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_source', 'remove_source'])
        .describe('Operation to perform'),
      warehouseId: z
        .string()
        .optional()
        .describe('Warehouse ID (required for update/delete/add_source/remove_source)'),
      metadataId: z.string().optional().describe('Catalog metadata ID (required for create)'),
      name: z.string().optional().describe('Warehouse display name'),
      enabled: z.boolean().optional().describe('Whether the warehouse is enabled'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Warehouse-specific configuration settings'),
      sourceId: z.string().optional().describe('Source ID to connect/disconnect')
    })
  )
  .output(
    z.object({
      warehouseId: z.string().optional().describe('Warehouse ID'),
      warehouseName: z.string().optional().describe('Warehouse name'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      sourceConnected: z.boolean().optional().describe('Whether source was connected'),
      sourceDisconnected: z.boolean().optional().describe('Whether source was disconnected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'create') {
      if (!ctx.input.metadataId) {
        throw new Error('metadataId is required to create a warehouse');
      }
      let wh = await client.createWarehouse({
        metadataId: ctx.input.metadataId,
        name: ctx.input.name,
        enabled: ctx.input.enabled,
        settings: ctx.input.settings
      });
      return {
        output: {
          warehouseId: wh?.id,
          warehouseName: wh?.name,
          enabled: wh?.enabled
        },
        message: `Created warehouse **${wh?.name ?? ctx.input.metadataId}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.warehouseId) {
        throw new Error('warehouseId is required to update');
      }
      let wh = await client.updateWarehouse(ctx.input.warehouseId, {
        name: ctx.input.name,
        enabled: ctx.input.enabled,
        settings: ctx.input.settings
      });
      return {
        output: {
          warehouseId: wh?.id,
          warehouseName: wh?.name,
          enabled: wh?.enabled
        },
        message: `Updated warehouse **${wh?.name ?? ctx.input.warehouseId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.warehouseId) {
        throw new Error('warehouseId is required to delete');
      }
      await client.deleteWarehouse(ctx.input.warehouseId);
      return {
        output: { warehouseId: ctx.input.warehouseId, deleted: true },
        message: `Deleted warehouse **${ctx.input.warehouseId}**`
      };
    }

    if (ctx.input.action === 'add_source') {
      if (!ctx.input.warehouseId || !ctx.input.sourceId) {
        throw new Error('warehouseId and sourceId are required');
      }
      await client.addSourceToWarehouse(ctx.input.warehouseId, ctx.input.sourceId);
      return {
        output: { warehouseId: ctx.input.warehouseId, sourceConnected: true },
        message: `Connected source \`${ctx.input.sourceId}\` to warehouse **${ctx.input.warehouseId}**`
      };
    }

    if (ctx.input.action === 'remove_source') {
      if (!ctx.input.warehouseId || !ctx.input.sourceId) {
        throw new Error('warehouseId and sourceId are required');
      }
      await client.removeSourceFromWarehouse(ctx.input.warehouseId, ctx.input.sourceId);
      return {
        output: { warehouseId: ctx.input.warehouseId, sourceDisconnected: true },
        message: `Disconnected source \`${ctx.input.sourceId}\` from warehouse **${ctx.input.warehouseId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
