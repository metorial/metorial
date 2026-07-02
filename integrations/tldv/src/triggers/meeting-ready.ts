import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let meetingReady = SlateTrigger.create(spec, {
  name: 'Meeting Ready',
  key: 'meeting_ready',
  description:
    'Fires when a meeting has finished processing and is ready to be consumed. Provides meeting metadata including organizer, invitees, duration, and template information.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Unique webhook event identifier.'),
      event: z.string().describe('Event type (MeetingReady).'),
      executedAt: z.string().describe('ISO 8601 timestamp of when the event fired.'),
      meetingId: z.string().describe('Meeting identifier.'),
      name: z.string().describe('Meeting title.'),
      happenedAt: z.string().describe('ISO 8601 timestamp of when the meeting occurred.'),
      url: z.string().describe('tl;dv web URL for the meeting.'),
      duration: z.number().describe('Meeting duration in seconds.'),
      organizerName: z.string().optional().describe('Organizer name.'),
      organizerEmail: z.string().optional().describe('Organizer email.'),
      invitees: z
        .array(
          z.object({
            name: z.string().describe('Invitee name.'),
            email: z.string().describe('Invitee email.')
          })
        )
        .describe('List of meeting invitees.'),
      templateName: z.string().optional().describe('Applied note template name.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Unique meeting identifier.'),
      name: z.string().describe('Meeting title.'),
      happenedAt: z.string().describe('ISO 8601 timestamp of when the meeting occurred.'),
      url: z.string().describe('tl;dv web URL for the meeting.'),
      duration: z.number().describe('Meeting duration in seconds.'),
      organizerName: z.string().optional().describe('Organizer name.'),
      organizerEmail: z.string().optional().describe('Organizer email.'),
      invitees: z
        .array(
          z.object({
            name: z.string().describe('Invitee name.'),
            email: z.string().describe('Invitee email.')
          })
        )
        .describe('List of meeting invitees.'),
      templateName: z.string().optional().describe('Applied note template name.'),
      executedAt: z.string().describe('ISO 8601 timestamp of when the event was triggered.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data || data.event !== 'MeetingReady') {
        return { inputs: [] };
      }

      let meeting = data.data ?? {};

      return {
        inputs: [
          {
            webhookId: data.id ?? '',
            event: data.event,
            executedAt: data.executedAt ?? '',
            meetingId: meeting.id ?? '',
            name: meeting.name ?? '',
            happenedAt: meeting.happenedAt ?? '',
            url: meeting.url ?? '',
            duration: meeting.duration ?? 0,
            organizerName: meeting.organizer?.name,
            organizerEmail: meeting.organizer?.email,
            invitees: (meeting.invitees ?? []).map((i: any) => ({
              name: i.name ?? '',
              email: i.email ?? ''
            })),
            templateName: meeting.template?.name
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'meeting.ready',
        id: ctx.input.webhookId,
        output: {
          meetingId: ctx.input.meetingId,
          name: ctx.input.name,
          happenedAt: ctx.input.happenedAt,
          url: ctx.input.url,
          duration: ctx.input.duration,
          organizerName: ctx.input.organizerName,
          organizerEmail: ctx.input.organizerEmail,
          invitees: ctx.input.invitees,
          templateName: ctx.input.templateName,
          executedAt: ctx.input.executedAt
        }
      };
    }
  })
  .build();
