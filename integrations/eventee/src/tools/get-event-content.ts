import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  start: z.string().describe('Start time of the session (ISO 8601)'),
  end: z.string().describe('End time of the session (ISO 8601)'),
  stageId: z.number().describe('ID of the stage where the session takes place'),
  trackId: z.number().nullable().describe('ID of the track the session belongs to, or null'),
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
  description: `Retrieves the full event content including event details, agenda with sessions, stages/rooms, tracks, and speakers.
Use this to get a complete snapshot of an event's schedule and lineup.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      eventName: z.string().describe('Name of the event'),
      eventDescription: z.string().describe('Description of the event'),
      eventStart: z.string().describe('Start date/time of the event (ISO 8601)'),
      eventEnd: z.string().describe('End date/time of the event (ISO 8601)'),
      stages: z.array(stageSchema).describe('List of stages/rooms at the event'),
      tracks: z.array(trackSchema).describe('List of session tracks'),
      sessions: z.array(sessionSchema).describe('List of sessions in the agenda'),
      speakers: z.array(speakerSchema).describe('List of speakers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let content = await client.getContent();

    return {
      output: {
        eventName: content.eventName,
        eventDescription: content.eventDescription,
        eventStart: content.eventStart,
        eventEnd: content.eventEnd,
        stages: content.stages,
        tracks: content.tracks,
        sessions: content.sessions,
        speakers: content.speakers
      },
      message: `Retrieved event content for **${content.eventName}** with ${content.sessions.length} session(s), ${content.speakers.length} speaker(s), ${content.stages.length} stage(s), and ${content.tracks.length} track(s).`
    };
  })
  .build();
