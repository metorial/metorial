import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let setMediaMetadata = SlateTool.create(spec, {
  key: 'set_media_metadata',
  name: 'Set Media Metadata',
  description:
    'Set documented gallery or asset metadata, including captions, descriptions, tags, links, and asset reference IDs.',
  instructions: [
    'For a gallery, use its fid from list_galleries and the name, description, and tags fields.',
    'For an asset, use its rid from list_assets and the caption, description, tags, referenceId, link, and thumbnail fields.',
    'Omitted fields are left to the provider. Empty strings are sent as supplied.'
  ]
})
  .input(
    z.object({
      resource: z.enum(['gallery', 'asset']),
      resourceId: z
        .string()
        .describe('Gallery fid or asset rid from the corresponding list tool'),
      name: z.string().optional().describe('Gallery name'),
      caption: z.string().optional().describe('Asset caption'),
      description: z.string().optional(),
      tags: z.string().optional().describe('Comma-separated tags'),
      longDescription: z.string().optional().describe('Asset long description'),
      referenceId: z.string().optional().describe('Asset reference ID'),
      relatedLinkText: z.string().optional().describe('Asset related-link label'),
      relatedLinkUrl: z.string().optional().describe('Asset related-link URL'),
      videoThumbSec: z.string().optional().describe('Asset video thumbnail time in seconds'),
      thumbAttachedAssetId: z.string().optional().describe('Asset rid to use as the thumbnail')
    })
  )
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (
      input.resource === 'gallery' &&
      [
        input.caption,
        input.longDescription,
        input.referenceId,
        input.relatedLinkText,
        input.relatedLinkUrl,
        input.videoThumbSec,
        input.thumbAttachedAssetId
      ].some(value => value !== undefined)
    ) {
      throw createApiServiceError('Asset metadata fields cannot be used for a gallery.');
    }
    if (input.resource === 'asset' && input.name !== undefined) {
      throw createApiServiceError(
        'Use caption to set an asset title. The name field is for galleries.'
      );
    }
    let fields =
      input.resource === 'gallery'
        ? {
            fid: input.resourceId,
            name: input.name,
            description: input.description,
            tags: input.tags
          }
        : {
            rid: input.resourceId,
            caption: input.caption,
            description: input.description,
            tags: input.tags,
            long_description: input.longDescription,
            reference_id: input.referenceId,
            related_link_text: input.relatedLinkText,
            related_link_url: input.relatedLinkUrl,
            video_thumb_sec: input.videoThumbSec,
            thumb_attached_rid: input.thumbAttachedAssetId
          };
    let data = await new CincopaClient(ctx.auth).setMediaMetadata(input.resource, fields);
    return {
      output: { success: requireSuccess(data) },
      message: `Updated ${input.resource} metadata.`
    };
  })
  .build();
