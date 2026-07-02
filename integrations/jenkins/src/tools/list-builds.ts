import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let listBuilds = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `List recent builds for a Jenkins job. Returns build numbers, results, timestamps, and durations for the most recent builds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobPath: z.string().describe('Path to the job (e.g. "my-job" or "folder/my-job")'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of builds to return. Defaults to 10.')
    })
  )
  .output(
    z.object({
      builds: z.array(
        z.object({
          buildNumber: z.number().describe('Build number'),
          buildUrl: z.string().describe('URL of the build'),
          result: z
            .string()
            .optional()
            .nullable()
            .describe(
              'Build result (SUCCESS, FAILURE, UNSTABLE, ABORTED, or null if running)'
            ),
          building: z.boolean().optional().describe('Whether the build is currently running'),
          timestamp: z.number().optional().describe('Build start timestamp in milliseconds'),
          duration: z.number().optional().describe('Build duration in milliseconds'),
          displayName: z.string().optional().describe('Display name of the build')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let builds = await client.getBuilds(ctx.input.jobPath, ctx.input.limit || 10);

    let mappedBuilds = builds.map((b: any) => ({
      buildNumber: b.number,
      buildUrl: b.url,
      result: b.result,
      building: b.building,
      timestamp: b.timestamp,
      duration: b.duration,
      displayName: b.displayName
    }));

    return {
      output: { builds: mappedBuilds },
      message: `Found **${mappedBuilds.length}** build(s) for \`${ctx.input.jobPath}\`.`
    };
  })
  .build();
