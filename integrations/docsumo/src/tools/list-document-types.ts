import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTypes = SlateTool.create(spec, {
  name: 'List Document Types',
  key: 'list_document_types',
  description: `Retrieve all document types enabled in your Docsumo account along with document counts per type. Use this to find the correct document type identifier needed for uploading documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      documentTypes: z
        .array(
          z.object({
            docTypeId: z.string().describe('Unique ID of the document type'),
            title: z
              .string()
              .describe('Human-readable name (e.g., "Invoice", "Bank Statement")'),
            docType: z
              .string()
              .describe(
                'Type identifier used in API calls (e.g., "invoice", "bank_statements")'
              ),
            canUpload: z
              .boolean()
              .optional()
              .describe('Whether uploads are enabled for this type, when returned'),
            isDefault: z
              .boolean()
              .optional()
              .describe('Whether this is a default document type, when returned'),
            category: z.string().optional().describe('Docsumo document type category'),
            docCounts: z
              .object({
                all: z.number().describe('Total document count'),
                processed: z.number().describe('Number of processed documents'),
                reviewing: z.number().describe('Number of documents in review')
              })
              .optional()
              .describe('Document counts by status'),
            uploadEmail: z
              .string()
              .optional()
              .describe('Email address for uploading documents via email')
          })
        )
        .describe('Available document types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let documentTypes = await client.listEnabledDocumentTypes();

    return {
      output: { documentTypes },
      message: `Found **${documentTypes.length}** document type(s): ${documentTypes.map(dt => dt.title || dt.docType).join(', ')}.`
    };
  })
  .build();
