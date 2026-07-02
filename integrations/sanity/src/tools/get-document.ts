import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve one or more documents by ID directly from the Content Lake. This endpoint bypasses caching and indexing to return the freshest version. Optionally retrieve a historical revision at a specific point in time.`,
  instructions: [
    'Pass a single documentId to fetch one document, or use documentIds to fetch multiple documents at once.',
    'To retrieve a past version, provide a revision ID or a timestamp in the history options.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().optional().describe('ID of a single document to retrieve.'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Array of document IDs to retrieve multiple documents at once.'),
      revision: z
        .string()
        .optional()
        .describe('Specific revision ID to retrieve a historical version of the document.'),
      time: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp to retrieve the document as it was at that point in time.'
        )
    })
  )
  .output(
    z.object({
      documents: z.array(z.any()).describe('Array of retrieved documents.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    let isHistorical = ctx.input.revision || ctx.input.time;
    let docId = ctx.input.documentId;
    let docIds = ctx.input.documentIds;

    if (!docId && (!docIds || docIds.length === 0)) {
      throw new Error('Either documentId or documentIds must be provided.');
    }

    if (isHistorical && docId) {
      let response = await client.getDocumentRevision(docId, {
        revision: ctx.input.revision,
        time: ctx.input.time
      });
      return {
        output: { documents: response.documents || [] },
        message: `Retrieved historical revision of document \`${docId}\`.`
      };
    }

    if (docIds && docIds.length > 0) {
      let response = await client.getDocuments(docIds);
      let docs = response.documents || [];
      return {
        output: { documents: docs },
        message: `Retrieved ${docs.length} document(s).`
      };
    }

    let response = await client.getDocument(docId!);
    let docs = response.documents || [];
    return {
      output: { documents: docs },
      message: `Retrieved document \`${docId}\`.`
    };
  })
  .build();
