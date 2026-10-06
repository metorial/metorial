import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const exportApplication = SlateTool.create(spec, {
  key: 'export_application',
  name: 'Export Application',
  description:
    'Create a downloadable gzip application/workspace export through the licensed Public API. Current workspace exports require an enterprise edition; legacy application exports require a business or enterprise edition.',
  instructions: [
    'Use an exact application/workspace ID from discovery. Data rows are excluded by default; include rows only when authorized to export that data.',
    'This tool delivers an unencrypted native archive up to 8 MiB compressed and 16 MiB expanded for validation. Use the dashboard for larger or password-encrypted exports.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      appId: z.string().describe('Exact native application/workspace ID, not app_metadata'),
      excludeRows: z
        .boolean()
        .default(true)
        .describe('Exclude table rows from the archive; defaults to true')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      fileName: z.string(),
      mimeType: z.literal('application/gzip'),
      size: z.number().int().nonnegative(),
      excludeRows: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await Client.fromContext(ctx).exportApplication(
      ctx.input.appId,
      ctx.input.excludeRows
    );
    const fileName = `${result.application.appId}.tar.gz`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.bytes, { headers: { 'content-type': 'application/gzip' } }),
      filename: fileName,
      mimeType: 'application/gzip'
    });
    return {
      output: {
        appId: result.application.appId,
        fileName,
        mimeType: 'application/gzip' as const,
        size: result.bytes.length,
        excludeRows: result.excludeRows
      },
      message: 'Prepared the application export for download.'
    };
  })
  .build();
