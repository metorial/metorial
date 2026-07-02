import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let getStreams = SlateTool.create(spec, {
  name: 'Get Streams',
  key: 'get_streams',
  description: `Retrieve information about active live streams. Filter by user, game, or language. Returns viewer count, game, title, and stream start time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      userLogins: z.array(z.string()).optional().describe('Filter by user login names'),
      gameIds: z.array(z.string()).optional().describe('Filter by game/category IDs'),
      language: z.string().optional().describe('Filter by stream language (ISO 639-1 code)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      streams: z.array(
        z.object({
          streamId: z.string(),
          userId: z.string(),
          userLogin: z.string(),
          userName: z.string(),
          gameId: z.string(),
          gameName: z.string(),
          type: z.string(),
          title: z.string(),
          viewerCount: z.number(),
          startedAt: z.string(),
          language: z.string(),
          thumbnailUrl: z.string(),
          tags: z.array(z.string()),
          isMature: z.boolean()
        })
      ),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    let result = await client.getStreams({
      userIds: ctx.input.userIds,
      userLogins: ctx.input.userLogins,
      gameIds: ctx.input.gameIds,
      language: ctx.input.language,
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let mapped = result.streams.map(s => ({
      streamId: s.id,
      userId: s.user_id,
      userLogin: s.user_login,
      userName: s.user_name,
      gameId: s.game_id,
      gameName: s.game_name,
      type: s.type,
      title: s.title,
      viewerCount: s.viewer_count,
      startedAt: s.started_at,
      language: s.language,
      thumbnailUrl: s.thumbnail_url,
      tags: s.tags || [],
      isMature: s.is_mature
    }));

    return {
      output: { streams: mapped, cursor: result.cursor },
      message:
        mapped.length === 0
          ? 'No live streams found matching the criteria'
          : `Found **${mapped.length}** live streams. Top: ${mapped
              .slice(0, 3)
              .map(s => `**${s.userName}** (${s.viewerCount} viewers)`)
              .join(', ')}`
    };
  })
  .build();
