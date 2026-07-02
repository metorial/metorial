import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentCompleted = SlateTrigger.create(spec, {
  name: 'New Document Completed',
  key: 'new_document_completed',
  description:
    'Triggers when a document is fully completed — meaning all assigned recipients have signed. Polls for documents where every recipient has a signedAt timestamp.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the completed document'),
      documentName: z.string().describe('Name of the completed document'),
      status: z.string().describe('Status of the document'),
      completedAt: z
        .string()
        .describe('Timestamp of the last signature that completed the document'),
      recipientCount: z.number().describe('Total number of recipients who signed')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the completed document'),
      documentName: z.string().describe('Name of the completed document'),
      status: z.string().describe('Status of the document'),
      completedAt: z
        .string()
        .describe('Timestamp of the last signature that completed the document'),
      recipientCount: z.number().describe('Total number of recipients who signed')
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
      let knownCompletedIds = (ctx.state?.knownCompletedIds as string[] | null) ?? [];
      let documents = await client.listDocumentsSince(lastPolledAt);

      let inputs: Array<{
        documentId: string;
        documentName: string;
        status: string;
        completedAt: string;
        recipientCount: number;
      }> = [];

      let newKnownCompletedIds = [...knownCompletedIds];

      for (let doc of documents) {
        if (knownCompletedIds.includes(doc.id)) {
          continue;
        }

        let recipients = doc.recipients || [];
        if (recipients.length === 0) {
          continue;
        }

        let allSigned = recipients.every(r => r.signedAt);
        if (!allSigned) {
          continue;
        }

        let lastSignedAt = recipients.reduce(
          (max, r) => (r.signedAt && r.signedAt > max ? r.signedAt : max),
          recipients[0]!.signedAt || doc.updatedAt
        );

        inputs.push({
          documentId: doc.id,
          documentName: doc.name,
          status: doc.status,
          completedAt: lastSignedAt,
          recipientCount: recipients.length
        });

        newKnownCompletedIds.push(doc.id);
      }

      let latestUpdate =
        documents.length > 0
          ? documents.reduce(
              (max, doc) => (doc.updatedAt > max ? doc.updatedAt : max),
              documents[0]!.updatedAt
            )
          : lastPolledAt;

      return {
        inputs,
        updatedState: {
          lastPolledAt: latestUpdate,
          knownCompletedIds: newKnownCompletedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.completed',
        id: `document_completed_${ctx.input.documentId}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          status: ctx.input.status,
          completedAt: ctx.input.completedAt,
          recipientCount: ctx.input.recipientCount
        }
      };
    }
  })
  .build();
