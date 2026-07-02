import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let summarySchema = z.object({
  docTypeId: z.string().describe('Unique ID of the document type'),
  title: z.string().describe('Human-readable document type name'),
  docType: z.string().describe('Document type identifier'),
  canUpload: z.boolean().optional().describe('Whether uploads are enabled'),
  isDefault: z.boolean().optional().describe('Whether this is a default type'),
  category: z.string().optional().describe('Document type category'),
  docCounts: z
    .object({
      all: z.number().describe('Total documents'),
      processed: z.number().describe('Processed documents'),
      reviewing: z.number().describe('Documents currently in review')
    })
    .optional()
    .describe('Counts grouped by status'),
  uploadEmail: z.string().optional().describe('Email upload address for this type')
});

export let getDocumentsSummary = SlateTool.create(spec, {
  name: 'Get Documents Summary',
  key: 'get_documents_summary',
  description: `Retrieve a summary of documents grouped by document type, including per-status counts and disabled document types where Docsumo returns them.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      documentTypes: z.array(summarySchema).describe('Document summaries by type'),
      disabledDocumentTypes: z
        .array(z.string())
        .describe('Disabled document type identifiers returned by Docsumo')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let summary = await client.getDocumentsSummary();

    return {
      output: summary,
      message: `Retrieved document summary for **${summary.documentTypes.length}** document type(s).`
    };
  })
  .build();
