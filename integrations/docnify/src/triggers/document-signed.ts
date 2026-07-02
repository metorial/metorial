import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentSigned = SlateTrigger.create(spec, {
  name: 'New Document Signed',
  key: 'new_document_signed',
  description:
    'Triggers when a recipient signs a document in Docnify. Detects individual recipient signatures by monitoring the signedAt field on each recipient.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document that was signed'),
      documentName: z.string().describe('Name of the signed document'),
      recipientId: z.string().describe('ID of the recipient who signed'),
      recipientEmail: z.string().describe('Email of the recipient who signed'),
      recipientName: z.string().describe('Name of the recipient who signed'),
      signedAt: z.string().describe('Timestamp when the recipient signed')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document that was signed'),
      documentName: z.string().describe('Name of the signed document'),
      recipientId: z.string().describe('ID of the recipient who signed'),
      recipientEmail: z.string().describe('Email of the recipient who signed'),
      recipientName: z.string().describe('Name of the recipient who signed'),
      signedAt: z.string().describe('Timestamp when the recipient signed')
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
      let knownSignatures = (ctx.state?.knownSignatures as string[] | null) ?? [];
      let documents = await client.listDocumentsSince(lastPolledAt);

      let inputs: Array<{
        documentId: string;
        documentName: string;
        recipientId: string;
        recipientEmail: string;
        recipientName: string;
        signedAt: string;
      }> = [];

      let newKnownSignatures = [...knownSignatures];

      for (let doc of documents) {
        let recipients = doc.recipients || [];
        for (let recipient of recipients) {
          if (recipient.signedAt) {
            let signatureKey = `${doc.id}_${recipient.recipientId}`;
            if (!knownSignatures.includes(signatureKey)) {
              inputs.push({
                documentId: doc.id,
                documentName: doc.name,
                recipientId: recipient.recipientId,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                signedAt: recipient.signedAt
              });
              newKnownSignatures.push(signatureKey);
            }
          }
        }
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
          knownSignatures: newKnownSignatures
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.signed',
        id: `document_signed_${ctx.input.documentId}_${ctx.input.recipientId}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          recipientId: ctx.input.recipientId,
          recipientEmail: ctx.input.recipientEmail,
          recipientName: ctx.input.recipientName,
          signedAt: ctx.input.signedAt
        }
      };
    }
  })
  .build();
