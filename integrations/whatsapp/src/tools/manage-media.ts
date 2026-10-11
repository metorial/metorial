import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getOfficialWhatsAppMediaUrl, getWhatsAppMediaUrlExpiry } from '../lib/media';
import { spec } from '../spec';

export let getMediaUrl = SlateTool.create(spec, {
  name: 'Get Media URL',
  key: 'get_media_url',
  description: `Retrieve a WhatsApp media file by its media ID and provide it as a downloadable file, along with its MIME type, size, and SHA256 hash.
Use this to access media files received from incoming messages (media IDs from incoming messages stay valid for 7 days; uploaded media for 30 days).`,
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

    // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#download-media
    // The URL needs the access token and expires after 5 minutes; the media ID reissues it.
    let downloadUrl = getOfficialWhatsAppMediaUrl(result.url);
    if (downloadUrl) {
      await ctx.addAttachment({
        type: 'url',
        url: downloadUrl,
        mimeType: result.mime_type,
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        refreshReference: { mediaId: result.id ?? ctx.input.mediaId },
        refreshAt: getWhatsAppMediaUrlExpiry()
      });
    }

    return {
      output: {
        mediaId: result.id,
        url: result.url,
        mimeType: result.mime_type,
        sha256: result.sha256,
        fileSize: Number.isFinite(fileSize) ? fileSize : undefined
      },
      message: downloadUrl
        ? `Prepared media \`${ctx.input.mediaId}\` for download. MIME type: **${result.mime_type ?? 'unknown'}**.`
        : `Retrieved media details for \`${ctx.input.mediaId}\`, but WhatsApp did not return an official download URL.`
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
