import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let actorSchema = z
  .object({
    userId: z.string().optional().describe('User ID of the actor'),
    email: z.string().optional().describe('Actor email'),
    username: z.string().optional().describe('Actor username')
  })
  .optional();

export let styleguideEvents = SlateTrigger.create(spec, {
  name: 'Styleguide Events',
  key: 'styleguide_events',
  description:
    'Triggered when changes occur in Zeplin styleguides, including member changes, color/text style/component/spacing token updates.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g. styleguide.color, styleguide.component)'),
      action: z.string().describe('Action performed (e.g. created, updated)'),
      timestamp: z.number().describe('UNIX timestamp of when the event occurred'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      resourceData: z.any().optional().describe('Data of the affected resource'),
      styleguideId: z.string().optional().describe('Styleguide ID from context'),
      styleguideName: z.string().optional().describe('Styleguide name from context'),
      actor: z.any().optional().describe('User who triggered the event'),
      deliveryId: z.string().optional().describe('Unique delivery ID for deduplication')
    })
  )
  .output(
    z.object({
      event: z.string().describe('Event type'),
      action: z.string().describe('Action performed'),
      timestamp: z.number().describe('UNIX timestamp'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      resourceData: z.any().optional().describe('Data of the affected resource'),
      styleguideId: z.string().optional().describe('Styleguide ID'),
      styleguideName: z.string().optional().describe('Styleguide name'),
      actor: actorSchema.describe('User who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let deliveryId =
        ctx.request.headers.get('zeplin-delivery-id') ||
        `${body.event}-${body.timestamp}-${body.resource?.id}`;

      let styleguideId: string | undefined;
      let styleguideName: string | undefined;
      if (body.context?.styleguide) {
        styleguideId = body.context.styleguide.id;
        styleguideName = body.context.styleguide.extra?.name;
      }

      let actor: any;
      if (body.actor?.user) {
        actor = {
          userId: body.actor.user.id,
          email: body.actor.user.email,
          username: body.actor.user.username
        };
      }

      return {
        inputs: [
          {
            event: body.event,
            action: body.action,
            timestamp: body.timestamp,
            resourceId: body.resource?.id,
            resourceType: body.resource?.type,
            resourceData: body.resource?.data,
            styleguideId,
            styleguideName,
            actor,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = `${ctx.input.event}.${ctx.input.action}`;

      let actor: any;
      if (ctx.input.actor) {
        actor = {
          userId: ctx.input.actor.userId || ctx.input.actor.user?.id,
          email: ctx.input.actor.email || ctx.input.actor.user?.email,
          username: ctx.input.actor.username || ctx.input.actor.user?.username
        };
      }

      return {
        type: eventType,
        id:
          ctx.input.deliveryId ||
          `${ctx.input.event}-${ctx.input.timestamp}-${ctx.input.resourceId}`,
        output: {
          event: ctx.input.event,
          action: ctx.input.action,
          timestamp: ctx.input.timestamp,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          resourceData: ctx.input.resourceData,
          styleguideId: ctx.input.styleguideId,
          styleguideName: ctx.input.styleguideName,
          actor
        }
      };
    }
  })
  .build();
