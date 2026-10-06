import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeReport, pagination, paginationSchema } from '../lib/helpers';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List reports within a Mode workspace. You can filter reports by collection or data source. Supports ordering and filtering by creation or update timestamps.`,
  instructions: [
    'Use at most one collectionToken or dataSourceToken. Omit both to list workspace reports. An explicit page returns one page; otherwise all pages are read.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionToken: z
        .string()
        .optional()
        .describe('Token of the collection to list reports from'),
      dataSourceToken: z
        .string()
        .optional()
        .describe('Token of the data source to list reports for'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter expression using created_at or updated_at with gt/lt operators, e.g. "updated_at.gt.2024-01-01T00:00:00Z"'
        ),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      orderBy: z.enum(['created_at', 'updated_at']).optional().describe('Field to order by'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportToken: z.string(),
            name: z.string(),
            description: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            archived: z.boolean(),
            spaceToken: z.string(),
            lastRunAt: z.string()
          })
        )
        .describe('List of reports'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    let options = {
      filter: ctx.input.filter,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy,
      page: ctx.input.page
    };

    if (ctx.input.collectionToken !== undefined && ctx.input.dataSourceToken !== undefined)
      throw createApiServiceError('Choose only one collectionToken or dataSourceToken.');
    const data =
      ctx.input.dataSourceToken !== undefined
        ? await client.listReportsByDataSource(ctx.input.dataSourceToken, options)
        : ctx.input.collectionToken !== undefined
          ? await client.listReportsInCollection(ctx.input.collectionToken, options)
          : await client.listWorkspaceReports(options);

    let reports = getEmbedded(data, 'reports').map(normalizeReport);

    return {
      output: { reports, pagination: pagination(data) },
      message: `Found **${reports.length}** reports.`
    };
  })
  .build();
