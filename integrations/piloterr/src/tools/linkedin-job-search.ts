import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

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
        .describe('LinkedIn geographic area ID (default: 92000000 for worldwide)'),
      companyId: z.string().optional().describe('LinkedIn company ID to filter jobs by'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
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

    let jobsList = Array.isArray(results) ? results : [];

    let jobs = jobsList.map((job: any) => ({
      jobId: job.id,
      title: job.title,
      url: job.url,
      listDate: job.list_date,
      companyName: job.company_name,
      companyUrl: job.company_url,
      location: job.location
    }));

    return {
      output: { jobs },
      message: `Found **${jobs.length} LinkedIn jobs** matching "${ctx.input.keyword ?? 'all'}" (page ${ctx.input.page ?? 1}).`
    };
  })
  .build();
