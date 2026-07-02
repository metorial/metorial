import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTrack = SlateTool.create(spec, {
  name: 'Update Track',
  key: 'update_track',
  description: `Update metadata of an existing SoundCloud track. You can change the title, description, genre, tags, sharing status, and license. Note: the audio file itself cannot be replaced.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      sharing: z.enum(['public', 'private']).optional().describe('Sharing setting'),
      genre: z.string().optional().describe('Genre'),
      tagList: z.string().optional().describe('Space-separated list of tags'),
      license: z
        .string()
        .optional()
        .describe('License type (e.g., "cc-by", "cc-by-nc", "all-rights-reserved")')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Unique identifier (URN) of the updated track'),
      title: z.string().describe('Updated title'),
      permalinkUrl: z.string().describe('URL to the track on SoundCloud'),
      sharing: z.string().describe('Sharing setting'),
      genre: z.string().nullable().describe('Genre'),
      tags: z.string().describe('Tags'),
      lastModified: z.string().describe('When the track was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let track = await client.updateTrack(ctx.input.trackId, {
      title: ctx.input.title,
      description: ctx.input.description,
      sharing: ctx.input.sharing,
      genre: ctx.input.genre,
      tagList: ctx.input.tagList,
      license: ctx.input.license
    });

    return {
      output: {
        trackId: track.urn || String(track.id),
        title: track.title,
        permalinkUrl: track.permalink_url,
        sharing: track.sharing,
        genre: track.genre,
        tags: track.tag_list,
        lastModified: track.last_modified
      },
      message: `Updated track **"${track.title}"** successfully.`
    };
  })
  .build();

export let deleteTrack = SlateTool.create(spec, {
  name: 'Delete Track',
  key: 'delete_track',
  description: `Permanently delete a track from SoundCloud. This action cannot be undone. Only the track owner can delete their tracks.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the track was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTrack(ctx.input.trackId);

    return {
      output: { deleted: true },
      message: `Track **${ctx.input.trackId}** has been permanently deleted.`
    };
  })
  .build();

export let uploadTrack = SlateTool.create(spec, {
  name: 'Upload Track',
  key: 'upload_track',
  description: `Upload a new audio track to SoundCloud. Requires base64-encoded audio data. Supported formats: AIFF, WAVE, FLAC, OGG, MP2, MP3, AAC, AMR, WMA. Optionally set metadata and artwork.`,
  constraints: [
    'Maximum file size is 500MB',
    'Audio data must be base64-encoded',
    'Requires user-level OAuth authentication (not client credentials)'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the track'),
      assetData: z.string().describe('Base64-encoded audio file data'),
      assetFilename: z
        .string()
        .describe('Filename including extension (e.g., "my-track.mp3")'),
      description: z.string().optional().describe('Track description'),
      sharing: z
        .enum(['public', 'private'])
        .optional()
        .describe('Sharing setting (default: public)'),
      genre: z.string().optional().describe('Genre'),
      tagList: z.string().optional().describe('Space-separated list of tags'),
      license: z.string().optional().describe('License type'),
      artworkData: z.string().optional().describe('Base64-encoded artwork image data')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Unique identifier (URN) of the uploaded track'),
      title: z.string().describe('Title of the track'),
      permalinkUrl: z.string().describe('URL to the track on SoundCloud'),
      sharing: z.string().describe('Sharing setting'),
      createdAt: z.string().describe('When the track was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let track = await client.uploadTrack({
      title: ctx.input.title,
      description: ctx.input.description,
      sharing: ctx.input.sharing,
      genre: ctx.input.genre,
      tagList: ctx.input.tagList,
      license: ctx.input.license,
      assetData: ctx.input.assetData,
      assetFilename: ctx.input.assetFilename,
      artworkData: ctx.input.artworkData
    });

    return {
      output: {
        trackId: track.urn || String(track.id),
        title: track.title,
        permalinkUrl: track.permalink_url,
        sharing: track.sharing,
        createdAt: track.created_at
      },
      message: `Uploaded track **"${track.title}"** to SoundCloud. [View track](${track.permalink_url})`
    };
  })
  .build();
