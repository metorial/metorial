import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description:
    'Triggered when a member joins or is removed from the workspace. Configure the webhook in Mode Workspace Settings > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Mode event name')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of membership event: joined or removed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';

      if (
        eventName !== 'member_joined_organization' &&
        eventName !== 'member_removed_from_organization'
      ) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName } = ctx.input;

      let eventType = eventName === 'member_joined_organization' ? 'joined' : 'removed';
      let type =
        eventName === 'member_joined_organization' ? 'member.joined' : 'member.removed';

      return {
        type,
        id: `${eventName}_${Date.now()}`,
        output: {
          eventType
        }
      };
    }
  })
  .build();
