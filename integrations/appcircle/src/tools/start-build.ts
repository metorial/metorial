import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let startBuild = SlateTool.create(spec, {
  name: 'Start Build',
  key: 'start_build',
  description: `Triggers a new build for a specific branch and workflow in a build profile. You can specify the branch by ID or by name. Optionally pass environment variables to customize the build.`,
  instructions: [
    'You must provide a profileId and workflowId. Provide either branchId or branchName to identify the branch.',
    'Use the List Build Profiles tool to find profileId, and List Workflows to find workflowId.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the build profile'),
      workflowId: z.string().describe('ID of the workflow to use'),
      branchId: z
        .string()
        .optional()
        .describe('ID of the branch to build. Provide either branchId or branchName.'),
      branchName: z
        .string()
        .optional()
        .describe('Name of the branch to build. Provide either branchId or branchName.'),
      configurationId: z.string().optional().describe('ID of the build configuration to use'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of environment variables to pass to the build')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().optional(),
        buildId: z.string().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: any;

    if (ctx.input.branchId) {
      result = await client.startBuildByBranchAndWorkflow(
        ctx.input.profileId,
        ctx.input.branchId,
        ctx.input.workflowId,
        ctx.input.configurationId,
        ctx.input.environmentVariables
      );
    } else if (ctx.input.branchName) {
      result = await client.startBuildByBranchNameAndWorkflow(
        ctx.input.profileId,
        ctx.input.workflowId,
        ctx.input.branchName,
        ctx.input.configurationId,
        ctx.input.environmentVariables
      );
    } else {
      throw new Error('Either branchId or branchName must be provided');
    }

    return {
      output: result,
      message: `Build triggered successfully for profile **${ctx.input.profileId}** on branch **${ctx.input.branchId ?? ctx.input.branchName}**.`
    };
  })
  .build();
