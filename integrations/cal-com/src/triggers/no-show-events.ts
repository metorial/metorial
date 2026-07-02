import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let NO_SHOW_TRIGGERS = [
  'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
  'AFTER_GUESTS_CAL_VIDEO_NO_SHOW'
] as const;

export let noShowEvents = SlateTrigger.create(spec, {
  name: 'No-Show Detection Events',
  key: 'no_show_events',
  description:
    'Triggers when a host or guest fails to join a Cal Video meeting within the configured time window after the booking start time.'
})
  .input(
    z.object({
      triggerEvent: z.string().describe('The trigger event type from Cal.com'),
      bookingUid: z.string().describe('UID of the related booking'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      bookingUid: z.string().describe('UID of the related booking'),
      title: z.string().optional().describe('Title of the booking'),
      startTime: z.string().optional().describe('Scheduled start time of the booking'),
      noShowType: z
        .enum(['host', 'guest'])
        .describe('Whether the no-show is for a host or guest'),
      organizerEmail: z.string().optional().describe('Email of the organizer'),
      attendees: z
        .array(
          z.object({
            email: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Attendees of the booking')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        subscriberUrl: ctx.input.webhookBaseUrl,
        triggers: [...NO_SHOW_TRIGGERS],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let triggerEvent = data.triggerEvent || '';
      let bookingUid = data.payload?.uid || data.payload?.bookingUid || data.uid || '';

      return {
        inputs: [
          {
            triggerEvent,
            bookingUid,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      let noShowType: 'host' | 'guest' =
        ctx.input.triggerEvent === 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW' ? 'host' : 'guest';

      let attendees = Array.isArray(p?.attendees)
        ? p.attendees.map((a: any) => ({
            email: a?.email,
            name: a?.name
          }))
        : [];

      return {
        type: noShowType === 'host' ? 'no_show.host' : 'no_show.guest',
        id: `${ctx.input.triggerEvent}-${ctx.input.bookingUid}`,
        output: {
          bookingUid: ctx.input.bookingUid,
          title: p?.title,
          startTime: p?.startTime,
          noShowType,
          organizerEmail: p?.organizer?.email,
          attendees
        }
      };
    }
  })
  .build();
