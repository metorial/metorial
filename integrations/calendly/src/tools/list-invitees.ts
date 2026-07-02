import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInvitees = SlateTool.create(spec, {
  name: 'List Event Invitees',
  key: 'list_event_invitees',
  description: `List invitees for a scheduled event. Returns contact information, responses to custom questions, UTM tracking data, and cancellation/reschedule URLs. Filter by status or email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventUri: z.string().describe('URI or UUID of the scheduled event'),
      status: z.enum(['active', 'canceled']).optional().describe('Filter by invitee status'),
      email: z.string().optional().describe('Filter by invitee email address'),
      sort: z.string().optional().describe('Sort order, e.g. "created_at:asc"'),
      count: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      invitees: z.array(
        z.object({
          inviteeUri: z.string().describe('Unique URI of the invitee'),
          email: z.string().describe('Invitee email address'),
          name: z.string().describe('Invitee full name'),
          firstName: z.string().nullable().describe('Invitee first name'),
          lastName: z.string().nullable().describe('Invitee last name'),
          status: z.string().describe('Invitee status (active or canceled)'),
          timezone: z.string().nullable().describe('Invitee timezone'),
          questionsAndAnswers: z
            .array(
              z.object({
                question: z.string(),
                answer: z.string(),
                position: z.number()
              })
            )
            .describe('Responses to custom questions'),
          tracking: z.any().optional().describe('UTM tracking data'),
          rescheduled: z.boolean().describe('Whether invitee rescheduled'),
          cancelUrl: z.string().describe('URL for the invitee to cancel'),
          rescheduleUrl: z.string().describe('URL for the invitee to reschedule'),
          noShow: z.any().optional().describe('No-show marking details'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEventInvitees(ctx.input.eventUri, {
      status: ctx.input.status,
      email: ctx.input.email,
      sort: ctx.input.sort,
      count: ctx.input.count,
      pageToken: ctx.input.pageToken
    });

    let invitees = result.collection.map(inv => ({
      inviteeUri: inv.uri,
      email: inv.email,
      name: inv.name,
      firstName: inv.firstName,
      lastName: inv.lastName,
      status: inv.status,
      timezone: inv.timezone,
      questionsAndAnswers: inv.questionsAndAnswers || [],
      tracking: inv.tracking,
      rescheduled: inv.rescheduled,
      cancelUrl: inv.cancelUrl,
      rescheduleUrl: inv.rescheduleUrl,
      noShow: inv.noShow,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt
    }));

    return {
      output: {
        invitees,
        nextPageToken: result.pagination.nextPageToken
      },
      message: `Found **${invitees.length}** invitee(s) for this event.${result.pagination.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
