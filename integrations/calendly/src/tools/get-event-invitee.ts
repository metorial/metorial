import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventInvitee = SlateTool.create(spec, {
  name: 'Get Event Invitee',
  key: 'get_event_invitee',
  description: `Retrieve detailed invitee information for a scheduled event, including contact details, answers, no-show status, and cancellation/reschedule links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventUri: z.string().describe('URI or UUID of the scheduled event'),
      inviteeUri: z.string().describe('URI or UUID of the invitee')
    })
  )
  .output(
    z.object({
      inviteeUri: z.string().describe('Unique URI of the invitee'),
      eventUri: z.string().describe('URI of the scheduled event'),
      email: z.string().describe('Invitee email address'),
      name: z.string().describe('Invitee full name'),
      firstName: z.string().nullable().describe('Invitee first name'),
      lastName: z.string().nullable().describe('Invitee last name'),
      status: z.string().describe('Invitee status'),
      timezone: z.string().nullable().describe('Invitee timezone'),
      questionsAndAnswers: z.array(z.any()).describe('Responses to custom questions'),
      tracking: z.any().optional().describe('UTM tracking data'),
      cancelUrl: z.string().describe('URL for the invitee to cancel'),
      rescheduleUrl: z.string().describe('URL for the invitee to reschedule'),
      rescheduled: z.boolean().describe('Whether invitee rescheduled'),
      noShow: z.any().optional().describe('No-show marking details'),
      cancellation: z.any().optional().describe('Cancellation details'),
      payment: z.any().optional().describe('Payment details, if present'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let invitee = await client.getEventInvitee(ctx.input.eventUri, ctx.input.inviteeUri);

    return {
      output: {
        inviteeUri: invitee.uri,
        eventUri: invitee.event,
        email: invitee.email,
        name: invitee.name,
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        status: invitee.status,
        timezone: invitee.timezone,
        questionsAndAnswers: invitee.questionsAndAnswers || [],
        tracking: invitee.tracking,
        cancelUrl: invitee.cancelUrl,
        rescheduleUrl: invitee.rescheduleUrl,
        rescheduled: invitee.rescheduled,
        noShow: invitee.noShow,
        cancellation: invitee.cancellation,
        payment: invitee.payment,
        createdAt: invitee.createdAt,
        updatedAt: invitee.updatedAt
      },
      message: `Retrieved invitee **${invitee.name}** (${invitee.email}).`
    };
  })
  .build();
