import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapDeploy } from '../lib/client';
import { spec } from '../spec';

export let getDeploy = SlateTool.create(spec, {
  name: 'Get Deploy',
  key: 'get_deploy',
  description:
    'Retrieve a reported deploy by ID to inspect its revision, environment, status and timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      deployId: z.number().describe('ID from create_deploy or list_deploys'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.')
    })
  )
  .output(
    z.object({
      deployId: z.number(),
      environment: z.string().optional(),
      revision: z.string().optional(),
      status: z.string().optional(),
      localUsername: z.string().optional(),
      rollbarUsername: z.string().optional(),
      comment: z.string().optional(),
      startTime: z.number().optional(),
      finishTime: z.number().optional(),
      projectId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const deploy = (await createClient(ctx).getDeploy(ctx.input.deployId)).result;
    return {
      output: mapDeploy(deploy),
      message: `Retrieved deploy ${deploy.id}${deploy.status ? ` (${deploy.status})` : ''}.`
    };
  })
  .build();
