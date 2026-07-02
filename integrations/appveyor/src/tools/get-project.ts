import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed project information including the last build status. Can also fetch the last build for a specific branch or a build by its version number.`,
  instructions: [
    'Provide accountName and projectSlug to get the project with its last build.',
    'Optionally specify a branch to get the last build for that branch.',
    'Optionally specify a buildVersion to get a specific build.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountName: z.string().describe('Account name that owns the project'),
      projectSlug: z.string().describe('Project URL slug'),
      branch: z.string().optional().describe('Branch name to get the last build for'),
      buildVersion: z.string().optional().describe('Specific build version to retrieve')
    })
  )
  .output(
    z.object({
      project: z
        .record(z.string(), z.unknown())
        .describe('Project details including build information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result: Record<string, unknown>;

    if (ctx.input.buildVersion) {
      result = await client.getProjectBuildByVersion(
        ctx.input.accountName,
        ctx.input.projectSlug,
        ctx.input.buildVersion
      );
    } else if (ctx.input.branch) {
      result = await client.getProjectBranch(
        ctx.input.accountName,
        ctx.input.projectSlug,
        ctx.input.branch
      );
    } else {
      result = await client.getProject(ctx.input.accountName, ctx.input.projectSlug);
    }

    let projectName = (result as any).project?.name || ctx.input.projectSlug;

    return {
      output: { project: result },
      message: `Retrieved project **${projectName}** details.`
    };
  })
  .build();
