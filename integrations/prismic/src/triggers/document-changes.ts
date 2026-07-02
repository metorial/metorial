import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ContentApiClient } from '../lib/client';
import { spec } from '../spec';

export let documentChanges = SlateTrigger.create(spec, {
  name: 'Document Changes',
  key: 'document_changes',
  description:
    'Triggers when documents are published or unpublished in the Prismic repository. Configure the webhook URL in your Prismic repository Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['published_or_unpublished']).describe('Type of document event'),
      documentIds: z.array(z.string()).describe('IDs of affected documents'),
      masterRef: z.string().describe('Current master ref after the change'),
      domain: z.string().describe('Repository domain name'),
      secret: z.string().nullable().describe('Webhook secret if configured')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the affected document'),
      documentType: z.string().optional().describe('Custom type of the document'),
      uid: z.string().nullable().optional().describe('UID of the document'),
      tags: z.array(z.string()).optional().describe('Tags of the document'),
      lang: z.string().optional().describe('Language of the document'),
      masterRef: z.string().describe('Master ref at time of event'),
      domain: z.string().describe('Repository domain')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let documentIds: string[] = body.documents || [];
      let masterRef: string = body.masterRef || '';
      let domain: string = body.domain || '';
      let secret: string | null = body.secret || null;

      if (documentIds.length === 0) {
        return { inputs: [] };
      }

      return {
        inputs: documentIds.map(_docId => ({
          eventType: 'published_or_unpublished' as const,
          documentIds,
          masterRef,
          domain,
          secret
        }))
      };
    },

    handleEvent: async ctx => {
      // Attempt to fetch document details for richer output
      let client = new ContentApiClient({
        repositoryName: ctx.config.repositoryName,
        accessToken: ctx.auth.token
      });

      let firstDocId = ctx.input.documentIds[0] || '';
      let docDetails: any = null;

      try {
        docDetails = await client.getDocumentById(firstDocId, {
          ref: ctx.input.masterRef || undefined
        });
      } catch {
        // Document may have been unpublished and no longer queryable
      }

      return {
        type: 'document.changed',
        id: `doc_change_${ctx.input.masterRef}_${firstDocId}`,
        output: {
          documentId: firstDocId,
          documentType: docDetails?.type,
          uid: docDetails?.uid,
          tags: docDetails?.tags,
          lang: docDetails?.lang,
          masterRef: ctx.input.masterRef,
          domain: ctx.input.domain
        }
      };
    }
  })
  .build();
