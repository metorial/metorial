import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { spec } from '../spec';

export const downloadResults = SlateTool.create(spec, {
  name: 'Download Results',
  key: 'download_results',
  description:
    'Download an existing successful report run as CSV, JSON or PDF. CSV and JSON can also export a single query run. This reads existing results and does not execute SQL or start a report.',
  instructions: [
    'Use get_report_run to confirm success and discover query-run tokens. PDF applies to the whole report. Only export data you are authorized to download.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      reportToken: z.string().describe('Report token'),
      runToken: z.string().describe('Successful report-run token'),
      format: z.enum(['csv', 'json', 'pdf']).describe('File format'),
      queryRunToken: z
        .string()
        .optional()
        .describe('Single query-run token for CSV/JSON; omit for whole-report results')
    })
  )
  .output(
    z.object({
      reportToken: z.string(),
      runToken: z.string(),
      queryRunToken: z.string().optional(),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      runState: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const file = await ModeClient.fromContext(ctx).download(
      ctx.input.reportToken,
      ctx.input.runToken,
      ctx.input.format,
      ctx.input.queryRunToken
    );
    const fileName = `mode-results.${ctx.input.format}`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(file.bytes, { headers: { 'content-type': file.mimeType } }),
      filename: fileName,
      mimeType: file.mimeType
    });
    return {
      output: {
        reportToken: ctx.input.reportToken,
        runToken: ctx.input.runToken,
        queryRunToken: ctx.input.queryRunToken,
        fileName,
        mimeType: file.mimeType,
        sizeBytes: file.bytes.byteLength,
        runState: file.runState
      },
      message: `Prepared **${fileName}** for download.`
    };
  })
  .build();
