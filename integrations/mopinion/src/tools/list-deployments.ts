import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List all deployments in your Mopinion account, or retrieve a specific deployment by key. Deployments control how and where feedback forms are displayed on websites or in mobile apps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentKey: z
        .string()
        .optional()
        .describe('Specific deployment key to retrieve. Omit to list all deployments.')
    })
  )
  .output(
    z.object({
      deployments: z
        .array(
          z.object({
            deploymentKey: z.string().describe('Deployment key/identifier'),
            name: z.string().describe('Deployment name')
          })
        )
        .describe('List of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    if (ctx.input.deploymentKey) {
      let deployment = await client.getDeployment(ctx.input.deploymentKey);
      let deploymentData = deployment.data || deployment;

      return {
        output: {
          deployments: [
            {
              deploymentKey: deploymentData.key || ctx.input.deploymentKey,
              name: deploymentData.name || ''
            }
          ]
        },
        message: `Retrieved deployment **${deploymentData.name || ctx.input.deploymentKey}**.`
      };
    }

    let result = await client.getDeployments();
    let deploymentsData = Array.isArray(result) ? result : result.data || [];

    let deployments = deploymentsData.map((d: any) => ({
      deploymentKey: d.key || '',
      name: d.name || ''
    }));

    return {
      output: { deployments },
      message: `Retrieved **${deployments.length}** deployments.`
    };
  })
  .build();
