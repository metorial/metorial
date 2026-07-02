import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let checkRunTrigger = SlateTrigger.create(spec, {
  name: 'Check Run',
  key: 'check_run',
  description:
    'Triggered when a check run is created, completed, rerequested, or has a requested action. GitHub Actions workflow jobs automatically create check runs.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('Check run action (created, completed, rerequested, requested_action)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      checkRunId: z.number().describe('Check run ID'),
      checkRunName: z.string().describe('Check run name'),
      headSha: z.string().describe('Head commit SHA'),
      status: z.string().describe('Check run status (queued, in_progress, completed)'),
      conclusion: z
        .string()
        .nullable()
        .describe(
          'Check run conclusion (success, failure, neutral, cancelled, skipped, timed_out, action_required)'
        ),
      startedAt: z.string().nullable().describe('Check run start time'),
      completedAt: z.string().nullable().describe('Check run completion time'),
      htmlUrl: z.string().nullable().describe('URL to the check run'),
      checkSuiteId: z.number().nullable().describe('Associated check suite ID'),
      appName: z.string().nullable().describe('App that created the check run'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Check run action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      checkRunId: z.number().describe('Check run ID'),
      checkRunName: z.string().describe('Check run name'),
      headSha: z.string().describe('Head commit SHA'),
      status: z.string().describe('Check run status'),
      conclusion: z.string().nullable().describe('Check run conclusion'),
      startedAt: z.string().nullable().describe('Start time'),
      completedAt: z.string().nullable().describe('Completion time'),
      htmlUrl: z.string().nullable().describe('URL to the check run'),
      checkSuiteId: z.number().nullable().describe('Associated check suite ID'),
      appName: z.string().nullable().describe('App that created the check run')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'check_run') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let checkRun = data.check_run;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            checkRunId: checkRun.id,
            checkRunName: checkRun.name,
            headSha: checkRun.head_sha,
            status: checkRun.status,
            conclusion: checkRun.conclusion,
            startedAt: checkRun.started_at,
            completedAt: checkRun.completed_at,
            htmlUrl: checkRun.html_url,
            checkSuiteId: checkRun.check_suite?.id ?? null,
            appName: checkRun.app?.name ?? null,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `check_run.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          checkRunId: ctx.input.checkRunId,
          checkRunName: ctx.input.checkRunName,
          headSha: ctx.input.headSha,
          status: ctx.input.status,
          conclusion: ctx.input.conclusion,
          startedAt: ctx.input.startedAt,
          completedAt: ctx.input.completedAt,
          htmlUrl: ctx.input.htmlUrl,
          checkSuiteId: ctx.input.checkSuiteId,
          appName: ctx.input.appName
        }
      };
    }
  })
  .build();
