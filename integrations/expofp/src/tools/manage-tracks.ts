import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionTracks = SlateTool.create(spec, {
  name: 'Get Session Tracks',
  key: 'get_session_tracks',
  description: `Retrieve all session tracks for an event. Tracks are used to categorize and organize sessions (e.g., "Keynotes", "Workshops", "Panels").`,
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
      tracks: z
        .array(
          z.object({
            trackId: z.number().describe('Track ID'),
            name: z.string().describe('Track name')
          })
        )
        .describe('List of tracks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let tracks = await client.getSessionTracks(ctx.input.eventId);

    return {
      output: {
        tracks: tracks.map(t => ({
          trackId: t.id,
          name: t.name
        }))
      },
      message: `Found **${tracks.length}** track(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let upsertSessionTracks = SlateTool.create(spec, {
  name: 'Upsert Session Tracks',
  key: 'upsert_session_tracks',
  description: `Create or update session tracks in bulk. Include a trackId to update existing tracks, omit it to create new ones.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      tracks: z
        .array(
          z.object({
            trackId: z
              .number()
              .optional()
              .describe('Track ID (omit for new tracks, provide for updates)'),
            name: z.string().describe('Track name')
          })
        )
        .describe('Tracks to create or update')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      trackCount: z.number().describe('Number of tracks upserted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let mapped = ctx.input.tracks.map(t => ({
      id: t.trackId,
      name: t.name
    }));

    await client.upsertSessionTracks(ctx.input.eventId, mapped);

    return {
      output: {
        eventId: ctx.input.eventId,
        trackCount: ctx.input.tracks.length
      },
      message: `Upserted **${ctx.input.tracks.length}** track(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let deleteSessionTracks = SlateTool.create(spec, {
  name: 'Delete Session Tracks',
  key: 'delete_session_tracks',
  description: `Delete one or more session tracks from an event by their IDs.`,
  constraints: ['This action is irreversible.'],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      trackIds: z.array(z.number()).describe('IDs of tracks to delete')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      deletedCount: z.number().describe('Number of tracks deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteSessionTracks(ctx.input.eventId, ctx.input.trackIds);

    return {
      output: {
        eventId: ctx.input.eventId,
        deletedCount: ctx.input.trackIds.length
      },
      message: `Deleted **${ctx.input.trackIds.length}** track(s) from event ${ctx.input.eventId}.`
    };
  })
  .build();
