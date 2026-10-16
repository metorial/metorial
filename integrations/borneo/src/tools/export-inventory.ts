import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachDownload, listMetadata, readList, readTotal, redact } from '../lib/responses';
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
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      accountId: z.string().optional().describe('Filter by cloud account ID'),
      region: z.string().optional().describe('Filter by region'),
      resourceType: z.string().optional().describe('Filter by resource type'),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy tag strings are not accepted by the provider. Use resourceTags instead.'
        ),
      resourceTags: z
        .array(z.object({ source: z.string(), tagKey: z.string(), tagValue: z.string() }))
        .optional()
        .describe('Provider resource tag filters, including their source, key, and value.'),
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
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe('Zero-based page number; prefer nextToken for efficient paging.'),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.exportInventoryResources({
      page: ctx.input.page,
      nextToken: ctx.input.nextToken,
      size: ctx.input.size,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      accountId: ctx.input.accountId,
      region: ctx.input.region,
      resourceType: ctx.input.resourceType,
      tags: ctx.input.tags,
      resourceTags: ctx.input.resourceTags,
      fields: ctx.input.fields,
      includeViolationMetrics: ctx.input.includeViolationMetrics,
      includeFrameworkExceptionCounts: ctx.input.includeFrameworkExceptionCounts
    });

    await attachDownload(
      file => ctx.addAttachment(file),
      result.file.url,
      ctx.auth.token,
      ctx.auth.baseUrl ?? ctx.config.baseUrl
    );
    let data = result.rows;
    let resources = readList(data, 'resources');
    let totalCount = readTotal(data, 'count');

    return {
      output: {
        resources,
        totalCount,
        ...listMetadata(data),
        exportResult: redact(result.file, ctx.auth.token)
      },
      message: `Exported **${resources.length}** inventory resource(s)${totalCount !== undefined && totalCount > resources.length ? ` out of **${totalCount}** total` : ''}.`
    };
  })
  .build();
