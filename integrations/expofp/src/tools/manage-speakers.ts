import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let speakerUpsertSchema = z.object({
  speakerId: z
    .number()
    .optional()
    .describe('Speaker ID (omit for new speakers, provide for updates)'),
  name: z.string().describe('Speaker name'),
  company: z.string().optional().describe('Company name'),
  jobTitle: z.string().optional().describe('Job title'),
  position: z.string().optional().describe('Position'),
  photo: z.string().optional().describe('Photo URL'),
  instagramUrl: z.string().optional().describe('Instagram URL'),
  youtubeUrl: z.string().optional().describe('YouTube URL'),
  facebookUrl: z.string().optional().describe('Facebook URL'),
  twitterUrl: z.string().optional().describe('Twitter URL'),
  linkedInUrl: z.string().optional().describe('LinkedIn URL'),
  tiktokUrl: z.string().optional().describe('TikTok URL')
});

export let getSessionSpeakers = SlateTool.create(spec, {
  name: 'Get Session Speakers',
  key: 'get_session_speakers',
  description: `Retrieve all session speakers for an event. Returns speaker details including name, company, job title, photo, and social links.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event')
    })
  )
  .output(
    z.object({
      speakers: z
        .array(
          z.object({
            speakerId: z.number().describe('Speaker ID'),
            name: z.string().describe('Speaker name'),
            company: z.string().describe('Company'),
            jobTitle: z.string().describe('Job title'),
            position: z.string().describe('Position'),
            photo: z.string().describe('Photo URL'),
            linkedInUrl: z.string().describe('LinkedIn URL'),
            twitterUrl: z.string().describe('Twitter URL')
          })
        )
        .describe('List of speakers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let speakers = await client.getSessionSpeakers(ctx.input.eventId);

    return {
      output: {
        speakers: speakers.map(s => ({
          speakerId: s.id,
          name: s.name ?? '',
          company: s.company ?? '',
          jobTitle: s.jobTitle ?? '',
          position: s.position ?? '',
          photo: s.photo ?? '',
          linkedInUrl: s.linkedInUrl ?? '',
          twitterUrl: s.twitterUrl ?? ''
        }))
      },
      message: `Found **${speakers.length}** speaker(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let upsertSessionSpeakers = SlateTool.create(spec, {
  name: 'Upsert Session Speakers',
  key: 'upsert_session_speakers',
  description: `Create or update session speakers in bulk. Include a speakerId to update existing speakers, omit it to create new ones.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      speakers: z.array(speakerUpsertSchema).describe('Speakers to create or update')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      speakerCount: z.number().describe('Number of speakers upserted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let mapped = ctx.input.speakers.map(s => ({
      id: s.speakerId,
      name: s.name,
      company: s.company,
      jobTitle: s.jobTitle,
      position: s.position,
      photo: s.photo,
      instagramUrl: s.instagramUrl,
      youtubeUrl: s.youtubeUrl,
      facebookUrl: s.facebookUrl,
      twitterUrl: s.twitterUrl,
      linkedInUrl: s.linkedInUrl,
      tiktokUrl: s.tiktokUrl
    }));

    await client.upsertSessionSpeakers(ctx.input.eventId, mapped);

    return {
      output: {
        eventId: ctx.input.eventId,
        speakerCount: ctx.input.speakers.length
      },
      message: `Upserted **${ctx.input.speakers.length}** speaker(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let deleteSessionSpeakers = SlateTool.create(spec, {
  name: 'Delete Session Speakers',
  key: 'delete_session_speakers',
  description: `Delete one or more session speakers from an event by their IDs.`,
  constraints: ['This action is irreversible.'],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      speakerIds: z.array(z.number()).describe('IDs of speakers to delete')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      deletedCount: z.number().describe('Number of speakers deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteSessionSpeakers(ctx.input.eventId, ctx.input.speakerIds);

    return {
      output: {
        eventId: ctx.input.eventId,
        deletedCount: ctx.input.speakerIds.length
      },
      message: `Deleted **${ctx.input.speakerIds.length}** speaker(s) from event ${ctx.input.eventId}.`
    };
  })
  .build();
