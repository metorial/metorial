import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      userId: z.string().describe('Unique identifier (URN)'),
      username: z.string().describe('Username'),
      fullName: z.string().describe('Full display name'),
      description: z.string().nullable().describe('User bio'),
      permalinkUrl: z.string().describe('Profile URL on SoundCloud'),
      avatarUrl: z.string().describe('Avatar image URL'),
      city: z.string().nullable().describe('City'),
      countryCode: z.string().nullable().describe('Country code'),
      followersCount: z.number().describe('Number of followers'),
      followingsCount: z.number().describe('Number of users followed'),
      trackCount: z.number().describe('Number of uploaded tracks'),
      playlistCount: z.number().describe('Number of playlists'),
      likesCount: z.number().describe('Number of likes'),
      verified: z.boolean().describe('Whether the user is verified'),
      createdAt: z.string().describe('When the account was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.urn || String(user.id),
        username: user.username,
        fullName: user.full_name,
        description: user.description,
        permalinkUrl: user.permalink_url,
        avatarUrl: user.avatar_url,
        city: user.city,
        countryCode: user.country_code,
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
      limit: z.number().optional().describe('Max items to include per list (default 20)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique identifier (URN)'),
      username: z.string().describe('Username'),
      fullName: z.string().describe('Full display name'),
      description: z.string().nullable().describe('User bio'),
      permalinkUrl: z.string().describe('Profile URL on SoundCloud'),
      avatarUrl: z.string().describe('Avatar image URL'),
      followersCount: z.number().describe('Number of followers'),
      followingsCount: z.number().describe('Number of users followed'),
      trackCount: z.number().describe('Number of uploaded tracks'),
      playlistCount: z.number().describe('Number of playlists'),
      tracks: z
        .array(
          z.object({
            trackId: z.string(),
            title: z.string(),
            permalinkUrl: z.string(),
            duration: z.number(),
            access: z.string()
          })
        )
        .optional()
        .describe('Uploaded tracks'),
      playlists: z
        .array(
          z.object({
            playlistId: z.string(),
            title: z.string(),
            permalinkUrl: z.string(),
            trackCount: z.number()
          })
        )
        .optional()
        .describe('User playlists'),
      likedTracks: z
        .array(
          z.object({
            trackId: z.string(),
            title: z.string(),
            permalinkUrl: z.string(),
            username: z.string()
          })
        )
        .optional()
        .describe('Liked tracks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let limit = ctx.input.limit || 20;

    let user = await client.getMe();

    let tracks:
      | {
          trackId: string;
          title: string;
          permalinkUrl: string;
          duration: number;
          access: string;
        }[]
      | undefined;
    let playlists:
      | { playlistId: string; title: string; permalinkUrl: string; trackCount: number }[]
      | undefined;
    let likedTracks:
      | { trackId: string; title: string; permalinkUrl: string; username: string }[]
      | undefined;

    if (ctx.input.includeTracks) {
      let result = await client.getMyTracks({ limit });
      tracks = result.collection.map(t => ({
        trackId: t.urn || String(t.id),
        title: t.title,
        permalinkUrl: t.permalink_url,
        duration: t.duration,
        access: t.access
      }));
    }

    if (ctx.input.includePlaylists) {
      let result = await client.getMyPlaylists({ limit });
      playlists = result.collection.map(p => ({
        playlistId: p.urn || String(p.id),
        title: p.title,
        permalinkUrl: p.permalink_url,
        trackCount: p.track_count
      }));
    }

    if (ctx.input.includeLikes) {
      let result = await client.getMyLikedTracks({ limit });
      likedTracks = result.collection.map(t => ({
        trackId: t.urn || String(t.id),
        title: t.title,
        permalinkUrl: t.permalink_url,
        username: t.user?.username || ''
      }));
    }

    return {
      output: {
        userId: user.urn || String(user.id),
        username: user.username,
        fullName: user.full_name,
        description: user.description,
        permalinkUrl: user.permalink_url,
        avatarUrl: user.avatar_url,
        followersCount: user.followers_count,
        followingsCount: user.followings_count,
        trackCount: user.track_count,
        playlistCount: user.playlist_count,
        tracks,
        playlists,
        likedTracks
      },
      message: `Retrieved profile for **${user.username}** - ${user.track_count} tracks, ${user.followers_count} followers.`
    };
  })
  .build();
