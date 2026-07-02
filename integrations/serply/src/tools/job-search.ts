import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let jobResultSchema = z.object({
  position: z.string().optional().describe('Job title/position'),
  link: z.string().optional().describe('Job posting URL'),
  highlights: z.any().optional().describe('Job highlights and key details'),
  description: z.any().optional().describe('Employer and job description details'),
  logo: z.any().optional().describe('Employer logo and source info'),
  metadata: z.any().optional().describe('Location and other metadata')
});

export let jobSearch = SlateTool.create(spec, {
  name: 'Job Search',
  key: 'job_search',
  description: `Search Google Jobs for job listings and retrieve structured posting data. Returns position titles, employer information, salary ranges, benefits, remote/hybrid indicators, and job descriptions. Useful for building job boards, recruitment tools, or salary research.`,
  constraints: ['Currently limited to job listings in North America (US and Canada).'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Job search query, e.g., "nurse practitioner", "data analyst work from home"'
        ),
      proxyLocation: z
        .enum(['US', 'CA'])
        .optional()
        .describe('Location for job results (US or CA only)'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobResultSchema).describe('Job listings'),
      deviceRegion: z.string().optional().describe('Region used for the search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.jobSearch({
      query: ctx.input.query,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let jobs = data.jobs || [];

    return {
      output: {
        jobs,
        deviceRegion: data.device_region || null
      },
      message: `Found **${jobs.length}** job listings for "${ctx.input.query}".`
    };
  })
  .build();
