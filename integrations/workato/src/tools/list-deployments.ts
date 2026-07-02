import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
          deploymentId: z.number().describe('Deployment ID'),
          projectId: z.string().nullable().describe('Project ID'),
          environmentType: z.string().describe('Target environment'),
          state: z.string().describe('Deployment state'),
          title: z.string().nullable().describe('Deployment title'),
          description: z.string().nullable().describe('Deployment description'),
          performedByName: z
            .string()
            .nullable()
            .describe('Person who performed the deployment'),
          createdAt: z.string().describe('Deployment creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDeployments({
      projectId: ctx.input.projectId,
      environmentType: ctx.input.environmentType,
      state: ctx.input.state
    });

    let items = result.items ?? (Array.isArray(result) ? result : []);
    let deployments = items.map((d: any) => ({
      deploymentId: d.id,
      projectId: d.project_id ?? null,
      environmentType: d.environment_type,
      state: d.state,
      title: d.title ?? null,
      description: d.description ?? null,
      performedByName: d.performed_by_name ?? null,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { deployments },
      message: `Found **${deployments.length}** deployments.`
    };
  });
