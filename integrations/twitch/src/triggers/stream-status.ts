import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let streamStatus = SlateTrigger.create(spec, {
  name: 'Stream Status',
  key: 'stream_status',
  description:
    'Triggers when a monitored channel goes live or offline. Polls for stream status changes.'
})
  .input(
    z.object({
      eventType: z.enum(['online', 'offline']).describe('Type of stream event'),
      userId: z.string().describe('User ID of the streamer'),
      userName: z.string().describe('Display name of the streamer'),
      userLogin: z.string().describe('Login name of the streamer'),
      streamId: z.string().optional().describe('Stream ID (available when going online)'),
      title: z.string().optional().describe('Stream title'),
      gameName: z.string().optional().describe('Game/category being played'),
      gameId: z.string().optional().describe('Game/category ID'),
      viewerCount: z.number().optional().describe('Current viewer count'),
      startedAt: z.string().optional().describe('Stream start time'),
      language: z.string().optional().describe('Stream language'),
      thumbnailUrl: z.string().optional().describe('Stream thumbnail URL')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      userName: z.string(),
      userLogin: z.string(),
      streamId: z.string().optional(),
      title: z.string().optional(),
      gameName: z.string().optional(),
      gameId: z.string().optional(),
      viewerCount: z.number().optional(),
      startedAt: z.string().optional(),
      language: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      isLive: z.boolean()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
      let state = ctx.state as { trackedStreams?: Record<string, boolean> } | null;
      let trackedStreams = state?.trackedStreams || {};

      // Get the authenticated user to monitor their stream and followed channels
      let user = await client.getAuthenticatedUser();
      let userIds = [user.id];

      // Check current stream status
      let result = await client.getStreams({ userIds });
      let liveStreamIds = new Set(result.streams.map(s => s.user_id));
      let inputs: Array<{
        eventType: 'online' | 'offline';
        userId: string;
        userName: string;
        userLogin: string;
        streamId?: string;
        title?: string;
        gameName?: string;
        gameId?: string;
        viewerCount?: number;
        startedAt?: string;
        language?: string;
        thumbnailUrl?: string;
      }> = [];

      // Check for new live streams
      for (let stream of result.streams) {
        if (!trackedStreams[stream.user_id]) {
          inputs.push({
            eventType: 'online',
            userId: stream.user_id,
            userName: stream.user_name,
            userLogin: stream.user_login,
            streamId: stream.id,
            title: stream.title,
            gameName: stream.game_name,
            gameId: stream.game_id,
            viewerCount: stream.viewer_count,
            startedAt: stream.started_at,
            language: stream.language,
            thumbnailUrl: stream.thumbnail_url
          });
        }
      }

      // Check for streams that went offline
      for (let userId of Object.keys(trackedStreams)) {
        if (trackedStreams[userId] && !liveStreamIds.has(userId)) {
          let users = await client.getUsers({ ids: [userId] });
          let offlineUser = users[0];
          inputs.push({
            eventType: 'offline',
            userId,
            userName: offlineUser?.display_name || userId,
            userLogin: offlineUser?.login || userId
          });
        }
      }

      let newTrackedStreams: Record<string, boolean> = {};
      for (let userId of userIds) {
        newTrackedStreams[userId] = liveStreamIds.has(userId);
      }

      return {
        inputs,
        updatedState: { trackedStreams: newTrackedStreams }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `stream.${ctx.input.eventType}`,
        id: `${ctx.input.userId}-${ctx.input.eventType}-${ctx.input.streamId || Date.now()}`,
        output: {
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          userLogin: ctx.input.userLogin,
          streamId: ctx.input.streamId,
          title: ctx.input.title,
          gameName: ctx.input.gameName,
          gameId: ctx.input.gameId,
          viewerCount: ctx.input.viewerCount,
          startedAt: ctx.input.startedAt,
          language: ctx.input.language,
          thumbnailUrl: ctx.input.thumbnailUrl,
          isLive: ctx.input.eventType === 'online'
        }
      };
    }
  })
  .build();
