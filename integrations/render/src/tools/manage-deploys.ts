import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageDeploys = SlateTool.create(spec, {
  name: 'Manage Deployments',
  key: 'manage_deploys',
  description: `Trigger, cancel, or rollback deployments for a Render service. Trigger deploys optionally for a specific commit or Docker image. Cancel an in-progress deploy or rollback to a previous successful deploy.`
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      action: z
        .enum(['trigger', 'cancel', 'rollback'])
        .describe('Deployment action to perform'),
      deployId: z.string().optional().describe('Deploy ID (required for cancel and rollback)'),
      commitId: z.string().optional().describe('Specific commit to deploy (trigger only)'),
      imageUrl: z
        .string()
        .optional()
        .describe('Docker image URL to deploy (trigger only, for image-backed services)'),
      clearCache: z
        .enum(['clear', 'do_not_clear'])
        .optional()
        .describe('Whether to clear build cache (trigger only)')
    })
  )
  .output(
    z.object({
      deployId: z.string().describe('The deployment ID'),
      serviceId: z.string().describe('The service ID'),
      status: z.string().optional().describe('Deployment status'),
      commitId: z.string().optional().describe('Deployed commit ID'),
      createdAt: z.string().optional().describe('Deploy creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { serviceId, action, deployId } = ctx.input;
    let result: any;

    switch (action) {
      case 'trigger': {
        let body: Record<string, any> = {};
        if (ctx.input.clearCache) body.clearCache = ctx.input.clearCache;
        if (ctx.input.commitId) body.commitId = ctx.input.commitId;
        if (ctx.input.imageUrl) body.imageUrl = ctx.input.imageUrl;
        result = await client.triggerDeploy(serviceId, body);
        break;
      }
      case 'cancel': {
        if (!deployId) throw createApiServiceError('deployId is required for cancel action');
        result = await client.cancelDeploy(serviceId, deployId);
        break;
      }
      case 'rollback': {
        if (!deployId) throw createApiServiceError('deployId is required for rollback action');
        result = await client.rollbackDeploy(serviceId, deployId);
        break;
      }
    }

    return {
      output: {
        deployId: result.id,
        serviceId: serviceId,
        status: result.status,
        commitId: result.commit?.id,
        createdAt: result.createdAt
      },
      message: `Deployment **${action}** executed for service \`${serviceId}\`. Deploy ID: \`${result.id}\`, status: **${result.status || 'initiated'}**.`
    };
  })
  .build();
