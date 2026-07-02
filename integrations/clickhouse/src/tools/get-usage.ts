import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

let costEntrySchema = z.object({
  serviceId: z.string().optional(),
  dataWarehouseId: z.string().optional(),
  date: z.string().optional().describe('Date of the usage entry'),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  totalCHC: z.number().optional().describe('Total cost in CHC (ClickHouse Credits)'),
  storageCHC: z.number().optional(),
  computeCHC: z.number().optional(),
  backupCHC: z.number().optional(),
  dataTransferCHC: z.number().optional(),
  locked: z.boolean().optional().describe('Whether the cost entry is finalized')
});

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage & Costs',
  key: 'get_usage',
  description: `Retrieve usage and cost information for the organization over a date range. Covers Storage, Compute, Data Transfer, ClickPipes, and Backup costs. Maximum queryable range is 31 days.`,
  constraints: ['Maximum date range is 31 days.', 'Dates must be in ISO-8601 format.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date (ISO-8601 format, e.g., 2024-01-01)'),
      toDate: z.string().describe('End date (ISO-8601 format, e.g., 2024-01-31)'),
      filter: z
        .array(z.string())
        .optional()
        .describe('Tag-based filter strings (e.g., "tag:env=production")')
    })
  )
  .output(
    z.object({
      grandTotalCHC: z.number().optional().describe('Grand total cost in ClickHouse Credits'),
      costs: z.array(costEntrySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getUsageCost(
      ctx.input.fromDate,
      ctx.input.toDate,
      ctx.input.filter
    );

    let costs = Array.isArray(result?.costs) ? result.costs : [];

    return {
      output: {
        grandTotalCHC: result?.grandTotalCHC,
        costs: costs.map((c: any) => ({
          serviceId: c.serviceId,
          dataWarehouseId: c.dataWarehouseId,
          date: c.date,
          entityType: c.entityType,
          entityId: c.entityId,
          entityName: c.entityName,
          totalCHC: c.totalCHC,
          storageCHC: c.metrics?.storageCHC,
          computeCHC: c.metrics?.computeCHC,
          backupCHC: c.metrics?.backupCHC,
          dataTransferCHC: c.metrics?.dataTransferCHC,
          locked: c.locked
        }))
      },
      message: `Usage from ${ctx.input.fromDate} to ${ctx.input.toDate}: **${result?.grandTotalCHC ?? 'N/A'}** CHC total across **${costs.length}** entries.`
    };
  })
  .build();
