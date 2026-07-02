import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Scheduled Events',
  key: 'list_events',
  description: `Retrieve scheduled Workable events such as calls, interviews, and meetings. Filter by event type, candidate, job shortcode, member, date range, or token context.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.string().optional().describe('Filter by event type'),
      candidateId: z.string().optional().describe('Filter by candidate ID'),
      jobShortcode: z.string().optional().describe('Filter by job shortcode'),
      memberId: z.string().optional().describe('Filter by team member ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter events scheduled after this ISO 8601 timestamp'),
      endDate: z
        .string()
        .optional()
        .describe('Filter events scheduled before this ISO 8601 timestamp'),
      context: z
        .enum(['user', 'team', 'all'])
        .optional()
        .describe('Event context for user tokens'),
      includeCancelled: z.boolean().optional().describe('Include cancelled events'),
      limit: z.number().optional().describe('Maximum number of events to return'),
      sinceId: z.string().optional().describe('Return events with ID greater than this ID'),
      maxId: z.string().optional().describe('Return events with ID less than this ID')
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
            startsAt: z.string().optional().describe('Start time'),
            endsAt: z.string().optional().describe('End time'),
            cancelled: z.boolean().optional().describe('Whether the event is cancelled'),
            jobShortcode: z.string().optional().describe('Associated job shortcode'),
            jobTitle: z.string().optional().describe('Associated job title'),
            candidateId: z.string().optional().describe('Associated candidate ID'),
            candidateName: z.string().optional().describe('Associated candidate name'),
            members: z.array(z.any()).optional().describe('Team members in the event'),
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
      shortcode: ctx.input.jobShortcode,
      member_id: ctx.input.memberId,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      context: ctx.input.context,
      include_cancelled: ctx.input.includeCancelled,
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId,
      max_id: ctx.input.maxId
    });

    let events = (result.events || []).map((event: any) => ({
      eventId: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      cancelled: event.cancelled,
      jobShortcode: event.job?.shortcode,
      jobTitle: event.job?.title,
      candidateId: event.candidate?.id,
      candidateName: event.candidate?.name,
      members: event.members?.map((member: any) => ({
        memberId: member.id,
        name: member.name,
        status: member.status
      })),
      conference: event.conference
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
