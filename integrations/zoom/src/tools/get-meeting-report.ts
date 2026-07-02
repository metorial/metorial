import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getMeetingReport = SlateTool.create(spec, {
  name: 'Get Meeting Report',
  key: 'get_meeting_report',
  description: `Retrieve a report for a past meeting including duration, participant count, and meeting details. Also fetches participant-level details with join/leave times.`,
  constraints: [
    'Only available for past (ended) meetings',
    'Requires report:read:admin scope'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The raw meeting UUID or ID')
    })
  )
  .output(
    z.object({
      meetingId: z.number().optional().describe('Meeting ID'),
      uuid: z.string().optional().describe('Meeting UUID'),
      topic: z.string().optional().describe('Meeting topic'),
      hostId: z.string().optional().describe('Host user ID'),
      hostEmail: z.string().optional().describe('Host email'),
      startTime: z.string().optional().describe('Start time'),
      endTime: z.string().optional().describe('End time'),
      duration: z.number().optional().describe('Meeting duration in minutes'),
      participantsCount: z.number().optional().describe('Number of participants'),
      type: z.number().optional().describe('Meeting type'),
      source: z.string().optional().describe('Meeting source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let report = await client.getMeetingReport(ctx.input.meetingId);

    return {
      output: {
        meetingId: report.id,
        uuid: report.uuid,
        topic: report.topic,
        hostId: report.host_id,
        hostEmail: report.user_email || report.host_email || report.email,
        startTime: report.start_time,
        endTime: report.end_time,
        duration: report.duration,
        participantsCount: report.participants_count,
        type: report.type,
        source: report.source
      },
      message: `Report for meeting **${report.topic || ctx.input.meetingId}**: ${report.participants_count || 0} participant(s), duration ${report.duration || 0} min.`
    };
  })
  .build();
