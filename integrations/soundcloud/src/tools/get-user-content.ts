import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTracks = SlateTool.create(spec, {
  name: 'Get User Tracks',
  key: 'get_user_tracks',
  description: `Retrieve tracks uploaded by a specific SoundCloud user. Returns track metadata including title, duration, play counts, and access level.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('User ID or URN'),
      nextHref: z
        .string()
        .optional()
        .describe(
          'Exact continuation URL returned by this list; keep the same resource and filters'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of tracks to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      tracks: z
        .array(
          z.object({
            trackId: z.string().describe('Track URN'),
            title: z.string().describe('Track title'),
            permalinkUrl: z.string().nullable().optional().describe('Track URL'),
            duration: z.number().nullable().optional().describe('Duration in milliseconds'),
            genre: z.string().nullable().optional().describe('Genre'),
            playbackCount: z.number().nullable().optional().describe('Number of plays'),
            likesCount: z.number().nullable().optional().describe('Number of likes'),
            access: z.string().nullable().optional().describe('Access level'),
            createdAt: z.string().nullable().optional().describe('Creation date')
          })
        )
        .describe('List of tracks'),
      nextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next page URL, when supplied'),
      hasMore: z.boolean().describe('Whether more tracks are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getUserTracks(ctx.input.userId, {
      nextHref: ctx.input.nextHref,
      limit: ctx.input.limit ?? 20
    });

    let tracks = result.collection.map(t => ({
      trackId: t.urn,
      title: t.title,
      permalinkUrl: t.permalink_url,
      duration: t.duration,
      genre: t.genre,
      playbackCount: t.playback_count,
      likesCount: t.likes_count,
      access: t.access,
      createdAt: t.created_at
    }));

    return {
      output: { tracks, hasMore: !!result.next_href, nextHref: result.next_href },
      message: `Retrieved **${tracks.length}** tracks for user ${ctx.input.userId}.`
    };
  })
  .build();

export let getUserPlaylists = SlateTool.create(spec, {
  name: 'Get User Playlists',
  key: 'get_user_playlists',
  description: `Retrieve playlists created by a specific SoundCloud user. Returns playlist metadata including title, track count, and sharing status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('User ID or URN'),
      nextHref: z
        .string()
        .optional()
        .describe(
          'Exact continuation URL returned by this list; keep the same resource and filters'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of playlists to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      playlists: z
        .array(
          z.object({
            playlistId: z.string().describe('Playlist URN'),
            title: z.string().describe('Playlist title'),
            permalinkUrl: z.string().nullable().optional().describe('Playlist URL'),
            trackCount: z.number().nullable().optional().describe('Number of tracks'),
            duration: z
              .number()
              .nullable()
              .optional()
              .describe('Total duration in milliseconds'),
            likesCount: z.number().nullable().optional().describe('Number of likes'),
            isAlbum: z.boolean().optional().describe('Whether marked as an album'),
            createdAt: z.string().nullable().optional().describe('Creation date')
          })
        )
        .describe('List of playlists'),
      nextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next page URL, when supplied'),
      hasMore: z.boolean().describe('Whether more playlists are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getUserPlaylists(ctx.input.userId, {
      nextHref: ctx.input.nextHref,
      limit: ctx.input.limit ?? 20
    });

    let playlists = result.collection.map(p => ({
      playlistId: p.urn,
      title: p.title,
      permalinkUrl: p.permalink_url,
      trackCount: p.track_count,
      duration: p.duration,
      likesCount: p.likes_count,
      isAlbum: p.is_album,
      createdAt: p.created_at
    }));

    return {
      output: { playlists, hasMore: !!result.next_href, nextHref: result.next_href },
      message: `Retrieved **${playlists.length}** playlists for user ${ctx.input.userId}.`
    };
  })
  .build();

export let getUserFollowers = SlateTool.create(spec, {
  name: 'Get User Followers',
  key: 'get_user_followers',
  description: `Retrieve the list of followers for a specific SoundCloud user.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('User ID or URN'),
      nextHref: z
        .string()
        .optional()
        .describe(
          'Exact continuation URL returned by this list; keep the same resource and filters'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of followers to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      followers: z
        .array(
          z.object({
            userId: z.string().optional().describe('Follower URN'),
            username: z.string().optional().describe('Username'),
            fullName: z.string().nullable().optional().describe('Full name'),
            permalinkUrl: z.string().nullable().optional().describe('Profile URL'),
            avatarUrl: z.string().nullable().optional().describe('Avatar URL'),
            followersCount: z.number().nullable().optional().describe('Number of followers'),
            trackCount: z.number().nullable().optional().describe('Number of tracks')
          })
        )
        .describe('List of followers'),
      nextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next page URL, when supplied'),
      hasMore: z.boolean().describe('Whether more followers are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getUserFollowers(ctx.input.userId, {
      nextHref: ctx.input.nextHref,
      limit: ctx.input.limit ?? 20
    });

    let followers = result.collection.map(u => ({
      userId: u.urn,
      username: u.username,
      fullName: u.full_name,
      permalinkUrl: u.permalink_url,
      avatarUrl: u.avatar_url,
      followersCount: u.followers_count,
      trackCount: u.track_count
    }));

    return {
      output: { followers, hasMore: !!result.next_href, nextHref: result.next_href },
      message: `Retrieved **${followers.length}** followers for user ${ctx.input.userId}.`
    };
  })
  .build();

export let getUserFollowings = SlateTool.create(spec, {
  name: 'Get User Followings',
  key: 'get_user_followings',
  description: `Retrieve the list of users that a specific SoundCloud user is following.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('User ID or URN'),
      nextHref: z
        .string()
        .optional()
        .describe(
          'Exact continuation URL returned by this list; keep the same resource and filters'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of followings to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      followings: z
        .array(
          z.object({
            userId: z.string().optional().describe('User URN'),
            username: z.string().optional().describe('Username'),
            fullName: z.string().nullable().optional().describe('Full name'),
            permalinkUrl: z.string().nullable().optional().describe('Profile URL'),
            avatarUrl: z.string().nullable().optional().describe('Avatar URL'),
            followersCount: z.number().nullable().optional().describe('Number of followers'),
            trackCount: z.number().nullable().optional().describe('Number of tracks')
          })
        )
        .describe('List of followings'),
      nextHref: z
        .string()
        .nullable()
        .optional()
        .describe('Native next page URL, when supplied'),
      hasMore: z.boolean().describe('Whether more followings are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getUserFollowings(ctx.input.userId, {
      nextHref: ctx.input.nextHref,
      limit: ctx.input.limit ?? 20
    });

    let followings = result.collection.map(u => ({
      userId: u.urn,
      username: u.username,
      fullName: u.full_name,
      permalinkUrl: u.permalink_url,
      avatarUrl: u.avatar_url,
      followersCount: u.followers_count,
      trackCount: u.track_count
    }));

    return {
      output: { followings, hasMore: !!result.next_href, nextHref: result.next_href },
      message: `Retrieved **${followings.length}** followings for user ${ctx.input.userId}.`
    };
  })
  .build();
