import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger a GitHub Actions workflow run via the \`workflow_dispatch\` event. The workflow must have a \`workflow_dispatch\` trigger defined in its YAML file. You can pass custom inputs that are defined in the workflow file.`,
  instructions: [
    'The workflow must have `on: workflow_dispatch` configured in its YAML file.',
    'Use the workflow ID (number) or the workflow file name (e.g. "ci.yml") to identify the workflow.',
    'Custom inputs must match the inputs defined in the workflow file.'
  ],
  tags: {
    destructive: false
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
      triggered: z.boolean().describe('Whether the workflow was successfully triggered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    await client.triggerWorkflowDispatch(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.workflowId,
      ctx.input.ref,
      ctx.input.inputs
    );

    return {
      output: {
        triggered: true
      },
      message: `Triggered workflow **${ctx.input.workflowId}** on ref **${ctx.input.ref}** in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
