import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let linkedinJobs = SlateTool.create(spec, {
  name: 'LinkedIn Jobs Search',
  key: 'linkedin_jobs_search',
  description: `Extract LinkedIn job listings by query and geographic location. Supports filtering by job type, experience level, and recency.`,
  instructions: [
    'The `geoId` is a LinkedIn-specific geographic identifier (e.g., 102257491 for London). You can find these IDs on LinkedIn.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Job search query (e.g., "software engineer", "product manager")'),
      geoId: z.number().describe('LinkedIn geographic ID for the target location'),
      page: z.number().optional().describe('Page number (0, 1, 2, etc.)'),
      jobType: z
        .enum(['temporary', 'contract', 'volunteer', 'full_time', 'part_time'])
        .optional()
        .describe('Filter by job type'),
      sortBy: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Filter jobs posted within a time period'),
      experienceLevel: z
        .enum(['internship', 'entry_level', 'associate', 'mid_senior_level', 'director'])
        .optional()
        .describe('Filter by experience level')
    })
  )
  .output(
    z.object({
      results: z.any().describe('LinkedIn job listings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.linkedinJobs({
      q: ctx.input.query,
      geoId: ctx.input.geoId,
      page: ctx.input.page,
      jobType: ctx.input.jobType,
      sortBy: ctx.input.sortBy,
      expLevel: ctx.input.experienceLevel
    });

    return {
      output: { results: data },
      message: `Searched LinkedIn jobs for **"${ctx.input.query}"**.`
    };
  })
  .build();
