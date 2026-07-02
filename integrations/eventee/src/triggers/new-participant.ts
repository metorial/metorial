import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newParticipant = SlateTrigger.create(spec, {
  name: 'New Participant',
  key: 'new_participant',
  description: 'Triggers when a new participant joins the event.'
})
  .input(
    z.object({
      participantId: z.number().describe('Unique identifier for the participant'),
      email: z.string().describe('Email address of the participant'),
      firstName: z.string().describe('First name of the participant'),
      lastName: z.string().describe('Last name of the participant'),
      photoUrl: z.string().describe('URL of the participant photo'),
      phone: z.string().describe('Phone number'),
      bio: z.string().describe('Biography'),
      webPage: z.string().describe('Personal web page URL'),
      facebookUrl: z.string().describe('Facebook profile URL'),
      twitterUrl: z.string().describe('Twitter profile URL'),
      linkedinUrl: z.string().describe('LinkedIn profile URL'),
      jobPosition: z.string().describe('Job position/title'),
      company: z.string().describe('Company name'),
      checkedIn: z.boolean().describe('Whether the participant has checked in')
    })
  )
  .output(
    z.object({
      participantId: z.number().describe('Unique identifier for the participant'),
      email: z.string().describe('Email address of the participant'),
      firstName: z.string().describe('First name of the participant'),
      lastName: z.string().describe('Last name of the participant'),
      photoUrl: z.string().describe('URL of the participant photo'),
      phone: z.string().describe('Phone number'),
      bio: z.string().describe('Biography'),
      webPage: z.string().describe('Personal web page URL'),
      facebookUrl: z.string().describe('Facebook profile URL'),
      twitterUrl: z.string().describe('Twitter profile URL'),
      linkedinUrl: z.string().describe('LinkedIn profile URL'),
      jobPosition: z.string().describe('Job position/title'),
      company: z.string().describe('Company name'),
      checkedIn: z.boolean().describe('Whether the participant has checked in')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let participants = await client.listParticipants();

      let knownIds: number[] = ctx.state?.knownParticipantIds ?? [];
      let knownIdSet = new Set(knownIds);

      let newParticipants = participants.filter(p => !knownIdSet.has(p.participantId));

      let updatedKnownIds = participants.map(p => p.participantId);

      return {
        inputs: newParticipants.map(p => ({
          participantId: p.participantId,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          photoUrl: p.photoUrl,
          phone: p.phone,
          bio: p.bio,
          webPage: p.webPage,
          facebookUrl: p.facebookUrl,
          twitterUrl: p.twitterUrl,
          linkedinUrl: p.linkedinUrl,
          jobPosition: p.jobPosition,
          company: p.company,
          checkedIn: p.checkedIn
        })),
        updatedState: {
          knownParticipantIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'participant.joined',
        id: String(ctx.input.participantId),
        output: {
          participantId: ctx.input.participantId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          photoUrl: ctx.input.photoUrl,
          phone: ctx.input.phone,
          bio: ctx.input.bio,
          webPage: ctx.input.webPage,
          facebookUrl: ctx.input.facebookUrl,
          twitterUrl: ctx.input.twitterUrl,
          linkedinUrl: ctx.input.linkedinUrl,
          jobPosition: ctx.input.jobPosition,
          company: ctx.input.company,
          checkedIn: ctx.input.checkedIn
        }
      };
    }
  })
  .build();
