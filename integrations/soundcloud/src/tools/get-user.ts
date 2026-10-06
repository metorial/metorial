import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, limit as validateLimit } from '../lib/native';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve public profile information for a SoundCloud user by ID or URN. Includes follower/following counts, track count, and location.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('User ID or URN (e.g., "123456" or "soundcloud:users:123456")')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('Unique identifier (URN)'),
      username: z.string().optional().describe('Username'),
      fullName: z.string().nullable().optional().describe('Full display name'),
      description: z.string().nullable().optional().describe('User bio'),
      permalinkUrl: z.string().nullable().optional().describe('Profile URL on SoundCloud'),
      avatarUrl: z.string().nullable().optional().describe('Avatar image URL'),
      city: z.string().nullable().optional().describe('City'),
      countryCode: z
        .string()
        .nullable()
        .optional()
        .describe('Native country code, only when supplied'),
      country: z.string().nullable().optional().describe('Native country name or value'),
      publicFavoritesCount: z
        .number()
        .nullable()
        .optional()
        .describe('Native public favorites count'),
      followersCount: z.number().nullable().optional().describe('Number of followers'),
      followingsCount: z.number().nullable().optional().describe('Number of users followed'),
      trackCount: z.number().nullable().optional().describe('Number of uploaded tracks'),
      playlistCount: z.number().nullable().optional().describe('Number of playlists'),
      likesCount: z.number().nullable().optional().describe('Number of likes'),
      verified: z.boolean().optional().describe('Whether the user is verified'),
      createdAt: z.string().nullable().optional().describe('When the account was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.urn,
        username: user.username,
        fullName: user.full_name,
        description: user.description,
        permalinkUrl: user.permalink_url,
        avatarUrl: user.avatar_url,
        city: user.city,
        countryCode: user.country_code,
        country: user.country,
        publicFavoritesCount: user.public_favorites_count,
        followersCount: user.followers_count,
        followingsCount: user.followings_count,
        trackCount: user.track_count,
        playlistCount: user.playlist_count,
        likesCount: user.likes_count,
        verified: user.verified,
        createdAt: user.created_at
      },
      message: `Retrieved profile for **${user.username}** (${user.full_name}) - ${user.track_count} tracks, ${user.followers_count} followers.`
    };
  })
  .build();

export let getMyProfile = SlateTool.create(spec, {
  name: 'Get My Profile',
  key: 'get_my_profile',
  description: `Retrieve the authenticated user's SoundCloud profile, including their tracks, playlists, and liked tracks. Requires user-level OAuth authentication.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeTracks: z
        .boolean()
        .optional()
        .describe("Include the user's uploaded tracks (default false)"),
      includePlaylists: z
        .boolean()
        .optional()
        .describe("Include the user's playlists (default false)"),
      includeLikes: z
        .boolean()
        .optional()
        .describe("Include the user's liked tracks (default false)"),
      limit: z.number().optional().describe('Max items to include per list (default 20)'),
      tracksNextHref: z
        .string()
        .optional()
        .describe(
          'Exact native uploaded-track continuation returned by this tool; requires includeTracks'
        ),
      playlistsNextHref: z
        .string()
        .optional()
        .describe(
          'Exact native playlist continuation returned by this tool; requires includePlaylists'
        ),
      likesNextHref: z
        .string()
        .optional()
        .describe(
          'Exact native liked-track continuation returned by this tool; requires includeLikes'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('Unique identifier (URN)'),
      username: z.string().optional().describe('Username'),
      fullName: z.string().nullable().optional().describe('Full display name'),
      description: z.string().nullable().optional().describe('User bio'),
      permalinkUrl: z.string().nullable().optional().describe('Profile URL on SoundCloud'),
      avatarUrl: z.string().nullable().optional().describe('Avatar image URL'),
      followersCount: z.number().nullable().optional().describe('Number of followers'),
      followingsCount: z.number().nullable().optional().describe('Number of users followed'),
      trackCount: z.number().nullable().optional().describe('Number of uploaded tracks'),
      playlistCount: z.number().nullable().optional().describe('Number of playlists'),
      tracks: z
        .array(
          z.object({
            trackId: z.string(),
            title: z.string(),
            permalinkUrl: z.string().nullable().optional(),
            duration: z.number().nullable().optional(),
            access: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Uploaded tracks'),
      playlists: z
        .array(
          z.object({
            playlistId: z.string(),
            title: z.string(),
            permalinkUrl: z.string().nullable().optional(),
            trackCount: z.number().nullable().optional()
          })
        )
        .optional()
        .describe('User playlists'),
      tracksNextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next uploaded-track page'),
      playlistsNextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next playlist page'),
      likesNextHref: z.string().nullable().optional().describe('Native next liked-track page'),
      likedTracks: z
        .array(
          z.object({
            trackId: z.string(),
            title: z.string(),
            permalinkUrl: z.string().nullable().optional(),
            username: z.string().optional()
          })
        )
        .optional()
        .describe('Liked tracks')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      limit = validateLimit(ctx.input.limit ?? 20);
    for (const [next, include] of [
      [ctx.input.tracksNextHref, ctx.input.includeTracks],
      [ctx.input.playlistsNextHref, ctx.input.includePlaylists],
      [ctx.input.likesNextHref, ctx.input.includeLikes]
    ])
      if (next !== undefined && !include)
        throw fail('A profile-list continuation requires its matching include flag.');
    const user = await client.getMe();
    const trackPage = ctx.input.includeTracks
      ? await client.getMyTracks({ limit, nextHref: ctx.input.tracksNextHref })
      : undefined;
    const playlistPage = ctx.input.includePlaylists
      ? await client.getMyPlaylists({ limit, nextHref: ctx.input.playlistsNextHref })
      : undefined;
    const likesPage = ctx.input.includeLikes
      ? await client.getMyLikedTracks({ limit, nextHref: ctx.input.likesNextHref })
      : undefined;
    return {
      output: {
        userId: user.urn,
        username: user.username,
        fullName: user.full_name,
        description: user.description,
        permalinkUrl: user.permalink_url,
        avatarUrl: user.avatar_url,
        followersCount: user.followers_count,
        followingsCount: user.followings_count,
        trackCount: user.track_count,
        playlistCount: user.playlist_count,
        tracks: trackPage?.collection.map(t => ({
          trackId: t.urn,
          title: t.title,
          permalinkUrl: t.permalink_url,
          duration: t.duration,
          access: t.access
        })),
        playlists: playlistPage?.collection.map(p => ({
          playlistId: p.urn,
          title: p.title,
          permalinkUrl: p.permalink_url,
          trackCount: p.track_count
        })),
        likedTracks: likesPage?.collection.map(t => ({
          trackId: t.urn,
          title: t.title,
          permalinkUrl: t.permalink_url,
          username: t.user?.username
        })),
        tracksNextHref: trackPage?.next_href,
        playlistsNextHref: playlistPage?.next_href,
        likesNextHref: likesPage?.next_href
      },
      message: `Retrieved SoundCloud profile for **${user.username}**. Optional lists are native pages, with continuations when supplied.`
    };
  })
  .build();
