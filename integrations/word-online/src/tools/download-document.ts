import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Get a pre-authenticated download URL for a Word document or file stored in OneDrive or SharePoint.
The returned URL can be used to download the file content directly. Optionally convert the document to PDF format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item to download'),
      convertToPdf: z
        .boolean()
        .optional()
        .describe(
          'If true, returns a PDF conversion download URL instead of the original file'
        )
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('Pre-authenticated URL to download the file content'),
      format: z.string().describe('The format of the downloadable file ("original" or "pdf")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let downloadUrl: string;
    let format: string;

    if (ctx.input.convertToPdf) {
      downloadUrl = await client.convertToPdf(ctx.input.itemId);
      format = 'pdf';
    } else {
      downloadUrl = await client.getDownloadUrl(ctx.input.itemId);
      format = 'original';
    }

    return {
      output: {
        downloadUrl,
        format
      },
      message: `Download URL generated for item \`${ctx.input.itemId}\` in **${format}** format`
    };
  })
  .build();
