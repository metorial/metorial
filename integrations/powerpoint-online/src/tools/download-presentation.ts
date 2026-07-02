import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemLocationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let downloadPresentation = SlateTool.create(spec, {
  name: 'Download Presentation',
  key: 'download_presentation',
  description: `Get a download URL for a PowerPoint presentation from OneDrive or SharePoint. Optionally convert the presentation to PDF format on the server side.`,
  instructions: [
    'The returned URL is a pre-authenticated, temporary download link that can be used directly.',
    'Set "format" to "pdf" to download the presentation converted to PDF.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    driveItemLocationSchema.extend({
      format: z
        .enum(['original', 'pdf'])
        .default('original')
        .describe('Download format. Use "pdf" to convert the presentation to PDF on download.')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('Pre-authenticated temporary URL to download the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let format = ctx.input.format === 'pdf' ? 'pdf' : undefined;

    let downloadUrl = await client.getDownloadUrl({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      format
    });

    return {
      output: { downloadUrl },
      message: `Download URL generated${format ? ' (PDF conversion)' : ''}`
    };
  })
  .build();
