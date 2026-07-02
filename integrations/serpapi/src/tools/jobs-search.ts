import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let jobResultSchema = z.object({
  title: z.string().optional().describe('Job title'),
  companyName: z.string().optional().describe('Company name'),
  location: z.string().optional().describe('Job location'),
  link: z.string().optional().describe('Job listing URL'),
  description: z.string().optional().describe('Job description snippet'),
  via: z.string().optional().describe('Job board source (e.g., "via LinkedIn", "via Indeed")'),
  detectedExtensions: z
    .object({
      postedAt: z.string().optional().describe('When the job was posted'),
      schedule: z
        .string()
        .optional()
        .describe('Work schedule (e.g., "Full-time", "Part-time")'),
      salary: z.string().optional().describe('Salary information'),
      workFromHome: z.boolean().optional().describe('Whether remote work is available')
    })
    .optional()
    .describe('Detected job details'),
  thumbnailUrl: z.string().optional().describe('Company logo URL'),
  jobId: z.string().optional().describe('Google Jobs job ID for detailed lookup')
});

export let jobsSearchTool = SlateTool.create(spec, {
  name: 'Jobs Search',
  key: 'jobs_search',
  description: `Search Google Jobs for job listings. Returns job titles, companies, locations, descriptions, salary info, and job board sources. Supports geographic and keyword filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Job search query (e.g., "software engineer", "marketing manager")'),
      location: z.string().optional().describe('Location to search in (e.g., "New York, NY")'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      chips: z
        .string()
        .optional()
        .describe('Filter chips for refining results (e.g., date posted, job type)'),
      startIndex: z
        .number()
        .optional()
        .describe('Start index for pagination (increments of 10)'),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobResultSchema).describe('Job listing results'),
      chipsFilters: z
        .array(
          z.object({
            type: z.string().optional().describe('Filter type'),
            options: z
              .array(
                z.object({
                  text: z.string().optional(),
                  value: z.string().optional()
                })
              )
              .optional()
              .describe('Filter options')
          })
        )
        .optional()
        .describe('Available filter chips for refining search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: 'google_jobs',
      q: ctx.input.query
    };

    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.chips) params.chips = ctx.input.chips;
    if (ctx.input.startIndex !== undefined) params.start = ctx.input.startIndex;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;

    let data = await client.search(params);

    let jobs = (data.jobs_results || []).map((r: any) => ({
      title: r.title,
      companyName: r.company_name,
      location: r.location,
      link: r.share_link || r.related_links?.[0]?.link,
      description: r.description,
      via: r.via,
      detectedExtensions: r.detected_extensions
        ? {
            postedAt: r.detected_extensions.posted_at,
            schedule: r.detected_extensions.schedule_type,
            salary: r.detected_extensions.salary,
            workFromHome: r.detected_extensions.work_from_home
          }
        : undefined,
      thumbnailUrl: r.thumbnail,
      jobId: r.job_id
    }));

    let chipsFilters = (data.chips || []).map((c: any) => ({
      type: c.type,
      options: c.options?.map((o: any) => ({
        text: o.text,
        value: o.value
      }))
    }));

    return {
      output: {
        jobs,
        chipsFilters: chipsFilters.length > 0 ? chipsFilters : undefined
      },
      message: `Jobs search for "${ctx.input.query}"${ctx.input.location ? ` in ${ctx.input.location}` : ''} returned **${jobs.length}** job listings.`
    };
  })
  .build();
