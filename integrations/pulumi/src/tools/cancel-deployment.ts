import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let cancelDeployment = SlateTool.create(spec, {
  name: 'Cancel Deployment',
  key: 'cancel_deployment',
  description: `Cancel an in-progress deployment on a stack. Use with caution — cancelling may leave the stack in an inconsistent state.`,
  constraints: [
    'Cancelling a deployment may leave the stack in an inconsistent state. A refresh operation may be needed afterward.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      deploymentId: z.string().describe('ID of the deployment to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z
        .boolean()
        .describe(
          'Whether the provider accepted the cancellation request; read deployment status to confirm termination'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    await client.cancelDeployment(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      ctx.input.deploymentId
    );

    return {
      output: { cancelled: true },
      message: `Cancellation request accepted for deployment **${ctx.input.deploymentId}** on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**. Read deployment status to confirm termination.`
    };
  })
  .build();
