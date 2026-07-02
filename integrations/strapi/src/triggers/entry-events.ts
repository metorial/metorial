import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let entryEvents = SlateTrigger.create(spec, {
  name: 'Entry Events',
  key: 'entry_events',
  description:
    'Triggered when content entries are created, updated, deleted, published, or unpublished. Configure a webhook in Strapi (Settings → Webhooks) pointing to the provided URL and select the entry events to listen for.'
})
  .input(
    z.object({
      event: z.string().describe('The event type (e.g., "entry.create", "entry.update")'),
      model: z.string().describe('The content type model name'),
      uid: z.string().describe('The content type UID (e.g., "api::article.article")'),
      entryDocumentId: z.string().optional().describe('Document ID of the affected entry'),
      entryData: z.record(z.string(), z.any()).describe('The entry data'),
      createdAt: z.string().describe('Timestamp of the event')
    })
  )
  .output(
    z.object({
      model: z.string().describe('The content type model name'),
      contentTypeUid: z
        .string()
        .describe('The content type UID (e.g., "api::article.article")'),
      entryDocumentId: z.string().optional().describe('Document ID of the affected entry'),
      entryData: z.record(z.string(), z.any()).describe('The entry data'),
      createdAt: z.string().describe('Timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.event ?? '';
      let model = body?.model ?? '';
      let uid = body?.uid ?? '';
      let entry = body?.entry ?? {};
      let createdAt = body?.createdAt ?? new Date().toISOString();
      let entryDocumentId = entry?.documentId ?? entry?.id?.toString();

      return {
        inputs: [
          {
            event,
            model,
            uid,
            entryDocumentId,
            entryData: entry,
            createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'entry.unknown';
      let uniqueId = `${eventType}-${ctx.input.entryDocumentId ?? 'unknown'}-${ctx.input.createdAt}`;

      return {
        type: eventType,
        id: uniqueId,
        output: {
          model: ctx.input.model,
          contentTypeUid: ctx.input.uid,
          entryDocumentId: ctx.input.entryDocumentId,
          entryData: ctx.input.entryData,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
