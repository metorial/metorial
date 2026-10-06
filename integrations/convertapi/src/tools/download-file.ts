import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';
export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Prepare an unexpired ConvertAPI temporary file for download using its exact ID.',
  constraints: [
    'File IDs and download URLs grant access to the stored file. Do not share them publicly. Files expire after up to three hours; expired content cannot be renewed.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      fileId: z.string().describe('Exact temporary file ID')
    })
  )
  .output(z.object({ fileId: z.string(), url: z.string(), available: z.boolean() }))
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });
    const url = client.fileUrl(ctx.input.fileId);
    if (!(await client.fileExists(ctx.input.fileId)))
      throw invalid(
        'The temporary file is missing or expired. Upload or convert the source again only after reconciling any conversion credit effects.'
      );
    await ctx.addAttachment({ type: 'url', url });
    return {
      output: { fileId: ctx.input.fileId, url, available: true },
      message:
        'Prepared the temporary file for download. Availability was checked; delivery can fail if it expires before download.'
    };
  })
  .build();
