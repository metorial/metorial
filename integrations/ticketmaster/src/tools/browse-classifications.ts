import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapClassification, mapPagination } from '../lib/mappers';
import { spec } from '../spec';

let classificationDetailSchema = z.object({
  segment: z
    .object({
      segmentId: z.string(),
      name: z.string()
    })
    .nullable(),
  genre: z
    .object({
      genreId: z.string(),
      name: z.string()
    })
    .nullable(),
  subGenre: z
    .object({
      subGenreId: z.string(),
      name: z.string()
    })
    .nullable(),
  type: z
    .object({
      typeId: z.string(),
      name: z.string()
    })
    .nullable(),
  subType: z
    .object({
      subTypeId: z.string(),
      name: z.string()
    })
    .nullable(),
  primary: z.boolean()
});

export let browseClassificationsTool = SlateTool.create(spec, {
  name: 'Browse Classifications',
  key: 'browse_classifications',
  description: `Browse and search Ticketmaster event classifications (segments, genres, sub-genres, types, sub-types). Classifications are hierarchical: Segment > Genre > Sub-Genre. Segments include Music, Sports, Arts & Theatre, Film, and Family. Use to discover valid classification IDs for filtering events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search keyword to filter classifications'),
      size: z.number().optional().describe('Number of results per page (default 20, max 200)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      classifications: z.array(classificationDetailSchema),
      pagination: z.object({
        totalElements: z.number(),
        totalPages: z.number(),
        currentPage: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.searchClassifications({
      keyword: ctx.input.keyword,
      size: ctx.input.size,
      page: ctx.input.page
    });

    let rawClassifications = response?._embedded?.classifications || [];
    let classifications = rawClassifications.map(mapClassification).filter(Boolean);
    let pagination = mapPagination(response?.page);

    return {
      output: { classifications, pagination },
      message: `Found **${pagination.totalElements}** classifications (showing page ${pagination.currentPage + 1} of ${pagination.totalPages}).`
    };
  })
  .build();
