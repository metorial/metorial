import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete an ERPNext document by its DocType and name. This action is irreversible. Works with any DocType.`,
  constraints: [
    'Submitted documents must be cancelled before they can be deleted.',
    'Some documents may have dependencies that prevent deletion.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      doctype: z.string().describe('The DocType of the document to delete'),
      documentName: z.string().describe('The unique name/ID of the document to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    await client.deleteDocument(ctx.input.doctype, ctx.input.documentName);

    return {
      output: { deleted: true },
      message: `Deleted **${ctx.input.doctype}** document: **${ctx.input.documentName}**`
    };
  })
  .build();
