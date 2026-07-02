import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeInputSchema = z.object({
  email: z.string().describe('Email address of the attendee (required)'),
  firstName: z.string().optional().describe('First name of the attendee'),
  lastName: z.string().optional().describe('Last name of the attendee'),
  photoUrl: z.string().optional().describe('URL for the attendee profile photo'),
  phone: z.string().optional().describe('Phone number of the attendee'),
  bio: z.string().optional().describe('Biography of the attendee'),
  webPage: z.string().optional().describe('Personal web page URL'),
  facebookUrl: z.string().optional().describe('Facebook profile URL'),
  twitterUrl: z.string().optional().describe('Twitter profile URL'),
  linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
  jobPosition: z.string().optional().describe('Job position/title'),
  company: z.string().optional().describe('Company name'),
  sendEmail: z
    .boolean()
    .optional()
    .describe('Whether to send an invitation email to the attendee')
});

export let inviteAttendees = SlateTool.create(spec, {
  name: 'Invite Attendees',
  key: 'invite_attendees',
  description: `Invites one or more attendees to the event. Each attendee must have an email address; additional profile fields (name, photo, phone, bio, social links, job, company) are optional.
Optionally triggers an invitation email to each attendee.`,
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
      invitedCount: z.number().describe('Number of attendees successfully invited')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.inviteAttendees(ctx.input.attendees);

    let invitedCount = result.invited ?? ctx.input.attendees.length;

    return {
      output: {
        invitedCount
      },
      message: `Successfully invited **${invitedCount}** attendee(s) to the event.`
    };
  })
  .build();
