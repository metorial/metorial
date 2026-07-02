import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let deploymentStatusTrigger = SlateTrigger.create(spec, {
  name: 'Deployment Status',
  key: 'deployment_status',
  description:
    'Triggered when a deployment status changes. Fires when deployments managed by GitHub Actions workflows are created or their statuses are updated.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      deploymentId: z.number().describe('Deployment ID'),
      deploymentStatusId: z.number().describe('Deployment status ID'),
      environment: z.string().describe('Deployment environment name'),
      state: z
        .string()
        .describe(
          'Deployment state (pending, success, failure, error, inactive, in_progress, queued)'
        ),
      description: z.string().nullable().describe('Deployment status description'),
      targetUrl: z.string().nullable().describe('Target URL for the deployment'),
      createdAt: z.string().describe('Status creation timestamp'),
      ref: z.string().describe('Git ref that was deployed'),
      sha: z.string().describe('Commit SHA that was deployed'),
      creator: z.string().nullable().describe('User who created the deployment'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      deploymentId: z.number().describe('Deployment ID'),
      deploymentStatusId: z.number().describe('Deployment status ID'),
      environment: z.string().describe('Deployment environment name'),
      state: z.string().describe('Deployment state'),
      description: z.string().nullable().describe('Deployment status description'),
      targetUrl: z.string().nullable().describe('Target URL for the deployment'),
      createdAt: z.string().describe('Status creation timestamp'),
      ref: z.string().describe('Git ref that was deployed'),
      sha: z.string().describe('Commit SHA that was deployed'),
      creator: z.string().nullable().describe('User who created the deployment')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'deployment_status') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let deployment = data.deployment;
      let deploymentStatus = data.deployment_status;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action ?? 'created',
            owner: data.repository.owner.login,
            repo: data.repository.name,
            deploymentId: deployment.id,
            deploymentStatusId: deploymentStatus.id,
            environment: deployment.environment ?? deploymentStatus.environment ?? 'unknown',
            state: deploymentStatus.state,
            description: deploymentStatus.description,
            targetUrl: deploymentStatus.target_url ?? deploymentStatus.environment_url ?? null,
            createdAt: deploymentStatus.created_at,
            ref: deployment.ref,
            sha: deployment.sha,
            creator: deployment.creator?.login ?? null,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `deployment_status.${ctx.input.state}`,
        id: ctx.input.deliveryId,
        output: {
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          deploymentId: ctx.input.deploymentId,
          deploymentStatusId: ctx.input.deploymentStatusId,
          environment: ctx.input.environment,
          state: ctx.input.state,
          description: ctx.input.description,
          targetUrl: ctx.input.targetUrl,
          createdAt: ctx.input.createdAt,
          ref: ctx.input.ref,
          sha: ctx.input.sha,
          creator: ctx.input.creator
        }
      };
    }
  })
  .build();
