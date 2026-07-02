import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentCreated = SlateTrigger.create(spec, {
  name: 'New Document Created',
  key: 'new_document_created',
  description:
    'Triggers when a new document is created in your Docnify account. Polls for recently created documents.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the created document'),
      documentName: z.string().describe('Name of the created document'),
      status: z.string().describe('Status of the document'),
      createdAt: z.string().describe('Timestamp when the document was created'),
      updatedAt: z.string().describe('Timestamp when the document was last updated')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the created document'),
      documentName: z.string().describe('Name of the created document'),
      status: z.string().describe('Status of the document'),
      createdAt: z.string().describe('Timestamp when the document was created'),
      updatedAt: z.string().describe('Timestamp when the document was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let lastPolledAt = (ctx.state?.lastPolledAt as string | null) ?? null;
      let documents = await client.listDocumentsSince(lastPolledAt);

      let newDocuments = lastPolledAt
        ? documents.filter(doc => doc.createdAt > lastPolledAt)
        : documents;

      let latestTimestamp =
        newDocuments.length > 0
          ? newDocuments.reduce(
              (max, doc) => (doc.createdAt > max ? doc.createdAt : max),
              newDocuments[0]!.createdAt
            )
          : lastPolledAt;

      return {
        inputs: newDocuments.map(doc => ({
          documentId: doc.id,
          documentName: doc.name,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        })),
        updatedState: {
          lastPolledAt: latestTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.created',
        id: `document_created_${ctx.input.documentId}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
