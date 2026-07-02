import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let presenceEvents = SlateTrigger.create(spec, {
  name: 'Presence Events',
  key: 'presence_events',
  description: 'Triggers when user presence or availability status changes.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier from the notification'),
      extensionId: z.string().describe('Extension ID of the user whose presence changed'),
      userStatus: z.string().describe('User-defined status (Available, Busy, Offline, etc.)'),
      dndStatus: z
        .string()
        .describe('Do Not Disturb status (TakeAllCalls, DoNotAcceptAnyCalls, etc.)'),
      presenceStatus: z
        .string()
        .describe('Aggregated presence status (Available, Busy, Offline, etc.)'),
      telephonyStatus: z
        .string()
        .describe('Telephony status (NoCall, Ringing, CallConnected, etc.)')
    })
  )
  .output(
    z.object({
      extensionId: z.string().describe('Extension ID of the user whose presence changed'),
      userStatus: z.string().describe('User-defined status (Available, Busy, Offline, etc.)'),
      dndStatus: z
        .string()
        .describe('Do Not Disturb status (TakeAllCalls, DoNotAcceptAnyCalls, etc.)'),
      presenceStatus: z
        .string()
        .describe('Aggregated presence status (Available, Busy, Offline, etc.)'),
      telephonyStatus: z
        .string()
        .describe('Telephony status (NoCall, Ringing, CallConnected, etc.)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      let result = await client.createSubscription(
        ['/restapi/v1.0/account/~/extension/~/presence'],
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          subscriptionId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let validationToken = ctx.request.headers.get('Validation-Token');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'Validation-Token': validationToken }
          })
        };
      }

      let body = (await ctx.request.json()) as any;
      let presence = body.body || {};

      return {
        inputs: [
          {
            eventId: body.uuid || '',
            extensionId: String(presence.extensionId || ''),
            userStatus: presence.userStatus || '',
            dndStatus: presence.dndStatus || '',
            presenceStatus: presence.presenceStatus || '',
            telephonyStatus: presence.telephonyStatus || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'presence.changed',
        id: ctx.input.eventId,
        output: {
          extensionId: ctx.input.extensionId,
          userStatus: ctx.input.userStatus,
          dndStatus: ctx.input.dndStatus,
          presenceStatus: ctx.input.presenceStatus,
          telephonyStatus: ctx.input.telephonyStatus
        }
      };
    }
  })
  .build();
