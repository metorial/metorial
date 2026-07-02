import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { conciseDocSchema } from '../lib/types';
import { spec } from '../spec';

export let docEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'doc_events',
  description:
    'Triggers when documents are created or updated in Dart. Polls for recently changed documents and emits events for new and modified docs.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of document event'),
      docId: z.string().describe('Document ID'),
      doc: z.any().describe('Document data from API')
    })
  )
  .output(conciseDocSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownDocIds = (ctx.state?.knownDocIds as string[] | undefined) ?? [];

      let now = new Date().toISOString();

      let params: Record<string, any> = {
        ordering: ['-updated_at'],
        limit: 50,
        noDefaults: true
      };

      // The docs list endpoint doesn't have an updated_at_after filter,
      // so we fetch recent docs and compare against known IDs
      let result = await client.listDocs(params);

      let inputs = result.results.map(doc => {
        let isNew = !knownDocIds.includes(doc.docId);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          docId: doc.docId,
          doc
        };
      });

      // On first poll, don't emit events for existing docs
      if (!lastPollTime) {
        inputs = [];
      }

      let newKnownIds = [
        ...new Set([...knownDocIds, ...result.results.map(d => d.docId)])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownDocIds: newKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let doc = ctx.input.doc;
      return {
        type: `doc.${ctx.input.eventType}`,
        id: `${ctx.input.docId}-${ctx.input.eventType}-${Date.now()}`,
        output: doc
      };
    }
  })
  .build();
