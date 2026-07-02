import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let crmObjectChanges = SlateTrigger.create(spec, {
  name: 'CRM Object Changes',
  key: 'crm_object_changes',
  description:
    '[Polling fallback] Triggers when CRM objects (contacts, companies, deals, tickets) are created or modified in HubSpot. Polls for recently modified records. Prefer CRM Object Changes (Webhook) when HubSpot app webhooks are configured.'
})
  .scopes(hubSpotActionScopes.crmObjectChanges)
  .input(
    z.object({
      objectType: z
        .string()
        .describe('CRM object type (e.g., contacts, companies, deals, tickets)'),
      objectId: z.string().describe('HubSpot object ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the object was created or updated'),
      properties: z.record(z.string(), z.any()).describe('Current object properties'),
      modifiedAt: z.string().describe('Timestamp of modification'),
      createdAt: z.string().describe('Timestamp of creation')
    })
  )
  .output(
    z.object({
      objectType: z.string().describe('CRM object type'),
      objectId: z.string().describe('HubSpot object ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the object was created or updated'),
      properties: z.record(z.string(), z.any()).describe('Current object properties'),
      modifiedAt: z.string().describe('Timestamp of modification'),
      createdAt: z.string().describe('Timestamp of creation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HubSpotClient(ctx.auth.token);
      let objectTypes = ['contacts', 'companies', 'deals', 'tickets'];
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let allInputs: Array<{
        objectType: string;
        objectId: string;
        changeType: 'created' | 'updated';
        properties: Record<string, any>;
        modifiedAt: string;
        createdAt: string;
      }> = [];

      let newLastPollTime = lastPollTime;

      for (let objectType of objectTypes) {
        try {
          let result = await client.getRecentlyModified(objectType, lastPollTime, 50);
          let results = result.results || [];

          for (let record of results) {
            let modifiedAt = record.properties?.hs_lastmodifieddate || record.updatedAt || '';
            let createdAt = record.properties?.createdate || record.createdAt || '';

            let isNew =
              !lastPollTime ||
              (createdAt &&
                createdAt >= lastPollTime &&
                Math.abs(new Date(createdAt).getTime() - new Date(modifiedAt).getTime()) <
                  5000);

            allInputs.push({
              objectType,
              objectId: record.id,
              changeType: isNew ? 'created' : 'updated',
              properties: record.properties || {},
              modifiedAt,
              createdAt
            });

            if (!newLastPollTime || modifiedAt > newLastPollTime) {
              newLastPollTime = modifiedAt;
            }
          }
        } catch (_e) {
          // Skip object types that fail (e.g., insufficient permissions)
        }
      }

      // If this is the first poll and no lastPollTime, set it to now to avoid re-triggering
      if (!lastPollTime && allInputs.length === 0) {
        newLastPollTime = new Date().toISOString();
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: newLastPollTime || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.objectType}.${ctx.input.changeType}`,
        id: `${ctx.input.objectType}-${ctx.input.objectId}-${ctx.input.modifiedAt}`,
        output: {
          objectType: ctx.input.objectType,
          objectId: ctx.input.objectId,
          changeType: ctx.input.changeType,
          properties: ctx.input.properties,
          modifiedAt: ctx.input.modifiedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
