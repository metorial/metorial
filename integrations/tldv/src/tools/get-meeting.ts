import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getMeeting = SlateTool.create(spec, {
  name: 'Get Meeting',
  key: 'get_meeting',
  description: `Retrieve detailed metadata for a specific meeting by its ID. Returns the meeting name, date, duration, organizer, invitees, applied note template, and conference ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The unique identifier of the meeting to retrieve.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Unique meeting identifier.'),
      name: z.string().describe('Meeting title.'),
      happenedAt: z.string().describe('ISO 8601 timestamp of when the meeting occurred.'),
      url: z.string().describe('tl;dv web URL for the meeting.'),
      duration: z.number().describe('Meeting duration in seconds.'),
      organizer: z
        .object({
          name: z.string().describe('Organizer name.'),
          email: z.string().describe('Organizer email.')
        })
        .describe('Meeting organizer details.'),
      invitees: z
        .array(
          z.object({
            name: z.string().describe('Invitee name.'),
            email: z.string().describe('Invitee email.')
          })
        )
        .describe('List of meeting invitees.'),
      templateName: z.string().optional().describe('Name of the applied note template.'),
      conferenceId: z.string().optional().describe('Conference platform meeting ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let meeting = await client.getMeeting(ctx.input.meetingId);

    return {
      output: {
        meetingId: meeting.id,
        name: meeting.name,
        happenedAt: meeting.happenedAt,
        url: meeting.url,
        duration: meeting.duration,
        organizer: {
          name: meeting.organizer?.name ?? '',
          email: meeting.organizer?.email ?? ''
        },
        invitees: (meeting.invitees ?? []).map(i => ({
          name: i.name,
          email: i.email
        })),
        templateName: meeting.template?.name,
        conferenceId: meeting.conferenceId
      },
      message: `Retrieved meeting **${meeting.name}** (${meeting.happenedAt}).`
    };
  })
  .build();
