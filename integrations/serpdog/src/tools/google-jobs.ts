import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleJobs = SlateTool.create(spec, {
  name: 'Google Jobs Search',
  key: 'google_jobs_search',
  description: `Scrape job postings from Google Search results. Supports filtering by location, radius, and additional filter chips from the job search interface.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Job search query (e.g., "software engineer in london")'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)'),
      chips: z
        .string()
        .optional()
        .describe('Extra query filters from the job search page filter chips'),
      locationRadius: z.string().optional().describe('Radius for location-based filtering')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Jobs search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleJobs({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      page: ctx.input.page,
      chips: ctx.input.chips,
      lrad: ctx.input.locationRadius
    });

    return {
      output: { results: data },
      message: `Searched Google Jobs for **"${ctx.input.query}"**.`
    };
  })
  .build();
