import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createMedia = SlateTool.create(spec, {
  name: 'Create Media',
  key: 'create_media',
  description: `Create a new media object in a Snapchat ad account. Media objects are containers for images and videos used in ad creatives. After creating the media object, upload the actual media file separately.`,
  instructions: [
    'Valid media types: IMAGE, VIDEO.',
    'After creation, use the returned mediaId to upload the actual file.'
  ]
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID to create the media in'),
      name: z.string().describe('Name for the media object'),
      type: z.enum(['IMAGE', 'VIDEO']).describe('Media type')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Unique ID of the created media object'),
      name: z.string().optional().describe('Media name'),
      type: z.string().optional().describe('Media type'),
      mediaStatus: z.string().optional().describe('Media processing status'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.createMedia(ctx.input.adAccountId, {
      name: ctx.input.name,
      type: ctx.input.type
    });

    if (!result) {
      throw snapchatServiceError('Snapchat did not return media in the API response.');
    }

    let output = {
      mediaId: result.id,
      name: result.name,
      type: result.type,
      mediaStatus: result.media_status,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    return {
      output,
      message: `Created media object **${output.name}** (${output.mediaId}). Upload the media file to complete the process.`
    };
  })
  .build();
