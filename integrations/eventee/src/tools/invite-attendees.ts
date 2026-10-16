import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attendeeInputSchema, providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

export let inviteAttendees = SlateTool.create(spec, {
  name: 'Invite Attendees',
  key: 'invite_attendees',
  description: `Invites one or more attendees to the event. Each attendee must have an email address; additional profile fields (name, photo, phone, bio, social links, job, company) are optional.
Optionally triggers an invitation email to each attendee. Eventee processes the first 25 entries immediately and the rest in the background; invalid entries and event admins or moderators may be skipped. Use list_participants to verify the outcome.`,
  instructions: [
    'At minimum, provide an email address for each attendee.',
    'Set sendEmail to true if you want Eventee to send an invitation email to the attendee.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      attendees: z.array(attendeeInputSchema).min(1).describe('List of attendees to invite')
    })
  )
  .output(
    z.object({
      invitedCount: z
        .number()
        .describe(
          'Confirmed invitation count; 0 when Eventee does not return a count. This is not the submitted count'
        ),
      invitedCountConfirmed: z
        .boolean()
        .describe(
          'Whether invitedCount was supplied by Eventee; false means the successful count is unknown'
        ),
      submittedCount: z
        .number()
        .describe('Number submitted for processing; not a confirmation of invitations'),
      raw: providerRecordSchema.describe(
        'Complete response, including the event URL and QR code URL'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.inviteAttendees(ctx.input.attendees);

    let invitedCount = typeof result.invited === 'number' ? result.invited : 0;

    return {
      output: {
        invitedCount,
        invitedCountConfirmed: typeof result.invited === 'number',
        submittedCount: ctx.input.attendees.length,
        raw: result
      },
      message: `Submitted **${ctx.input.attendees.length}** attendee(s) for processing. Eventee does not confirm a successful count; call list_participants to verify.`
    };
  })
  .build();
