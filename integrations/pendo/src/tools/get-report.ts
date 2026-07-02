import { Buffer } from 'node:buffer';
import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve results from a Pendo visitor or account report by report ID. JSON results are returned inline; CSV results are returned as a Slate attachment.`,
  constraints: [
    'Only Visitor and Account report types are supported.',
    'Paths, funnels, workflows, retention, and Data Explorer reports cannot be retrieved via the API.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.string().describe('The report ID to retrieve results for'),
      format: z
        .enum(['json', 'csv'])
        .optional()
        .describe('Report result format. CSV results are returned as an attachment.')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('The report ID'),
      format: z.string().describe('Report result format'),
      results: z.any().optional().describe('Report result data when format is json'),
      contentType: z.string().optional().describe('Attachment MIME type when format is csv'),
      byteLength: z.number().optional().describe('CSV attachment byte length'),
      attachmentCount: z.number().optional().describe('Number of returned attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let format = ctx.input.format ?? 'json';

    let results = await client.getReport(ctx.input.reportId, format);

    if (format === 'csv') {
      let content = typeof results === 'string' ? results : String(results ?? '');
      return {
        output: {
          reportId: ctx.input.reportId,
          format,
          contentType: 'text/csv',
          byteLength: Buffer.byteLength(content, 'utf8'),
          attachmentCount: 1
        },
        attachments: [createTextAttachment(content, 'text/csv')],
        message: `Retrieved CSV results for report **${ctx.input.reportId}** as an attachment.`
      };
    }

    return {
      output: {
        reportId: ctx.input.reportId,
        format,
        results
      },
      message: `Retrieved results for report **${ctx.input.reportId}**.`
    };
  })
  .build();
