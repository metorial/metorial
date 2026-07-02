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
            permalinkUrl: z.string().describe('Track URL'),
            duration: z.number().describe('Duration in milliseconds'),
            genre: z.string().nullable().describe('Genre'),
            playbackCount: z.number().describe('Number of plays'),
            likesCount: z.number().describe('Number of likes'),
            access: z.string().describe('Access level'),
            createdAt: z.string().describe('Creation date')
          })
        )
        .describe('List of tracks'),
      hasMore: z.boolean().describe('Whether more tracks are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUserTracks(ctx.input.userId, {
      limit: ctx.input.limit || 20
    });

    let tracks = result.collection.map(t => ({
      trackId: t.urn || String(t.id),
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
      output: { tracks, hasMore: !!result.next_href },
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
            permalinkUrl: z.string().describe('Playlist URL'),
            trackCount: z.number().describe('Number of tracks'),
            duration: z.number().describe('Total duration in milliseconds'),
            likesCount: z.number().describe('Number of likes'),
            isAlbum: z.boolean().describe('Whether marked as an album'),
            createdAt: z.string().describe('Creation date')
          })
        )
        .describe('List of playlists'),
      hasMore: z.boolean().describe('Whether more playlists are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUserPlaylists(ctx.input.userId, {
      limit: ctx.input.limit || 20
    });

    let playlists = result.collection.map(p => ({
      playlistId: p.urn || String(p.id),
      title: p.title,
      permalinkUrl: p.permalink_url,
      trackCount: p.track_count,
      duration: p.duration,
      likesCount: p.likes_count,
      isAlbum: p.is_album,
      createdAt: p.created_at
    }));

    return {
      output: { playlists, hasMore: !!result.next_href },
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
            userId: z.string().describe('Follower URN'),
            username: z.string().describe('Username'),
            fullName: z.string().describe('Full name'),
            permalinkUrl: z.string().describe('Profile URL'),
            avatarUrl: z.string().describe('Avatar URL'),
            followersCount: z.number().describe('Number of followers'),
            trackCount: z.number().describe('Number of tracks')
          })
        )
        .describe('List of followers'),
      hasMore: z.boolean().describe('Whether more followers are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUserFollowers(ctx.input.userId, {
      limit: ctx.input.limit || 20
    });

    let followers = result.collection.map(u => ({
      userId: u.urn || String(u.id),
      username: u.username,
      fullName: u.full_name,
      permalinkUrl: u.permalink_url,
      avatarUrl: u.avatar_url,
      followersCount: u.followers_count,
      trackCount: u.track_count
    }));

    return {
      output: { followers, hasMore: !!result.next_href },
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
            userId: z.string().describe('User URN'),
            username: z.string().describe('Username'),
            fullName: z.string().describe('Full name'),
            permalinkUrl: z.string().describe('Profile URL'),
            avatarUrl: z.string().describe('Avatar URL'),
            followersCount: z.number().describe('Number of followers'),
            trackCount: z.number().describe('Number of tracks')
          })
        )
        .describe('List of followings'),
      hasMore: z.boolean().describe('Whether more followings are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUserFollowings(ctx.input.userId, {
      limit: ctx.input.limit || 20
    });

    let followings = result.collection.map(u => ({
      userId: u.urn || String(u.id),
      username: u.username,
      fullName: u.full_name,
      permalinkUrl: u.permalink_url,
      avatarUrl: u.avatar_url,
      followersCount: u.followers_count,
      trackCount: u.track_count
    }));

    return {
      output: { followings, hasMore: !!result.next_href },
      message: `Retrieved **${followings.length}** followings for user ${ctx.input.userId}.`
    };
  })
  .build();
