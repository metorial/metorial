import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTypes = SlateTool.create(spec, {
  name: 'List Document Types',
  key: 'list_document_types',
  description: `Retrieve all document types configured in your Typless account. Returns each document type's slug, name, field counts, and model information. Use this to discover available document types before extracting data or managing training.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      documentTypes: z
        .array(
          z.object({
            slug: z.string().describe('Unique slug identifier for the document type'),
            name: z.string().describe('Display name of the document type'),
            fieldsCount: z.number().describe('Number of metadata fields configured'),
            lineItemFieldsCount: z.number().describe('Number of line item fields configured'),
            documentsCount: z.number().describe('Number of documents in the training dataset'),
            modelsCount: z.number().describe('Number of trained models')
          })
        )
        .describe('List of document types in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let documentTypes = await client.getDocumentTypes();

    let summary =
      documentTypes.length > 0
        ? documentTypes
            .map(
              dt =>
                `- **${dt.name}** (\`${dt.slug}\`): ${dt.fieldsCount} fields, ${dt.documentsCount} documents, ${dt.modelsCount} models`
            )
            .join('\n')
        : 'No document types found.';

    return {
      output: { documentTypes },
      message: `Found **${documentTypes.length}** document types:\n${summary}`
    };
  })
  .build();
