import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let MEETING_TRIGGERS = [
  'MEETING_STARTED',
  'MEETING_ENDED',
  'INSTANT_MEETING',
  'RECORDING_READY',
  'RECORDING_TRANSCRIPTION_GENERATED'
] as const;

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description:
    'Triggers when a Cal Video meeting starts, ends, an instant meeting is created, a recording is ready, or a transcription is generated.'
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
      title: z.string().optional().describe('Title of the meeting/booking'),
      startTime: z.string().optional().describe('Start time of the meeting'),
      endTime: z.string().optional().describe('End time of the meeting'),
      meetingUrl: z.string().optional().describe('Meeting URL'),
      recordingUrl: z
        .string()
        .optional()
        .describe('Recording download URL (for recording events)'),
      transcriptionUrl: z
        .string()
        .optional()
        .describe('Transcription download URL (for transcription events)'),
      organizerEmail: z.string().optional().describe('Organizer email'),
      attendees: z
        .array(
          z.object({
            email: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Attendees of the meeting')
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
        triggers: [...MEETING_TRIGGERS],
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

      let attendees = Array.isArray(p?.attendees)
        ? p.attendees.map((a: any) => ({
            email: a?.email,
            name: a?.name
          }))
        : [];

      let typeMap: Record<string, string> = {
        MEETING_STARTED: 'meeting.started',
        MEETING_ENDED: 'meeting.ended',
        INSTANT_MEETING: 'meeting.instant_created',
        RECORDING_READY: 'recording.ready',
        RECORDING_TRANSCRIPTION_GENERATED: 'recording.transcription_generated'
      };

      return {
        type:
          typeMap[ctx.input.triggerEvent] || `meeting.${ctx.input.triggerEvent.toLowerCase()}`,
        id: `${ctx.input.triggerEvent}-${ctx.input.bookingUid}`,
        output: {
          bookingUid: ctx.input.bookingUid,
          title: p?.title,
          startTime: p?.startTime,
          endTime: p?.endTime,
          meetingUrl: p?.meetingUrl || p?.metadata?.videoCallUrl,
          recordingUrl: p?.downloadLink || p?.recordingUrl,
          transcriptionUrl: p?.transcriptionUrl || p?.downloadLink,
          organizerEmail: p?.organizer?.email,
          attendees
        }
      };
    }
  })
  .build();
