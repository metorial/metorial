import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let watchNewDocument = SlateTrigger.create(spec, {
  name: 'Watch New Document',
  key: 'watch_new_document',
  description: 'Triggers when a new document is generated from any template in your account.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the new document'),
      templateId: z.string().describe('ID of the source template'),
      created: z.number().describe('Creation timestamp'),
      name: z.string().describe('Document name'),
      dataLength: z.number().describe('Number of data items'),
      filename: z.string().describe('Generated filename'),
      format: z.string().describe('Output format'),
      documentUri: z.string().describe('Download URL')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique document ID'),
      templateId: z.string().describe('ID of the source template'),
      created: z.number().describe('Creation timestamp (Unix epoch)'),
      name: z.string().describe('Document name'),
      dataLength: z.number().describe('Number of data items used'),
      filename: z.string().describe('Generated filename'),
      format: z.string().describe('Output format'),
      documentUri: z.string().describe('URL to download the document')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DocuGenerateClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastSeenTimestamp = (ctx.state?.lastSeenTimestamp as number) ?? 0;
      let knownDocumentIds = (ctx.state?.knownDocumentIds as string[]) ?? [];

      // Get all templates, then get documents for each
      let templates = await client.listTemplates();
      let allNewDocs: Array<{
        documentId: string;
        templateId: string;
        created: number;
        name: string;
        dataLength: number;
        filename: string;
        format: string;
        documentUri: string;
      }> = [];

      let latestTimestamp = lastSeenTimestamp;
      let updatedKnownIds = [...knownDocumentIds];

      for (let template of templates) {
        let docs = await client.listDocuments(template.id);
        for (let doc of docs) {
          if (doc.created > lastSeenTimestamp && !knownDocumentIds.includes(doc.id)) {
            allNewDocs.push({
              documentId: doc.id,
              templateId: doc.template_id,
              created: doc.created,
              name: doc.name,
              dataLength: doc.data_length,
              filename: doc.filename,
              format: doc.format,
              documentUri: doc.document_uri
            });
            updatedKnownIds.push(doc.id);
            if (doc.created > latestTimestamp) {
              latestTimestamp = doc.created;
            }
          }
        }
      }

      // Keep known IDs list from growing unbounded - only keep recent ones
      if (updatedKnownIds.length > 1000) {
        updatedKnownIds = updatedKnownIds.slice(-500);
      }

      return {
        inputs: allNewDocs,
        updatedState: {
          lastSeenTimestamp: latestTimestamp,
          knownDocumentIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.created',
        id: ctx.input.documentId,
        output: {
          documentId: ctx.input.documentId,
          templateId: ctx.input.templateId,
          created: ctx.input.created,
          name: ctx.input.name,
          dataLength: ctx.input.dataLength,
          filename: ctx.input.filename,
          format: ctx.input.format,
          documentUri: ctx.input.documentUri
        }
      };
    }
  })
  .build();
