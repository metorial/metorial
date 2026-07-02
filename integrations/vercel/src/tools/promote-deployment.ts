import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let promoteDeploymentTool = SlateTool.create(spec, {
  name: 'Promote Deployment',
  key: 'promote_deployment',
  description: `Promote a deployment to production by pointing all production domains to it. Useful for rollbacks or manual production promotions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectIdOrName: z.string().describe('Project ID or name'),
      deploymentId: z.string().describe('Deployment ID to promote to production')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the promotion was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    await client.promoteDeployment(ctx.input.projectIdOrName, ctx.input.deploymentId);

    return {
      output: { success: true },
      message: `Promoted deployment **${ctx.input.deploymentId}** to production for project "${ctx.input.projectIdOrName}".`
    };
  })
  .build();
