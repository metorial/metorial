import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a single ERPNext document by its DocType and name. Works with any DocType such as Customer, Sales Order, Invoice, Employee, Item, etc. Optionally select specific fields to return.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      doctype: z
        .string()
        .describe('The DocType of the document (e.g., "Customer", "Sales Order", "Item")'),
      documentName: z.string().describe('The unique name/ID of the document'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return. If omitted, all fields are returned.')
    })
  )
  .output(
    z.object({
      document: z
        .record(z.string(), z.any())
        .describe('The retrieved document with all requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.getDocument(
      ctx.input.doctype,
      ctx.input.documentName,
      ctx.input.fields
    );

    return {
      output: { document },
      message: `Retrieved **${ctx.input.doctype}** document: **${ctx.input.documentName}**`
    };
  })
  .build();
