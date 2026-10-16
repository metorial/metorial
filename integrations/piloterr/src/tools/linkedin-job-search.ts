import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput, responseArray, responseId } from '../lib/response';
import { spec } from '../spec';

let linkedinJobSearchOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
  jobs: z
    .array(
      z.object({
        jobId: z.string().optional(),
        title: z.string().optional(),
        url: z.string().optional(),
        listDate: z.string().optional(),
        companyName: z.string().optional(),
        companyUrl: z.string().optional(),
        location: z.string().optional()
      })
    )
    .describe('List of matching job listings')
});

export let linkedinJobSearch = SlateTool.create(spec, {
  name: 'LinkedIn Job Search',
  key: 'linkedin_job_search',
  description: `Search for LinkedIn job listings with filters for keywords, experience level, job type, recency, work flexibility, location, and company. Returns matching job listings with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Job search keywords'),
      experienceLevel: z
        .enum(['internship', 'entry_level', 'associate', 'mid_senior', 'director'])
        .optional()
        .describe('Required experience level'),
      jobType: z
        .enum(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer'])
        .optional()
        .describe('Employment type'),
      when: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Time filter for when jobs were posted'),
      flexibility: z
        .enum(['remote', 'flexible', 'on_site'])
        .optional()
        .describe('Work arrangement type'),
      distance: z
        .number()
        .optional()
        .describe('Search radius in miles (5, 10, 25, 50, or 100)'),
      geoId: z
        .string()
        .optional()
        .describe(
          'LinkedIn geographic area ID. Call linkedin_job_suggestions with location=true to discover IDs; default: 92000000 for worldwide'
        ),
      companyId: z
        .string()
        .optional()
        .describe(
          'LinkedIn company ID to filter jobs by. Call linkedin_company to discover the companyId'
        ),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination, up to 25 listings per page (default: 1)')
    })
  )
  .output(linkedinJobSearchOutputSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.distance !== undefined && !ctx.input.geoId) {
      throw createApiServiceError(
        'Provide geoId with distance. Call linkedin_job_suggestions to discover a location ID.'
      );
    }
    let client = new PiloterrClient(ctx.auth.token);
    let results = await client.searchLinkedInJobs({
      keyword: ctx.input.keyword,
      experienceLevel: ctx.input.experienceLevel,
      jobType: ctx.input.jobType,
      when: ctx.input.when,
      flexibility: ctx.input.flexibility,
      distance: ctx.input.distance,
      geoId: ctx.input.geoId,
      companyId: ctx.input.companyId,
      page: ctx.input.page
    });

    let jobsList = responseArray(results, 'LinkedIn jobs');

    let jobs = jobsList.map((job: any) => ({
      jobId: responseId(job.id),
      title: job.title,
      url: job.url,
      listDate: job.list_date,
      companyName: job.company_name,
      companyUrl: job.company_url,
      location: job.location
    }));

    return {
      output: normalizeOutput(linkedinJobSearchOutputSchema, { raw: results, jobs }),
      message: `Found **${jobs.length} LinkedIn jobs** matching "${ctx.input.keyword ?? 'all'}" (page ${ctx.input.page ?? 1}).`
    };
  })
  .build();
