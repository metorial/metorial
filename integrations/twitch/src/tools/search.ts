import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search for channels or game/category on Twitch. Find channels by name or keyword, optionally filtering to live channels only. Search for games/categories to get their IDs for use in other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      type: z
        .enum(['channels', 'categories'])
        .describe('Whether to search channels or categories/games'),
      liveOnly: z
        .boolean()
        .optional()
        .describe('Only return live channels (for channel search)'),
      maxResults: z.number().optional().describe('Maximum number of results (1-100)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            broadcasterId: z.string(),
            broadcasterLogin: z.string(),
            displayName: z.string(),
            gameId: z.string(),
            gameName: z.string(),
            isLive: z.boolean(),
            title: z.string(),
            language: z.string(),
            thumbnailUrl: z.string(),
            tags: z.array(z.string())
          })
        )
        .optional(),
      categories: z
        .array(
          z.object({
            categoryId: z.string(),
            name: z.string(),
            boxArtUrl: z.string()
          })
        )
        .optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.type === 'channels') {
      let result = await client.searchChannels(ctx.input.query, {
        first: ctx.input.maxResults,
        after: ctx.input.cursor,
        liveOnly: ctx.input.liveOnly
      });

      let channels = result.channels.map(c => ({
        broadcasterId: c.id,
        broadcasterLogin: c.broadcaster_login,
        displayName: c.display_name,
        gameId: c.game_id,
        gameName: c.game_name,
        isLive: c.is_live,
        title: c.title,
        language: c.broadcaster_language,
        thumbnailUrl: c.thumbnail_url,
        tags: c.tags || []
      }));

      return {
        output: { channels, cursor: result.cursor },
        message:
          channels.length === 0
            ? `No channels found for "${ctx.input.query}"`
            : `Found **${channels.length}** channels for "${ctx.input.query}"`
      };
    }

    let result = await client.searchCategories(ctx.input.query, {
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let categories = result.categories.map(c => ({
      categoryId: c.id,
      name: c.name,
      boxArtUrl: c.box_art_url
    }));

    return {
      output: { categories, cursor: result.cursor },
      message:
        categories.length === 0
          ? `No categories found for "${ctx.input.query}"`
          : `Found **${categories.length}** categories: ${categories
              .slice(0, 5)
              .map(c => c.name)
              .join(', ')}`
    };
  })
  .build();
