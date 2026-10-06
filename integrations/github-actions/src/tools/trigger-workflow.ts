import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger a GitHub Actions workflow run via the \`workflow_dispatch\` event. The workflow must have a \`workflow_dispatch\` trigger defined in its YAML file. You can pass custom inputs that are defined in the workflow file.`,
  instructions: [
    'The workflow must have `on: workflow_dispatch` configured in its YAML file.',
    'Use the workflow ID (number) or the workflow file name (e.g. "ci.yml") to identify the workflow.',
    'The workflow file must exist on the default branch; ref selects the branch or tag to run.',
    'Custom inputs must match the inputs defined in the workflow file.'
  ],
  constraints: [
    'Workflow execution may consume paid runner time and perform deployment or external actions configured in the workflow.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      workflowId: z
        .union([z.number(), z.string()])
        .describe('Workflow ID (number) or workflow file name (e.g. "ci.yml")'),
      ref: z.string().describe('Git reference (branch or tag) to run the workflow on'),
      inputs: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom inputs to pass to the workflow, as key-value pairs')
    })
  )
  .output(
    z.object({
      runId: z
        .number()
        .optional()
        .describe('GitHub run ID returned when dispatch is accepted'),
      runUrl: z.string().optional().describe('API URL for the dispatched run'),
      htmlUrl: z.string().optional().describe('GitHub URL for the dispatched run'),
      triggered: z
        .boolean()
        .describe('Whether workflow dispatch was accepted; check run status for completion')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    if (ctx.input.inputs && Object.keys(ctx.input.inputs).length > 25)
      throw createApiServiceError('A workflow dispatch supports at most 25 inputs.');
    let client = new GitHubActionsClient(ctx.auth.token);
    const run = await client.triggerWorkflowDispatch(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.workflowId,
      ctx.input.ref,
      ctx.input.inputs
    );

    return {
      output: {
        triggered: true,
        runId: run.workflow_run_id,
        runUrl: run.run_url,
        htmlUrl: run.html_url
      },
      message: `GitHub accepted dispatch for workflow **${ctx.input.workflowId}** on ref **${ctx.input.ref}** in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
