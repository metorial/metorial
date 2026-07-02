import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let manageDeployment = SlateTool.create(spec, {
  name: 'Manage Deployment',
  key: 'manage_deployment',
  description: `Create or delete a Mopinion deployment. Deployments configure how and where feedback forms are displayed. For creating, provide a key and name. For deleting, provide the deployment key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Operation to perform'),
      deploymentKey: z.string().describe('Deployment key/identifier'),
      name: z.string().optional().describe('Deployment name (required for create)')
    })
  )
  .output(
    z.object({
      deploymentKey: z.string().describe('Key of the affected deployment'),
      name: z.string().optional().describe('Deployment name'),
      success: z.boolean().describe('Whether the operation succeeded'),
      result: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    let { action, deploymentKey, name } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a deployment');

      let result = await client.addDeployment({ key: deploymentKey, name });
      let created = result.data || result;

      return {
        output: {
          deploymentKey: created.key || deploymentKey,
          name: created.name || name,
          success: true,
          result: created
        },
        message: `Created deployment **${name}** (key: ${deploymentKey}).`
      };
    }

    if (action === 'delete') {
      let result = await client.deleteDeployment(deploymentKey);

      return {
        output: {
          deploymentKey,
          success: true,
          result
        },
        message: `Deleted deployment **${deploymentKey}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
