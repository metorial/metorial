import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelDocument = SlateTool.create(spec, {
  name: 'Cancel Document',
  key: 'cancel_document',
  description: `Cancel a submitted ERPNext document. This reverses the submission and marks the document as cancelled. Commonly used with Sales Invoices, Purchase Invoices, Journal Entries, and other submitted transactional documents.`,
  instructions: [
    'Only submitted documents (docstatus = 1) can be cancelled.',
    'Cancellation may be blocked if dependent documents exist.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      doctype: z.string().describe('The DocType of the document to cancel'),
      documentName: z.string().describe('The unique name/ID of the document to cancel')
    })
  )
  .output(
    z.object({
      document: z.record(z.string(), z.any()).describe('The cancelled document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.cancelDocument(ctx.input.doctype, ctx.input.documentName);

    return {
      output: { document },
      message: `Cancelled **${ctx.input.doctype}** document: **${ctx.input.documentName}**`
    };
  })
  .build();
