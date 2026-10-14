import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description:
    'Lists documents the authenticated member can read. Use the returned documentUuid with get_document or update_document.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      documents: z.array(
        z.object({
          documentUuid: z.string().describe('UUID of the document'),
          title: z.string().describe('Document title'),
          appUrl: z.string().describe('URL to view the document in Shortcut')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let docs = await client.listDocuments();
    let documents = docs.map((doc: { id: string; title: string; app_url: string }) => ({
      documentUuid: doc.id,
      title: doc.title,
      appUrl: doc.app_url
    }));
    return {
      output: { documents },
      message: `Found **${documents.length}** accessible documents`
    };
  })
  .build();
