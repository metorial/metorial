import { Buffer } from 'node:buffer';
import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let getSegmentVisitorExport = SlateTool.create(spec, {
  name: 'Get Segment Visitor Export',
  key: 'get_segment_visitor_export',
  description: `Check the status of a Pendo segment visitor export job or retrieve completed CSV export results as a Slate attachment.`,
  instructions: [
    'Use action "status" before "results" unless you already know the export job is complete.',
    'Results are currently retrieved as CSV and returned as an attachment.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['status', 'results'])
        .describe('Whether to check export status or retrieve CSV results'),
      segmentId: z.string().describe('The segment ID for the export job'),
      jobId: z.string().describe('The export job ID returned by Start Segment Visitor Export')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      segmentId: z.string().describe('Segment ID'),
      jobId: z.string().describe('Export job ID'),
      status: z.any().optional().describe('Raw status payload for status checks'),
      contentType: z.string().optional().describe('Attachment MIME type for results'),
      byteLength: z.number().optional().describe('CSV attachment byte length'),
      attachmentCount: z.number().optional().describe('Number of returned attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    if (ctx.input.action === 'status') {
      let status = await client.getSegmentVisitorExportStatus(
        ctx.input.segmentId,
        ctx.input.jobId
      );

      return {
        output: {
          action: ctx.input.action,
          segmentId: ctx.input.segmentId,
          jobId: ctx.input.jobId,
          status
        },
        message: `Retrieved visitor export status for Pendo segment **${ctx.input.segmentId}**.`
      };
    }

    let content = await client.getSegmentVisitorExportResults(
      ctx.input.segmentId,
      ctx.input.jobId
    );

    return {
      output: {
        action: ctx.input.action,
        segmentId: ctx.input.segmentId,
        jobId: ctx.input.jobId,
        contentType: 'text/csv',
        byteLength: Buffer.byteLength(content, 'utf8'),
        attachmentCount: 1
      },
      attachments: [createTextAttachment(content, 'text/csv')],
      message: `Retrieved visitor export results for Pendo segment **${ctx.input.segmentId}** as a CSV attachment.`
    };
  })
  .build();
