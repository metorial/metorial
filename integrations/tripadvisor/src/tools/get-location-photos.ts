import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentClient } from '../lib/client';
import { spec } from '../spec';

let imageVariantSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional()
});

let photoSchema = z.object({
  photoId: z.string(),
  caption: z.string().optional(),
  publishedDate: z.string().optional(),
  isBlessed: z.boolean().optional(),
  album: z.string().optional(),
  sourceName: z.string().optional(),
  images: z
    .object({
      thumbnail: imageVariantSchema.optional(),
      small: imageVariantSchema.optional(),
      medium: imageVariantSchema.optional(),
      large: imageVariantSchema.optional(),
      original: imageVariantSchema.optional()
    })
    .optional(),
  user: z
    .object({
      username: z.string().optional()
    })
    .optional()
});

export let getLocationPhotos = SlateTool.create(spec, {
  name: 'Get Location Photos',
  key: 'get_location_photos',
  description: `Retrieve high-quality recent photos for a specific Tripadvisor location. Returns photo URLs in multiple sizes (thumbnail, small, medium, large, original), captions, and source info. Optionally filter by photo source (Expert, Management, Traveler). Use a location ID obtained from the search tools.`,
  constraints: ['Returns up to 5 photos per location.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.string().describe('Tripadvisor location ID'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (overrides global config)'),
      limit: z.number().optional().describe('Number of photos to return (max 5)'),
      offset: z.number().optional().describe('Index of the first result for pagination'),
      source: z
        .string()
        .optional()
        .describe('Comma-separated photo sources: "Expert", "Management", "Traveler"')
    })
  )
  .output(
    z.object({
      photos: z.array(photoSchema),
      totalResults: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let result = await client.getLocationPhotos(
      ctx.input.locationId,
      ctx.input.language,
      ctx.input.limit,
      ctx.input.offset,
      ctx.input.source
    );

    let photos = (result.data || []).map((p: any) => {
      let mapImage = (img: any) =>
        img ? { url: img.url, width: img.width, height: img.height } : undefined;

      return {
        photoId: String(p.id),
        caption: p.caption,
        publishedDate: p.published_date,
        isBlessed: p.is_blessed,
        album: p.album,
        sourceName: p.source?.localized_name || p.source?.name,
        images: p.images
          ? {
              thumbnail: mapImage(p.images.thumbnail),
              small: mapImage(p.images.small),
              medium: mapImage(p.images.medium),
              large: mapImage(p.images.large),
              original: mapImage(p.images.original)
            }
          : undefined,
        user: p.user
          ? {
              username: p.user.username
            }
          : undefined
      };
    });

    let totalResults = result.paging?.total_results;

    return {
      output: { photos, totalResults },
      message: `Retrieved **${photos.length}** photo(s) for location ${ctx.input.locationId}${totalResults ? ` (${totalResults} total)` : ''}.`
    };
  })
  .build();
