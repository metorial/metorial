import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { pandadocServiceError } from '../lib/errors';
import { spec } from '../spec';

let tokenSchema = z.object({
  name: z.string().describe('Token name as defined in the document'),
  value: z.string().describe('Value to populate the token with')
});

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update a draft PandaDoc document with supported mutable values such as name, recipients, fields, tokens, tags, metadata, pricing tables, tables, text blocks, or image blocks.`,
  constraints: [
    'PandaDoc only allows document content updates while the document is in draft status.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the draft document to update'),
      name: z.string().optional().describe('New document name'),
      recipients: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Replacement recipients payload in PandaDoc API shape'),
      tokens: z.array(tokenSchema).optional().describe('Template tokens to update'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to update, keyed by field name with their values'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata to update on the document'),
      tags: z.array(z.string()).optional().describe('Tags to set on the document'),
      pricingTables: z
        .array(z.any())
        .optional()
        .describe('Pricing table data to update in the document'),
      tables: z.array(z.any()).optional().describe('Table data to update in the document'),
      texts: z.array(z.any()).optional().describe('Text block data to update in the document'),
      images: z
        .array(z.any())
        .optional()
        .describe('Image block data to update in the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('UUID of the updated document'),
      updated: z.boolean().describe('Whether PandaDoc accepted the update request'),
      updatedFields: z.array(z.string()).describe('Top-level document fields submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let fieldsPayload: Record<string, { value: any }> | undefined;
    if (ctx.input.fields) {
      fieldsPayload = {};
      for (let [key, value] of Object.entries(ctx.input.fields)) {
        fieldsPayload[key] = { value };
      }
    }

    let payload: Record<string, unknown> = {
      name: ctx.input.name,
      recipients: ctx.input.recipients,
      tokens: ctx.input.tokens?.map(token => ({ name: token.name, value: token.value })),
      fields: fieldsPayload,
      metadata: ctx.input.metadata,
      tags: ctx.input.tags,
      pricing_tables: ctx.input.pricingTables,
      tables: ctx.input.tables,
      texts: ctx.input.texts,
      images: ctx.input.images
    };

    let updatePayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    let updatedFields = Object.keys(updatePayload);

    if (updatedFields.length === 0) {
      throw pandadocServiceError('Provide at least one document field to update.');
    }

    await client.updateDocument(ctx.input.documentId, updatePayload);

    return {
      output: {
        documentId: ctx.input.documentId,
        updated: true,
        updatedFields
      },
      message: `Updated document \`${ctx.input.documentId}\` fields: ${updatedFields.join(', ')}.`
    };
  })
  .build();
