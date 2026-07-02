import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import * as dns from '../lib/dns';
import { spec } from '../spec';

export let dnsZoneChanges = SlateTrigger.create(spec, {
  name: 'DNS Zone Changes',
  key: 'dns_zone_changes',
  description: 'Triggers when DNS zones are created or deleted in a Yandex Cloud folder.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'deleted']).describe('Type of change detected'),
      eventId: z.string().describe('Unique event identifier'),
      dnsZoneId: z.string().describe('DNS zone ID'),
      name: z.string().optional().describe('Zone name'),
      zone: z.string().optional().describe('DNS zone domain'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Zone creation timestamp')
    })
  )
  .output(
    z.object({
      dnsZoneId: z.string().describe('DNS zone ID'),
      name: z.string().optional().describe('Zone name'),
      zone: z.string().optional().describe('DNS zone domain'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Zone creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let folderId = ctx.config.folderId;
      if (!folderId) return { inputs: [], updatedState: ctx.state };

      let result = await dns.listDnsZones(ctx.auth, folderId, 1000);
      let zones: any[] = result.dnsZones || [];

      let previousIds: string[] = ctx.state?.zoneIds || [];
      let previousSet = new Set(previousIds);
      let inputs: any[] = [];
      let currentIds: string[] = [];

      for (let zone of zones) {
        currentIds.push(zone.id);
        if (!previousSet.has(zone.id)) {
          inputs.push({
            eventType: 'created' as const,
            eventId: `${zone.id}-created-${Date.now()}`,
            dnsZoneId: zone.id,
            name: zone.name,
            zone: zone.zone,
            folderId: zone.folderId,
            createdAt: zone.createdAt
          });
        }
      }

      let currentSet = new Set(currentIds);
      for (let id of previousIds) {
        if (!currentSet.has(id)) {
          inputs.push({
            eventType: 'deleted' as const,
            eventId: `${id}-deleted-${Date.now()}`,
            dnsZoneId: id,
            folderId
          });
        }
      }

      return {
        inputs,
        updatedState: { zoneIds: currentIds }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `dns_zone.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          dnsZoneId: ctx.input.dnsZoneId,
          name: ctx.input.name,
          zone: ctx.input.zone,
          folderId: ctx.input.folderId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
