import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let getBookedMeetings = SlateTool.create(spec, {
  name: 'Get Booked Meetings',
  key: 'get_booked_meetings',
  description: `Retrieve booked meetings from Drift within a time range. Returns meetings across the organization with scheduling details, agent info, and conference details.`,
  constraints: [
    'Only returns meetings from the past 30 days.',
    'Maximum 1000 results per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      minStartTime: z.string().describe('Start of the time range (ISO 8601 datetime string)'),
      maxStartTime: z.string().describe('End of the time range (ISO 8601 datetime string)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of meetings to return (max 1000, default 100)')
    })
  )
  .output(
    z.object({
      meetings: z.array(
        z.object({
          conversationId: z.number().optional().describe('Related conversation ID'),
          agentId: z.number().optional().describe('Agent user ID'),
          orgId: z.number().optional().describe('Organization ID'),
          status: z.string().optional().describe('Meeting status'),
          meetingSource: z.string().optional().describe('Source of the meeting'),
          schedulerId: z.number().optional().describe('Scheduler ID'),
          eventId: z.string().optional().describe('Calendar event ID'),
          slotStart: z.number().optional().describe('Meeting start time (epoch ms)'),
          slotEnd: z.number().optional().describe('Meeting end time (epoch ms)'),
          scheduledAt: z
            .number()
            .optional()
            .describe('When the meeting was scheduled (epoch ms)'),
          updatedAt: z.number().optional().describe('Last update timestamp (epoch ms)'),
          meetingType: z.string().optional().describe('Type of meeting'),
          endUserTimeZone: z.string().optional().describe('Timezone of the end user'),
          conferenceType: z
            .string()
            .optional()
            .describe('Conference type (e.g., Zoom, Google Meet)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let minMs = new Date(ctx.input.minStartTime).getTime();
    let maxMs = new Date(ctx.input.maxStartTime).getTime();

    let meetings = await client.getBookedMeetings({
      minStartTime: minMs,
      maxStartTime: maxMs,
      limit: ctx.input.limit
    });

    return {
      output: {
        meetings: meetings.map((m: any) => ({
          conversationId: m.conversationId,
          agentId: m.agentId,
          orgId: m.orgId,
          status: m.status,
          meetingSource: m.meetingSource,
          schedulerId: m.schedulerId,
          eventId: m.eventId,
          slotStart: m.slotStart,
          slotEnd: m.slotEnd,
          scheduledAt: m.scheduledAt,
          updatedAt: m.updatedAt,
          meetingType: m.meetingType,
          endUserTimeZone: m.endUserTimeZone,
          conferenceType: m.conferenceType
        }))
      },
      message: `Retrieved **${meetings.length}** booked meeting(s).`
    };
  })
  .build();
