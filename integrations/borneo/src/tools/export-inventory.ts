import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportInventory = SlateTool.create(spec, {
  name: 'Export Inventory Resources',
  key: 'export_inventory',
  description: `Export filtered and sorted lists of inventory resources. Supports field selection, sorting, and filtering by account, region, resource type, and tags. Optionally include violation metrics and framework exception counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().optional().describe('Filter by cloud account ID'),
      region: z.string().optional().describe('Filter by region'),
      resourceType: z.string().optional().describe('Filter by resource type'),
      tags: z.array(z.string()).optional().describe('Filter by resource tags'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to include in the export'),
      includeViolationMetrics: z
        .boolean()
        .optional()
        .describe('Include violation metrics in the export'),
      includeFrameworkExceptionCounts: z
        .boolean()
        .optional()
        .describe('Include framework exception counts'),
      page: z.number().optional().describe('Page number'),
      size: z.number().optional().describe('Page size'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        resources: z.array(z.any()).describe('List of exported inventory resources'),
        totalCount: z
          .number()
          .optional()
          .describe('Total number of resources matching the filter')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.exportInventoryResources({
      page: ctx.input.page,
      size: ctx.input.size,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      accountId: ctx.input.accountId,
      region: ctx.input.region,
      resourceType: ctx.input.resourceType,
      tags: ctx.input.tags,
      fields: ctx.input.fields,
      includeViolationMetrics: ctx.input.includeViolationMetrics,
      includeFrameworkExceptionCounts: ctx.input.includeFrameworkExceptionCounts
    });

    let data = result?.data ?? result;
    let resources = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
    let totalCount = data?.totalElements ?? data?.total ?? resources.length;

    return {
      output: { resources, totalCount },
      message: `Exported **${resources.length}** inventory resource(s)${totalCount > resources.length ? ` out of **${totalCount}** total` : ''}.`
    };
  })
  .build();
