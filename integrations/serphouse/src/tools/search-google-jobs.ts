import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogleJobs = SlateTool.create(spec, {
  name: 'Search Google Jobs',
  key: 'search_google_jobs',
  description: `Search for job listings from Google Jobs. Returns structured job data including company name, role, location, salary (when available), description, and apply links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Job search query, e.g. "software engineer", "marketing manager"'),
      domain: z.string().default('google.com').describe('Google domain to search'),
      lang: z.string().default('en').describe('Language code'),
      loc: z.string().optional().describe('Location name for the job search'),
      locId: z.number().optional().describe('Location ID'),
      dateRange: z
        .string()
        .optional()
        .describe('Date filter: "h", "d", "w", "m", "y", or "YYYY-MM-DD,YYYY-MM-DD"')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      searchMetadata: z.any().optional().describe('Search metadata'),
      searchParameters: z.any().optional().describe('Search parameters used'),
      jobs: z.array(z.any()).optional().describe('Array of job listing results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.googleJobsSearch({
      q: ctx.input.query,
      domain: ctx.input.domain,
      lang: ctx.input.lang,
      ...(ctx.input.loc ? { loc: ctx.input.loc } : {}),
      ...(ctx.input.locId ? { loc_id: ctx.input.locId } : {}),
      ...(ctx.input.dateRange ? { date_range: ctx.input.dateRange } : {})
    });

    let resultsData = response?.results;
    let jobCount = resultsData?.results?.jobs?.length ?? 0;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        jobs: resultsData?.results?.jobs ?? []
      },
      message: `Google Jobs search for **"${ctx.input.query}"** returned **${jobCount}** job listings.`
    };
  })
  .build();
