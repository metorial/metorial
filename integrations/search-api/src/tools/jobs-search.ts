import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let jobResultSchema = z.object({
  title: z.string().optional().describe('Job title'),
  companyName: z.string().optional().describe('Company name'),
  location: z.string().optional().describe('Job location'),
  link: z.string().optional().describe('Job listing URL'),
  description: z.string().optional().describe('Job description'),
  postedAt: z.string().optional().describe('When the job was posted'),
  scheduleType: z.string().optional().describe('Schedule type (e.g., Full-time, Part-time)'),
  salary: z.string().optional().describe('Salary information'),
  highlights: z.array(z.string()).optional().describe('Key job highlights or requirements'),
  applyLinks: z
    .array(
      z.object({
        title: z.string().optional().describe('Platform name'),
        link: z.string().optional().describe('Application URL')
      })
    )
    .optional()
    .describe('Links to apply')
});

export let jobsSearch = SlateTool.create(spec, {
  name: 'Google Jobs Search',
  key: 'jobs_search',
  description: `Search Google Jobs for job listings. Returns structured job data including company, location, salary, schedule type, description, and application links. Supports location-based filtering and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Job search query (e.g., "software engineer", "marketing manager in New York")'
        ),
      location: z.string().optional().describe('Geographic location for job search'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pagination token for next page of results')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      jobs: z.array(jobResultSchema).describe('Job listings'),
      nextPageToken: z.string().optional().describe('Token for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_jobs',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      next_page_token: ctx.input.nextPageToken
    });

    let jobs = (data.jobs || []).map((j: any) => {
      let highlights = [
        ...(j.job_highlights?.qualifications || []),
        ...(j.job_highlights?.responsibilities || []),
        ...(j.job_highlights?.benefits || [])
      ].filter(Boolean);

      let applyLinks = (j.apply_links || []).map((a: any) => ({
        title: a.title,
        link: a.link
      }));

      return {
        title: j.title,
        companyName: j.company_name,
        location: j.location,
        link: j.share_link || j.link,
        description: j.description,
        postedAt: j.detected_extensions?.posted_at,
        scheduleType: j.detected_extensions?.schedule_type,
        salary: j.detected_extensions?.salary,
        highlights: highlights.length > 0 ? highlights : undefined,
        applyLinks: applyLinks.length > 0 ? applyLinks : undefined
      };
    });

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        jobs,
        nextPageToken: data.pagination?.next_page_token
      },
      message: `Found ${jobs.length} job${jobs.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
