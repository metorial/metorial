import { createApiServiceError, SlateTool } from 'slates';
import type { z as Zod } from 'zod';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import type { playableSchema } from '../lib/types';
import { spec } from '../spec';

const itemOutputSchema = z.object({
  trackId: z.string().nullable(),
  episodeId: z.string().nullable().optional(),
  itemType: z.string(),
  name: z.string(),
  artists: z.array(z.object({ artistId: z.string().nullable(), name: z.string() })).nullable(),
  uri: z.string()
});
function mapItem(item: Zod.infer<typeof playableSchema>) {
  return {
    trackId: item.type === 'track' ? (item.id ?? null) : null,
    episodeId: item.type === 'episode' ? (item.id ?? null) : undefined,
    itemType: item.type,
    name: item.name,
    artists: item.artists?.map(a => ({ artistId: a.id ?? null, name: a.name })) ?? null,
    uri: item.uri
  };
}

export let controlPlayback = SlateTool.create(spec, {
  name: 'Control Playback',
  key: 'control_playback',
  description: `Control Spotify playback on any connected device. Play, pause, skip, seek, adjust volume, toggle shuffle/repeat, transfer playback between devices, and add items to the queue. Also retrieve current playback state, available devices, and the user's queue.`,
  constraints: [
    'Most playback commands require Spotify Premium.',
    'A device must be active for playback commands to work. Use "getDevices" to list available devices.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'getState',
          'getCurrentlyPlaying',
          'getDevices',
          'getQueue',
          'play',
          'pause',
          'next',
          'previous',
          'seek',
          'setVolume',
          'setShuffle',
          'setRepeat',
          'transferPlayback',
          'addToQueue'
        ])
        .describe('Playback action to perform'),
      deviceId: z.string().optional().describe('Target device ID'),
      contextUri: z
        .string()
        .optional()
        .describe('Spotify URI of the context to play (album, artist, playlist)'),
      uris: z.array(z.string()).optional().describe('List of Spotify track URIs to play'),
      offsetPosition: z
        .number()
        .optional()
        .describe('Zero-based position in context to start playing'),
      offsetUri: z
        .string()
        .optional()
        .describe('Spotify URI within context to start playing from'),
      positionMs: z.number().optional().describe('Position in milliseconds to seek to'),
      volumePercent: z.number().min(0).max(100).optional().describe('Volume level (0-100)'),
      shuffle: z.boolean().optional().describe('Shuffle state'),
      repeatMode: z.enum(['track', 'context', 'off']).optional().describe('Repeat mode'),
      uri: z.string().optional().describe('Spotify URI to add to queue'),
      play: z
        .boolean()
        .optional()
        .describe('Whether to start playing immediately after transfer'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
    })
  )
  .output(
    z.object({
      playbackState: z
        .object({
          isPlaying: z.boolean(),
          shuffleState: z.boolean().optional(),
          repeatState: z.string().optional(),
          progressMs: z.number().nullable(),
          currentItem: itemOutputSchema.nullable(),
          currentTrack: z
            .object({
              trackId: z.string().nullable(),
              name: z.string(),
              artists: z
                .array(
                  z.object({
                    artistId: z.string().nullable(),
                    name: z.string()
                  })
                )
                .nullable(),
              albumName: z.string().nullable(),
              durationMs: z.number(),
              spotifyUrl: z.string().nullable(),
              uri: z.string()
            })
            .nullable(),
          device: z
            .object({
              deviceId: z.string().nullable(),
              name: z.string(),
              type: z.string(),
              isActive: z.boolean(),
              volumePercent: z.number().nullable()
            })
            .optional(),
          context: z
            .object({
              type: z.string(),
              uri: z.string()
            })
            .nullable()
        })
        .optional(),
      devices: z
        .array(
          z.object({
            deviceId: z.string().nullable(),
            name: z.string(),
            type: z.string(),
            isActive: z.boolean(),
            volumePercent: z.number().nullable(),
            supportsVolume: z.boolean().optional()
          })
        )
        .optional(),
      queue: z
        .object({
          currentlyPlaying: itemOutputSchema.nullable(),
          upcoming: z.array(itemOutputSchema)
        })
        .optional(),
      success: z.boolean().optional(),
      outcome: z.literal('accepted').optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      refreshToken: ctx.auth.refreshToken,
      input: ctx.input,
      market: ctx.config.market,
      endpointCompatibility: ctx.config.endpointCompatibility
    });

    let { action } = ctx.input;

    if (action === 'getState' || action === 'getCurrentlyPlaying') {
      let state =
        action === 'getState'
          ? await client.getPlaybackState(ctx.input.market)
          : await client.getCurrentlyPlaying(ctx.input.market);

      if (!state) {
        return {
          output: {},
          message: 'No active playback session found.'
        };
      }

      const currentItem = state.item ? mapItem(state.item) : null;
      const playbackState = {
        isPlaying: state.is_playing,
        shuffleState: state.shuffle_state,
        repeatState: state.repeat_state,
        progressMs: state.progress_ms,
        currentItem,
        currentTrack:
          state.item?.type === 'track'
            ? {
                ...mapItem(state.item),
                albumName: state.item.album?.name ?? null,
                durationMs: state.item.duration_ms,
                spotifyUrl: state.item.external_urls?.spotify ?? null
              }
            : null,
        device: state.device
          ? {
              deviceId: state.device.id,
              name: state.device.name,
              type: state.device.type,
              isActive: state.device.is_active,
              volumePercent: state.device.volume_percent
            }
          : undefined,
        context: state.context ? { type: state.context.type, uri: state.context.uri } : null
      };
      return {
        output: { playbackState },
        message: `Spotify reports playback ${state.is_playing ? 'playing' : 'paused'}${state.item ? `: **${state.item.name}**` : ''}.`
      };
    }

    if (action === 'getDevices') {
      let result = await client.getAvailableDevices();
      let devices = result.devices.map(d => ({
        deviceId: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volumePercent: d.volume_percent,
        supportsVolume: d.supports_volume
      }));

      return {
        output: { devices },
        message: `Found ${devices.length} available device(s): ${devices.map(d => `${d.name} (${d.type}${d.isActive ? ', active' : ''})`).join(', ')}.`
      };
    }

    if (action === 'getQueue') {
      const result = await client.getQueue();
      const queue = {
        currentlyPlaying: result.currently_playing ? mapItem(result.currently_playing) : null,
        upcoming: result.queue.map(mapItem)
      };
      return {
        output: { queue },
        message: `Spotify reports ${queue.upcoming.length} queued item(s). Tracks and episodes remain distinct.`
      };
    }

    if (action === 'play') {
      if (ctx.input.offsetPosition !== undefined && ctx.input.offsetUri !== undefined)
        throw createApiServiceError('Use offsetPosition or offsetUri, not both.');
      let offset: { position?: number; uri?: string } | undefined;
      if (ctx.input.offsetPosition !== undefined)
        offset = { position: ctx.input.offsetPosition };
      else if (ctx.input.offsetUri) offset = { uri: ctx.input.offsetUri };

      await client.startPlayback({
        deviceId: ctx.input.deviceId,
        contextUri: ctx.input.contextUri,
        uris: ctx.input.uris,
        offset,
        positionMs: ctx.input.positionMs
      });

      return {
        output: { success: true, outcome: 'accepted' },
        message:
          'Spotify accepted the playback request; execution was not independently observed.'
      };
    }

    if (action === 'pause') {
      await client.pausePlayback(ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: 'Spotify accepted the pause request.'
      };
    }

    if (action === 'next') {
      await client.skipToNext(ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: 'Spotify accepted the next-item request.'
      };
    }

    if (action === 'previous') {
      await client.skipToPrevious(ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: 'Spotify accepted the previous-item request.'
      };
    }

    if (action === 'seek') {
      if (ctx.input.positionMs === undefined)
        throw createApiServiceError('positionMs is required for "seek" action');
      await client.seekToPosition(ctx.input.positionMs, ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: `Spotify accepted a seek request to ${Math.round(ctx.input.positionMs / 1000)}s.`
      };
    }

    if (action === 'setVolume') {
      if (ctx.input.volumePercent === undefined)
        throw createApiServiceError('volumePercent is required for "setVolume" action');
      await client.setVolume(ctx.input.volumePercent, ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: `Spotify accepted a volume request for ${ctx.input.volumePercent}%.`
      };
    }

    if (action === 'setShuffle') {
      if (ctx.input.shuffle === undefined)
        throw createApiServiceError('shuffle is required for "setShuffle" action');
      await client.toggleShuffle(ctx.input.shuffle, ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: `Spotify accepted shuffle ${ctx.input.shuffle ? 'enabled' : 'disabled'}.`
      };
    }

    if (action === 'setRepeat') {
      if (!ctx.input.repeatMode)
        throw createApiServiceError('repeatMode is required for "setRepeat" action');
      await client.setRepeatMode(ctx.input.repeatMode, ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: `Spotify accepted repeat mode ${ctx.input.repeatMode}.`
      };
    }

    if (action === 'transferPlayback') {
      if (!ctx.input.deviceId)
        throw createApiServiceError('deviceId is required for "transferPlayback" action');
      await client.transferPlayback([ctx.input.deviceId], ctx.input.play);
      return {
        output: { success: true, outcome: 'accepted' },
        message: 'Spotify accepted the transfer request.'
      };
    }

    if (action === 'addToQueue') {
      if (!ctx.input.uri)
        throw createApiServiceError('uri is required for "addToQueue" action');
      await client.addToQueue(ctx.input.uri, ctx.input.deviceId);
      return {
        output: { success: true, outcome: 'accepted' },
        message: 'Spotify accepted the queue request.'
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  });
