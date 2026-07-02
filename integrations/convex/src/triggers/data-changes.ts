import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let dataChanges = SlateTrigger.create(spec, {
  name: 'Data Changes',
  key: 'data_changes',
  description:
    'Polls for document-level changes (inserts, updates, deletes) across all tables in a Convex deployment using the Streaming Export API. Requires deploy key authentication.'
})
  .input(
    z.object({
      tableName: z.string().describe('The table where the change occurred'),
      documentId: z.string().describe('The ID of the affected document'),
      document: z
        .any()
        .nullable()
        .describe('The document data after the change, or null if deleted'),
      deleted: z.boolean().describe('Whether the document was deleted'),
      timestamp: z.string().describe('Timestamp of the change')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('The table where the change occurred'),
      documentId: z.string().describe('The ID of the affected document'),
      document: z
        .any()
        .nullable()
        .describe('The document data after the change, or null if deleted'),
      deleted: z.boolean().describe('Whether the document was deleted'),
      timestamp: z.string().describe('Timestamp of the change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ConvexClient({
        deploymentUrl: ctx.config.deploymentUrl,
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let cursor = ctx.state?.cursor as string | undefined;

      let result = await client.documentDeltas({ cursor });
      let allValues = result.values || [];
      let latestCursor = result.cursor;

      // If there are more pages, keep fetching (up to a reasonable limit)
      let hasMore = result.hasMore;
      let fetchCount = 0;
      while (hasMore && fetchCount < 10) {
        let nextResult = await client.documentDeltas({ cursor: latestCursor });
        allValues = allValues.concat(nextResult.values || []);
        latestCursor = nextResult.cursor;
        hasMore = nextResult.hasMore;
        fetchCount++;
      }

      let inputs = allValues.map((delta: any) => ({
        tableName: delta._tableName || delta.tableName || '',
        documentId: delta._id || delta.documentId || '',
        document: delta._deleted ? null : delta,
        deleted: !!delta._deleted,
        timestamp: delta._ts ? String(delta._ts) : ''
      }));

      return {
        inputs,
        updatedState: {
          cursor: latestCursor
        }
      };
    },

    handleEvent: async ctx => {
      let changeType = ctx.input.deleted ? 'deleted' : 'updated';

      return {
        type: `document.${changeType}`,
        id: `${ctx.input.tableName}:${ctx.input.documentId}:${ctx.input.timestamp}`,
        output: {
          tableName: ctx.input.tableName,
          documentId: ctx.input.documentId,
          document: ctx.input.document,
          deleted: ctx.input.deleted,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
