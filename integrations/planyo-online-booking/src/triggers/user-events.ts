import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { USER_EVENTS } from '../lib/webhook-events';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description: "Triggers when a new user is added or an existing user's settings are updated."
})
  .input(
    z.object({
      notificationType: z.string().describe('Planyo event code'),
      userId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      isNewUser: z.boolean().optional().describe('Whether this is a newly created user'),
      rawPayload: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      isNewUser: z.boolean().optional().describe('Whether this is a newly created user'),
      country: z.string().optional().describe('Country code'),
      city: z.string().optional().describe('City'),
      phone: z.string().optional().describe('Phone number')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let webhookUrl = `${ctx.input.webhookBaseUrl}?ppp_payload=json`;

      let registeredEvents: string[] = [];
      for (let eventCode of USER_EVENTS) {
        try {
          await client.addNotificationCallback(eventCode, webhookUrl);
          registeredEvents.push(eventCode);
        } catch (_e) {
          // Continue
        }
      }

      return {
        registrationDetails: {
          webhookUrl,
          registeredEvents
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let details = ctx.input.registrationDetails as {
        webhookUrl: string;
        registeredEvents: string[];
      };

      for (let eventCode of details.registeredEvents) {
        try {
          await client.removeNotificationCallback(eventCode, details.webhookUrl);
        } catch (_e) {
          // Best effort
        }
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, any>;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, any>;
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let notificationType = data.notification_type || '';
      let userId = data.user_id
        ? String(data.user_id)
        : data.user
          ? String(data.user)
          : undefined;

      if (!userId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            notificationType,
            userId,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            isNewUser: data.is_new_user === '1' || data.is_new_user === 1,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let raw = input.rawPayload || {};

      return {
        type: input.isNewUser ? 'user.created' : 'user.updated',
        id: `${input.userId}-${input.notificationType}-${Date.now()}`,
        output: {
          userId: input.userId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          isNewUser: input.isNewUser,
          country: raw.country,
          city: raw.city,
          phone: raw.phone
        }
      };
    }
  })
  .build();
