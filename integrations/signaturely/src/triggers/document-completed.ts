import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Document Completed',
  key: 'document_completed',
  description: 'Triggers when a document has been fully signed by all parties.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document'),
      title: z.string().optional().describe('Title of the document'),
      status: z.string().optional().describe('Status of the document'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the document was last updated')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the completed document'),
      title: z.string().optional().describe('Title of the document'),
      status: z.string().optional().describe('Current status of the document'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the document was last updated')
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
        orderingKey: 'updatedAt',
        orderingDirection: 'DESC',
        searchType: 'documents',
        status: 'completed'
      });

      let items: any[] = result.items || result || [];
      if (!Array.isArray(items)) items = [];

      let newItems = lastPolledAt
        ? items.filter((doc: any) => doc.updatedAt && doc.updatedAt > lastPolledAt)
        : items;

      let latestTimestamp = newItems.length > 0 ? newItems[0].updatedAt : lastPolledAt;

      return {
        inputs: newItems.map((doc: any) => ({
          documentId: doc.id?.toString() || '',
          title: doc.title || doc.name || undefined,
          status: doc.status || 'completed',
          updatedAt: doc.updatedAt || undefined
        })),
        updatedState: {
          lastPolledAt: latestTimestamp || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.completed',
        id: ctx.input.documentId,
        output: {
          documentId: ctx.input.documentId,
          title: ctx.input.title,
          status: ctx.input.status,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
