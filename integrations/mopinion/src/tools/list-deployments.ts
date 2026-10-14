import { createApiServiceError, SlateTool } from 'slates';
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
            name: z.string().describe('Deployment name'),
            domain: z.string().optional().describe('Deployment domain'),
            type: z.string().optional().describe('Deployment type'),
            published: z.boolean().optional().describe('Whether the deployment is published'),
            rules: z
              .array(z.any())
              .optional()
              .describe('Rules that determine when forms are displayed')
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
      let data = deployment.data ?? deployment;
      let deploymentData = Array.isArray(data.deployment)
        ? data.deployment[0]
        : (data.deployment ?? data);
      if (!deploymentData) {
        throw createApiServiceError(
          'Mopinion returned no details for the requested deployment.'
        );
      }

      return {
        output: {
          deployments: [
            {
              deploymentKey:
                deploymentData.key || deploymentData.id || ctx.input.deploymentKey,
              name: deploymentData.name || '',
              domain: deploymentData.domain,
              type: deploymentData.type,
              published: deploymentData.published,
              rules: deploymentData.rules
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
