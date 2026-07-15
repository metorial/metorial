import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient, MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

let mimeTypeExtensions: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/tiff': 'tiff',
  'image/webp': 'webp',
  'video/avi': 'avi',
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
  'video/x-matroska': 'mkv'
};

let safeStem = (value: string, stripExtension: boolean) =>
  (stripExtension ? value.replace(/\.[^.]*$/, '') : value)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 140);

let safeFilenameStem = (value: string) =>
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value) ? `media-${value}` : value;

export let safeMediaFileName = (
  filename: string | undefined,
  mediaItemId: string,
  mimeType: string
) => {
  let safeMediaItemId = safeStem(mediaItemId, false) || 'media';
  let fallbackStem = `google-photos-${safeMediaItemId}`.slice(0, 140);
  let filenameStem =
    typeof filename === 'string' ? safeFilenameStem(safeStem(filename, true)) : '';
  let subtype = mimeType.split('/', 2)[1] ?? '';
  let extension =
    mimeTypeExtensions[mimeType] ??
    subtype
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20);

  return `${filenameStem || fallbackStem}.${extension || 'bin'}`;
};

export let downloadMediaItem = SlateTool.create(spec, {
  name: 'Download Media Item',
  key: 'download_media_item',
  description:
    'Download the bytes of one app-created Google Photos Library API media item and return them only as a Slate attachment.',
  instructions: [
    'Pass a Library API media item ID returned by get_media_item, search_media_items, or upload_media.',
    'The tool gets current media metadata first, then immediately downloads the temporary base URL with =d for a photo or =dv for a READY video.',
    'Use the attachment for the file contents; output contains metadata only.'
  ],
  constraints: [
    'The Library API can retrieve only media items created by this app. Picker API selections use separate IDs and access rules and are not supported by this tool.',
    'Google Photos Library API base URLs remain valid for 60 minutes. This tool requests a fresh base URL for each invocation and does not expose it.',
    'Videos must have finished processing with READY status before they can be downloaded.',
    `Downloads are limited to ${MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES} bytes per attachment.`
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.downloadMediaItem)
  .input(
    z.object({
      mediaItemId: z
        .string()
        .trim()
        .min(1)
        .describe('App-created Library API media item ID to download')
    })
  )
  .output(
    z.object({
      mediaItemId: z.string().describe('Downloaded Google Photos media item ID'),
      fileName: z.string().describe('Safe suggested attachment file name'),
      mimeType: z.string().describe('Validated MIME type of the downloaded attachment'),
      mediaType: z.enum(['photo', 'video']).describe('Downloaded media kind'),
      sizeBytes: z.number().int().positive().describe('Downloaded byte length'),
      attachmentCount: z.literal(1).describe('Number of returned Slate attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);
    let downloaded = await client.downloadMediaItem(ctx.input.mediaItemId);
    let fileName = safeMediaFileName(
      downloaded.filename,
      downloaded.mediaItemId,
      downloaded.mimeType
    );

    return {
      output: {
        mediaItemId: downloaded.mediaItemId,
        fileName,
        mimeType: downloaded.mimeType,
        mediaType: downloaded.mediaType,
        sizeBytes: downloaded.content.length,
        attachmentCount: 1 as const
      },
      attachments: [
        createBase64Attachment(downloaded.content.toString('base64'), downloaded.mimeType)
      ],
      message: `Downloaded **${fileName}** (${downloaded.content.length} bytes) and returned it as an attachment.`
    };
  })
  .build();
