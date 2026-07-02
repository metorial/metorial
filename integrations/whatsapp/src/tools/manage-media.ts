import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMediaUrl = SlateTool.create(spec, {
  name: 'Get Media URL',
  key: 'get_media_url',
  description: `Retrieve the download URL for a WhatsApp media file by its media ID. The returned URL is temporary (valid for ~5 minutes) and requires the access token to download.
Use this to access media files received from incoming messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('WhatsApp media ID to retrieve the URL for')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Media ID'),
      url: z
        .string()
        .describe('Temporary download URL (valid ~5 minutes, requires Bearer token)'),
      mimeType: z.string().optional().describe('MIME type of the media file'),
      sha256: z.string().optional().describe('SHA256 hash of the media file'),
      fileSize: z.number().optional().describe('File size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getMediaUrl(ctx.input.mediaId);
    let fileSize =
      typeof result.file_size === 'number'
        ? result.file_size
        : typeof result.file_size === 'string'
          ? Number(result.file_size)
          : undefined;

    return {
      output: {
        mediaId: result.id,
        url: result.url,
        mimeType: result.mime_type,
        sha256: result.sha256,
        fileSize: Number.isFinite(fileSize) ? fileSize : undefined
      },
      message: `Retrieved media URL for \`${ctx.input.mediaId}\`. MIME type: **${result.mime_type ?? 'unknown'}**. URL is valid for ~5 minutes.`
    };
  })
  .build();

export let deleteMedia = SlateTool.create(spec, {
  name: 'Delete Media',
  key: 'delete_media',
  description: `Delete a media file from WhatsApp servers by its media ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('WhatsApp media ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteMedia(ctx.input.mediaId);

    return {
      output: {
        success: result.success === true
      },
      message: `Deleted media \`${ctx.input.mediaId}\`.`
    };
  })
  .build();
