import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentPreview = SlateTool.create(spec, {
  name: 'Document Preview',
  key: 'document_preview',
  description: `Get a short-lived embeddable preview URL for a Word document stored in SharePoint or OneDrive for Business.
The returned URL can be embedded in an iframe to display a temporary read-only preview of the document.`,
  tags: {
    readOnly: true
  },
  constraints: ['Only available for documents in SharePoint and OneDrive for Business.']
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item to preview')
    })
  )
  .output(
    z.object({
      previewGetUrl: z
        .string()
        .describe('Embeddable GET URL for rendering a preview (short-lived)'),
      previewPostUrl: z
        .string()
        .describe('Embeddable POST URL for rendering a preview (short-lived)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let preview = await client.getPreviewUrl(ctx.input.itemId);

    return {
      output: {
        previewGetUrl: preview.getUrl,
        previewPostUrl: preview.postUrl
      },
      message: `Generated preview URL for item \`${ctx.input.itemId}\``
    };
  })
  .build();
