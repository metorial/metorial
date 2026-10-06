import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { documentOutput, mapDocument } from '../lib/schemas';
import { requireValue } from '../lib/validation';
import { spec } from '../spec';
export const getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description:
    'Retrieve one document by its exact UUID or urlId, including Markdown, lifecycle state and authors.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
    })
  )
  .output(documentOutput.extend({ text: z.string() }))
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const document = await client.getDocument(ctx.input.documentId);
    requireValue(
      typeof document.text === 'string',
      'The instance did not return Markdown. Check its supported API version before using this document.'
    );
    return {
      output: { ...mapDocument(document), text: document.text },
      message: `Retrieved document at revision ${document.revision}.`
    };
  })
  .build();
