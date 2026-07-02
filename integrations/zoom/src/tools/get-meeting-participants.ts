import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getMeetingParticipants = SlateTool.create(spec, {
  name: 'Get Meeting Participants',
  key: 'get_meeting_participants',
  description: `Retrieve the participant report for a past meeting. Returns participant names, join/leave times, duration, and email addresses. Uses the Reports API and requires Business or higher plan.`,
  constraints: [
    'Only available for past (ended) meetings',
    'Requires Business or higher plan',
    'Requires report:read:admin scope'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The raw meeting UUID or ID (use UUID for accuracy)'),
      pageSize: z.number().optional().describe('Number of records per page (max 300)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of participants'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      participants: z
        .array(
          z.object({
            odataUserId: z
              .string()
              .optional()
              .describe('User ID if the participant was authenticated'),
            participantName: z.string().optional().describe('Participant display name'),
            email: z.string().optional().describe('Participant email'),
            joinTime: z.string().optional().describe('Time when participant joined'),
            leaveTime: z.string().optional().describe('Time when participant left'),
            durationInSeconds: z.number().optional().describe('Duration in seconds'),
            attentivenessScore: z.string().optional().describe('Attentiveness score'),
            participantUserId: z.string().optional().describe('Participant UUID'),
            userId: z.string().optional().describe('Meeting-scoped participant ID'),
            status: z.string().optional().describe('Participant status')
          })
        )
        .describe('List of participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.getMeetingParticipantReport(ctx.input.meetingId, {
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let participants = (result.participants || []).map((p: any) => ({
      odataUserId: p.id,
      participantName: p.name,
      email: p.user_email,
      joinTime: p.join_time,
      leaveTime: p.leave_time,
      durationInSeconds: p.duration,
      attentivenessScore: p.attentiveness_score,
      participantUserId: p.participant_user_id,
      userId: p.user_id,
      status: p.status
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        participants
      },
      message: `Found **${participants.length}** participant(s) for meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();
