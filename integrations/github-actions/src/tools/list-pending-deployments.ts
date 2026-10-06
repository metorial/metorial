import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export const listPendingDeployments = SlateTool.create(spec, {
  key: 'list_pending_deployments',
  name: 'List Pending Deployments',
  description:
    'Inspect environment reviews pending for a workflow run, including environment IDs needed to approve or reject a deployment. Reading this list does not approve a deployment.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID')
    })
  )
  .output(
    z.object({
      deployments: z
        .array(
          z.object({
            environmentId: z.number().describe('Environment ID'),
            environmentName: z.string().describe('Environment name'),
            htmlUrl: z.string().describe('Environment URL'),
            waitTimerMinutes: z.number().describe('Configured wait timer'),
            waitTimerStartedAt: z.string().nullable().describe('When waiting began'),
            currentUserCanApprove: z
              .boolean()
              .describe('Whether the connected user can approve')
          })
        )
        .describe('Pending deployment reviews')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const { owner, repo, runId } = ctx.input;
    const data = await new GitHubActionsClient(ctx.auth.token).getPendingDeployments(
      owner,
      repo,
      runId
    );
    return {
      output: {
        deployments: data.map(item => ({
          environmentId: item.environment.id,
          environmentName: item.environment.name,
          htmlUrl: item.environment.html_url,
          waitTimerMinutes: item.wait_timer,
          waitTimerStartedAt: item.wait_timer_started_at,
          currentUserCanApprove: item.current_user_can_approve
        }))
      },
      message: `Found **${data.length}** pending deployment reviews.`
    };
  })
  .build();
