import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchJobs = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Search for job orders using full-text keyword search or advanced structured filters. Use **query** for keyword search or **filters** for field-level filtering with operators like \`exactly\`, \`contains\`, \`between\`, etc.`,
  instructions: ['Provide either a query string OR filters, not both.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      filters: z.any().optional().describe('Advanced filter object with boolean logic'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Job ID'),
            title: z.string().optional().describe('Job title'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            isActive: z.boolean().optional().describe('Whether active'),
            isHot: z.boolean().optional().describe('Whether hot')
          })
        )
        .describe('Matching jobs'),
      totalCount: z.number().optional().describe('Total results'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.filters) {
      data = await client.filterJobs(ctx.input.filters, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      data = await client.searchJobs(ctx.input.query ?? '', {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let jobs = (data?._embedded?.jobs ?? []).map((j: any) => ({
      jobId: j.id?.toString() ?? '',
      title: j.title,
      city: j.city,
      state: j.state,
      isActive: j.is_active,
      isHot: j.is_hot
    }));

    return {
      output: {
        jobs,
        totalCount: data?.total ?? jobs.length,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Found **${jobs.length}** job(s).`
    };
  })
  .build();
