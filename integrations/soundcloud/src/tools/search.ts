import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trackSchema = z.object({
  trackId: z.string().describe('Unique identifier (URN) of the track'),
  title: z.string().describe('Title of the track'),
  permalinkUrl: z.string().describe('URL to the track on SoundCloud'),
  duration: z.number().describe('Duration of the track in milliseconds'),
  genre: z.string().nullable().describe('Genre of the track'),
  artworkUrl: z.string().nullable().describe('URL to the track artwork'),
  playbackCount: z.number().describe('Number of plays'),
  likesCount: z.number().describe('Number of likes'),
  commentsCount: z.number().describe('Number of comments'),
  access: z.string().describe('Access level: playable, preview, or blocked'),
  createdAt: z.string().describe('When the track was created'),
  username: z.string().describe('Username of the track uploader')
});

let playlistSchema = z.object({
  playlistId: z.string().describe('Unique identifier (URN) of the playlist'),
  title: z.string().describe('Title of the playlist'),
  permalinkUrl: z.string().describe('URL to the playlist on SoundCloud'),
  duration: z.number().describe('Total duration in milliseconds'),
  trackCount: z.number().describe('Number of tracks in the playlist'),
  likesCount: z.number().describe('Number of likes'),
  isAlbum: z.boolean().describe('Whether the playlist is marked as an album'),
  createdAt: z.string().describe('When the playlist was created'),
  username: z.string().describe('Username of the playlist creator')
});

let userSchema = z.object({
  userId: z.string().describe('Unique identifier (URN) of the user'),
  username: z.string().describe('Username'),
  fullName: z.string().describe('Full display name'),
  permalinkUrl: z.string().describe('URL to the user profile on SoundCloud'),
  avatarUrl: z.string().describe('URL to the user avatar'),
  followersCount: z.number().describe('Number of followers'),
  trackCount: z.number().describe('Number of tracks uploaded'),
  city: z.string().nullable().describe('User city'),
  countryCode: z.string().nullable().describe('User country code')
});

export let searchTracks = SlateTool.create(spec, {
  name: 'Search Tracks',
  key: 'search_tracks',
  description: `Search for tracks on SoundCloud by keyword, genre, BPM range, or duration. Results can be filtered by access level to only include streamable tracks.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 20, max 200)'),
      access: z
        .enum(['playable', 'preview', 'blocked'])
        .optional()
        .describe('Filter by access level'),
      genres: z.string().optional().describe('Filter by genre'),
      bpmFrom: z.number().optional().describe('Minimum BPM'),
      bpmTo: z.number().optional().describe('Maximum BPM'),
      durationFrom: z.number().optional().describe('Minimum duration in milliseconds'),
      durationTo: z.number().optional().describe('Maximum duration in milliseconds')
    })
  )
  .output(
    z.object({
      tracks: z.array(trackSchema).describe('List of matching tracks'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchTracks(ctx.input.query, {
      limit: ctx.input.limit || 20,
      access: ctx.input.access,
      genres: ctx.input.genres,
      bpmFrom: ctx.input.bpmFrom,
      bpmTo: ctx.input.bpmTo,
      durationFrom: ctx.input.durationFrom,
      durationTo: ctx.input.durationTo
    });

    let tracks = result.collection.map(t => ({
      trackId: t.urn || String(t.id),
      title: t.title,
      permalinkUrl: t.permalink_url,
      duration: t.duration,
      genre: t.genre,
      artworkUrl: t.artwork_url,
      playbackCount: t.playback_count,
      likesCount: t.likes_count,
      commentsCount: t.comment_count,
      access: t.access,
      createdAt: t.created_at,
      username: t.user?.username || ''
    }));

    return {
      output: { tracks, hasMore: !!result.next_href },
      message: `Found **${tracks.length}** tracks matching "${ctx.input.query}"${result.next_href ? ' (more results available)' : ''}.`
    };
  })
  .build();

export let searchPlaylists = SlateTool.create(spec, {
  name: 'Search Playlists',
  key: 'search_playlists',
  description: `Search for playlists (sets) on SoundCloud by keyword. Returns playlist metadata including track count, duration, and creator info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      playlists: z.array(playlistSchema).describe('List of matching playlists'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchPlaylists(ctx.input.query, {
      limit: ctx.input.limit || 20
    });

    let playlists = result.collection.map(p => ({
      playlistId: p.urn || String(p.id),
      title: p.title,
      permalinkUrl: p.permalink_url,
      duration: p.duration,
      trackCount: p.track_count,
      likesCount: p.likes_count,
      isAlbum: p.is_album,
      createdAt: p.created_at,
      username: p.user?.username || ''
    }));

    return {
      output: { playlists, hasMore: !!result.next_href },
      message: `Found **${playlists.length}** playlists matching "${ctx.input.query}"${result.next_href ? ' (more results available)' : ''}.`
    };
  })
  .build();

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search for users on SoundCloud by keyword. Returns user profiles including follower count, track count, and location.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 20, max 200)')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of matching users'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchUsers(ctx.input.query, {
      limit: ctx.input.limit || 20
    });

    let users = result.collection.map(u => ({
      userId: u.urn || String(u.id),
      username: u.username,
      fullName: u.full_name,
      permalinkUrl: u.permalink_url,
      avatarUrl: u.avatar_url,
      followersCount: u.followers_count,
      trackCount: u.track_count,
      city: u.city,
      countryCode: u.country_code
    }));

    return {
      output: { users, hasMore: !!result.next_href },
      message: `Found **${users.length}** users matching "${ctx.input.query}"${result.next_href ? ' (more results available)' : ''}.`
    };
  })
  .build();
