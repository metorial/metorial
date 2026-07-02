import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let objectChanges = SlateTrigger.create(spec, {
  name: 'Object Changes',
  key: 'object_changes',
  description:
    'Detects new or updated objects in a Cloud Storage bucket by polling. Triggers when objects are created or overwritten.'
})
  .scopes(googleCloudStorageActionScopes.objectChanges)
  .input(
    z.object({
      eventType: z
        .enum(['object.created', 'object.updated'])
        .describe('Type of change detected'),
      objectName: z.string().describe('Name of the object'),
      bucketName: z.string().describe('Bucket containing the object'),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      storageClass: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      generation: z.string().optional(),
      metageneration: z.string().optional(),
      md5Hash: z.string().optional()
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      storageClass: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      generation: z.string().optional(),
      md5Hash: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        projectId: ctx.config.projectId
      });

      let pollingInput = (ctx.state as any)?.input || ctx.input;
      let bucketName = pollingInput?.bucketName;
      let prefix = pollingInput?.prefix;

      if (!bucketName) {
        return { inputs: [], updatedState: ctx.state };
      }

      let lastKnownObjects: Record<string, { generation: string; metageneration: string }> =
        (ctx.state as any)?.lastKnownObjects || {};
      let lastPollTime: string | null = (ctx.state as any)?.lastPollTime || null;

      let allObjects: any[] = [];
      let pageToken: string | undefined;

      do {
        let result = await client.listObjects(bucketName, {
          prefix,
          maxResults: 500,
          pageToken
        });
        if (result.items) {
          allObjects.push(...result.items);
        }
        pageToken = result.nextPageToken;
      } while (pageToken);

      let inputs: Array<{
        eventType: 'object.created' | 'object.updated';
        objectName: string;
        bucketName: string;
        sizeBytes?: string;
        contentType?: string;
        storageClass?: string;
        createdAt?: string;
        updatedAt?: string;
        generation?: string;
        metageneration?: string;
        md5Hash?: string;
      }> = [];

      // On first poll, just record state without emitting events
      if (lastPollTime !== null) {
        for (let obj of allObjects) {
          let known = lastKnownObjects[obj.name];
          if (!known) {
            inputs.push({
              eventType: 'object.created',
              objectName: obj.name,
              bucketName: obj.bucket,
              sizeBytes: obj.size,
              contentType: obj.contentType,
              storageClass: obj.storageClass,
              createdAt: obj.timeCreated,
              updatedAt: obj.updated,
              generation: obj.generation,
              metageneration: obj.metageneration,
              md5Hash: obj.md5Hash
            });
          } else if (
            known.generation !== obj.generation ||
            known.metageneration !== obj.metageneration
          ) {
            inputs.push({
              eventType:
                known.generation !== obj.generation ? 'object.created' : 'object.updated',
              objectName: obj.name,
              bucketName: obj.bucket,
              sizeBytes: obj.size,
              contentType: obj.contentType,
              storageClass: obj.storageClass,
              createdAt: obj.timeCreated,
              updatedAt: obj.updated,
              generation: obj.generation,
              metageneration: obj.metageneration,
              md5Hash: obj.md5Hash
            });
          }
        }
      }

      let newKnownObjects: Record<string, { generation: string; metageneration: string }> = {};
      for (let obj of allObjects) {
        newKnownObjects[obj.name] = {
          generation: obj.generation,
          metageneration: obj.metageneration
        };
      }

      return {
        inputs,
        updatedState: {
          input: pollingInput,
          lastKnownObjects: newKnownObjects,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.bucketName}/${ctx.input.objectName}/${ctx.input.generation || ctx.input.updatedAt || Date.now()}`,
        output: {
          objectName: ctx.input.objectName,
          bucketName: ctx.input.bucketName,
          sizeBytes: ctx.input.sizeBytes,
          contentType: ctx.input.contentType,
          storageClass: ctx.input.storageClass,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          generation: ctx.input.generation,
          md5Hash: ctx.input.md5Hash
        }
      };
    }
  })
  .build();
