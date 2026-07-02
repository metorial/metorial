import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let boothChanges = SlateTrigger.create(spec, {
  name: 'Booth Changes',
  key: 'booth_changes',
  description:
    'Polls for changes to booths on an event. Detects when booth exhibitor assignments change or new booths appear. Requires the eventId to be set in the provider configuration.'
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID'),
      changeType: z.enum(['added', 'removed', 'updated']).describe('Type of change detected'),
      boothName: z.string().describe('Booth name'),
      exhibitors: z.array(z.string()).describe('Current exhibitor assignments'),
      isSpecialSection: z.boolean().describe('Whether booth is special section')
    })
  )
  .output(
    z.object({
      boothName: z.string().describe('Booth name'),
      exhibitors: z.array(z.string()).describe('Current exhibitor assignments'),
      isSpecialSection: z.boolean().describe('Whether booth is a special section'),
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
      let booths = await client.listBooths(eventId);

      let previousState: Record<string, { exhibitors: string[]; isSpecialSection: boolean }> =
        (ctx.state?.boothMap as Record<
          string,
          { exhibitors: string[]; isSpecialSection: boolean }
        >) ?? {};

      let currentMap: Record<string, { exhibitors: string[]; isSpecialSection: boolean }> = {};
      let inputs: Array<{
        eventId: number;
        changeType: 'added' | 'removed' | 'updated';
        boothName: string;
        exhibitors: string[];
        isSpecialSection: boolean;
      }> = [];

      for (let booth of booths) {
        currentMap[booth.name] = {
          exhibitors: booth.exhibitors ?? [],
          isSpecialSection: booth.isSpecialSection ?? false
        };

        let prev = previousState[booth.name];
        if (!prev) {
          inputs.push({
            eventId,
            changeType: 'added',
            boothName: booth.name,
            exhibitors: booth.exhibitors ?? [],
            isSpecialSection: booth.isSpecialSection ?? false
          });
        } else if (
          JSON.stringify(prev.exhibitors) !== JSON.stringify(booth.exhibitors ?? []) ||
          prev.isSpecialSection !== (booth.isSpecialSection ?? false)
        ) {
          inputs.push({
            eventId,
            changeType: 'updated',
            boothName: booth.name,
            exhibitors: booth.exhibitors ?? [],
            isSpecialSection: booth.isSpecialSection ?? false
          });
        }
      }

      for (let name of Object.keys(previousState)) {
        if (!currentMap[name]) {
          let prev = previousState[name]!;
          inputs.push({
            eventId,
            changeType: 'removed',
            boothName: name,
            exhibitors: prev.exhibitors,
            isSpecialSection: prev.isSpecialSection
          });
        }
      }

      return {
        inputs,
        updatedState: {
          boothMap: currentMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `booth.${ctx.input.changeType}`,
        id: `${ctx.input.eventId}-${ctx.input.boothName}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          boothName: ctx.input.boothName,
          exhibitors: ctx.input.exhibitors,
          isSpecialSection: ctx.input.isSpecialSection,
          eventId: ctx.input.eventId
        }
      };
    }
  })
  .build();
