import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapAttraction, mapPagination } from '../lib/mappers';
import { spec } from '../spec';

let attractionSchema = z.object({
  attractionId: z.string().describe('Unique Ticketmaster attraction ID'),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  locale: z.string(),
  upcomingEvents: z.record(z.string(), z.any()).describe('Count of upcoming events by source'),
  externalLinks: z
    .record(z.string(), z.any())
    .describe('External links (social media, homepage, etc.)'),
  images: z.array(
    z.object({
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      ratio: z.string()
    })
  ),
  classifications: z.array(
    z.object({
      primary: z.boolean(),
      segmentName: z.string(),
      segmentId: z.string(),
      genreName: z.string(),
      genreId: z.string(),
      subGenreName: z.string(),
      subGenreId: z.string()
    })
  ),
  aliases: z.array(z.string())
});

export let searchAttractionsTool = SlateTool.create(spec, {
  name: 'Search Attractions',
  key: 'search_attractions',
  description: `Search for attractions (artists, teams, performers) on Ticketmaster. Filter by keyword, classification, segment, or genre. Returns attraction details including images, classifications, external links, and upcoming event counts.`,
  instructions: ['Sort options: name,asc | name,desc | relevance,asc | relevance,desc'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z
        .string()
        .optional()
        .describe('Search keyword to match against attraction name'),
      classificationName: z
        .string()
        .optional()
        .describe('Filter by classification name (e.g., "Music", "Sports")'),
      segmentId: z.string().optional().describe('Filter by segment ID'),
      segmentName: z.string().optional().describe('Filter by segment name'),
      genreId: z.string().optional().describe('Filter by genre ID'),
      subGenreId: z.string().optional().describe('Filter by sub-genre ID'),
      source: z
        .string()
        .optional()
        .describe('Source platform: ticketmaster, universe, frontgate, tmr'),
      sort: z.string().optional().describe('Sort order (e.g., name,asc | relevance,desc)'),
      size: z.number().optional().describe('Number of results per page (default 20, max 200)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      attractions: z.array(attractionSchema),
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

    let response = await client.searchAttractions({
      keyword: ctx.input.keyword,
      classificationName: ctx.input.classificationName,
      segmentId: ctx.input.segmentId,
      segmentName: ctx.input.segmentName,
      genreId: ctx.input.genreId,
      subGenreId: ctx.input.subGenreId,
      source: ctx.input.source,
      sort: ctx.input.sort,
      size: ctx.input.size,
      page: ctx.input.page
    });

    let rawAttractions = response?._embedded?.attractions || [];
    let attractions = rawAttractions.map(mapAttraction).filter(Boolean);
    let pagination = mapPagination(response?.page);

    return {
      output: { attractions, pagination },
      message: `Found **${pagination.totalElements}** attractions (showing page ${pagination.currentPage + 1} of ${pagination.totalPages}).`
    };
  })
  .build();
