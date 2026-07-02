import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageFollowing = SlateTool.create(spec, {
  name: 'Manage Following',
  key: 'manage_following',
  description: `Manage the user's followed artists, users, and playlists. Follow or unfollow artists/users, check follow status, list followed artists, and follow/unfollow playlists.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'follow',
          'unfollow',
          'check',
          'getFollowedArtists',
          'followPlaylist',
          'unfollowPlaylist'
        ])
        .describe('Following operation to perform'),
      type: z
        .enum(['artist', 'user'])
        .optional()
        .describe('Entity type for follow/unfollow/check operations'),
      ids: z.array(z.string()).optional().describe('Spotify IDs of artists or users'),
      playlistId: z
        .string()
        .optional()
        .describe('Spotify playlist ID (for followPlaylist/unfollowPlaylist)'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether to publicly show that the user follows the playlist'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max results for getFollowedArtists (default 20)'),
      after: z.string().optional().describe('Cursor for pagination of followed artists')
    })
  )
  .output(
    z.object({
      followedArtists: z
        .array(
          z.object({
            artistId: z.string(),
            name: z.string(),
            genres: z.array(z.string()),
            popularity: z.number(),
            followers: z.number(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string()
          })
        )
        .optional(),
      checkResults: z
        .array(
          z.object({
            itemId: z.string(),
            isFollowing: z.boolean()
          })
        )
        .optional(),
      nextCursor: z.string().nullable().optional(),
      total: z.number().optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
    });

    let { action } = ctx.input;

    if (action === 'follow') {
      if (!ctx.input.type) throw new Error('type is required for "follow" action');
      if (!ctx.input.ids || ctx.input.ids.length === 0)
        throw new Error('ids is required for "follow" action');
      await client.followArtistsOrUsers(ctx.input.type, ctx.input.ids);
      return {
        output: { success: true },
        message: `Followed ${ctx.input.ids.length} ${ctx.input.type}(s).`
      };
    }

    if (action === 'unfollow') {
      if (!ctx.input.type) throw new Error('type is required for "unfollow" action');
      if (!ctx.input.ids || ctx.input.ids.length === 0)
        throw new Error('ids is required for "unfollow" action');
      await client.unfollowArtistsOrUsers(ctx.input.type, ctx.input.ids);
      return {
        output: { success: true },
        message: `Unfollowed ${ctx.input.ids.length} ${ctx.input.type}(s).`
      };
    }

    if (action === 'check') {
      if (!ctx.input.type) throw new Error('type is required for "check" action');
      if (!ctx.input.ids || ctx.input.ids.length === 0)
        throw new Error('ids is required for "check" action');
      let results = await client.checkFollowing(ctx.input.type, ctx.input.ids);
      let checkResults = ctx.input.ids.map((id, i) => ({
        itemId: id,
        isFollowing: results[i] ?? false
      }));
      return {
        output: { checkResults },
        message: `Checked ${checkResults.length} ${ctx.input.type}(s): ${checkResults.filter(r => r.isFollowing).length} followed.`
      };
    }

    if (action === 'getFollowedArtists') {
      let result = await client.getFollowedArtists({
        limit: ctx.input.limit,
        after: ctx.input.after
      });

      let followedArtists = result.artists.items.map(a => ({
        artistId: a.id,
        name: a.name,
        genres: a.genres,
        popularity: a.popularity,
        followers: a.followers.total,
        imageUrl: a.images?.[0]?.url ?? null,
        spotifyUrl: a.external_urls.spotify
      }));

      return {
        output: {
          followedArtists,
          nextCursor: result.artists.cursors.after,
          total: result.artists.total
        },
        message: `Retrieved ${followedArtists.length} followed artists${result.artists.total ? ` (${result.artists.total} total)` : ''}.`
      };
    }

    if (action === 'followPlaylist') {
      if (!ctx.input.playlistId)
        throw new Error('playlistId is required for "followPlaylist" action');
      await client.followPlaylist(ctx.input.playlistId, ctx.input.isPublic);
      return {
        output: { success: true },
        message: 'Now following playlist.'
      };
    }

    if (action === 'unfollowPlaylist') {
      if (!ctx.input.playlistId)
        throw new Error('playlistId is required for "unfollowPlaylist" action');
      await client.unfollowPlaylist(ctx.input.playlistId);
      return {
        output: { success: true },
        message: 'Unfollowed playlist.'
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
