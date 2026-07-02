import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let connectionEvents = SlateTrigger.create(spec, {
  name: 'Connection Events',
  key: 'connection_events',
  description:
    'Triggers on connection sync events: sync started, sync progress, sync finished, and connection/partition limit exceeded.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from the webhook payload'),
      nonce: z.string().describe('Unique idempotency nonce'),
      connectionId: z.string().optional().describe('Connection ID'),
      syncId: z.string().optional().describe('Sync ID'),
      partition: z.string().nullable().optional().describe('Partition'),
      createCount: z.number().optional().describe('Documents to create'),
      createdCount: z.number().optional().describe('Documents created so far'),
      updateCount: z.number().optional().describe('Documents to update'),
      updatedCount: z.number().optional().describe('Documents updated so far'),
      deleteCount: z.number().optional().describe('Documents to delete'),
      deletedCount: z.number().optional().describe('Documents deleted so far'),
      erroredCount: z.number().optional().describe('Documents that errored')
    })
  )
  .output(
    z.object({
      connectionId: z.string().optional().describe('ID of the affected connection'),
      syncId: z.string().optional().describe('Sync operation ID'),
      partition: z.string().nullable().optional().describe('Partition'),
      createCount: z.number().optional().describe('Documents to create'),
      createdCount: z.number().optional().describe('Documents created so far'),
      updateCount: z.number().optional().describe('Documents to update'),
      updatedCount: z.number().optional().describe('Documents updated so far'),
      deleteCount: z.number().optional().describe('Documents to delete'),
      deletedCount: z.number().optional().describe('Documents deleted so far'),
      erroredCount: z.number().optional().describe('Documents that errored')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        partition: ctx.config.partition
      });

      let endpoint = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Connection Events',
        partitionPattern: ctx.config.partition || undefined
      });

      return {
        registrationDetails: {
          endpointId: endpoint.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        partition: ctx.config.partition
      });

      if (ctx.input.registrationDetails?.endpointId) {
        await client.deleteWebhookEndpoint(ctx.input.registrationDetails.endpointId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType: string = body.type || '';
      let nonce: string = body.nonce || '';
      let payload = body.payload || {};

      let isConnectionEvent = [
        'connection_sync_started',
        'connection_sync_progress',
        'connection_sync_finished',
        'connection_limit_exceeded',
        'partition_limit_exceeded'
      ].includes(eventType);

      if (!isConnectionEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            nonce,
            connectionId: payload.connection_id,
            syncId: payload.sync_id,
            partition: payload.partition ?? null,
            createCount: payload.create_count,
            createdCount: payload.created_count,
            updateCount: payload.update_count,
            updatedCount: payload.updated_count,
            deleteCount: payload.delete_count,
            deletedCount: payload.deleted_count,
            erroredCount: payload.errored_count
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.nonce,
        output: {
          connectionId: ctx.input.connectionId,
          syncId: ctx.input.syncId,
          partition: ctx.input.partition,
          createCount: ctx.input.createCount,
          createdCount: ctx.input.createdCount,
          updateCount: ctx.input.updateCount,
          updatedCount: ctx.input.updatedCount,
          deleteCount: ctx.input.deleteCount,
          deletedCount: ctx.input.deletedCount,
          erroredCount: ctx.input.erroredCount
        }
      };
    }
  })
  .build();
