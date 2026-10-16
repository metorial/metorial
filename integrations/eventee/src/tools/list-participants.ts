import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

let participantSchema = z.object({
  participantId: z.number().describe('Unique identifier for the participant'),
  email: z.string().describe('Email address of the participant'),
  firstName: z.string().describe('First name of the participant'),
  lastName: z.string().describe('Last name of the participant'),
  photoUrl: z.string().describe('URL of the participant photo'),
  phone: z.string().describe('Phone number of the participant'),
  bio: z.string().describe('Biography of the participant'),
  webPage: z.string().describe('Personal web page URL'),
  facebookUrl: z.string().describe('Facebook profile URL'),
  twitterUrl: z.string().describe('Twitter profile URL'),
  linkedinUrl: z.string().describe('LinkedIn profile URL'),
  jobPosition: z.string().describe('Job position/title'),
  company: z.string().describe('Company name'),
  checkedIn: z.boolean().describe('Whether the participant has checked in')
});

export let listParticipants = SlateTool.create(spec, {
  name: 'List Participants',
  key: 'list_participants',
  description: `Retrieves all participants (including attendees, speakers, admins, and moderators) with their profile information and check-in status. Fields absent from the provider response are empty strings; raw records retain roles, tickets, group IDs, personal URLs and timestamps.
Use this to get a complete list of people currently participating in the event.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      participants: z.array(participantSchema).describe('List of event participants'),
      raw: z
        .array(providerRecordSchema)
        .describe('Complete provider records with all original fields'),
      totalCount: z.number().describe('Total number of participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { participants, raw } = await client.listParticipants();

    let checkedInCount = participants.filter(p => p.checkedIn).length;

    return {
      output: {
        participants,
        raw,
        totalCount: participants.length
      },
      message: `Retrieved **${participants.length}** participant(s). **${checkedInCount}** currently checked in.`
    };
  })
  .build();
