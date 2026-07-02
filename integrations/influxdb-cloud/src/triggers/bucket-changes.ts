import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let bucketOutputSchema = z.object({
  bucketId: z.string().describe('Bucket ID'),
  name: z.string().describe('Bucket name'),
  description: z.string().optional().describe('Bucket description'),
  orgId: z.string().optional().describe('Organization ID'),
  retentionSeconds: z.number().optional().describe('Retention period in seconds'),
  type: z.string().optional().describe('Bucket type'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let bucketChangesTrigger = SlateTrigger.create(spec, {
  name: 'Bucket Changes',
  key: 'bucket_changes',
  description:
    'Polls for changes to buckets in the organization. Detects when buckets are created, updated, or deleted.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      bucketId: z.string().describe('Bucket ID'),
      name: z.string().describe('Bucket name'),
      description: z.string().optional().describe('Bucket description'),
      orgId: z.string().optional().describe('Organization ID'),
      retentionSeconds: z.number().optional().describe('Retention period in seconds'),
      type: z.string().optional().describe('Bucket type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(bucketOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let result = await client.listBuckets({ limit: 100 });
      let currentBuckets = (result.buckets || []) as any[];

      let previousBucketMap: Record<string, any> = (ctx.state as any)?.bucketMap || {};
      let isFirstPoll = !(ctx.state as any)?.bucketMap;
      let inputs: any[] = [];

      let currentBucketMap: Record<string, any> = {};

      for (let bucket of currentBuckets) {
        let retentionSeconds = bucket.retentionRules?.[0]?.everySeconds;

        currentBucketMap[bucket.id] = {
          bucketId: bucket.id,
          name: bucket.name,
          description: bucket.description,
          orgId: bucket.orgID,
          retentionSeconds,
          type: bucket.type,
          createdAt: bucket.createdAt,
          updatedAt: bucket.updatedAt
        };

        if (!isFirstPoll) {
          let previous = previousBucketMap[bucket.id];
          if (!previous) {
            inputs.push({
              changeType: 'created' as const,
              ...currentBucketMap[bucket.id]
            });
          } else if (previous.updatedAt !== bucket.updatedAt) {
            inputs.push({
              changeType: 'updated' as const,
              ...currentBucketMap[bucket.id]
            });
          }
        }
      }

      if (!isFirstPoll) {
        for (let [bucketId, prevBucket] of Object.entries(previousBucketMap)) {
          if (!currentBucketMap[bucketId]) {
            inputs.push({
              changeType: 'deleted' as const,
              ...prevBucket
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          bucketMap: currentBucketMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `bucket.${ctx.input.changeType}`,
        id: `${ctx.input.bucketId}-${ctx.input.changeType}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          bucketId: ctx.input.bucketId,
          name: ctx.input.name,
          description: ctx.input.description,
          orgId: ctx.input.orgId,
          retentionSeconds: ctx.input.retentionSeconds,
          type: ctx.input.type,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
