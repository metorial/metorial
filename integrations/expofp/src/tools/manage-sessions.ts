import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sessionSchema = z.object({
  sessionId: z
    .number()
    .optional()
    .describe('Session ID (omit for new sessions, provide for updates)'),
  externalId: z.string().optional().describe('External ID for integration'),
  name: z.string().describe('Session name'),
  description: z.string().optional().describe('Session description'),
  dates: z.array(z.string()).optional().describe('Session date/time strings'),
  logo: z.string().optional().describe('Session logo URL'),
  boothId: z.number().optional().describe('ID of the booth where session is held'),
  boothName: z.string().optional().describe('Name of the booth where session is held'),
  speakerIds: z.array(z.number()).optional().describe('IDs of speakers for this session'),
  trackIds: z.array(z.number()).optional().describe('IDs of tracks this session belongs to')
});

export let getSessions = SlateTool.create(spec, {
  name: 'Get Sessions',
  key: 'get_sessions',
  description: `Retrieve all sessions for an event. Returns session details including name, description, dates, speakers, tracks, and booth assignment.`,
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
      sessions: z
        .array(
          z.object({
            sessionId: z.number().describe('Session ID'),
            externalId: z.string().describe('External ID'),
            name: z.string().describe('Session name'),
            description: z.string().describe('Session description'),
            dates: z.array(z.string()).describe('Session dates'),
            logo: z.string().describe('Logo URL'),
            boothId: z.number().describe('Booth ID'),
            boothName: z.string().describe('Booth name'),
            speakerIds: z.array(z.number()).describe('Speaker IDs'),
            trackIds: z.array(z.number()).describe('Track IDs')
          })
        )
        .describe('List of sessions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let sessions = await client.getSessions(ctx.input.eventId);

    return {
      output: {
        sessions: sessions.map(s => ({
          sessionId: s.id,
          externalId: s.externalId ?? '',
          name: s.name ?? '',
          description: s.description ?? '',
          dates: s.dates ?? [],
          logo: s.logo ?? '',
          boothId: s.boothId ?? 0,
          boothName: s.boothName ?? '',
          speakerIds: s.speakerIds ?? [],
          trackIds: s.trackIds ?? []
        }))
      },
      message: `Found **${sessions.length}** session(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let upsertSessions = SlateTool.create(spec, {
  name: 'Upsert Sessions',
  key: 'upsert_sessions',
  description: `Create or update sessions in bulk for an event. Provide an array of sessions — include a sessionId to update existing sessions, omit it to create new ones.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      sessions: z.array(sessionSchema).describe('Sessions to create or update')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      sessionCount: z.number().describe('Number of sessions upserted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let mapped = ctx.input.sessions.map(s => ({
      id: s.sessionId,
      externalId: s.externalId,
      name: s.name,
      description: s.description,
      dates: s.dates,
      logo: s.logo,
      boothId: s.boothId,
      boothName: s.boothName,
      speakerIds: s.speakerIds,
      trackIds: s.trackIds
    }));

    await client.upsertSessions(ctx.input.eventId, mapped);

    return {
      output: {
        eventId: ctx.input.eventId,
        sessionCount: ctx.input.sessions.length
      },
      message: `Upserted **${ctx.input.sessions.length}** session(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let deleteSessions = SlateTool.create(spec, {
  name: 'Delete Sessions',
  key: 'delete_sessions',
  description: `Delete one or more sessions from an event by their IDs.`,
  constraints: ['This action is irreversible. Deleted sessions cannot be recovered.'],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      sessionIds: z.array(z.number()).describe('IDs of sessions to delete')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      deletedCount: z.number().describe('Number of sessions deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteSessions(ctx.input.eventId, ctx.input.sessionIds);

    return {
      output: {
        eventId: ctx.input.eventId,
        deletedCount: ctx.input.sessionIds.length
      },
      message: `Deleted **${ctx.input.sessionIds.length}** session(s) from event ${ctx.input.eventId}.`
    };
  })
  .build();
