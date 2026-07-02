import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelDeploymentTool = SlateTool.create(spec, {
  name: 'Cancel Deployment',
  key: 'cancel_deployment',
  description: `Cancel an in-progress deployment that is currently building. Cannot cancel deployments that have already completed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('Deployment ID to cancel')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Canceled deployment ID'),
      state: z.string().optional().describe('Deployment state after cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let d = await client.cancelDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: d.id,
        state: d.readyState || d.status
      },
      message: `Canceled deployment **${d.id}**.`
    };
  })
  .build();
