import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let objectChangesTrigger = SlateTrigger.create(spec, {
  name: 'Object Changes',
  key: 'object_changes',
  description:
    'Polls an S3 bucket for new or modified objects. Detects objects created or updated since the last poll based on the LastModified timestamp.'
})
  .input(
    z.object({
      objectKey: z.string().describe('Key of the changed object'),
      lastModified: z.string().describe('When the object was last modified'),
      eTag: z.string().describe('Entity tag of the object'),
      sizeBytes: z.number().describe('Size of the object in bytes'),
      storageClass: z.string().describe('Storage class of the object'),
      bucketName: z.string().describe('Bucket containing the object')
    })
  )
  .output(
    z.object({
      objectKey: z.string().describe('Key of the changed object'),
      bucketName: z.string().describe('Bucket containing the object'),
      lastModified: z.string().describe('When the object was last modified'),
      eTag: z.string().describe('Entity tag (hash) of the object'),
      sizeBytes: z.number().describe('Size of the object in bytes'),
      storageClass: z.string().describe('Storage class of the object')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new S3Client({
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken,
        region: ctx.config.region
      });

      let state = ctx.state || {};
      let lastPollTime = state.lastPollTime as string | undefined;
      let monitoredBucket = state.monitoredBucket as string | undefined;
      let prefix = state.prefix as string | undefined;

      // If no bucket is configured yet, try listing buckets and picking the first one
      // In practice, the state should be set up with the target bucket before first poll
      if (!monitoredBucket) {
        let buckets = await client.listBuckets();
        if (buckets.length === 0) {
          return {
            inputs: [],
            updatedState: { ...state, lastPollTime: new Date().toISOString() }
          };
        }
        monitoredBucket = buckets[0]!.bucketName;
      }

      let allObjects: Array<{
        objectKey: string;
        lastModified: string;
        eTag: string;
        sizeBytes: number;
        storageClass: string;
        bucketName: string;
      }> = [];

      let continuationToken: string | undefined;
      let hasMore = true;

      while (hasMore) {
        let result = await client.listObjects(monitoredBucket!, {
          prefix,
          maxKeys: 1000,
          continuationToken
        });

        for (let obj of result.objects) {
          // Only include objects modified after the last poll time
          if (!lastPollTime || obj.lastModified > lastPollTime) {
            allObjects.push({
              objectKey: obj.objectKey,
              lastModified: obj.lastModified,
              eTag: obj.eTag,
              sizeBytes: obj.sizeBytes,
              storageClass: obj.storageClass,
              bucketName: monitoredBucket!
            });
          }
        }

        hasMore = result.isTruncated;
        continuationToken = result.nextContinuationToken;

        // Safety limit to avoid excessive API calls
        if (allObjects.length > 5000) break;
      }

      // Sort by lastModified descending so newest are first
      allObjects.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

      let newLastPollTime =
        allObjects.length > 0
          ? allObjects[0]!.lastModified
          : lastPollTime || new Date().toISOString();

      return {
        inputs: allObjects,
        updatedState: {
          ...state,
          lastPollTime: newLastPollTime,
          monitoredBucket,
          prefix
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'object.modified',
        id: `${ctx.input.bucketName}/${ctx.input.objectKey}@${ctx.input.eTag}`,
        output: {
          objectKey: ctx.input.objectKey,
          bucketName: ctx.input.bucketName,
          lastModified: ctx.input.lastModified,
          eTag: ctx.input.eTag,
          sizeBytes: ctx.input.sizeBytes,
          storageClass: ctx.input.storageClass
        }
      };
    }
  })
  .build();
