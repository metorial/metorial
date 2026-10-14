import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let listUploads = SlateTool.create(spec, {
  name: 'List Uploads',
  key: 'list_uploads',
  description: `Lists a range of completed imports (uploads) in your Dromo account. Returns status, row counts, field information, and the total upload count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z
        .number()
        .refine(Number.isInteger)
        .min(0)
        .optional()
        .describe('Starting upload index; defaults to 0'),
      end: z
        .number()
        .refine(Number.isInteger)
        .min(1)
        .optional()
        .describe('Ending upload index; defaults to 10000')
    })
  )
  .output(
    z.object({
      start: z.number().describe('Start index returned by Dromo'),
      end: z.number().describe('End index returned by Dromo'),
      totalUploads: z.number().describe('Total number of uploads available'),
      uploads: z.array(
        z.object({
          uploadId: z.string().describe('Unique identifier of the upload'),
          status: z.string().describe('Current status of the upload'),
          totalRows: z.number().describe('Total number of data rows'),
          fieldOrder: z.array(z.string()).describe('Ordered list of field keys'),
          downloadUrl: z.string().optional().describe('Pre-signed URL to download the data')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.end ?? 10000) <= (ctx.input.start ?? 0)) {
      throw createApiServiceError('end must be greater than start.');
    }
    let client = new DromoClient({ token: ctx.auth.token });
    let page = await client.listUploads(ctx.input);

    let mapped = page.data.map(u => ({
      uploadId: u.id,
      status: u.upload_status,
      totalRows: u.total_num_rows,
      fieldOrder: u.field_order,
      downloadUrl: u.download_url
    }));

    return {
      output: {
        uploads: mapped,
        start: page.start,
        end: page.end,
        totalUploads: page.total_num_uploads
      },
      message: `Found **${mapped.length}** upload(s).`
    };
  })
  .build();
