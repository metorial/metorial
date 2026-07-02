import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let amendDocument = SlateTool.create(spec, {
  name: 'Amend Document',
  key: 'amend_document',
  description: `Amend a cancelled or submitted ERPNext document by creating a revised copy linked to the original. The new document is created in draft status with an "amended_from" reference. Optionally override specific fields in the amended copy.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      doctype: z.string().describe('The DocType of the document to amend'),
      documentName: z.string().describe('The unique name/ID of the original document'),
      documentData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to override in the amended copy')
    })
  )
  .output(
    z.object({
      document: z.record(z.string(), z.any()).describe('The newly created amended document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let document = await client.amendDocument(
      ctx.input.doctype,
      ctx.input.documentName,
      ctx.input.documentData
    );

    return {
      output: { document },
      message: `Amended **${ctx.input.doctype}** from **${ctx.input.documentName}** → new document: **${document.name}**`
    };
  })
  .build();
