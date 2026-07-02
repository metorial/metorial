import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let photoSchema = z.object({
  photoId: z.string().optional().describe('Photo ID'),
  createdAt: z.string().optional().describe('Photo creation timestamp'),
  prefix: z.string().optional().describe('Photo URL prefix'),
  suffix: z.string().optional().describe('Photo URL suffix'),
  photoUrl: z.string().optional().describe('Assembled full photo URL (original size)'),
  width: z.number().optional().describe('Photo width in pixels'),
  height: z.number().optional().describe('Photo height in pixels'),
  classifications: z
    .array(z.string())
    .optional()
    .describe('Photo classifications (e.g. "food", "indoor")')
});

export let getPlacePhotos = SlateTool.create(spec, {
  name: 'Get Place Photos',
  key: 'get_place_photos',
  description: `Retrieve photos for a specific place. Returns photo metadata and assembled URLs. Photos can be filtered by classification and sorted by popularity or recency.`,
  instructions: [
    'Use the classifications parameter to filter by type: "food", "indoor", "menu", "outdoor".',
    'Photo URLs are assembled as: prefix + "original" + suffix for full-size images, or prefix + "WIDTHxHEIGHT" + suffix for specific dimensions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fsqId: z.string().describe('Foursquare place ID'),
      limit: z.number().optional().describe('Maximum number of photos (default 10)'),
      sort: z.enum(['popular', 'newest']).optional().describe('Sort order for photos'),
      classifications: z
        .string()
        .optional()
        .describe('Comma-separated photo classifications to filter by (e.g. "food,indoor")'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      photos: z.array(photoSchema).describe('List of photos for the place')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPlacePhotos(ctx.input.fsqId, {
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      classifications: ctx.input.classifications,
      offset: ctx.input.offset
    });

    let photos = (Array.isArray(result) ? result : []).map((photo: any) => ({
      photoId: photo.id,
      createdAt: photo.created_at,
      prefix: photo.prefix,
      suffix: photo.suffix,
      photoUrl:
        photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : undefined,
      width: photo.width,
      height: photo.height,
      classifications: photo.classifications
    }));

    return {
      output: { photos },
      message: `Retrieved **${photos.length}** photo(s) for place ${ctx.input.fsqId}.`
    };
  })
  .build();
