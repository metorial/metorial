import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { FirestoreClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let firestoreDocumentChanges = SlateTrigger.create(spec, {
  name: 'Firestore Document Changes',
  key: 'firestore_document_changes',
  description:
    'Monitors a Firestore collection for new or updated documents by polling for changes. Detects documents that have been created or modified since the last poll.'
})
  .scopes(firebaseActionScopes.firestoreDocumentChanges)
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      documentPath: z.string().describe('Full resource path of the document'),
      documentId: z.string().describe('The document ID'),
      collectionPath: z.string().describe('Collection path being monitored'),
      fields: z.record(z.string(), z.any()).describe('Current document fields'),
      createTime: z.string().describe('Document creation timestamp'),
      updateTime: z.string().describe('Document last update timestamp')
    })
  )
  .output(
    z.object({
      documentPath: z.string().describe('Full resource path of the document'),
      documentId: z.string().describe('The document ID'),
      collectionPath: z.string().describe('Collection path being monitored'),
      fields: z.record(z.string(), z.any()).describe('Current document fields'),
      createTime: z.string().describe('Document creation timestamp'),
      updateTime: z.string().describe('Document last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state || {};
      let collectionPath = state.collectionPath || 'documents';
      let lastPollTime = state.lastPollTime || '';
      let knownDocIds: Record<string, string> = state.knownDocIds || {};

      let client = new FirestoreClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId
      });

      let inputs: Array<{
        changeType: 'created' | 'updated';
        documentPath: string;
        documentId: string;
        collectionPath: string;
        fields: Record<string, any>;
        createTime: string;
        updateTime: string;
      }> = [];

      let result = await client.listDocuments(collectionPath, { pageSize: 100 });
      let newKnownDocIds: Record<string, string> = {};

      for (let doc of result.documents) {
        newKnownDocIds[doc.documentId] = doc.updateTime;

        let previousUpdateTime = knownDocIds[doc.documentId];

        if (!previousUpdateTime) {
          if (lastPollTime) {
            inputs.push({
              changeType: 'created',
              documentPath: doc.documentPath,
              documentId: doc.documentId,
              collectionPath,
              fields: doc.fields,
              createTime: doc.createTime,
              updateTime: doc.updateTime
            });
          }
        } else if (previousUpdateTime !== doc.updateTime) {
          inputs.push({
            changeType: 'updated',
            documentPath: doc.documentPath,
            documentId: doc.documentId,
            collectionPath,
            fields: doc.fields,
            createTime: doc.createTime,
            updateTime: doc.updateTime
          });
        }
      }

      return {
        inputs,
        updatedState: {
          collectionPath,
          lastPollTime: new Date().toISOString(),
          knownDocIds: newKnownDocIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `firestore_document.${ctx.input.changeType}`,
        id: `${ctx.input.documentId}-${ctx.input.updateTime}`,
        output: {
          documentPath: ctx.input.documentPath,
          documentId: ctx.input.documentId,
          collectionPath: ctx.input.collectionPath,
          fields: ctx.input.fields,
          createTime: ctx.input.createTime,
          updateTime: ctx.input.updateTime
        }
      };
    }
  })
  .build();
