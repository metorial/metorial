import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new ERPNext document of any DocType. Use this to create Customers, Sales Orders, Invoices, Items, Employees, and any other business entity. Provide the DocType and the document fields as key-value pairs.`,
  instructions: [
    'Field names should match the ERPNext field names for the given DocType (typically snake_case).',
    'For child table fields (e.g., items in a Sales Order), pass an array of objects.'
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
          'The DocType of the document to create (e.g., "Customer", "Sales Order", "Item")'
        ),
      documentData: z
        .record(z.string(), z.any())
        .describe('Document field values as key-value pairs')
    })
  )
  .output(
    z.object({
      document: z.record(z.string(), z.any()).describe('The created document with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.createDocument(ctx.input.doctype, ctx.input.documentData);

    return {
      output: { document },
      message: `Created **${ctx.input.doctype}** document: **${document.name}**`
    };
  })
  .build();
