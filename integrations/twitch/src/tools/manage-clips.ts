import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageClips = SlateTool.create(spec, {
  name: 'Manage Clips',
  key: 'manage_clips',
  description: `Create clips from live streams or retrieve existing clips. Create a clip of the current broadcast, or search clips by broadcaster, game, or clip ID.`,
  instructions: [
    'To **create** a clip, set action to "create". The broadcaster must be live.',
    'To **get** clips, set action to "get" and provide at least one filter (broadcasterId, gameId, or clipIds).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get'])
        .describe('Whether to create a new clip or get existing clips'),
      broadcasterId: z
        .string()
        .optional()
        .describe('Broadcaster ID (required for create, optional filter for get)'),
      gameId: z.string().optional().describe('Filter clips by game ID (for get action)'),
      clipIds: z.array(z.string()).optional().describe('Specific clip IDs to retrieve'),
      hasDelay: z
        .boolean()
        .optional()
        .describe('Add a delay before capturing the clip (for create)'),
      maxResults: z.number().optional().describe('Max clips to return (for get, max 100)'),
      startedAt: z
        .string()
        .optional()
        .describe('Filter clips created after this date (RFC 3339)'),
      endedAt: z
        .string()
        .optional()
        .describe('Filter clips created before this date (RFC 3339)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      clipId: z.string().optional().describe('Created clip ID (for create action)'),
      editUrl: z.string().optional().describe('Edit URL for the created clip'),
      clips: z
        .array(
          z.object({
            clipId: z.string(),
            url: z.string(),
            embedUrl: z.string(),
            broadcasterId: z.string(),
            broadcasterName: z.string(),
            creatorId: z.string(),
            creatorName: z.string(),
            gameId: z.string(),
            title: z.string(),
            viewCount: z.number(),
            createdAt: z.string(),
            thumbnailUrl: z.string(),
            duration: z.number()
          })
        )
        .optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.action === 'create') {
      if (!ctx.input.broadcasterId)
        throw new Error('broadcasterId is required to create a clip');

      let result = await client.createClip(ctx.input.broadcasterId, ctx.input.hasDelay);

      return {
        output: { clipId: result.clipId, editUrl: result.editUrl },
        message: `Clip created: [Edit clip](${result.editUrl})`
      };
    }

    let result = await client.getClips({
      broadcasterId: ctx.input.broadcasterId,
      gameId: ctx.input.gameId,
      clipIds: ctx.input.clipIds,
      first: ctx.input.maxResults,
      after: ctx.input.cursor,
      startedAt: ctx.input.startedAt,
      endedAt: ctx.input.endedAt
    });

    let clips = result.clips.map(c => ({
      clipId: c.id,
      url: c.url,
      embedUrl: c.embed_url,
      broadcasterId: c.broadcaster_id,
      broadcasterName: c.broadcaster_name,
      creatorId: c.creator_id,
      creatorName: c.creator_name,
      gameId: c.game_id,
      title: c.title,
      viewCount: c.view_count,
      createdAt: c.created_at,
      thumbnailUrl: c.thumbnail_url,
      duration: c.duration
    }));

    return {
      output: { clips, cursor: result.cursor },
      message:
        clips.length === 0
          ? 'No clips found'
          : `Found **${clips.length}** clips. Top: ${clips
              .slice(0, 3)
              .map(c => `"${c.title}" (${c.viewCount} views)`)
              .join(', ')}`
    };
  })
  .build();
