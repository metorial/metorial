import { SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export const manageJobLog = SlateTool.create(spec, {
  name: 'Manage Job Log',
  key: 'manage_job_log',
  description:
    'Download a Travis CI job log as a text or JSON file, or permanently remove its contents.',
  instructions: [
    'Log downloads may contain build output and sensitive data. Deleting a log replaces its contents with a removal notice.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      jobId: z.string().describe('Numeric job ID'),
      action: z.enum(['get', 'delete']).default('get'),
      format: z.enum(['text', 'json']).default('text').describe('Download format for get')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      logId: z.number().optional(),
      filename: z.string().optional(),
      contentType: z.string().optional(),
      sizeBytes: z.number().optional(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    });
    if (ctx.input.action === 'delete') {
      await client.deleteJobLog(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, deleted: true },
        message: `Removed log contents for job **${ctx.input.jobId}**.`
      };
    }
    const text =
      ctx.input.format === 'text' ? await client.getJobLogText(ctx.input.jobId) : undefined;
    const log =
      ctx.input.format === 'json' ? await client.getJobLog(ctx.input.jobId) : undefined;
    const filename = `travis-job-${ctx.input.jobId}.${ctx.input.format === 'text' ? 'txt' : 'json'}`;
    const contentType = ctx.input.format === 'text' ? 'text/plain' : 'application/json';
    const download = client.jobLogDownload(ctx.input.jobId, ctx.input.format);
    await ctx.addAttachment({
      type: 'url',
      filename,
      mimeType: contentType,
      url: download.url,
      headers: download.headers
    });
    return {
      output: {
        jobId: ctx.input.jobId,
        logId: log?.id,
        filename,
        contentType,
        sizeBytes: text === undefined ? undefined : Buffer.byteLength(text),
        deleted: false
      },
      message: `Job **${ctx.input.jobId}** log is ready to download.`
    };
  })
  .build();
