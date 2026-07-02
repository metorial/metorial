import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let syncEvents = SlateTrigger.create(spec, {
  name: 'Sync Events',
  key: 'sync_events',
  description:
    'Monitors sync execution status across integrations. Fires events when syncs complete (successfully or with errors), detecting state transitions like SUCCESS, ERROR, RUNNING, PAUSED, or STOPPED.'
})
  .input(
    z.object({
      eventType: z
        .enum(['completed', 'errored', 'started', 'paused', 'stopped'])
        .describe('Type of sync state change'),
      syncId: z.string().describe('Unique sync identifier'),
      syncStatus: z.string().describe('Current sync status'),
      providerConfigKey: z.string().describe('The integration ID'),
      connectionId: z.string().optional().describe('The connection ID if applicable'),
      finishedAt: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp of most recent completion'),
      frequency: z.string().describe('Sync execution schedule'),
      latestResult: z
        .object({
          added: z.number(),
          updated: z.number(),
          deleted: z.number()
        })
        .describe('Record counts from the latest sync run')
    })
  )
  .output(
    z.object({
      syncId: z.string().describe('Unique sync identifier'),
      syncStatus: z.string().describe('Current sync status (SUCCESS, ERROR, RUNNING, etc.)'),
      providerConfigKey: z.string().describe('The integration ID'),
      connectionId: z.string().optional().describe('The connection ID if applicable'),
      finishedAt: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp of most recent completion'),
      frequency: z.string().describe('Sync execution schedule'),
      recordsAdded: z.number().describe('Number of records added in the latest run'),
      recordsUpdated: z.number().describe('Number of records updated in the latest run'),
      recordsDeleted: z.number().describe('Number of records deleted in the latest run')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NangoClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      // First get all integrations to iterate over their syncs
      let integrationsResult = await client.listIntegrations();
      let previousSyncStates: Record<string, { status: string; finishedAt: string | null }> =
        ctx.state?.syncStates ?? {};
      let currentSyncStates: Record<string, { status: string; finishedAt: string | null }> =
        {};

      let inputs: {
        eventType: 'completed' | 'errored' | 'started' | 'paused' | 'stopped';
        syncId: string;
        syncStatus: string;
        providerConfigKey: string;
        connectionId?: string;
        finishedAt: string | null;
        frequency: string;
        latestResult: { added: number; updated: number; deleted: number };
      }[] = [];

      for (let integration of integrationsResult.data) {
        try {
          let statusResult = await client.getSyncStatus({
            provider_config_key: integration.unique_key,
            syncs: '*'
          });

          for (let sync of statusResult.syncs) {
            let stateKey = `${integration.unique_key}::${sync.id}`;
            currentSyncStates[stateKey] = {
              status: sync.status,
              finishedAt: sync.finished_at
            };

            let prevState = previousSyncStates[stateKey];
            if (!prevState) continue; // First poll, just record state

            // Detect status change or new completion
            let statusChanged = prevState.status !== sync.status;
            let newCompletion = sync.finished_at && prevState.finishedAt !== sync.finished_at;

            if (statusChanged || newCompletion) {
              let eventType: 'completed' | 'errored' | 'started' | 'paused' | 'stopped';
              if (sync.status === 'SUCCESS') eventType = 'completed';
              else if (sync.status === 'ERROR') eventType = 'errored';
              else if (sync.status === 'RUNNING') eventType = 'started';
              else if (sync.status === 'PAUSED') eventType = 'paused';
              else if (sync.status === 'STOPPED') eventType = 'stopped';
              else eventType = 'completed';

              inputs.push({
                eventType,
                syncId: sync.id,
                syncStatus: sync.status,
                providerConfigKey: integration.unique_key,
                finishedAt: sync.finished_at,
                frequency: sync.frequency,
                latestResult: sync.latest_result ?? { added: 0, updated: 0, deleted: 0 }
              });
            }
          }
        } catch (err) {
          ctx.warn(
            `Failed to fetch sync status for integration ${integration.unique_key}: ${err}`
          );
        }
      }

      return {
        inputs,
        updatedState: {
          syncStates: currentSyncStates
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `sync.${ctx.input.eventType}`,
        id: `${ctx.input.syncId}::${ctx.input.eventType}::${ctx.input.finishedAt ?? Date.now()}`,
        output: {
          syncId: ctx.input.syncId,
          syncStatus: ctx.input.syncStatus,
          providerConfigKey: ctx.input.providerConfigKey,
          connectionId: ctx.input.connectionId,
          finishedAt: ctx.input.finishedAt,
          frequency: ctx.input.frequency,
          recordsAdded: ctx.input.latestResult.added,
          recordsUpdated: ctx.input.latestResult.updated,
          recordsDeleted: ctx.input.latestResult.deleted
        }
      };
    }
  })
  .build();
