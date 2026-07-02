import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let legendEvents = SlateTrigger.create(spec, {
  name: 'Legend Changed',
  key: 'legend_changed',
  description:
    'Triggered when the color legend of a Storm is modified. Configure the webhook URL in Stormboard account settings (My Account → Webhooks).',
  instructions: [
    'Configure the webhook in your Stormboard account at My Account → Webhooks.',
    'Set the Payload URL to the provided webhook URL and select "Legend Change" events.'
  ]
})
  .input(
    z.object({
      eventId: z.number().describe('Unique event ID'),
      date: z.string().describe('Event timestamp'),
      stormId: z.number().describe('Storm ID'),
      stormTitle: z.string().describe('Storm title'),
      colour: z.string().describe('Updated legend color'),
      legendName: z.string().describe('Updated legend label name'),
      userId: z.number().optional().describe('User ID'),
      userName: z.string().optional().describe('Name of the user'),
      userFullName: z.string().optional().describe('Full name of the user')
    })
  )
  .output(
    z.object({
      stormId: z.number().describe('ID of the Storm'),
      stormTitle: z.string().describe('Title of the Storm'),
      colour: z.string().describe('Updated legend color'),
      legendName: z.string().describe('Updated legend label name'),
      userId: z.number().optional().describe('User ID'),
      userName: z.string().optional().describe('Name of the user'),
      userFullName: z.string().optional().describe('Full name of the user')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = Array.isArray(body) ? body : [body];

      let inputs = events
        .filter((evt: any) => evt.type === 'LegendChange')
        .map((evt: any) => ({
          eventId: evt.id,
          date: evt.date,
          stormId: evt.storm?.id,
          stormTitle: evt.storm?.title,
          colour: evt.to?.colour,
          legendName: evt.to?.name,
          userId: evt.user?.id,
          userName: evt.user?.name,
          userFullName: evt.user?.full
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'legend.changed',
        id: `${ctx.input.eventId}`,
        output: {
          stormId: ctx.input.stormId,
          stormTitle: ctx.input.stormTitle,
          colour: ctx.input.colour,
          legendName: ctx.input.legendName,
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          userFullName: ctx.input.userFullName
        }
      };
    }
  })
  .build();
