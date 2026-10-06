import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient, deploymentInfoSchema } from '../lib/client';
import { spec } from '../spec';

export const getDeploymentInfo = SlateTool.create(spec, {
  key: 'get_deployment_info',
  name: 'Get Deployment Info',
  description:
    'Identify the configured Convex deployment, including its project, team and deployment type when hosted in Convex Cloud.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(deploymentInfoSchema.extend({ deploymentUrl: z.string() }))
  .handleInvocation(async ctx => {
    const client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });
    return {
      output: { ...(await client.getDeploymentInfo()), deploymentUrl: client.origin },
      message: 'Retrieved Convex deployment identity.'
    };
  })
  .build();
