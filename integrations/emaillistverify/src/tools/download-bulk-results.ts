import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadBulkResults = SlateTool.create(spec, {
  name: 'Download Bulk Verification Results',
  key: 'download_bulk_results',
  description:
    'Download a finished bulk verification job as CSV or XLSX. Optionally keep only selected verification statuses, such as ok for deliverable addresses. Get the job ID from Upload Bulk Verification File.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned by Upload Bulk Verification File'),
      format: z.enum(['csv', 'xlsx']).optional().describe('Download format; defaults to CSV'),
      results: z
        .array(
          z.enum([
            'ok',
            'unknown',
            'dead_server',
            'invalid_mx',
            'email_disabled',
            'antispam_system',
            'ok_for_all',
            'smtp_protocol',
            'invalid_syntax',
            'disposable',
            'spamtrap'
          ])
        )
        .min(1)
        .optional()
        .describe('Keep only these verification statuses; omit to include all results')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      filename: z.string(),
      format: z.enum(['csv', 'xlsx']),
      status: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getBulkProgress(ctx.input.jobId);
    if (job.status !== 'finished') {
      throw createApiServiceError(
        `The bulk verification job is ${job.status}. Check its status and request the results when it is finished.`
      );
    }
    let format = ctx.input.format ?? 'csv';
    let query: Record<string, string> = { format };
    if (ctx.input.results) query.results = ctx.input.results.join(',');
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.emaillistverify.com/api/maillists/${encodeURIComponent(ctx.input.jobId)}`,
      query,
      headers: { 'x-api-key': ctx.auth.token },
      mimeType:
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    let filename = `${job.name.replace(/\.[^.]+$/, '')}.${format}`;
    return {
      output: { jobId: ctx.input.jobId, filename, format, status: job.status },
      message: `Prepared **${filename}** for download.`
    };
  })
  .build();
