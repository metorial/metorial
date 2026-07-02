import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentSentTrigger = SlateTrigger.create(spec, {
  name: 'Document Sent',
  key: 'document_sent',
  description: 'Triggers when a document has been sent out for signing.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document'),
      title: z.string().optional().describe('Title of the document'),
      status: z.string().optional().describe('Status of the document'),
      createdAt: z.string().optional().describe('ISO timestamp when the document was created')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the sent document'),
      title: z.string().optional().describe('Title of the document'),
      status: z.string().optional().describe('Current status of the document'),
      createdAt: z.string().optional().describe('ISO timestamp when the document was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let result = await client.listDocuments({
        orderingKey: 'createdAt',
        orderingDirection: 'DESC',
        searchType: 'documents',
        status: 'awaiting'
      });

      let items: any[] = result.items || result || [];
      if (!Array.isArray(items)) items = [];

      let newItems = lastPolledAt
        ? items.filter((doc: any) => doc.createdAt && doc.createdAt > lastPolledAt)
        : items;

      let latestTimestamp = newItems.length > 0 ? newItems[0].createdAt : lastPolledAt;

      return {
        inputs: newItems.map((doc: any) => ({
          documentId: doc.id?.toString() || '',
          title: doc.title || doc.name || undefined,
          status: doc.status || 'awaiting',
          createdAt: doc.createdAt || undefined
        })),
        updatedState: {
          lastPolledAt: latestTimestamp || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.sent',
        id: ctx.input.documentId,
        output: {
          documentId: ctx.input.documentId,
          title: ctx.input.title,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
