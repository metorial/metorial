import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReportData = SlateTool.create(spec, {
  name: 'Get Report Data',
  key: 'get_report_data',
  description: `Query analytics report data for messages, meetings, or sequences. Supports grouping by sender, recipient, domain, template, time, and more. Use the query parameter with Mixmax search syntax like \`sent:last30days from:everyone\`.`,
  instructions: [
    'For messages: groupBy options include "sender" (default), "recipient", "message", "customerDomain", "emailsByDomain", "delegator", "senderGroup", "time", "template".',
    'For meetings: groupBy options include "groupmember" (default), "teammate", "group".',
    'Fields for messages include: "delivered", "opened", "clicked", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['messages', 'meetings', 'sequences']).describe('Report type'),
      groupBy: z
        .string()
        .optional()
        .describe('How to group results (e.g., "sender", "recipient", "time", "template")'),
      query: z
        .string()
        .optional()
        .describe('Search query (e.g., "sent:last30days from:everyone")'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated fields to include (e.g., "delivered,opened")'),
      limit: z.number().optional().describe('Maximum number of results (default: 1000)'),
      offset: z.number().optional().describe('Pagination offset'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDesc: z.boolean().optional().describe('Sort descending'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for date calculations (e.g., "America/Los_Angeles")')
    })
  )
  .output(
    z.object({
      buckets: z.array(z.any()).describe('Report data buckets/rows'),
      totals: z.any().optional().describe('Aggregate totals'),
      dateRange: z.any().optional().describe('Date range of the report'),
      hasNext: z.boolean().optional().describe('Whether more results exist'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getReportData({
      type: ctx.input.type,
      groupBy: ctx.input.groupBy,
      query: ctx.input.query,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortDesc: ctx.input.sortDesc,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        buckets: data.buckets || [],
        totals: data.totals,
        dateRange: data.extra?.dateRange,
        hasNext: data.extra?.hasNext,
        total: data.extra?.total
      },
      message: `Report generated with ${(data.buckets || []).length} bucket(s).`
    };
  })
  .build();
