import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacesClient } from '../lib/places-client';
import { currentPlaceId, integerRange } from '../lib/places-schemas';
import { spec } from '../spec';

export let getPlacePhotosCurrent = SlateTool.create(spec, {
  key: 'get_place_photos_current',
  name: 'Get Place Photos (Current API)',
  description:
    'Retrieve current place photos with complete metadata, original image URLs, and downloadable images.',
  instructions: [
    'Requires a Places Service API Key. Photo classifications include food_or_drink, menu, outdoor, indoor_general, and product. The provider returns up to 50 photos; offset pagination is not documented.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      fsqPlaceId: currentPlaceId,
      limit: z.number().optional(),
      sort: z.enum(['POPULAR', 'NEWEST']).optional(),
      classifications: z.string().optional()
    })
  )
  .output(
    z.object({
      photos: z.array(
        z.looseObject({
          id: z.string().nullish(),
          prefix: z.string().nullish(),
          suffix: z.string().nullish(),
          photoUrl: z.string().optional()
        })
      ),
      response: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    integerRange(ctx.input.limit, 'limit', 1, 50);
    let { data } = await new PlacesClient(ctx.auth).request(
      'GET',
      `/places/${encodeURIComponent(ctx.input.fsqPlaceId)}/photos`,
      {
        limit: ctx.input.limit,
        sort: ctx.input.sort,
        classifications: ctx.input.classifications
      }
    );
    let photos = await Promise.all(
      (Array.isArray(data) ? data : []).map(async photo => {
        let photoUrl =
          photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : undefined;
        if (photoUrl) {
          await ctx.addAttachment({ type: 'url', url: photoUrl });
        }
        return { ...photo, photoUrl };
      })
    );
    return {
      output: { photos, response: data },
      message: `Retrieved ${photos.length} photo(s).`
    };
  })
  .build();

export let getPlaceTipsCurrent = SlateTool.create(spec, {
  key: 'get_place_tips_current',
  name: 'Get Place Tips (Current API)',
  description:
    'Retrieve current place tips with full provider metadata. Select additional fields for language, links, votes, or photos.',
  instructions: [
    'Requires a Places Service API Key. Default provider fields are fsq_tip_id, created_at, and text. Offset pagination is not documented.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      fsqPlaceId: currentPlaceId,
      limit: z.number().optional(),
      sort: z.enum(['POPULAR', 'NEWEST']).optional(),
      fields: z.string().optional()
    })
  )
  .output(
    z.object({ tips: z.array(z.record(z.string(), z.unknown())), response: z.unknown() })
  )
  .handleInvocation(async ctx => {
    integerRange(ctx.input.limit, 'limit', 1, 50);
    let { data } = await new PlacesClient(ctx.auth).request(
      'GET',
      `/places/${encodeURIComponent(ctx.input.fsqPlaceId)}/tips`,
      {
        limit: ctx.input.limit,
        sort: ctx.input.sort,
        fields: ctx.input.fields
      }
    );
    let tips = Array.isArray(data) ? data : [];
    return { output: { tips, response: data }, message: `Retrieved ${tips.length} tip(s).` };
  })
  .build();
