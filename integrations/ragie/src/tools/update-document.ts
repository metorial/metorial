import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update an existing document's metadata, content from a URL, or raw text/JSON data.
Metadata updates are applied without re-processing the document. Content updates replace the previous version and trigger re-indexing.`,
  instructions: [
    'To update metadata only, provide the metadata field. Set a key to null to delete it.',
    'To replace content from a URL, provide updateUrl.',
    'To replace content with raw data, provide updateRawData.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata to merge. Set a key to null to delete it.'),
      updateUrl: z
        .string()
        .optional()
        .describe('New URL to replace the document content from'),
      updateRawData: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe('New raw text or JSON data to replace the document content'),
      mode: z.enum(['fast', 'hi_res']).optional().describe('Import mode for content updates'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the updated document'),
      status: z.string().describe('Status after update'),
      updatedFields: z.array(z.string()).describe('List of fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let partition = ctx.input.partition;
    let updatedFields: string[] = [];

    if (ctx.input.metadata) {
      await client.updateDocumentMetadata(ctx.input.documentId, {
        metadata: ctx.input.metadata,
        partition
      });
      updatedFields.push('metadata');
    }

    if (ctx.input.updateUrl) {
      await client.updateDocumentFromUrl(ctx.input.documentId, {
        url: ctx.input.updateUrl,
        mode: ctx.input.mode,
        partition
      });
      updatedFields.push('content (from URL)');
    }

    if (ctx.input.updateRawData) {
      await client.updateDocumentRaw(ctx.input.documentId, {
        data: ctx.input.updateRawData,
        partition
      });
      updatedFields.push('content (raw data)');
    }

    if (updatedFields.length === 0) {
      throw new Error(
        'No update fields provided. Specify at least one of: metadata, updateUrl, or updateRawData.'
      );
    }

    let doc = await client.getDocument(ctx.input.documentId, partition);

    return {
      output: {
        documentId: doc.id,
        status: doc.status,
        updatedFields
      },
      message: `Document \`${ctx.input.documentId}\` updated: ${updatedFields.join(', ')}. Status: \`${doc.status}\``
    };
  })
  .build();
