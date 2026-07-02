import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Get the download URL for a completed PandaDoc document PDF.`,
  constraints: ['The document must be in "completed" status to be downloaded.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to download')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('URL to download the document PDF'),
      documentId: z.string().describe('UUID of the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.downloadDocument(ctx.input.documentId);

    return {
      output: {
        downloadUrl: result.url,
        documentId: ctx.input.documentId
      },
      message: `Download URL generated for document \`${ctx.input.documentId}\`.`
    };
  })
  .build();
