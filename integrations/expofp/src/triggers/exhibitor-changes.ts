import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exhibitorChanges = SlateTrigger.create(spec, {
  name: 'Exhibitor Changes',
  key: 'exhibitor_changes',
  description:
    'Polls for new or updated exhibitors on an event. Detects when exhibitors are added, removed, or their booth assignments change. Requires the eventId to be set in the provider configuration.'
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID'),
      changeType: z.enum(['added', 'removed', 'updated']).describe('Type of change detected'),
      exhibitorId: z.number().describe('Exhibitor ID'),
      name: z.string().describe('Exhibitor name'),
      externalId: z.string().describe('External ID'),
      boothNames: z.array(z.string()).describe('Current booth assignments')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('Exhibitor ID'),
      name: z.string().describe('Exhibitor name'),
      externalId: z.string().describe('External ID'),
      boothNames: z.array(z.string()).describe('Current booth assignments'),
      eventId: z.number().describe('Event ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let eventId = ctx.config.eventId;
      if (!eventId) {
        return { inputs: [], updatedState: ctx.state ?? {} };
      }

      let client = new Client(ctx.auth.token);
      let exhibitors = await client.listExhibitors(eventId);

      let previousState: Record<
        string,
        { name: string; externalId: string; boothNames: string[] }
      > =
        (ctx.state?.exhibitorMap as Record<
          string,
          { name: string; externalId: string; boothNames: string[] }
        >) ?? {};

      let currentMap: Record<
        string,
        { name: string; externalId: string; boothNames: string[] }
      > = {};
      let inputs: Array<{
        eventId: number;
        changeType: 'added' | 'removed' | 'updated';
        exhibitorId: number;
        name: string;
        externalId: string;
        boothNames: string[];
      }> = [];

      for (let exhibitor of exhibitors) {
        let key = String(exhibitor.id);
        currentMap[key] = {
          name: exhibitor.name,
          externalId: exhibitor.externalId ?? '',
          boothNames: exhibitor.boothNames ?? []
        };

        let prev = previousState[key];
        if (!prev) {
          inputs.push({
            eventId,
            changeType: 'added',
            exhibitorId: exhibitor.id,
            name: exhibitor.name,
            externalId: exhibitor.externalId ?? '',
            boothNames: exhibitor.boothNames ?? []
          });
        } else if (
          prev.name !== exhibitor.name ||
          prev.externalId !== (exhibitor.externalId ?? '') ||
          JSON.stringify(prev.boothNames) !== JSON.stringify(exhibitor.boothNames ?? [])
        ) {
          inputs.push({
            eventId,
            changeType: 'updated',
            exhibitorId: exhibitor.id,
            name: exhibitor.name,
            externalId: exhibitor.externalId ?? '',
            boothNames: exhibitor.boothNames ?? []
          });
        }
      }

      for (let key of Object.keys(previousState)) {
        if (!currentMap[key]) {
          let prev = previousState[key]!;
          inputs.push({
            eventId,
            changeType: 'removed',
            exhibitorId: Number(key),
            name: prev.name,
            externalId: prev.externalId,
            boothNames: prev.boothNames
          });
        }
      }

      return {
        inputs,
        updatedState: {
          exhibitorMap: currentMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `exhibitor.${ctx.input.changeType}`,
        id: `${ctx.input.eventId}-${ctx.input.exhibitorId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          exhibitorId: ctx.input.exhibitorId,
          name: ctx.input.name,
          externalId: ctx.input.externalId,
          boothNames: ctx.input.boothNames,
          eventId: ctx.input.eventId
        }
      };
    }
  })
  .build();
