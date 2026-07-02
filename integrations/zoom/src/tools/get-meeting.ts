import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getMeeting = SlateTool.create(spec, {
  name: 'Get Meeting',
  key: 'get_meeting',
  description: `Retrieve detailed information about a specific Zoom meeting by its ID. Returns meeting configuration, settings, join URLs, and scheduling details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.union([z.string(), z.number()]).describe('The meeting ID to retrieve')
    })
  )
  .output(
    z.object({
      meetingId: z.number().describe('The meeting ID'),
      uuid: z.string().optional().describe('Meeting UUID'),
      topic: z.string().describe('Meeting topic'),
      type: z.number().describe('Meeting type'),
      startTime: z.string().optional().describe('Meeting start time'),
      duration: z.number().optional().describe('Meeting duration in minutes'),
      timezone: z.string().optional().describe('Timezone'),
      agenda: z.string().optional().describe('Meeting agenda'),
      joinUrl: z.string().describe('URL for participants to join'),
      startUrl: z.string().optional().describe('URL for the host to start the meeting'),
      password: z.string().optional().describe('Meeting password'),
      hostId: z.string().optional().describe('Host user ID'),
      hostEmail: z.string().optional().describe('Host email address'),
      status: z.string().optional().describe('Meeting status'),
      createdAt: z.string().optional().describe('Meeting creation time'),
      settings: z.any().optional().describe('Full meeting settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let meeting = await client.getMeeting(ctx.input.meetingId);

    return {
      output: {
        meetingId: meeting.id,
        uuid: meeting.uuid,
        topic: meeting.topic,
        type: meeting.type,
        startTime: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        agenda: meeting.agenda,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password,
        hostId: meeting.host_id,
        hostEmail: meeting.host_email,
        status: meeting.status,
        createdAt: meeting.created_at,
        settings: meeting.settings
      },
      message: `Retrieved meeting **${meeting.topic}** (ID: ${meeting.id}). Status: ${meeting.status || 'N/A'}`
    };
  })
  .build();
