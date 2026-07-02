import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let auditSchema = z
  .object({
    auditId: z.string().optional().describe('Unique identifier of the audit'),
    name: z.string().optional().describe('Name or title of the audit'),
    siteId: z.string().optional().describe('ID of the site where the audit was performed'),
    status: z.string().optional().describe('Current status of the audit'),
    createdDate: z.string().optional().describe('Date the audit was created'),
    completedDate: z.string().optional().describe('Date the audit was completed')
  })
  .passthrough();

export let listAudits = SlateTool.create(spec, {
  name: 'List Audits',
  key: 'list_audits',
  description: `Retrieve audits and reports from 21RISK, including daily, weekly, and one-time inspections. Results include checklist responses and compliance status. Use OData filters to narrow by site, date range, or status.`,
  instructions: [
    'Use the $filter parameter to query by date range, e.g., "CreatedDate gt 2024-01-01T00:00:00Z"',
    'Use $expand to include related entities like categories or responses'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "SiteId eq 123")'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z
        .string()
        .optional()
        .describe('Related entities to expand (e.g., "Categories,Responses")'),
      orderby: z.string().optional().describe('Sort order (e.g., "CreatedDate desc")'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      audits: z.array(auditSchema).describe('List of audits'),
      count: z.number().describe('Number of audits returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let audits = await client.getAudits({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(audits) ? audits : [audits];

    return {
      output: {
        audits: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** audit(s).`
    };
  })
  .build();
