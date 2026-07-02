import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Scheduled Events',
  key: 'list_events',
  description: `Retrieve scheduled events such as interviews from Workable. Filter by event type, candidate, job, team member, or date range. Use this to review upcoming interviews, audit scheduling, or track interview activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.string().optional().describe('Filter by event type (e.g., "interview")'),
      candidateId: z.string().optional().describe('Filter by candidate ID'),
      jobShortcode: z.string().optional().describe('Filter by job shortcode'),
      memberId: z.string().optional().describe('Filter by team member ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter events on or after this date (ISO 8601)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter events on or before this date (ISO 8601)'),
      context: z.string().optional().describe('Event context filter'),
      limit: z.number().optional().describe('Maximum number of events to return'),
      sinceId: z.string().optional().describe('Return events after this ID for pagination')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            title: z.string().optional().describe('Event title'),
            description: z.string().optional().describe('Event description'),
            type: z.string().optional().describe('Event type'),
            startTime: z.string().optional().describe('Start time (ISO 8601)'),
            endTime: z.string().optional().describe('End time (ISO 8601)'),
            cancelled: z.boolean().optional().describe('Whether the event is cancelled'),
            jobShortcode: z.string().optional().describe('Associated job shortcode'),
            jobTitle: z.string().optional().describe('Associated job title'),
            candidateId: z.string().optional().describe('Associated candidate ID'),
            candidateName: z.string().optional().describe('Associated candidate name'),
            members: z
              .array(
                z.object({
                  memberId: z.string().optional(),
                  name: z.string().optional()
                })
              )
              .optional()
              .describe('Team members in the event'),
            conference: z.any().optional().describe('Video conference details')
          })
        )
        .describe('List of scheduled events'),
      paging: z
        .object({
          next: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listEvents({
      type: ctx.input.type,
      candidate_id: ctx.input.candidateId,
      job_shortcode: ctx.input.jobShortcode,
      member_id: ctx.input.memberId,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      context: ctx.input.context,
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId
    });

    let events = (result.events || []).map((e: any) => ({
      eventId: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      startTime: e.start_time || e.start,
      endTime: e.end_time || e.end,
      cancelled: e.cancelled,
      jobShortcode: e.job?.shortcode,
      jobTitle: e.job?.title,
      candidateId: e.candidate?.id,
      candidateName: e.candidate?.name,
      members: e.members?.map((m: any) => ({
        memberId: m.id,
        name: m.name
      })),
      conference: e.conference
    }));

    return {
      output: {
        events,
        paging: result.paging
      },
      message: `Found **${events.length}** scheduled event(s).`
    };
  })
  .build();
