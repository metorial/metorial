import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchJobsTool = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Search assigned jobs in AccuLynx by a text query or map coordinates. Provide query, geoLocation, or both. Returns paginated results matching the search criteria. Unassigned jobs are not returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query text'),
      pageSize: z
        .number()
        .min(1)
        .max(25)
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .optional()
        .describe('Number of items per page, up to 25'),
      pageStartIndex: z
        .number()
        .min(0)
        .max(100000)
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .optional()
        .describe('Zero-based record index of the first element to return'),
      includes: z
        .string()
        .optional()
        .describe('Comma-separated related data: contact, initialAppointment'),
      geoLocation: z
        .object({
          latitude: z.number().min(-90).max(90).describe('Latitude of the search center'),
          longitude: z.number().min(-180).max(180).describe('Longitude of the search center'),
          mapRadius: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Search radius in kilometers; defaults to 1')
        })
        .optional()
        .describe('Map coordinates to search around')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('Array of matching job objects'),
      totalCount: z.number().optional().describe('Total number of matching jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchJobs({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex,
      includes: ctx.input.includes,
      geoLocation: ctx.input.geoLocation
    });

    let jobs = Array.isArray(result) ? result : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.count ?? result?.totalCount ?? result?.total ?? jobs.length;

    return {
      output: { jobs, totalCount },
      message: `Found **${jobs.length}** jobs matching query "${ctx.input.query ?? ''}".`
    };
  })
  .build();
