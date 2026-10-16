import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const playlistFields = {
  name: z
    .string()
    .max(4096)
    .optional()
    .describe('Playlist name. Must be nonblank and cannot be "rss".'),
  description: z
    .string()
    .max(4096)
    .optional()
    .describe('Description. An empty string clears it.'),
  visibility: z
    .enum(['public', 'unlisted', 'private'])
    .optional()
    .describe('Who can view the playlist. Switching to private rotates the RSS secret.'),
  type: z
    .enum(['episode_list', 'podcast_list'])
    .optional()
    .describe('Default playlist view. Changing it preserves existing items.')
};
const playlistId = z
  .string()
  .min(1)
  .describe('Playlist ID returned by get_playlists or create_playlist.');
const itemId = z
  .number()
  .int()
  .positive()
  .describe('Numeric playlist item ID returned by get_playlists or add_playlist_item.');
const playlistOutput = z.object({
  playlistId: z.string().describe('Saved playlist ID.'),
  playlist: z
    .record(z.string(), z.unknown())
    .describe('Complete saved playlist metadata, including counts and provider URL.')
});
const itemOutput = z.object({
  itemId: z.number().describe('Playlist item ID.'),
  item: z
    .record(z.string(), z.unknown())
    .describe('Complete item, notes, timestamps, and podcast or episode metadata.')
});
const ownerConstraint = [
  'Only playlists owned by your API admin account can be modified. Contributor membership does not grant write access.'
];

export const createPlaylist = SlateTool.create(spec, {
  key: 'create_playlist',
  name: 'Create Playlist',
  description:
    'Create an empty Listen Later playlist for collecting podcasts or episodes. Returns its ID and saved metadata.',
  constraints: ownerConstraint,
  tags: { destructive: false }
})
  .input(
    z.object({
      ...playlistFields,
      name: z
        .string()
        .min(1)
        .max(4096)
        .describe('Nonblank playlist name, up to 4096 characters. The name "rss" is reserved.')
    })
  )
  .output(playlistOutput)
  .handleInvocation(async ctx => {
    if (!ctx.input.name.trim() || ctx.input.name.trim().toLowerCase() === 'rss') {
      throw createApiServiceError('Provide a nonblank playlist name other than "rss".');
    }
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.createPlaylist(ctx.input);
    return {
      output: { playlistId: data.id, playlist: { ...data } },
      message: `Created playlist **${data.name}**.`
    };
  })
  .build();

export const updatePlaylist = SlateTool.create(spec, {
  key: 'update_playlist',
  name: 'Update Playlist',
  description:
    'Update a playlist name, description, visibility, or default view. Omitted fields remain unchanged. Switching visibility to private rotates the RSS secret.',
  constraints: ownerConstraint,
  tags: { destructive: false }
})
  .input(z.object({ playlistId, ...playlistFields }))
  .output(playlistOutput)
  .handleInvocation(async ctx => {
    let { playlistId, ...fields } = ctx.input;
    if (!Object.keys(pickDefined(fields)).length)
      throw createApiServiceError('Provide at least one playlist field to update.');
    if (
      fields.name !== undefined &&
      (!fields.name.trim() || fields.name.trim().toLowerCase() === 'rss')
    ) {
      throw createApiServiceError('Provide a nonblank playlist name other than "rss".');
    }
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.updatePlaylist(playlistId, fields);
    return {
      output: { playlistId: data.id, playlist: { ...data } },
      message: `Updated playlist **${data.name}**.`
    };
  })
  .build();

export const deletePlaylist = SlateTool.create(spec, {
  key: 'delete_playlist',
  name: 'Delete Playlist',
  description:
    'Permanently delete a playlist and all its saved item references and notes. Episodes and podcasts remain in the podcast database. Obtain explicit confirmation before calling this tool.',
  constraints: [
    ...ownerConstraint,
    'Deletion cannot be undone. Confirm deletion with the user first.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      playlistId,
      confirmDeletion: z
        .boolean()
        .describe(
          'Set to true only after the user confirms permanent deletion of this playlist.'
        )
    })
  )
  .output(
    z.object({
      playlistId: z.string(),
      deleted: z.boolean(),
      raw: z.unknown().describe('Complete deletion response.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.confirmDeletion)
      throw createApiServiceError(
        'Confirm permanent playlist deletion before setting confirmDeletion to true.'
      );
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.deletePlaylist(ctx.input.playlistId);
    return {
      output: { playlistId: data.id, deleted: data.deleted, raw: data },
      message: `Processed playlist deletion for **${data.id}**.`
    };
  })
  .build();

export const addPlaylistItem = SlateTool.create(spec, {
  key: 'add_playlist_item',
  name: 'Add Playlist Item',
  description:
    'Add a podcast or episode to a playlist. Existing active items are reused; deleted items are restored. Omitted notes preserve existing notes, including on restoration.',
  constraints: ownerConstraint,
  tags: { destructive: false }
})
  .input(
    z.object({
      playlistId,
      episodeId: z
        .string()
        .optional()
        .describe('Episode ID. Supply exactly one of episodeId or podcastId.'),
      podcastId: z
        .string()
        .optional()
        .describe('Podcast ID. Supply exactly one of podcastId or episodeId.'),
      notes: z
        .string()
        .max(1024)
        .optional()
        .describe('Plain-text notes. An empty string clears existing notes.')
    })
  )
  .output(itemOutput)
  .handleInvocation(async ctx => {
    let episodeId = ctx.input.episodeId?.trim() || undefined;
    let podcastId = ctx.input.podcastId?.trim() || undefined;
    if (Boolean(episodeId) === Boolean(podcastId))
      throw createApiServiceError('Provide exactly one non-empty episodeId or podcastId.');
    if (!/^[0-9a-f]{32}$/i.test(episodeId ?? podcastId ?? ''))
      throw createApiServiceError(
        'Episode and podcast IDs must contain 32 hexadecimal characters.'
      );
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.addPlaylistItem(ctx.input.playlistId, {
      episode_id: episodeId,
      podcast_id: podcastId,
      notes: ctx.input.notes
    });
    return {
      output: { itemId: data.id, item: { ...data } },
      message: `Saved playlist item **${data.id}**.`
    };
  })
  .build();

export const updatePlaylistItem = SlateTool.create(spec, {
  key: 'update_playlist_item',
  name: 'Update Playlist Item Notes',
  description:
    'Replace the notes on an existing playlist item. Send an empty string to clear the notes. The item ID and added timestamp remain unchanged.',
  constraints: ownerConstraint,
  tags: { destructive: false }
})
  .input(
    z.object({
      playlistId,
      itemId,
      notes: z.string().max(1024).describe('Replacement notes. An empty string clears them.')
    })
  )
  .output(itemOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.updatePlaylistItem(
      ctx.input.playlistId,
      ctx.input.itemId,
      ctx.input.notes
    );
    return {
      output: { itemId: data.id, item: { ...data } },
      message: `Updated notes on playlist item **${data.id}**.`
    };
  })
  .build();

export const removePlaylistItem = SlateTool.create(spec, {
  key: 'remove_playlist_item',
  name: 'Remove Playlist Item',
  description:
    'Remove an item from a playlist. Repeating removal of the same item succeeds. The podcast or episode remains in the podcast database.',
  constraints: ownerConstraint,
  tags: { destructive: true }
})
  .input(z.object({ playlistId, itemId }))
  .output(
    z.object({
      itemId: z.number(),
      deleted: z.boolean(),
      raw: z.unknown().describe('Complete deletion response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.removePlaylistItem(ctx.input.playlistId, ctx.input.itemId);
    return {
      output: { itemId: data.id, deleted: data.deleted, raw: data },
      message: `Processed removal of playlist item **${data.id}**.`
    };
  })
  .build();
