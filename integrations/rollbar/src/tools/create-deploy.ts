import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeploy = SlateTool.create(spec, {
  name: 'Create Deploy',
  key: 'create_deploy',
  description: `Report a deployment to Rollbar. Deploy tracking enables suspect deploy identification and helps correlate error spikes with releases. Provide the environment, revision (git SHA or version), and optionally deployer info and status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      environment: z.string().describe('Target environment (e.g., "production", "staging")'),
      revision: z.string().describe('Code version or git SHA being deployed'),
      rollbarUsername: z.string().optional().describe('Rollbar username of the deployer'),
      localUsername: z.string().optional().describe('Local system username of the deployer'),
      comment: z.string().optional().describe('Deploy comment or description'),
      status: z
        .enum(['started', 'succeeded', 'failed', 'timed_out'])
        .optional()
        .describe('Deploy status')
    })
  )
  .output(
    z.object({
      deployId: z.number().describe('Unique deploy ID'),
      environment: z.string().describe('Target environment'),
      revision: z.string().describe('Code revision'),
      status: z.string().optional().describe('Deploy status'),
      projectId: z.number().optional().describe('Associated project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createDeploy({
      environment: ctx.input.environment,
      revision: ctx.input.revision,
      rollbar_username: ctx.input.rollbarUsername,
      local_username: ctx.input.localUsername,
      comment: ctx.input.comment,
      status: ctx.input.status
    });

    let deploy = result?.result;

    return {
      output: {
        deployId: deploy.deploy_id || deploy.id,
        environment: deploy.environment || ctx.input.environment,
        revision: deploy.revision || ctx.input.revision,
        status: deploy.status || ctx.input.status,
        projectId: deploy.project_id
      },
      message: `Deploy **${deploy.deploy_id || deploy.id}** created for revision \`${ctx.input.revision}\` in **${ctx.input.environment}**${ctx.input.status ? ` (status: ${ctx.input.status})` : ''}.`
    };
  })
  .build();
