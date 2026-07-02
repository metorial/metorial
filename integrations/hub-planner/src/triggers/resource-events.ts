import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resourceEvents = SlateTrigger.create(spec, {
  name: 'Resource Events',
  key: 'resource_events',
  description: 'Triggers when a resource is created or updated in Hub Planner.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type (resource.update)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('Resource ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      role: z.string().optional().describe('Role'),
      status: z.string().optional().describe('Resource status')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Resource ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      role: z.string().optional().describe('Role'),
      status: z.string().optional().describe('Resource status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        event: 'resource.update',
        target_url: ctx.input.webhookBaseUrl
      });
      return { registrationDetails: { subscriptionId: result._id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      if (ctx.input.registrationDetails?.subscriptionId) {
        await client.deleteWebhook(ctx.input.registrationDetails.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.event || 'resource.update';
      let resourceId = data._id || data.resourceId || '';
      let eventId = `${eventType}-${resourceId}-${data.updatedDate || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            role: data.role,
            status: data.status
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          resourceId: ctx.input.resourceId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          role: ctx.input.role,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
