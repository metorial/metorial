import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let newPortal = SlateTrigger.create(spec, {
  name: 'New ConvertHub Portal',
  key: 'new_converthub_portal',
  description:
    'Triggers when a new ConvertHub Portal is created in Deadline Funnel. Portals provide social proof displays, opt-in forms, microsurveys, and analytics on any website page.'
})
  .input(
    z.object({
      portalId: z.string().describe('Unique identifier of the portal'),
      portalName: z.string().describe('Name of the portal'),
      createdAt: z.string().describe('When the portal was created')
    })
  )
  .output(
    z.object({
      portalId: z.string().describe('Unique identifier of the portal'),
      portalName: z.string().describe('Name of the portal'),
      createdAt: z.string().describe('When the portal was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DeadlineFunnelClient({ token: ctx.auth.token });
      let lastTimestamp = (ctx.state as any)?.lastTimestamp || '';

      let portals = await client.listPortals({
        since: lastTimestamp || undefined
      });

      let inputs = portals.map(p => ({
        portalId: p.portalId,
        portalName: p.name,
        createdAt: p.createdAt
      }));

      let newLastTimestamp = portals.length > 0 ? portals[0]!.createdAt : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'portal.created',
        id: ctx.input.portalId,
        output: {
          portalId: ctx.input.portalId,
          portalName: ctx.input.portalName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
