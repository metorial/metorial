import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let getBuildHistory = SlateTool.create(spec, {
  name: 'Get Build History',
  key: 'get_build_history',
  description: `Retrieve the build history for a project with pagination support. Can filter by branch. Returns builds with their status, version, commit details, and timing.`,
  constraints: ['Maximum of 20 records per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountName: z.string().describe('Account name that owns the project'),
      projectSlug: z.string().describe('Project URL slug'),
      recordsNumber: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe('Number of records to return (max 20)'),
      startBuildId: z.number().optional().describe('Build ID to start from for pagination'),
      branch: z.string().optional().describe('Filter builds by branch name')
    })
  )
  .output(
    z.object({
      builds: z.array(z.record(z.string(), z.unknown())).describe('List of builds'),
      project: z.record(z.string(), z.unknown()).describe('Project metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.getProjectHistory(ctx.input.accountName, ctx.input.projectSlug, {
      recordsNumber: ctx.input.recordsNumber,
      startBuildId: ctx.input.startBuildId,
      branch: ctx.input.branch
    });

    let builds = (result as any).builds || [];
    let project = (result as any).project || {};

    return {
      output: { builds, project },
      message: `Retrieved **${builds.length}** build(s) for **${ctx.input.accountName}/${ctx.input.projectSlug}**.`
    };
  })
  .build();
