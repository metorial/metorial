import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeReport } from '../lib/helpers';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List reports within a Mode workspace. You can filter reports by collection or data source. Supports ordering and filtering by creation or update timestamps.`,
  instructions: [
    'Provide either a collectionToken or a dataSourceToken to scope the results.'
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
          'Filter expression using created_at or updated_at with gt/lt operators, e.g. "updated_at.gt:2024-01-01"'
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
        .describe('List of reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let options = {
      filter: ctx.input.filter,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy,
      page: ctx.input.page
    };

    let data: any;
    if (ctx.input.dataSourceToken) {
      data = await client.listReportsByDataSource(ctx.input.dataSourceToken, options);
    } else if (ctx.input.collectionToken) {
      data = await client.listReportsInCollection(ctx.input.collectionToken, options);
    } else {
      ctx.warn(
        'No collectionToken or dataSourceToken provided. Listing reports from all collections.'
      );
      data = await client.listCollections({ filter: 'all' });
      let collections = getEmbedded(data, 'spaces');
      let allReports: any[] = [];
      for (let collection of collections.slice(0, 10)) {
        let collData = await client.listReportsInCollection(collection.token, options);
        let reports = getEmbedded(collData, 'reports');
        allReports.push(...reports);
      }
      let reports = allReports.map(normalizeReport);
      return {
        output: { reports },
        message: `Found **${reports.length}** reports across collections.`
      };
    }

    let reports = getEmbedded(data, 'reports').map(normalizeReport);

    return {
      output: { reports },
      message: `Found **${reports.length}** reports.`
    };
  })
  .build();
