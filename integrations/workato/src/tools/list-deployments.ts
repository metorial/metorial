import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { malformed, numericId, records } from '../lib/validation';
import { spec } from '../spec';

export let listDeploymentsTool = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List project deployments in the Workato workspace. Filter by project, environment type, or deployment state. Returns deployment metadata and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z
        .string()
        .optional()
        .describe('Read one exact deployment instead of listing.'),
      projectId: z.string().optional().describe('Filter by project ID'),
      environmentType: z
        .enum(['sandbox', 'test', 'stage', 'uat', 'preprod', 'prod'])
        .optional()
        .describe('Filter by target environment'),
      state: z
        .enum(['pending', 'success', 'failed'])
        .optional()
        .describe('Filter by deployment state')
    })
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          deploymentId: z.number().optional().describe('Deployment ID'),
          projectId: z.string().nullable().optional().describe('Project ID'),
          environmentType: z.string().optional().describe('Target environment'),
          state: z.string().optional().describe('Deployment state'),
          title: z.string().nullable().optional().describe('Deployment title'),
          description: z.string().nullable().optional().describe('Deployment description'),
          performedByName: z
            .string()
            .nullable()
            .optional()
            .describe('Person who performed the deployment'),
          createdAt: z.string().optional().describe('Deployment creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = ctx.input.deploymentId
      ? { items: [await client.getDeployment(ctx.input.deploymentId)] }
      : await client.listDeployments(ctx.input);
    const deployments = records(result.items).map(map.deployment);
    if (
      ctx.input.deploymentId &&
      String(deployments[0]?.deploymentId) !==
        numericId(ctx.input.deploymentId, 'deploymentId')
    )
      malformed();
    return {
      output: { deployments },
      message: `Returned ${deployments.length} deployments with native state.`
    };
  });
