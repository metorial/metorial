import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Updates the name of an existing generated document.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      name: z.string().describe('New name for the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Updated document ID'),
      name: z.string().describe('Updated document name'),
      filename: z.string().describe('Updated filename'),
      documentUri: z.string().describe('URL to download the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let d = await client.updateDocument(ctx.input.documentId, {
      name: ctx.input.name
    });

    return {
      output: {
        documentId: d.id,
        name: d.name,
        filename: d.filename,
        documentUri: d.document_uri
      },
      message: `Updated document name to **${d.name}** (${d.id})`
    };
  })
  .build();
