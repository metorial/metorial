import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let imageResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Image title'),
  link: z.string().optional().describe('Page URL containing the image'),
  source: z.string().optional().describe('Source website name'),
  original: z.string().optional().describe('Direct URL to original image'),
  originalWidth: z.number().optional().describe('Original image width in pixels'),
  originalHeight: z.number().optional().describe('Original image height in pixels'),
  thumbnail: z.string().optional().describe('Thumbnail URL')
});

export let imageSearch = SlateTool.create(spec, {
  name: 'Google Images Search',
  key: 'image_search',
  description: `Search Google Images for image results. Returns structured image data including original and thumbnail URLs, dimensions, and source information. Supports filters for size, color, type, and usage rights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Image search query'),
      location: z.string().optional().describe('Geographic location'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code'),
      device: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Device type'),
      page: z.number().optional().describe('Results page number'),
      size: z
        .enum([
          'large',
          'medium',
          'icon',
          'qsvga',
          'vga',
          'svga',
          'xga',
          '2mp',
          '4mp',
          '6mp',
          '8mp',
          '10mp',
          '12mp',
          '15mp',
          '20mp',
          '40mp',
          '70mp'
        ])
        .optional()
        .describe('Image size filter'),
      color: z
        .enum([
          'red',
          'orange',
          'yellow',
          'green',
          'teal',
          'blue',
          'purple',
          'pink',
          'white',
          'gray',
          'black',
          'brown',
          'black_and_white',
          'transparent'
        ])
        .optional()
        .describe('Color filter'),
      imageType: z
        .enum(['clipart', 'line_drawing', 'gif', 'photo', 'face'])
        .optional()
        .describe('Image type filter'),
      timePeriod: z
        .enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
        .optional()
        .describe('Filter images by recency'),
      usageRights: z
        .enum(['creative_commons_licenses', 'commercial_or_other_licenses'])
        .optional()
        .describe('Filter by usage rights'),
      safeSearch: z.enum(['active', 'blur', 'off']).optional().describe('SafeSearch filtering')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      images: z.array(imageResultSchema).describe('Image search results'),
      suggestions: z.array(z.string()).optional().describe('Search suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_images',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      device: ctx.input.device,
      page: ctx.input.page,
      size: ctx.input.size,
      color: ctx.input.color,
      image_type: ctx.input.imageType,
      time_period: ctx.input.timePeriod,
      usage_rights: ctx.input.usageRights,
      safe: ctx.input.safeSearch
    });

    let images = (data.images || []).map((img: any) => ({
      position: img.position,
      title: img.title,
      link: img.link,
      source: img.source,
      original: img.original,
      originalWidth: img.original_width,
      originalHeight: img.original_height,
      thumbnail: img.thumbnail
    }));

    let suggestions = (data.suggestions || [])
      .map((s: any) => s.query || s.title || s)
      .filter(Boolean);

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        images,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      },
      message: `Found ${images.length} image${images.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
