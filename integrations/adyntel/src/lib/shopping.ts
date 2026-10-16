import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { adIdentifier, flattenAds, mapSummary } from './response';

export let googleShoppingAdSchema = z
  .object({
    advertiserId: z.string().optional(),
    creativeId: z.string().optional(),
    firstShown: z.string().optional(),
    lastShown: z.string().optional(),
    format: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    verified: z.boolean().optional(),
    rankAbsolute: z.number().optional(),
    rankGroup: z.number().optional(),
    previewImage: z
      .object({
        height: z.number().optional(),
        width: z.number().optional(),
        url: z.string().optional()
      })
      .passthrough()
      .optional(),
    previewUrl: z.string().nullable().optional()
  })
  .passthrough();

export let shoppingRequestId = (response: Record<string, unknown> | undefined) => {
  let id = adIdentifier(response?.id);
  if (!id?.trim())
    throw createApiServiceError(
      'Adyntel did not return a Google Shopping request ID. Try the search again later.'
    );
  return id;
};

export let mapShoppingAds = (ads: unknown) =>
  flattenAds(ads)?.map(ad => {
    let previewImage = mapSummary(
      googleShoppingAdSchema.shape.previewImage.unwrap(),
      ad.preview_image ?? ad.previewImage
    );
    return mapSummary(
      googleShoppingAdSchema,
      { ...ad, previewImage },
      {
        advertiserId: 'advertiser_id',
        creativeId: 'creative_id',
        firstShown: 'first_shown',
        lastShown: 'last_shown',
        rankAbsolute: 'rank_absolute',
        rankGroup: 'rank_group',
        previewUrl: 'preview_url'
      }
    );
  });
