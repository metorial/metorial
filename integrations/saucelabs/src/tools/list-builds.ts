import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let buildSchema = z.object({
  buildId: z.string().describe('Unique build identifier'),
  name: z.string().optional().describe('Build name'),
  status: z
    .string()
    .optional()
    .describe('Build status (e.g., success, failed, error, running, complete)'),
  startTime: z.string().optional().describe('Build start time (ISO 8601)'),
  endTime: z.string().optional().describe('Build end time (ISO 8601)'),
  jobsPassed: z.number().optional().describe('Number of passed jobs'),
  jobsFailed: z.number().optional().describe('Number of failed jobs'),
  jobsErrored: z.number().optional().describe('Number of errored jobs'),
  jobsComplete: z.number().optional().describe('Total completed jobs')
});

export let listBuilds = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `Retrieve a list of test builds from Sauce Labs. Builds group related test jobs for easier analysis. Filter by status, name, time range, and source (VDC or RDC). Builds are exclusive to their device source.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)'),
      status: z
        .array(z.enum(['running', 'error', 'failed', 'complete', 'success']))
        .optional()
        .describe('Filter by build status'),
      name: z.string().optional().describe('Filter by build name'),
      start: z
        .string()
        .optional()
        .describe('Only return builds created after this time (ISO 8601)'),
      end: z
        .string()
        .optional()
        .describe('Only return builds created before this time (ISO 8601)'),
      limit: z.number().optional().describe('Maximum number of builds to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time')
    })
  )
  .output(
    z.object({
      builds: z.array(buildSchema).describe('List of builds')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listBuilds(ctx.input.source, {
      status: ctx.input.status,
      name: ctx.input.name,
      start: ctx.input.start,
      end: ctx.input.end,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let buildsRaw = result.builds ?? [];
    let builds = buildsRaw.map((b: any) => ({
      buildId: b.id,
      name: b.name,
      status: b.status,
      startTime: b.start_time,
      endTime: b.end_time,
      jobsPassed: b.jobs?.passed,
      jobsFailed: b.jobs?.failed,
      jobsErrored: b.jobs?.errored,
      jobsComplete: b.jobs?.complete
    }));

    return {
      output: { builds },
      message: `Found **${builds.length}** ${ctx.input.source.toUpperCase()} builds.`
    };
  })
  .build();
