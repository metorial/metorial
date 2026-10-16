import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

let stageSchema = z.object({
  stageId: z.number().describe('Unique identifier for the stage'),
  name: z.string().describe('Name of the stage/room'),
  order: z.number().describe('Display order of the stage')
});

let trackSchema = z.object({
  trackId: z.number().describe('Unique identifier for the track'),
  name: z.string().describe('Name of the track'),
  color: z.string().describe('Color code for the track')
});

let sessionSchema = z.object({
  sessionId: z.number().describe('Unique identifier for the session'),
  title: z.string().describe('Title of the session'),
  description: z.string().describe('Description of the session'),
  start: z
    .string()
    .describe('Start time of the session in the event time zone (YYYY-MM-DD HH:mm:ss)'),
  end: z
    .string()
    .describe('End time of the session in the event time zone (YYYY-MM-DD HH:mm:ss)'),
  stageId: z
    .number()
    .describe('ID of the stage where the session takes place; 0 when no hall is assigned'),
  trackId: z
    .number()
    .nullable()
    .describe(
      'First label ID assigned to the session, or null; all label IDs are preserved in raw'
    ),
  speakers: z.array(z.number()).describe('List of speaker IDs assigned to this session')
});

let speakerSchema = z.object({
  speakerId: z.number().describe('Unique identifier for the speaker'),
  firstName: z.string().describe('First name of the speaker'),
  lastName: z.string().describe('Last name of the speaker'),
  email: z.string().describe('Email address of the speaker'),
  bio: z.string().describe('Biography of the speaker'),
  photoUrl: z.string().describe('URL of the speaker photo'),
  company: z.string().describe('Company the speaker is affiliated with'),
  jobPosition: z.string().describe('Job position/title of the speaker')
});

export let getEventContent = SlateTool.create(spec, {
  name: 'Get Event Content',
  key: 'get_event_content',
  description: `Retrieves the full event content including the agenda with sessions, stages/rooms, tracks, and speakers. Event name and event date metadata are not supplied by this endpoint; compatibility metadata fields are empty strings.
Use this to get a complete snapshot of an event's schedule and lineup.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Filter the agenda to YYYY-MM-DD'),
      withOverlapping: z.boolean().optional().describe('Include event days without content')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Event name when returned; otherwise an empty string'),
      eventDescription: z
        .string()
        .describe('Event description when returned; otherwise an empty string'),
      eventStart: z.string().describe('Event start when returned; otherwise an empty string'),
      eventEnd: z.string().describe('Event end when returned; otherwise an empty string'),
      stages: z.array(stageSchema).describe('List of stages/rooms at the event'),
      tracks: z.array(trackSchema).describe('List of session tracks'),
      sessions: z.array(sessionSchema).describe('List of sessions in the agenda'),
      speakers: z
        .array(speakerSchema)
        .describe(
          'List of speakers; unsupplied first and last names are empty strings. Full names are in raw.speakers'
        ),
      raw: providerRecordSchema.describe(
        'Complete provider response, including days, workshops, breaks, files, and all speaker and session fields'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let content = await client.getContent({
      date: ctx.input.date,
      with_overlapping:
        ctx.input.withOverlapping === undefined ? undefined : Number(ctx.input.withOverlapping)
    });

    return {
      output: content,
      message: `Retrieved the event agenda with ${content.sessions.length} session(s), ${content.speakers.length} speaker(s), ${content.stages.length} stage(s), and ${content.tracks.length} track(s).`
    };
  })
  .build();
