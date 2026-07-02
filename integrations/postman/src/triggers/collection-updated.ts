import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let collectionUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Collection Updated',
  key: 'collection_updated',
  description:
    'Triggers when a Postman collection is updated. Polls the collections list and detects changes based on the updatedAt timestamp.'
})
  .input(
    z.object({
      collectionId: z.string(),
      collectionName: z.string(),
      uid: z.string().optional(),
      updatedAt: z.string()
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      collectionName: z.string(),
      uid: z.string().optional(),
      updatedAt: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let collections = await client.listCollections();

      let lastKnownUpdates: Record<string, string> = ctx.state?.lastKnownUpdates ?? {};
      let inputs: Array<{
        collectionId: string;
        collectionName: string;
        uid?: string;
        updatedAt: string;
      }> = [];
      let updatedState: Record<string, string> = {};

      for (let c of collections) {
        updatedState[c.id] = c.updatedAt ?? '';

        let previousUpdate = lastKnownUpdates[c.id];
        if (c.updatedAt && previousUpdate && c.updatedAt !== previousUpdate) {
          inputs.push({
            collectionId: c.id,
            collectionName: c.name,
            uid: c.uid,
            updatedAt: c.updatedAt
          });
        }

        // Track new collections that didn't exist before only if state already exists (not first run)
        if (c.updatedAt && !previousUpdate && Object.keys(lastKnownUpdates).length > 0) {
          inputs.push({
            collectionId: c.id,
            collectionName: c.name,
            uid: c.uid,
            updatedAt: c.updatedAt
          });
        }
      }

      return {
        inputs,
        updatedState: { lastKnownUpdates: updatedState }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'collection.updated',
        id: `${ctx.input.collectionId}-${ctx.input.updatedAt}`,
        output: {
          collectionId: ctx.input.collectionId,
          collectionName: ctx.input.collectionName,
          uid: ctx.input.uid,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
