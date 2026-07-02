import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let classParticipantUpdate = SlateTrigger.create(spec, {
  name: 'Class Participant Update',
  key: 'class_participant_update',
  description:
    'Triggered when a class participant status changes — booked, rescheduled, cancelled, visited, waitlisted, or no-show.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      classParticipant: z
        .record(z.string(), z.any())
        .describe('Full class participant webhook payload')
    })
  )
  .output(
    z.object({
      participantId: z.string().describe('Participant record ID'),
      participantStatus: z
        .string()
        .optional()
        .describe(
          'Participant status (Booked, Waitlisted, Visited, Rescheduled, No-Show, Cancelled)'
        ),
      clientId: z.string().optional().describe('Client ID'),
      clientName: z.string().optional().describe('Client full name'),
      classId: z.string().optional().describe('Class ID'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      staffId: z.string().optional().describe('Staff member ID'),
      staffName: z.string().optional().describe('Staff member name'),
      locationId: z.string().optional().describe('Location ID'),
      locationTitle: z.string().optional().describe('Location name'),
      date: z.string().optional().describe('Class date'),
      time: z.string().optional().describe('Class time'),
      startTimeUtc: z.string().optional().describe('Start time in UTC'),
      endTimeUtc: z.string().optional().describe('End time in UTC'),
      timezone: z.string().optional().describe('Timezone'),
      bookedParticipants: z
        .number()
        .optional()
        .describe('Current number of booked participants'),
      numberOfParticipants: z.number().optional().describe('Total class capacity'),
      paymentStatus: z.string().optional().describe('Payment status'),
      cancellationReason: z.string().optional().describe('Cancellation reason if cancelled'),
      isOnlineClass: z.boolean().optional().describe('Whether this is an online class'),
      createdAt: z.string().optional().describe('Participant record creation time'),
      updatedAt: z.string().optional().describe('Participant record update time')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      let result = await client.createWebhook({
        serverUrl: ctx.input.webhookBaseUrl,
        eventTypes: ['class_participant_updates'],
        isActive: true
      });

      return {
        registrationDetails: {
          webhookId: result.id || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let participant = data.participant || {};
      let classInfo = data.class || {};
      let clientInfo = data.client || {};

      return {
        inputs: [
          {
            eventType: event.type || 'class_participant_updates',
            eventId: event.id || participant.id || participant._id || crypto.randomUUID(),
            eventTimestamp:
              event.timeStamp || participant.updatedAt || new Date().toISOString(),
            classParticipant: {
              participant,
              class: classInfo,
              client: clientInfo
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { participant, class: cls, client: cl } = ctx.input.classParticipant as any;

      let statusLower = (participant?.status || 'updated').toLowerCase().replace('-', '_');

      return {
        type: `class_participant.${statusLower}`,
        id: ctx.input.eventId,
        output: {
          participantId: participant?.id || participant?._id || ctx.input.eventId,
          participantStatus: participant?.status,
          clientId: cl?.id || cl?._id,
          clientName: cl?.fullName,
          classId: cls?.id || cls?._id,
          serviceId: cls?.service?.id,
          serviceName: cls?.service?.name,
          staffId: cls?.staff?.id,
          staffName: cls?.staff?.name,
          locationId: cls?.location?.id,
          locationTitle: cls?.location?.title,
          date: cls?.date,
          time: cls?.time,
          startTimeUtc: cls?.startTimeUTC,
          endTimeUtc: cls?.endTimeUTC,
          timezone: cls?.timezone,
          bookedParticipants: cls?.bookedParticipants,
          numberOfParticipants: cls?.numberOfParticipants,
          paymentStatus: participant?.paymentStatus,
          cancellationReason: participant?.cancellationReason,
          isOnlineClass: cls?.isOnlineClass,
          createdAt: participant?.createdAt,
          updatedAt: participant?.updatedAt
        }
      };
    }
  })
  .build();
