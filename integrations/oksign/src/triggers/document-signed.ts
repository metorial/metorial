import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let POLL_INTERVAL_SECONDS = 300; // 5 minutes (API rate limit: 1 request per 3 minutes)

export let documentSigned = SlateTrigger.create(spec, {
  name: 'Document Signed',
  key: 'document_signed',
  description:
    'Triggers when a document is signed on OKSign. Polls the signed documents endpoint to detect new signatures.'
})
  .input(
    z.object({
      sourceDocumentId: z.string().describe('Source document ID'),
      signedDocumentId: z.string().describe('Signed document ID'),
      filename: z.string().describe('Document filename')
    })
  )
  .output(
    z.object({
      sourceDocumentId: z.string().describe('Original uploaded document ID'),
      signedDocumentId: z.string().describe('Signed copy document ID'),
      filename: z.string().describe('Document filename')
    })
  )
  .polling({
    options: {
      intervalInSeconds: POLL_INTERVAL_SECONDS
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let now = new Date();
      let lastPollTime = ctx.state?.lastPollTime
        ? (ctx.state.lastPollTime as string)
        : new Date(now.getTime() - POLL_INTERVAL_SECONDS * 1000).toISOString();

      let toTime = now.toISOString();

      let signedDocs = await client.getSignedDocuments(lastPollTime, toTime);

      return {
        inputs: signedDocs.map(doc => ({
          sourceDocumentId: doc.source_docid,
          signedDocumentId: doc.signed_docid,
          filename: doc.filename
        })),
        updatedState: {
          lastPollTime: toTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.signed',
        id: `${ctx.input.signedDocumentId}`,
        output: {
          sourceDocumentId: ctx.input.sourceDocumentId,
          signedDocumentId: ctx.input.signedDocumentId,
          filename: ctx.input.filename
        }
      };
    }
  })
  .build();
