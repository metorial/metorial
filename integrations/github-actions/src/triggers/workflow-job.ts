import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let workflowJobTrigger = SlateTrigger.create(spec, {
  name: 'Workflow Job',
  key: 'workflow_job',
  description:
    'Triggered when a workflow job is queued, starts, completes, or enters a waiting state. Useful for monitoring individual job progress and autoscaling self-hosted runners.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('Job event action (queued, in_progress, completed, waiting)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      jobId: z.number().describe('Job ID'),
      jobName: z.string().describe('Job name'),
      runId: z.number().describe('Workflow run ID'),
      runAttempt: z.number().optional().describe('Run attempt number'),
      workflowName: z.string().nullable().describe('Workflow name'),
      headBranch: z.string().nullable().describe('Head branch'),
      headSha: z.string().describe('Head commit SHA'),
      status: z.string().describe('Job status'),
      conclusion: z.string().nullable().describe('Job conclusion'),
      startedAt: z.string().nullable().describe('Job start time'),
      completedAt: z.string().nullable().describe('Job completion time'),
      runnerName: z.string().nullable().describe('Runner name'),
      runnerGroupName: z.string().nullable().describe('Runner group name'),
      labels: z.array(z.string()).describe('Runner labels requested by the job'),
      htmlUrl: z.string().describe('URL to the job on GitHub'),
      steps: z
        .array(
          z.object({
            name: z.string().describe('Step name'),
            status: z.string().describe('Step status'),
            conclusion: z.string().nullable().describe('Step conclusion'),
            number: z.number().describe('Step number'),
            startedAt: z.string().nullable().describe('Step start time'),
            completedAt: z.string().nullable().describe('Step completion time')
          })
        )
        .optional()
        .describe('Steps within the job'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Job event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      jobId: z.number().describe('Job ID'),
      jobName: z.string().describe('Job name'),
      runId: z.number().describe('Workflow run ID'),
      runAttempt: z.number().optional().describe('Run attempt number'),
      workflowName: z.string().nullable().describe('Workflow name'),
      headBranch: z.string().nullable().describe('Head branch'),
      headSha: z.string().describe('Head commit SHA'),
      status: z.string().describe('Job status (queued, in_progress, completed, waiting)'),
      conclusion: z
        .string()
        .nullable()
        .describe('Job conclusion (success, failure, cancelled, skipped, etc.)'),
      startedAt: z.string().nullable().describe('Job start time'),
      completedAt: z.string().nullable().describe('Job completion time'),
      runnerName: z.string().nullable().describe('Runner name'),
      runnerGroupName: z.string().nullable().describe('Runner group name'),
      labels: z.array(z.string()).describe('Runner labels requested'),
      htmlUrl: z.string().describe('URL to the job'),
      steps: z
        .array(
          z.object({
            name: z.string().describe('Step name'),
            status: z.string().describe('Step status'),
            conclusion: z.string().nullable().describe('Step conclusion'),
            number: z.number().describe('Step number'),
            startedAt: z.string().nullable().describe('Step start time'),
            completedAt: z.string().nullable().describe('Step completion time')
          })
        )
        .optional()
        .describe('Steps within the job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'workflow_job') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let job = data.workflow_job;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      let steps = (job.steps ?? []).map((s: any) => ({
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
        number: s.number,
        startedAt: s.started_at,
        completedAt: s.completed_at
      }));

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            jobId: job.id,
            jobName: job.name,
            runId: job.run_id,
            runAttempt: job.run_attempt,
            workflowName: job.workflow_name ?? null,
            headBranch: job.head_branch,
            headSha: job.head_sha,
            status: job.status,
            conclusion: job.conclusion,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            runnerName: job.runner_name,
            runnerGroupName: job.runner_group_name,
            labels: job.labels ?? [],
            htmlUrl: job.html_url,
            steps: steps.length > 0 ? steps : undefined,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workflow_job.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          runId: ctx.input.runId,
          runAttempt: ctx.input.runAttempt,
          workflowName: ctx.input.workflowName,
          headBranch: ctx.input.headBranch,
          headSha: ctx.input.headSha,
          status: ctx.input.status,
          conclusion: ctx.input.conclusion,
          startedAt: ctx.input.startedAt,
          completedAt: ctx.input.completedAt,
          runnerName: ctx.input.runnerName,
          runnerGroupName: ctx.input.runnerGroupName,
          labels: ctx.input.labels,
          htmlUrl: ctx.input.htmlUrl,
          steps: ctx.input.steps
        }
      };
    }
  })
  .build();
