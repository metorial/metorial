import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let channelUpdate = SlateTrigger.create(spec, {
  name: 'Channel Update',
  key: 'channel_update',
  description:
    "Triggers when a channel's title, game/category, language, or other properties change. Polls for changes to channel info."
})
  .input(
    z.object({
      broadcasterId: z.string(),
      broadcasterName: z.string(),
      title: z.string(),
      gameName: z.string(),
      gameId: z.string(),
      language: z.string(),
      changeType: z.string().describe('What changed (title, game, language, etc.)')
    })
  )
  .output(
    z.object({
      broadcasterId: z.string(),
      broadcasterName: z.string(),
      title: z.string(),
      gameName: z.string(),
      gameId: z.string(),
      language: z.string(),
      changeType: z.string().describe('What changed'),
      tags: z.array(z.string())
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
      let state = ctx.state as {
        lastTitle?: string;
        lastGameId?: string;
        lastLanguage?: string;
        broadcasterId?: string;
      } | null;

      let user = await client.getAuthenticatedUser();
      let channels = await client.getChannelInfo([user.id]);
      let channel = channels[0];
      if (!channel) return { inputs: [], updatedState: state };

      let inputs: Array<{
        broadcasterId: string;
        broadcasterName: string;
        title: string;
        gameName: string;
        gameId: string;
        language: string;
        changeType: string;
      }> = [];

      // Only detect changes after we have a baseline
      if (state?.broadcasterId) {
        let changes: string[] = [];
        if (state.lastTitle !== undefined && state.lastTitle !== channel.title)
          changes.push('title');
        if (state.lastGameId !== undefined && state.lastGameId !== channel.game_id)
          changes.push('game');
        if (
          state.lastLanguage !== undefined &&
          state.lastLanguage !== channel.broadcaster_language
        )
          changes.push('language');

        if (changes.length > 0) {
          inputs.push({
            broadcasterId: channel.broadcaster_id,
            broadcasterName: channel.broadcaster_name,
            title: channel.title,
            gameName: channel.game_name,
            gameId: channel.game_id,
            language: channel.broadcaster_language,
            changeType: changes.join(',')
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastTitle: channel.title,
          lastGameId: channel.game_id,
          lastLanguage: channel.broadcaster_language,
          broadcasterId: channel.broadcaster_id
        }
      };
    },

    handleEvent: async ctx => {
      let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
      let channels = await client.getChannelInfo([ctx.input.broadcasterId]);
      let channel = channels[0];

      return {
        type: `channel.updated`,
        id: `${ctx.input.broadcasterId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          broadcasterId: ctx.input.broadcasterId,
          broadcasterName: ctx.input.broadcasterName,
          title: ctx.input.title,
          gameName: ctx.input.gameName,
          gameId: ctx.input.gameId,
          language: ctx.input.language,
          changeType: ctx.input.changeType,
          tags: channel?.tags || []
        }
      };
    }
  })
  .build();
