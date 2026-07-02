import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitDocument = SlateTool.create(spec, {
  name: 'Submit Document',
  key: 'submit_document',
  description: `Submit a draft ERPNext document to finalize it. Submission is a workflow step that locks the document from further edits. Commonly used with Sales Invoices, Purchase Invoices, Journal Entries, Stock Entries, and other transactional DocTypes.`,
  instructions: [
    'Only submittable DocTypes (those with is_submittable enabled) support this action.',
    'Once submitted, a document can only be amended or cancelled — not directly edited.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      doctype: z
        .string()
        .describe(
          'The DocType of the document to submit (e.g., "Sales Invoice", "Journal Entry")'
        ),
      documentName: z.string().describe('The unique name/ID of the document to submit')
    })
  )
  .output(
    z.object({
      document: z.record(z.string(), z.any()).describe('The submitted document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.submitDocument(ctx.input.doctype, ctx.input.documentName);

    return {
      output: { document },
      message: `Submitted **${ctx.input.doctype}** document: **${ctx.input.documentName}**`
    };
  })
  .build();
