import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      deploymentId: z.string().describe('ID of the deployment to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    await client.cancelDeployment(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      ctx.input.deploymentId
    );

    return {
      output: { cancelled: true },
      message: `Cancelled deployment **${ctx.input.deploymentId}** on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
    };
  })
  .build();
