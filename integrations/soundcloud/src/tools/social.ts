import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let likeTrack = SlateTool.create(spec, {
  name: 'Like Track',
  key: 'like_track',
  description: `Like or unlike a track on SoundCloud. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN to like/unlike'),
      unlike: z
        .boolean()
        .optional()
        .describe('Set to true to unlike instead of like (default false)')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Track ID that was liked/unliked'),
      liked: z.boolean().describe('Whether the track is now liked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unlike) {
      await client.unlikeTrack(ctx.input.trackId);
    } else {
      await client.likeTrack(ctx.input.trackId);
    }

    let liked = !ctx.input.unlike;
    return {
      output: { trackId: ctx.input.trackId, liked },
      message: liked
        ? `Liked track **${ctx.input.trackId}**.`
        : `Unliked track **${ctx.input.trackId}**.`
    };
  })
  .build();

export let repostTrack = SlateTool.create(spec, {
  name: 'Repost Track',
  key: 'repost_track',
  description: `Repost or un-repost a track to the authenticated user's profile. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN to repost/un-repost'),
      unrepost: z
        .boolean()
        .optional()
        .describe('Set to true to remove the repost (default false)')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Track ID that was reposted/un-reposted'),
      reposted: z.boolean().describe('Whether the track is now reposted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unrepost) {
      await client.unrepostTrack(ctx.input.trackId);
    } else {
      await client.repostTrack(ctx.input.trackId);
    }

    let reposted = !ctx.input.unrepost;
    return {
      output: { trackId: ctx.input.trackId, reposted },
      message: reposted
        ? `Reposted track **${ctx.input.trackId}**.`
        : `Removed repost of track **${ctx.input.trackId}**.`
    };
  })
  .build();

export let likePlaylist = SlateTool.create(spec, {
  name: 'Like Playlist',
  key: 'like_playlist',
  description: `Like or unlike a playlist on SoundCloud. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      playlistId: z.string().describe('Playlist ID or URN to like/unlike'),
      unlike: z
        .boolean()
        .optional()
        .describe('Set to true to unlike instead of like (default false)')
    })
  )
  .output(
    z.object({
      playlistId: z.string().describe('Playlist ID that was liked/unliked'),
      liked: z.boolean().describe('Whether the playlist is now liked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unlike) {
      await client.unlikePlaylist(ctx.input.playlistId);
    } else {
      await client.likePlaylist(ctx.input.playlistId);
    }

    let liked = !ctx.input.unlike;
    return {
      output: { playlistId: ctx.input.playlistId, liked },
      message: liked
        ? `Liked playlist **${ctx.input.playlistId}**.`
        : `Unliked playlist **${ctx.input.playlistId}**.`
    };
  })
  .build();

export let repostPlaylist = SlateTool.create(spec, {
  name: 'Repost Playlist',
  key: 'repost_playlist',
  description: `Repost or un-repost a playlist to the authenticated user's profile. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      playlistId: z.string().describe('Playlist ID or URN to repost/un-repost'),
      unrepost: z
        .boolean()
        .optional()
        .describe('Set to true to remove the repost (default false)')
    })
  )
  .output(
    z.object({
      playlistId: z.string().describe('Playlist ID that was reposted/un-reposted'),
      reposted: z.boolean().describe('Whether the playlist is now reposted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unrepost) {
      await client.unrepostPlaylist(ctx.input.playlistId);
    } else {
      await client.repostPlaylist(ctx.input.playlistId);
    }

    let reposted = !ctx.input.unrepost;
    return {
      output: { playlistId: ctx.input.playlistId, reposted },
      message: reposted
        ? `Reposted playlist **${ctx.input.playlistId}**.`
        : `Removed repost of playlist **${ctx.input.playlistId}**.`
    };
  })
  .build();

export let followUser = SlateTool.create(spec, {
  name: 'Follow User',
  key: 'follow_user',
  description: `Follow or unfollow a user on SoundCloud. Tracks from followed users appear in your activity feed. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      userId: z.string().describe('User ID or URN to follow/unfollow'),
      unfollow: z
        .boolean()
        .optional()
        .describe('Set to true to unfollow instead of follow (default false)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID that was followed/unfollowed'),
      following: z.boolean().describe('Whether the user is now being followed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unfollow) {
      await client.unfollowUser(ctx.input.userId);
    } else {
      await client.followUser(ctx.input.userId);
    }

    let following = !ctx.input.unfollow;
    return {
      output: { userId: ctx.input.userId, following },
      message: following
        ? `Now following user **${ctx.input.userId}**.`
        : `Unfollowed user **${ctx.input.userId}**.`
    };
  })
  .build();
