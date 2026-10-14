import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { environmentIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getEnvironment = SlateTool.create(spec, {
  name: 'Get Environment',
  key: 'get_environment',
  description:
    'Retrieves the selected environment ID, project name, environment name, and production status. Use this to verify an environmentId from Kontent.ai project settings and confirm that the API key can access it.',
  tags: { readOnly: true }
})
  .input(z.object({ environmentId: environmentIdInput }))
  .output(
    z.object({
      environmentId: z.string().describe('Verified environment ID'),
      projectName: z.string().describe('Project display name'),
      environmentName: z.string().describe('Environment display name'),
      isProduction: z.boolean().describe('Whether this is the production environment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.input.environmentId ?? ctx.config.environmentId
    });
    let environment = await client.getEnvironment();
    return {
      output: {
        environmentId: environment.id,
        projectName: environment.name,
        environmentName: environment.environment,
        isProduction: environment.is_production
      },
      message: `Retrieved environment **${environment.environment}** in **${environment.name}**.`
    };
  })
  .build();
