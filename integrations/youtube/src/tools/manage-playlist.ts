import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let managePlaylist = SlateTool.create(spec, {
  name: 'Manage Playlist',
  key: 'manage_playlist',
  description: `Create, update, or delete a YouTube playlist. When creating, provide a title and optional description, privacy, and tags. When updating, provide the playlist ID and fields to change. When deleting, provide only the playlist ID.`,
  instructions: [
    'For creating: set action to "create" and provide title.',
    'For updating: set action to "update" and provide playlistId plus fields to change.',
    'For deleting: set action to "delete" and provide playlistId.'
  ]
})
  .scopes(youtubeActionScopes.managePlaylist)
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      playlistId: z
        .string()
        .optional()
        .describe('Playlist ID (required for update and delete)'),
      title: z.string().optional().describe('Playlist title (required for create)'),
      description: z.string().optional().describe('Playlist description'),
      privacyStatus: z
        .enum(['private', 'public', 'unlisted'])
        .optional()
        .describe('Privacy status'),
      defaultLanguage: z.string().optional().describe('Default language (ISO 639-1 code)'),
      tags: z.array(z.string()).optional().describe('Tags for the playlist (create only)')
    })
  )
  .output(
    z.object({
      playlistId: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      privacyStatus: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) {
        throw youtubeServiceError('Title is required when creating a playlist');
      }
      let playlist = await client.createPlaylist({
        part: ['snippet', 'status'],
        title: ctx.input.title,
        description: ctx.input.description,
        privacyStatus: ctx.input.privacyStatus,
        defaultLanguage: ctx.input.defaultLanguage,
        tags: ctx.input.tags
      });

      return {
        output: {
          playlistId: playlist.id,
          title: playlist.snippet?.title,
          description: playlist.snippet?.description,
          privacyStatus: playlist.status?.privacyStatus
        },
        message: `Created playlist "${playlist.snippet?.title}" (\`${playlist.id}\`).`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.playlistId) {
        throw youtubeServiceError('Playlist ID is required when updating');
      }
      if (
        ctx.input.title === undefined &&
        ctx.input.description === undefined &&
        ctx.input.privacyStatus === undefined &&
        ctx.input.defaultLanguage === undefined
      ) {
        throw youtubeServiceError('At least one playlist field to update must be provided');
      }
      let parts = ['snippet'];
      if (ctx.input.privacyStatus !== undefined) {
        parts.push('status');
      }
      let playlist = await client.updatePlaylist({
        part: parts,
        playlistId: ctx.input.playlistId,
        title: ctx.input.title,
        description: ctx.input.description,
        privacyStatus: ctx.input.privacyStatus,
        defaultLanguage: ctx.input.defaultLanguage
      });

      return {
        output: {
          playlistId: playlist.id,
          title: playlist.snippet?.title,
          description: playlist.snippet?.description,
          privacyStatus: playlist.status?.privacyStatus
        },
        message: `Updated playlist "${playlist.snippet?.title}" (\`${playlist.id}\`).`
      };
    } else {
      if (!ctx.input.playlistId) {
        throw youtubeServiceError('Playlist ID is required when deleting');
      }
      await client.deletePlaylist(ctx.input.playlistId);

      return {
        output: {
          playlistId: ctx.input.playlistId,
          deleted: true
        },
        message: `Deleted playlist \`${ctx.input.playlistId}\`.`
      };
    }
  })
  .build();
