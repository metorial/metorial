import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let listWaiversByDate = SlateTool.create(spec, {
  name: 'List Waivers by Date',
  key: 'list_waivers_by_date',
  description: `Retrieve waivers signed within a date range with pagination. Optionally include custom column data and consolidate participant rows. Supports paginated results up to 500 records per page.`,
  instructions: ['Dates should be in ISO 8601 / UTC format.', 'Maximum page size is 500.'],
  constraints: ['Page size cannot exceed 500 records.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start of the date range (UTC, ISO 8601)'),
      endDate: z.string().describe('End of the date range (UTC, ISO 8601)'),
      includeCustomColumns: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include custom column/field data in results'),
      consolidateParticipants: z
        .boolean()
        .optional()
        .default(false)
        .describe('Consolidate multiple participant rows into single waiver entries'),
      pageIndex: z.number().optional().default(0).describe('Zero-based page index'),
      pageSize: z
        .number()
        .optional()
        .default(100)
        .describe('Number of records per page (max 500)')
    })
  )
  .output(
    z.object({
      waivers: z.any().describe('Array of waiver data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let pageSize = Math.min(ctx.input.pageSize, 500);

    let waivers = await client.getWaiverData({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      includeCustomColumns: ctx.input.includeCustomColumns,
      consolidateParticipants: ctx.input.consolidateParticipants,
      pageIndex: ctx.input.pageIndex,
      pageSize
    });

    let results = Array.isArray(waivers) ? waivers : [waivers];

    return {
      output: { waivers: results },
      message: `Retrieved **${results.length}** waiver(s) for page ${ctx.input.pageIndex} (${ctx.input.startDate} to ${ctx.input.endDate}).`
    };
  })
  .build();
