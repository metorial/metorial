import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let complianceRecordSchema = z
  .object({
    complianceId: z.string().optional().describe('Unique identifier'),
    siteId: z.string().optional().describe('Associated site ID'),
    auditId: z.string().optional().describe('Associated audit ID'),
    status: z.string().optional().describe('Compliance status'),
    score: z.number().optional().describe('Compliance score')
  })
  .passthrough();

export let getComplianceData = SlateTool.create(spec, {
  name: 'Get Compliance Data',
  key: 'get_compliance_data',
  description: `Retrieve compliance status data across audits and sites from 21RISK. Use this to analyze overall compliance posture, identify non-compliant areas, and track compliance trends over time.`,
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
      expand: z.string().optional().describe('Related entities to expand'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      complianceRecords: z
        .array(complianceRecordSchema)
        .describe('List of compliance records'),
      count: z.number().describe('Number of compliance records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let compliance = await client.getCompliance({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(compliance) ? compliance : [compliance];

    return {
      output: {
        complianceRecords: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** compliance record(s).`
    };
  })
  .build();
