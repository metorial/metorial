import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaceUpClient } from '../lib/client';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List whistleblower reports submitted through FaceUp. Returns report metadata including status, origin, priority, and source channel. Supports pagination for retrieving large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of reports to retrieve per page'),
      after: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination; pass the endCursor from a previous response to get the next page'
        )
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.string().describe('Unique identifier for the report'),
            tag: z.string().describe('Reference tag/code for the report'),
            origin: z.string().describe('Origin of the report (e.g., "Member")'),
            justification: z.string().describe('Justification classification'),
            priority: z.string().nullable().describe('Priority level of the report'),
            status: z
              .string()
              .describe('Current status of the report (e.g., "Open", "Closed")'),
            source: z.string().describe('Reporting channel used (e.g., "ReportingSystem")'),
            createdAt: z.string().describe('ISO 8601 timestamp of when the report was created')
          })
        )
        .describe('List of reports'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor to use for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaceUpClient({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let result = await client.getReports(ctx.input.first, ctx.input.after);

    let reportCount = result.reports.length;
    let paginationNote = result.hasNextPage ? ' More results available.' : '';

    return {
      output: result,
      message: `Retrieved **${reportCount}** report(s).${paginationNote}`
    };
  })
  .build();
