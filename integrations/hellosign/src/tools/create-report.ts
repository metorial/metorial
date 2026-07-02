import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reportTypeSchema = z.enum(['user_activity', 'document_status']);

export let createReport = SlateTool.create(spec, {
  name: 'Create Report',
  key: 'create_report',
  description: `Request Dropbox Sign activity and document-status reports for a date range. Dropbox Sign generates the CSV asynchronously and emails download links to the account.`,
  instructions: [
    'Use MM/DD/YYYY dates.',
    'The date range can be up to 12 months.',
    'Dropbox Sign emails the generated CSV report links when processing completes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Inclusive start date in MM/DD/YYYY format'),
      endDate: z.string().describe('Inclusive end date in MM/DD/YYYY format'),
      reportTypes: z
        .array(reportTypeSchema)
        .min(1)
        .describe('Report types to generate: user_activity and/or document_status')
    })
  )
  .output(
    z.object({
      successMessage: z.string().optional().describe('Dropbox Sign processing message'),
      startDate: z.string().describe('Report start date'),
      endDate: z.string().describe('Report end date'),
      reportTypes: z.array(reportTypeSchema).describe('Requested report types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.createReport(
      ctx.input.startDate,
      ctx.input.endDate,
      ctx.input.reportTypes
    );

    let reportTypes = result.report_type || ctx.input.reportTypes;

    return {
      output: {
        successMessage: result.success,
        startDate: result.start_date || ctx.input.startDate,
        endDate: result.end_date || ctx.input.endDate,
        reportTypes
      },
      message: `Dropbox Sign report request accepted for ${reportTypes.join(', ')}.`
    };
  })
  .build();
