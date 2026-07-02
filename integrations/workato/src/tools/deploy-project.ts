import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let deployProjectTool = SlateTool.create(spec, {
  name: 'Deploy Project',
  key: 'deploy_project',
  description: `Build and deploy a Workato project to a target environment. This performs a one-step build-and-deploy operation. Use to promote project changes across environments (sandbox, test, stage, uat, preprod, prod).`,
  instructions: [
    'The project must have changes to deploy. Deploying an unchanged project will have no effect.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to deploy'),
      environmentType: z
        .enum(['sandbox', 'test', 'stage', 'uat', 'preprod', 'prod'])
        .describe('Target environment'),
      title: z.string().optional().describe('Deployment title'),
      description: z.string().optional().describe('Deployment description')
    })
  )
  .output(
    z.object({
      deploymentId: z.number().describe('Deployment ID'),
      projectId: z.string().describe('Project ID'),
      environmentType: z.string().describe('Target environment'),
      state: z.string().describe('Deployment state (pending, success, failed)'),
      performedByName: z
        .string()
        .nullable()
        .describe('Name of the person who performed the deployment'),
      createdAt: z.string().describe('Deployment creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deployProject(ctx.input.projectId, {
      environmentType: ctx.input.environmentType,
      title: ctx.input.title,
      description: ctx.input.description
    });

    return {
      output: {
        deploymentId: result.id,
        projectId: result.project_id ?? ctx.input.projectId,
        environmentType: result.environment_type ?? ctx.input.environmentType,
        state: result.state ?? 'pending',
        performedByName: result.performed_by_name ?? null,
        createdAt: result.created_at
      },
      message: `Deployment **${result.id}** for project ${ctx.input.projectId} to **${ctx.input.environmentType}** — state: ${result.state ?? 'pending'}.`
    };
  });
