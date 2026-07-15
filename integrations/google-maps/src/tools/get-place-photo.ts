import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient, MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES } from '../lib/client';
import { spec } from '../spec';

let mimeTypeExtensions: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

let safeFileStem = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 100) || 'place';

export let getPlacePhotoTool = SlateTool.create(spec, {
  name: 'Get Place Photo',
  key: 'get_place_photo',
  description:
    'Download one current Places API (New) photo resource and return its validated image bytes only as a Slate attachment.',
  instructions: [
    'First call get_place_details and pass one photos[].name value as photoName.',
    'Provide maxWidthPx, maxHeightPx, or both. Google preserves the source aspect ratio and never enlarges a smaller image.',
    'Use the attachment for the image bytes; structured output contains metadata only.',
    'When get_place_details includes authorAttributions for the selected photo, preserve and display those attributions with the image.'
  ],
  constraints: [
    'Photo names can expire and must not be cached; request a current name from Place Details, Text Search, or Nearby Search.',
    'Each requested dimension must be an integer from 1 through 4800 pixels.',
    `Downloads are limited to ${MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES} bytes per attachment.`,
    'Only validated JPEG, PNG, GIF, WebP, AVIF, HEIC, and HEIF image content is returned.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      photoName: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Current photo resource name in the format places/{placeId}/photos/{photoReference}'
        ),
      maxWidthPx: z
        .number()
        .int()
        .min(1)
        .max(4800)
        .optional()
        .describe('Maximum requested image width in pixels'),
      maxHeightPx: z
        .number()
        .int()
        .min(1)
        .max(4800)
        .optional()
        .describe('Maximum requested image height in pixels')
    })
  )
  .output(
    z.object({
      placeId: z.string().describe('Place ID associated with the photo'),
      fileName: z.string().describe('Safe suggested attachment file name'),
      mimeType: z.string().describe('Validated MIME type of the downloaded image'),
      sizeBytes: z.number().int().positive().describe('Downloaded image byte length'),
      maxWidthPx: z.number().int().optional().describe('Requested maximum width'),
      maxHeightPx: z.number().int().optional().describe('Requested maximum height'),
      attachmentCount: z.literal(1).describe('Number of returned Slate attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });
    let downloaded = await client.getPlacePhoto({
      photoName: ctx.input.photoName,
      maxWidthPx: ctx.input.maxWidthPx,
      maxHeightPx: ctx.input.maxHeightPx
    });
    let extension = mimeTypeExtensions[downloaded.mimeType] ?? 'img';
    let fileName = `google-maps-${safeFileStem(downloaded.placeId)}-place-photo.${extension}`;

    return {
      output: {
        placeId: downloaded.placeId,
        fileName,
        mimeType: downloaded.mimeType,
        sizeBytes: downloaded.content.length,
        maxWidthPx: ctx.input.maxWidthPx,
        maxHeightPx: ctx.input.maxHeightPx,
        attachmentCount: 1 as const
      },
      attachments: [
        createBase64Attachment(downloaded.content.toString('base64'), downloaded.mimeType)
      ],
      message: `Downloaded **${fileName}** (${downloaded.content.length} bytes) and returned it as an attachment.`
    };
  })
  .build();
