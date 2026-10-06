import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { searchMetadataSchema } from '../lib/contracts';
import { searchParams } from '../lib/params';
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
        .describe('Legacy chips field is deprecated by Google; use filterToken instead.'),
      startIndex: z
        .number()
        .optional()
        .describe('Legacy start index is discontinued by Google; use nextPageToken instead.'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Exact Google Jobs next_page_token from the preceding response.'),
      filterToken: z
        .string()
        .optional()
        .describe('Exact native uds token from Google Jobs filters.'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      jobs: z.array(jobResultSchema).describe('Job listing results'),
      filters: z
        .array(z.unknown())
        .optional()
        .describe('Native filters including uds tokens for filterToken.'),
      nextPageToken: z.string().optional(),
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
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('jobs_search', ctx.input);

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
        ...receiptOutput(data),
        jobs,
        filters: data.filters,
        nextPageToken: data.serpapi_pagination?.next_page_token,
        chipsFilters: chipsFilters.length > 0 ? chipsFilters : undefined
      },
      message: receiptMessage(
        data,
        `Jobs search for "${ctx.input.query}"${ctx.input.location ? ` in ${ctx.input.location}` : ''} returned **${jobs.length}** job listings.`
      )
    };
  })
  .build();
