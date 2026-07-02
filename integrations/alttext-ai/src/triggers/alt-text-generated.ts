import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let altTextGenerated = SlateTrigger.create(spec, {
  name: 'Alt Text Generated',
  key: 'alt_text_generated',
  description:
    'Triggers when new alt text is generated for an image in your AltText.ai library.'
})
  .input(
    z.object({
      imageAssetId: z.string().describe('Asset ID of the image'),
      imageUrl: z.string().describe('URL of the image'),
      altText: z.string().describe('Generated alt text'),
      lang: z.string().describe('Language of the alt text'),
      status: z.string().describe('Processing status'),
      createdAt: z.string().describe('When the image was created'),
      updatedAt: z.string().describe('When the image was last updated')
    })
  )
  .output(
    z.object({
      imageAssetId: z.string().describe('Asset ID of the image'),
      imageUrl: z.string().describe('URL of the image'),
      altText: z.string().describe('Generated alt text'),
      lang: z.string().describe('Language of the alt text'),
      status: z.string().describe('Processing status'),
      createdAt: z.string().describe('When the image was created'),
      updatedAt: z.string().describe('When the image was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.state as
        | { lastSeenTimestamp?: string; seenAssetIds?: string[] }
        | undefined;
      let lastSeenTimestamp = state?.lastSeenTimestamp;
      let seenAssetIds = state?.seenAssetIds ?? [];

      let result = await client.getImages({ page: 1, perPage: 50 });
      let newImages = result.images.filter(img => {
        if (img.status !== 'completed' && img.status !== 'success') return false;
        if (seenAssetIds.includes(img.asset_id)) return false;
        if (lastSeenTimestamp && img.created_at <= lastSeenTimestamp) return false;
        return true;
      });

      let updatedSeenIds = [...newImages.map(img => img.asset_id), ...seenAssetIds].slice(
        0,
        200
      );

      let latestTimestamp = lastSeenTimestamp;
      if (newImages.length > 0) {
        latestTimestamp = newImages.reduce(
          (latest, img) => (img.created_at > latest ? img.created_at : latest),
          newImages[0]!.created_at
        );
      }

      return {
        inputs: newImages.map(img => ({
          imageAssetId: img.asset_id,
          imageUrl: img.url,
          altText: img.alt_text,
          lang: img.lang,
          status: img.status,
          createdAt: img.created_at,
          updatedAt: img.updated_at
        })),
        updatedState: {
          lastSeenTimestamp: latestTimestamp,
          seenAssetIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'image.alt_text_generated',
        id: ctx.input.imageAssetId,
        output: {
          imageAssetId: ctx.input.imageAssetId,
          imageUrl: ctx.input.imageUrl,
          altText: ctx.input.altText,
          lang: ctx.input.lang,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
