import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { WebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

let EVENT_TYPES = ['staff.clocked_on', 'staff.clocked_off'] as const;

export let staffEvents = SlateTrigger.create(spec, {
  name: 'Staff Events',
  key: 'staff_events',
  description: 'Triggers when staff clock-on and clock-off events occur in ServiceM8.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of staff event'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      staffUuid: z.string().describe('UUID of the affected staff member'),
      eventName: z.string().describe('Name of the event that occurred'),
      firstName: z.string().optional().describe('Staff first name'),
      lastName: z.string().optional().describe('Staff last name'),
      email: z.string().optional().describe('Staff email'),
      mobile: z.string().optional().describe('Staff mobile number')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let registeredEvents: string[] = [];

      for (let event of EVENT_TYPES) {
        try {
          await webhookClient.subscribeEventWebhook({
            event,
            callbackUrl: ctx.input.webhookBaseUrl,
            uniqueId: `slates_staff_events`
          });
          registeredEvents.push(event);
        } catch {
          // Some events may not be available
        }
      }

      return {
        registrationDetails: { registeredEvents, callbackUrl: ctx.input.webhookBaseUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registeredEvents: string[];
        callbackUrl: string;
      };

      for (let event of details.registeredEvents) {
        try {
          await webhookClient.unsubscribeEventWebhook({
            event,
            callbackUrl: details.callbackUrl,
            uniqueId: `slates_staff_events`
          });
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (body?.mode === 'subscribe' && body?.challenge) {
        return {
          inputs: [],
          response: new Response(body.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      let eventName = body?.event || body?.eventName || 'staff.clocked_on';
      return {
        inputs: [
          {
            eventType: eventName,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let eventType = ctx.input.eventType;
      let staffUuid = payload?.data?.uuid || payload?.entry?.[0]?.uuid || payload?.uuid || '';

      let staff: any = {};
      if (staffUuid) {
        try {
          let client = new Client({ token: ctx.auth.token });
          staff = await client.getStaffMember(staffUuid);
        } catch {
          // Staff may not be accessible
        }
      }

      return {
        type: eventType,
        id: `${eventType}_${staffUuid}_${payload?.entry?.[0]?.time || Date.now()}`,
        output: {
          staffUuid: staff.uuid || staffUuid,
          eventName: eventType,
          firstName: staff.first,
          lastName: staff.last,
          email: staff.email,
          mobile: staff.mobile
        }
      };
    }
  })
  .build();
