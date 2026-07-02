import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

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
          shuffleState: z.boolean(),
          repeatState: z.string(),
          progressMs: z.number().nullable(),
          currentTrack: z
            .object({
              trackId: z.string(),
              name: z.string(),
              artists: z.array(
                z.object({
                  artistId: z.string(),
                  name: z.string()
                })
              ),
              albumName: z.string(),
              durationMs: z.number(),
              spotifyUrl: z.string(),
              uri: z.string()
            })
            .nullable(),
          device: z.object({
            deviceId: z.string().nullable(),
            name: z.string(),
            type: z.string(),
            isActive: z.boolean(),
            volumePercent: z.number().nullable()
          }),
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
            supportsVolume: z.boolean()
          })
        )
        .optional(),
      queue: z
        .object({
          currentlyPlaying: z
            .object({
              trackId: z.string(),
              name: z.string(),
              artists: z.array(
                z.object({
                  artistId: z.string(),
                  name: z.string()
                })
              ),
              uri: z.string()
            })
            .nullable(),
          upcoming: z.array(
            z.object({
              trackId: z.string(),
              name: z.string(),
              artists: z.array(
                z.object({
                  artistId: z.string(),
                  name: z.string()
                })
              ),
              uri: z.string()
            })
          )
        })
        .optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
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

      let playbackState = {
        isPlaying: state.is_playing,
        shuffleState: state.shuffle_state,
        repeatState: state.repeat_state,
        progressMs: state.progress_ms,
        currentTrack: state.item
          ? {
              trackId: state.item.id,
              name: state.item.name,
              artists: state.item.artists.map(a => ({ artistId: a.id, name: a.name })),
              albumName: state.item.album.name,
              durationMs: state.item.duration_ms,
              spotifyUrl: state.item.external_urls.spotify,
              uri: state.item.uri
            }
          : null,
        device: {
          deviceId: state.device.id,
          name: state.device.name,
          type: state.device.type,
          isActive: state.device.is_active,
          volumePercent: state.device.volume_percent
        },
        context: state.context
          ? {
              type: state.context.type,
              uri: state.context.uri
            }
          : null
      };

      let trackName = state.item
        ? `**${state.item.name}** by ${state.item.artists.map(a => a.name).join(', ')}`
        : 'nothing';
      return {
        output: { playbackState },
        message: `Currently ${state.is_playing ? 'playing' : 'paused'}: ${trackName} on ${state.device.name}.`
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
      let result = await client.getQueue();

      let queue = {
        currentlyPlaying: result.currently_playing
          ? {
              trackId: result.currently_playing.id,
              name: result.currently_playing.name,
              artists: result.currently_playing.artists.map(a => ({
                artistId: a.id,
                name: a.name
              })),
              uri: result.currently_playing.uri
            }
          : null,
        upcoming: result.queue.map(t => ({
          trackId: t.id,
          name: t.name,
          artists: t.artists.map(a => ({ artistId: a.id, name: a.name })),
          uri: t.uri
        }))
      };

      return {
        output: { queue },
        message: `Queue has ${queue.upcoming.length} upcoming track(s).${queue.currentlyPlaying ? ` Currently playing: **${queue.currentlyPlaying.name}**.` : ''}`
      };
    }

    if (action === 'play') {
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
        output: { success: true },
        message: 'Playback started.'
      };
    }

    if (action === 'pause') {
      await client.pausePlayback(ctx.input.deviceId);
      return { output: { success: true }, message: 'Playback paused.' };
    }

    if (action === 'next') {
      await client.skipToNext(ctx.input.deviceId);
      return { output: { success: true }, message: 'Skipped to next track.' };
    }

    if (action === 'previous') {
      await client.skipToPrevious(ctx.input.deviceId);
      return { output: { success: true }, message: 'Skipped to previous track.' };
    }

    if (action === 'seek') {
      if (ctx.input.positionMs === undefined)
        throw new Error('positionMs is required for "seek" action');
      await client.seekToPosition(ctx.input.positionMs, ctx.input.deviceId);
      return {
        output: { success: true },
        message: `Seeked to ${Math.round(ctx.input.positionMs / 1000)}s.`
      };
    }

    if (action === 'setVolume') {
      if (ctx.input.volumePercent === undefined)
        throw new Error('volumePercent is required for "setVolume" action');
      await client.setVolume(ctx.input.volumePercent, ctx.input.deviceId);
      return {
        output: { success: true },
        message: `Volume set to ${ctx.input.volumePercent}%.`
      };
    }

    if (action === 'setShuffle') {
      if (ctx.input.shuffle === undefined)
        throw new Error('shuffle is required for "setShuffle" action');
      await client.toggleShuffle(ctx.input.shuffle, ctx.input.deviceId);
      return {
        output: { success: true },
        message: `Shuffle ${ctx.input.shuffle ? 'enabled' : 'disabled'}.`
      };
    }

    if (action === 'setRepeat') {
      if (!ctx.input.repeatMode)
        throw new Error('repeatMode is required for "setRepeat" action');
      await client.setRepeatMode(ctx.input.repeatMode, ctx.input.deviceId);
      return {
        output: { success: true },
        message: `Repeat mode set to ${ctx.input.repeatMode}.`
      };
    }

    if (action === 'transferPlayback') {
      if (!ctx.input.deviceId)
        throw new Error('deviceId is required for "transferPlayback" action');
      await client.transferPlayback([ctx.input.deviceId], ctx.input.play);
      return { output: { success: true }, message: 'Playback transferred.' };
    }

    if (action === 'addToQueue') {
      if (!ctx.input.uri) throw new Error('uri is required for "addToQueue" action');
      await client.addToQueue(ctx.input.uri, ctx.input.deviceId);
      return { output: { success: true }, message: 'Item added to queue.' };
    }

    throw new Error(`Unknown action: ${action}`);
  });
