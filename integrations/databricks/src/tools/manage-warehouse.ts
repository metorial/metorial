import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageWarehouse = SlateTool.create(spec, {
  name: 'Manage SQL Warehouse',
  key: 'manage_warehouse',
  description: `Create, start, stop, or delete a SQL warehouse. SQL warehouses are compute resources for running SQL queries in Databricks SQL.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'start', 'stop', 'delete']).describe('Action to perform'),
      warehouseId: z
        .string()
        .optional()
        .describe('Warehouse ID (required for start/stop/delete)'),
      name: z.string().optional().describe('Warehouse name (required for create)'),
      clusterSize: z
        .string()
        .optional()
        .describe(
          'Cluster size, e.g., "2X-Small", "Small", "Medium", "Large" (required for create)'
        ),
      minNumClusters: z.number().optional().describe('Minimum number of clusters'),
      maxNumClusters: z.number().optional().describe('Maximum number of clusters'),
      autoStopMins: z.number().optional().describe('Minutes of inactivity before auto-stop'),
      warehouseType: z.enum(['CLASSIC', 'PRO']).optional().describe('Warehouse type'),
      enableServerlessCompute: z.boolean().optional().describe('Enable serverless compute')
    })
  )
  .output(
    z.object({
      warehouseId: z.string().describe('ID of the affected warehouse')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let { action, warehouseId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.clusterSize) {
        throw databricksServiceError('name and clusterSize are required for create');
      }
      let result = await client.createWarehouse({
        name: ctx.input.name,
        clusterSize: ctx.input.clusterSize,
        minNumClusters: ctx.input.minNumClusters,
        maxNumClusters: ctx.input.maxNumClusters,
        autoStopMins: ctx.input.autoStopMins,
        warehouseType: ctx.input.warehouseType,
        enableServerlessCompute: ctx.input.enableServerlessCompute
      });
      return {
        output: { warehouseId: result.id },
        message: `Created SQL warehouse **${ctx.input.name}** (${result.id}).`
      };
    }

    if (!warehouseId) throw databricksServiceError('warehouseId is required for this action');

    switch (action) {
      case 'start':
        await client.startWarehouse(warehouseId);
        return { output: { warehouseId }, message: `Started warehouse **${warehouseId}**.` };
      case 'stop':
        await client.stopWarehouse(warehouseId);
        return { output: { warehouseId }, message: `Stopped warehouse **${warehouseId}**.` };
      case 'delete':
        await client.deleteWarehouse(warehouseId);
        return { output: { warehouseId }, message: `Deleted warehouse **${warehouseId}**.` };
    }
  })
  .build();
