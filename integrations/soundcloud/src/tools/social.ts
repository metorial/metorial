import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, identifier } from '../lib/native';
import { spec } from '../spec';

export let likeTrack = SlateTool.create(spec, {
  name: 'Like Track',
  key: 'like_track',
  description: `Like or unlike a track on SoundCloud. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      checkOnly: z
        .boolean()
        .optional()
        .describe('Read the exact native relationship state without changing it'),
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
    let client = new Client(ctx.auth);

    if (ctx.input.checkOnly && ctx.input.unlike !== undefined)
      throw fail('Do not combine checkOnly with a relationship mutation flag.');
    if (!ctx.input.checkOnly && ctx.input.unlike) {
      await client.unlikeTrack(ctx.input.trackId);
    } else if (!ctx.input.checkOnly) {
      await client.likeTrack(ctx.input.trackId);
    }

    const liked = await client.socialState('tracks', ctx.input.trackId, 'likes');
    if (!ctx.input.checkOnly && liked !== !ctx.input.unlike)
      throw fail(
        'SoundCloud accepted the request but did not confirm the requested relationship state. Reconcile before retrying.'
      );
    return {
      output: { trackId: identifier(ctx.input.trackId, 'tracks'), liked },
      message: ctx.input.checkOnly
        ? `Confirmed ${liked ? 'liked' : 'not liked'} state for **${ctx.input.trackId}**.`
        : liked
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
      checkOnly: z
        .boolean()
        .optional()
        .describe('Read the exact native relationship state without changing it'),
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
    let client = new Client(ctx.auth);

    if (ctx.input.checkOnly && ctx.input.unrepost !== undefined)
      throw fail('Do not combine checkOnly with a relationship mutation flag.');
    if (!ctx.input.checkOnly && ctx.input.unrepost) {
      await client.unrepostTrack(ctx.input.trackId);
    } else if (!ctx.input.checkOnly) {
      await client.repostTrack(ctx.input.trackId);
    }

    const reposted = await client.socialState('tracks', ctx.input.trackId, 'reposts');
    if (!ctx.input.checkOnly && reposted !== !ctx.input.unrepost)
      throw fail(
        'SoundCloud accepted the request but did not confirm the requested relationship state. Reconcile before retrying.'
      );
    return {
      output: { trackId: identifier(ctx.input.trackId, 'tracks'), reposted },
      message: ctx.input.checkOnly
        ? `Confirmed ${reposted ? 'reposted' : 'not reposted'} state for **${ctx.input.trackId}**.`
        : reposted
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
      checkOnly: z
        .boolean()
        .optional()
        .describe('Read the exact native relationship state without changing it'),
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
    let client = new Client(ctx.auth);

    if (ctx.input.checkOnly && ctx.input.unlike !== undefined)
      throw fail('Do not combine checkOnly with a relationship mutation flag.');
    if (!ctx.input.checkOnly && ctx.input.unlike) {
      await client.unlikePlaylist(ctx.input.playlistId);
    } else if (!ctx.input.checkOnly) {
      await client.likePlaylist(ctx.input.playlistId);
    }

    const liked = await client.socialState('playlists', ctx.input.playlistId, 'likes');
    if (!ctx.input.checkOnly && liked !== !ctx.input.unlike)
      throw fail(
        'SoundCloud accepted the request but did not confirm the requested relationship state. Reconcile before retrying.'
      );
    return {
      output: { playlistId: identifier(ctx.input.playlistId, 'playlists'), liked },
      message: ctx.input.checkOnly
        ? `Confirmed ${liked ? 'liked' : 'not liked'} state for **${ctx.input.playlistId}**.`
        : liked
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
      checkOnly: z
        .boolean()
        .optional()
        .describe('Read the exact native relationship state without changing it'),
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
    let client = new Client(ctx.auth);

    if (ctx.input.checkOnly && ctx.input.unrepost !== undefined)
      throw fail('Do not combine checkOnly with a relationship mutation flag.');
    if (!ctx.input.checkOnly && ctx.input.unrepost) {
      await client.unrepostPlaylist(ctx.input.playlistId);
    } else if (!ctx.input.checkOnly) {
      await client.repostPlaylist(ctx.input.playlistId);
    }

    const reposted = await client.socialState('playlists', ctx.input.playlistId, 'reposts');
    if (!ctx.input.checkOnly && reposted !== !ctx.input.unrepost)
      throw fail(
        'SoundCloud accepted the request but did not confirm the requested relationship state. Reconcile before retrying.'
      );
    return {
      output: { playlistId: identifier(ctx.input.playlistId, 'playlists'), reposted },
      message: ctx.input.checkOnly
        ? `Confirmed ${reposted ? 'reposted' : 'not reposted'} state for **${ctx.input.playlistId}**.`
        : reposted
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
      checkOnly: z
        .boolean()
        .optional()
        .describe('Read the exact native relationship state without changing it'),
      userId: z.string().describe('User ID or URN to follow/unfollow'),
      unfollow: z
        .boolean()
        .optional()
        .describe('Set to true to unfollow instead of follow (default false)')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID that was followed/unfollowed'),
      following: z.boolean().describe('Whether the user is now being followed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.checkOnly && ctx.input.unfollow !== undefined)
      throw fail('Do not combine checkOnly with a relationship mutation flag.');
    if (!ctx.input.checkOnly && ctx.input.unfollow) {
      await client.unfollowUser(ctx.input.userId);
    } else if (!ctx.input.checkOnly) {
      await client.followUser(ctx.input.userId);
    }

    const following = await client.socialState('users', ctx.input.userId, 'followings');
    if (!ctx.input.checkOnly && following !== !ctx.input.unfollow)
      throw fail(
        'SoundCloud accepted the request but did not confirm the requested relationship state. Reconcile before retrying.'
      );
    return {
      output: { userId: identifier(ctx.input.userId, 'users'), following },
      message: ctx.input.checkOnly
        ? `Confirmed ${following ? 'following' : 'not following'} state for **${ctx.input.userId}**.`
        : following
          ? `Now following user **${ctx.input.userId}**.`
          : `Unfollowed user **${ctx.input.userId}**.`
    };
  })
  .build();
