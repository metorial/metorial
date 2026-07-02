import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapRun } from '../lib/mappers';
import { spec } from '../spec';

export let createRunTool = SlateTool.create(spec, {
  name: 'Create Run',
  key: 'create_run',
  description: `Trigger a new Terraform run (plan, apply, or destroy) in a workspace. Supports plan-only, refresh-only, destroy runs, targeted resources, and resource replacement. For VCS-connected workspaces, uses the latest configuration; for API-driven workspaces, optionally specify a configuration version.`,
  instructions: [
    'Set isDestroy to true for a destroy run.',
    'Set planOnly to true for a speculative plan that cannot be applied.',
    'Use targetAddrs to plan/apply only specific resources (e.g., ["aws_instance.web"]).',
    'Use replaceAddrs to force recreation of specific resources.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to create the run in'),
      message: z.string().optional().describe('A message describing the purpose of this run'),
      isDestroy: z
        .boolean()
        .optional()
        .describe('Whether this is a destroy run (default: false)'),
      autoApply: z.boolean().optional().describe('Override auto-apply setting for this run'),
      planOnly: z
        .boolean()
        .optional()
        .describe('Create a speculative plan that cannot be applied (default: false)'),
      refreshOnly: z
        .boolean()
        .optional()
        .describe('Only refresh state without planning changes (default: false)'),
      configurationVersionId: z
        .string()
        .optional()
        .describe('Configuration version ID for API-driven runs'),
      targetAddrs: z
        .array(z.string())
        .optional()
        .describe('Resource addresses to target (e.g., ["aws_instance.web"])'),
      replaceAddrs: z
        .array(z.string())
        .optional()
        .describe('Resource addresses to force replace')
    })
  )
  .output(
    z.object({
      runId: z.string(),
      status: z.string(),
      message: z.string(),
      source: z.string(),
      isDestroy: z.boolean(),
      createdAt: z.string(),
      hasChanges: z.boolean(),
      autoApply: z.boolean(),
      planOnly: z.boolean(),
      statusTimestamps: z.object({
        plannedAt: z.string(),
        appliedAt: z.string(),
        erroredAt: z.string()
      }),
      workspaceId: z.string(),
      planId: z.string(),
      applyId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createRun(ctx.input);
    let run = mapRun(response.data);

    let runType = run.isDestroy ? 'destroy' : run.planOnly ? 'plan-only' : 'standard';

    return {
      output: run,
      message: `Created ${runType} run **${run.runId}** — status: ${run.status}.`
    };
  })
  .build();
