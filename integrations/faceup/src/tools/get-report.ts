import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaceUpClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve detailed information about a specific whistleblower report by its ID. Returns case metadata including status, origin, priority, source channel, and creation timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.string().describe('Unique identifier of the report to retrieve')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Unique identifier for the report'),
      tag: z.string().describe('Reference tag/code for the report'),
      origin: z.string().describe('Origin of the report (e.g., "Member")'),
      justification: z.string().describe('Justification classification'),
      priority: z.string().nullable().describe('Priority level of the report'),
      status: z.string().describe('Current status of the report (e.g., "Open", "Closed")'),
      source: z.string().describe('Reporting channel used (e.g., "ReportingSystem")'),
      createdAt: z.string().describe('ISO 8601 timestamp of when the report was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaceUpClient({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let report = await client.getReport(ctx.input.reportId);

    return {
      output: report,
      message: `Retrieved report **${report.tag}** (status: ${report.status}).`
    };
  })
  .build();
