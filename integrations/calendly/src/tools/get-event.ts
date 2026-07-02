import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event Details',
  key: 'get_event',
  description: `Retrieve detailed information about a specific scheduled event, including its invitees. Returns the event details along with the list of invitees and their responses to custom questions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventUri: z.string().describe('URI or UUID of the scheduled event')
    })
  )
  .output(
    z.object({
      eventUri: z.string().describe('Unique URI of the scheduled event'),
      name: z.string().describe('Event name'),
      status: z.string().describe('Event status (active or canceled)'),
      startTime: z.string().describe('Event start time (ISO 8601)'),
      endTime: z.string().describe('Event end time (ISO 8601)'),
      eventType: z.string().describe('URI of the associated event type'),
      location: z.any().optional().describe('Meeting location details'),
      inviteesCounter: z.object({
        total: z.number(),
        active: z.number(),
        limit: z.number()
      }),
      eventMemberships: z.array(
        z.object({
          user: z.string(),
          userEmail: z.string(),
          userName: z.string()
        })
      ),
      cancellation: z.any().optional().describe('Cancellation details if event was canceled'),
      createdAt: z.string(),
      updatedAt: z.string(),
      invitees: z.array(
        z.object({
          inviteeUri: z.string(),
          email: z.string(),
          name: z.string(),
          status: z.string(),
          timezone: z.string().nullable(),
          questionsAndAnswers: z.array(
            z.object({
              question: z.string(),
              answer: z.string(),
              position: z.number()
            })
          ),
          tracking: z.any().optional(),
          rescheduled: z.boolean(),
          cancelUrl: z.string(),
          rescheduleUrl: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let event = await client.getScheduledEvent(ctx.input.eventUri);
    let inviteesResult = await client.listEventInvitees(ctx.input.eventUri);

    let invitees = inviteesResult.collection.map(inv => ({
      inviteeUri: inv.uri,
      email: inv.email,
      name: inv.name,
      status: inv.status,
      timezone: inv.timezone,
      questionsAndAnswers: inv.questionsAndAnswers || [],
      tracking: inv.tracking,
      rescheduled: inv.rescheduled,
      cancelUrl: inv.cancelUrl,
      rescheduleUrl: inv.rescheduleUrl
    }));

    return {
      output: {
        eventUri: event.uri,
        name: event.name,
        status: event.status,
        startTime: event.startTime,
        endTime: event.endTime,
        eventType: event.eventType,
        location: event.location,
        inviteesCounter: event.inviteesCounter,
        eventMemberships: event.eventMemberships,
        cancellation: event.cancellation,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        invitees
      },
      message: `Retrieved event **"${event.name}"** (${event.status}) scheduled for ${event.startTime} with ${invitees.length} invitee(s).`
    };
  })
  .build();
