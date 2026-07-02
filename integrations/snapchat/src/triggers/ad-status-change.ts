import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

export let adStatusChange = SlateTrigger.create(spec, {
  name: 'Ad Updates',
  key: 'ad_updates',
  description:
    'Triggers when ads are created or updated under a Snapchat ad squad. Detects changes to ad status, creative associations, and other properties by polling.',
  instructions: [
    'Set the adSquadId in the global configuration to specify which ad squad to monitor.'
  ]
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the ad was created or updated'),
      adId: z.string().describe('ID of the ad'),
      adSquadId: z.string().optional().describe('Parent ad squad ID'),
      creativeId: z.string().optional().describe('Associated creative ID'),
      name: z.string().optional().describe('Ad name'),
      status: z.string().optional().describe('Ad status'),
      type: z.string().optional().describe('Ad type'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      adId: z.string().describe('ID of the ad'),
      adSquadId: z.string().optional().describe('Parent ad squad ID'),
      creativeId: z.string().optional().describe('Associated creative ID'),
      name: z.string().optional().describe('Ad name'),
      status: z.string().optional().describe('Ad status'),
      type: z.string().optional().describe('Ad type'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let adSquadId = ctx.config.adSquadId;
      if (!adSquadId) {
        return { inputs: [] };
      }

      let client = new SnapchatClient(ctx.auth.token);
      let ads = (await client.listAds(adSquadId)).items;

      let previousState: Record<string, string> =
        (ctx.input.state as Record<string, string>) ?? {};
      let inputs: any[] = [];

      for (let ad of ads) {
        let prevUpdatedAt = previousState[ad.id];
        let currentUpdatedAt = ad.updated_at;

        if (!prevUpdatedAt) {
          inputs.push({
            eventType: 'created' as const,
            adId: ad.id,
            adSquadId: ad.ad_squad_id,
            creativeId: ad.creative_id,
            name: ad.name,
            status: ad.status,
            type: ad.type,
            updatedAt: ad.updated_at,
            createdAt: ad.created_at
          });
        } else if (currentUpdatedAt && currentUpdatedAt !== prevUpdatedAt) {
          inputs.push({
            eventType: 'updated' as const,
            adId: ad.id,
            adSquadId: ad.ad_squad_id,
            creativeId: ad.creative_id,
            name: ad.name,
            status: ad.status,
            type: ad.type,
            updatedAt: ad.updated_at,
            createdAt: ad.created_at
          });
        }
      }

      let updatedState: Record<string, string> = {};
      for (let ad of ads) {
        if (ad.updated_at) {
          updatedState[ad.id] = ad.updated_at;
        }
      }

      return {
        inputs,
        updatedState
      };
    },

    handleEvent: async ctx => {
      return {
        type: `ad.${ctx.input.eventType}`,
        id: `${ctx.input.adId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          adId: ctx.input.adId,
          adSquadId: ctx.input.adSquadId,
          creativeId: ctx.input.creativeId,
          name: ctx.input.name,
          status: ctx.input.status,
          type: ctx.input.type,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
