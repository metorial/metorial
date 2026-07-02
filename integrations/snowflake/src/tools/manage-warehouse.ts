import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageWarehouse = SlateTool.create(spec, {
  name: 'Manage Warehouse',
  key: 'manage_warehouse',
  description: `Create, retrieve, list, delete, resume, suspend, or abort queries on Snowflake virtual warehouses. Warehouses provide the compute resources for executing queries. Use the **action** field to control the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'resume', 'suspend', 'abort'])
        .describe('Operation to perform'),
      warehouseName: z
        .string()
        .optional()
        .describe('Warehouse name (required for all actions except list)'),
      like: z
        .string()
        .optional()
        .describe('SQL LIKE pattern to filter warehouses when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of warehouses to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior for create action'),
      warehouseSize: z
        .enum([
          'XSMALL',
          'SMALL',
          'MEDIUM',
          'LARGE',
          'XLARGE',
          'XXLARGE',
          'XXXLARGE',
          'X4LARGE',
          'X5LARGE',
          'X6LARGE'
        ])
        .optional()
        .describe('Warehouse size for create action'),
      autoSuspend: z
        .number()
        .optional()
        .describe('Seconds of inactivity before auto-suspend (0 to disable)'),
      autoResume: z
        .boolean()
        .optional()
        .describe('Whether to automatically resume the warehouse when a query is submitted'),
      minClusterCount: z
        .number()
        .optional()
        .describe('Minimum cluster count for multi-cluster warehouses'),
      maxClusterCount: z
        .number()
        .optional()
        .describe('Maximum cluster count for multi-cluster warehouses'),
      comment: z.string().optional().describe('Warehouse comment'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the warehouse does not exist')
    })
  )
  .output(
    z.object({
      warehouses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of warehouses (for list action)'),
      warehouse: z
        .record(z.string(), z.any())
        .optional()
        .describe('Warehouse details (for get/create actions)'),
      deleted: z.boolean().optional().describe('Whether the warehouse was deleted'),
      resumed: z.boolean().optional().describe('Whether the warehouse was resumed'),
      suspended: z.boolean().optional().describe('Whether the warehouse was suspended'),
      aborted: z.boolean().optional().describe('Whether running queries were aborted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, warehouseName } = ctx.input;

    if (action === 'list') {
      let warehouses = await client.listWarehouses({
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { warehouses },
        message: `Found **${warehouses.length}** warehouse(s)`
      };
    }

    if (!warehouseName) {
      throw new Error(
        'warehouseName is required for get, create, delete, resume, suspend, and abort actions'
      );
    }

    if (action === 'get') {
      let warehouse = await client.getWarehouse(warehouseName);
      return {
        output: { warehouse },
        message: `Retrieved warehouse **${warehouseName}**`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = { name: warehouseName };
      if (ctx.input.warehouseSize) body.warehouse_size = ctx.input.warehouseSize;
      if (ctx.input.autoSuspend !== undefined) body.auto_suspend = ctx.input.autoSuspend;
      if (ctx.input.autoResume !== undefined) body.auto_resume = ctx.input.autoResume;
      if (ctx.input.minClusterCount !== undefined)
        body.min_cluster_count = ctx.input.minClusterCount;
      if (ctx.input.maxClusterCount !== undefined)
        body.max_cluster_count = ctx.input.maxClusterCount;
      if (ctx.input.comment) body.comment = ctx.input.comment;

      let warehouse = await client.createWarehouse(body, ctx.input.createMode);
      return {
        output: { warehouse },
        message: `Created warehouse **${warehouseName}** (size: ${ctx.input.warehouseSize || 'default'})`
      };
    }

    if (action === 'delete') {
      await client.deleteWarehouse(warehouseName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted warehouse **${warehouseName}**`
      };
    }

    if (action === 'resume') {
      await client.resumeWarehouse(warehouseName);
      return {
        output: { resumed: true },
        message: `Resumed warehouse **${warehouseName}**`
      };
    }

    if (action === 'suspend') {
      await client.suspendWarehouse(warehouseName);
      return {
        output: { suspended: true },
        message: `Suspended warehouse **${warehouseName}**`
      };
    }

    if (action === 'abort') {
      await client.abortWarehouseQueries(warehouseName);
      return {
        output: { aborted: true },
        message: `Aborted all queries on warehouse **${warehouseName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
