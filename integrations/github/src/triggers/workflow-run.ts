import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let workflowRunTrigger = SlateTrigger.create(spec, {
  name: 'Workflow Run',
  key: 'workflow_run',
  description:
    'Triggered when a GitHub Actions workflow run is requested, completed, or in progress.'
})
  .input(
    z.object({
      action: z.string().describe('Workflow run action (requested, completed, in_progress)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
      workflowName: z.string().describe('Workflow name'),
      workflowId: z.number().describe('Workflow ID'),
      status: z.string().nullable().describe('Run status'),
      conclusion: z.string().nullable().describe('Run conclusion'),
      headBranch: z.string().nullable().describe('Head branch'),
      headSha: z.string().describe('Head commit SHA'),
      event: z.string().describe('Event that triggered the workflow'),
      htmlUrl: z.string().describe('URL to the workflow run'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      actor: z.string().describe('User who triggered the run'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Workflow run action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
      workflowName: z.string().describe('Workflow name'),
      workflowId: z.number().describe('Workflow ID'),
      status: z.string().nullable().describe('Run status'),
      conclusion: z
        .string()
        .nullable()
        .describe('Run conclusion (success, failure, cancelled, etc.)'),
      headBranch: z.string().nullable().describe('Head branch'),
      headSha: z.string().describe('Head commit SHA'),
      event: z.string().describe('Triggering event'),
      htmlUrl: z.string().describe('URL to the workflow run'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      actor: z.string().describe('User who triggered the run')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'workflow_run') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let run = data.workflow_run;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            runId: run.id,
            workflowName: run.name ?? data.workflow?.name ?? 'unknown',
            workflowId: run.workflow_id ?? data.workflow?.id ?? 0,
            status: run.status,
            conclusion: run.conclusion,
            headBranch: run.head_branch,
            headSha: run.head_sha,
            event: run.event,
            htmlUrl: run.html_url,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            actor: run.actor?.login ?? 'unknown',
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workflow_run.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          runId: ctx.input.runId,
          workflowName: ctx.input.workflowName,
          workflowId: ctx.input.workflowId,
          status: ctx.input.status,
          conclusion: ctx.input.conclusion,
          headBranch: ctx.input.headBranch,
          headSha: ctx.input.headSha,
          event: ctx.input.event,
          htmlUrl: ctx.input.htmlUrl,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          actor: ctx.input.actor
        }
      };
    }
  })
  .build();
