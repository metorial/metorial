import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update an existing ERPNext document. Supports partial updates — only send the fields you want to change. Works with any DocType such as Customer, Sales Order, Invoice, Item, Employee, etc.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      doctype: z.string().describe('The DocType of the document to update'),
      documentName: z.string().describe('The unique name/ID of the document to update'),
      documentData: z
        .record(z.string(), z.any())
        .describe('Fields to update as key-value pairs (partial update supported)')
    })
  )
  .output(
    z.object({
      document: z.record(z.string(), z.any()).describe('The updated document with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.updateDocument(
      ctx.input.doctype,
      ctx.input.documentName,
      ctx.input.documentData
    );

    return {
      output: { document },
      message: `Updated **${ctx.input.doctype}** document: **${ctx.input.documentName}**`
    };
  })
  .build();
