import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let zoneStatusChangesTrigger = SlateTrigger.create(spec, {
  name: 'Zone Status Changes',
  key: 'zone_status_changes',
  description:
    '[Polling fallback] Polls for changes in zone status (e.g. active, pending, moved). Detects when zones are added, removed, or change their activation status.'
})
  .input(
    z.object({
      changeType: z.enum(['added', 'status_changed', 'removed']).describe('Type of change'),
      zoneId: z.string().describe('Zone ID'),
      zoneName: z.string().describe('Zone domain name'),
      status: z.string().describe('Current zone status'),
      previousStatus: z.string().optional().describe('Previous zone status'),
      paused: z.boolean().optional().describe('Whether the zone is paused')
    })
  )
  .output(
    z.object({
      zoneId: z.string().describe('Zone ID'),
      zoneName: z.string().describe('Zone domain name'),
      changeType: z.string().describe('Type of change: added, status_changed, or removed'),
      status: z.string().describe('Current zone status'),
      previousStatus: z.string().optional().describe('Previous zone status, if changed'),
      paused: z.boolean().optional().describe('Whether the zone is paused')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth);
      let response = await client.listZones({
        accountId: ctx.config.accountId,
        perPage: 50
      });

      let currentZones: Record<string, any> = {};
      for (let z of response.result) {
        currentZones[z.id] = {
          zoneId: z.id,
          zoneName: z.name,
          status: z.status,
          paused: z.paused
        };
      }

      let previousZones: Record<string, any> = ctx.state?.zones || {};
      let inputs: any[] = [];

      for (let [zoneId, zone] of Object.entries(currentZones)) {
        let prev = previousZones[zoneId];
        if (!prev) {
          if (ctx.state?.zones) {
            inputs.push({ ...zone, changeType: 'added' as const });
          }
        } else if (prev.status !== zone.status) {
          inputs.push({
            ...zone,
            changeType: 'status_changed' as const,
            previousStatus: prev.status
          });
        }
      }

      if (ctx.state?.zones) {
        for (let [zoneId, zone] of Object.entries(previousZones)) {
          if (!currentZones[zoneId]) {
            inputs.push({ ...zone, changeType: 'removed' as const });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          zones: currentZones
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `zone.${ctx.input.changeType}`,
        id: `${ctx.input.zoneId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          zoneId: ctx.input.zoneId,
          zoneName: ctx.input.zoneName,
          changeType: ctx.input.changeType,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          paused: ctx.input.paused
        }
      };
    }
  })
  .build();
