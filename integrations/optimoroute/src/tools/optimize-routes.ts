import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let optimizeRoutes = SlateTool.create(spec, {
  name: 'Optimize Routes',
  key: 'optimize_routes',
  description: `Start the route optimization engine for a given date or date range. Configurable options include route balancing, start mode, depot trips, clustering, and selective planning with specific orders/drivers. Planning runs asynchronously; the returned **planningId** can be used to check status or stop planning.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Planning date (YYYY-MM-DD)'),
      dateRange: z
        .object({
          from: z.string(),
          to: z.string()
        })
        .optional()
        .describe('Date range for weekly planning'),
      balancing: z
        .enum(['OFF', 'ON', 'ON_FORCE'])
        .optional()
        .describe('OFF=no balancing, ON=balanced, ON_FORCE=force use all drivers'),
      balanceBy: z
        .enum(['WT', 'NUM'])
        .optional()
        .describe('WT=balance by working time, NUM=balance by number of orders'),
      balancingFactor: z.number().optional().describe('Balancing factor (0-100)'),
      startWith: z
        .enum(['EMPTY', 'CURRENT'])
        .optional()
        .describe('EMPTY=plan from scratch, CURRENT=build on existing routes'),
      lockType: z
        .enum(['NONE', 'ROUTES', 'RESOURCES'])
        .optional()
        .describe('Lock existing routes or driver assignments'),
      depotTrips: z
        .boolean()
        .optional()
        .describe('Allow drivers to return to depot for reloading'),
      clustering: z.boolean().optional().describe('Minimize overlap between driver routes'),
      useOrders: z.array(z.string()).optional().describe('Subset of order numbers to include'),
      useDrivers: z
        .array(
          z.object({
            serial: z.string().optional(),
            externalId: z.string().optional()
          })
        )
        .optional()
        .describe('Subset of drivers to include')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      planningId: z.string().optional().describe('ID to check status or stop planning'),
      missingOrders: z.array(z.string()).optional().describe('Orders that could not be found'),
      missingDrivers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Drivers that could not be found'),
      ordersWithInvalidLocation: z
        .array(z.string())
        .optional()
        .describe('Orders with invalid locations'),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      date: ctx.input.date
    };

    if (ctx.input.dateRange) body.dateRange = ctx.input.dateRange;
    if (ctx.input.balancing) body.balancing = ctx.input.balancing;
    if (ctx.input.balanceBy) body.balanceBy = ctx.input.balanceBy;
    if (ctx.input.balancingFactor !== undefined)
      body.balancingFactor = ctx.input.balancingFactor;
    if (ctx.input.startWith) body.startWith = ctx.input.startWith;
    if (ctx.input.lockType) body.lockType = ctx.input.lockType;
    if (ctx.input.depotTrips !== undefined) body.depotTrips = ctx.input.depotTrips;
    if (ctx.input.clustering !== undefined) body.clustering = ctx.input.clustering;
    if (ctx.input.useOrders) body.useOrders = ctx.input.useOrders;
    if (ctx.input.useDrivers) body.useDrivers = ctx.input.useDrivers;

    let result = await client.startPlanning(body);

    return {
      output: {
        success: result.success,
        planningId: result.planningId,
        missingOrders: result.missingOrders,
        missingDrivers: result.missingDrivers,
        ordersWithInvalidLocation: result.ordersWithInvalidLocation,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Route optimization started for **${ctx.input.date}**. Planning ID: \`${result.planningId}\``
        : `Failed to start planning: ${result.message || result.code}`
    };
  })
  .build();
