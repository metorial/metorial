import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { malformed, numericId } from '../lib/validation';
import { spec } from '../spec';

export let deployProjectTool = SlateTool.create(spec, {
  name: 'Deploy Project',
  key: 'deploy_project',
  description: `Build and deploy a Workato project to a target environment. This performs a one-step build-and-deploy operation. Use to promote project changes across environments (sandbox, test, stage, uat, preprod, prod).`,
  instructions: [
    'This creates a retained asynchronous deployment and may change target resources. Read the returned deployment ID to verify completion.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('Project ID or f followed by the project folder ID to deploy'),
      environmentType: z
        .enum(['sandbox', 'test', 'stage', 'uat', 'preprod', 'prod'])
        .describe('Target environment'),
      title: z.string().optional().describe('Deployment title'),
      description: z.string().optional().describe('Deployment description')
    })
  )
  .output(
    z.object({
      deploymentId: z.number().optional().describe('Deployment ID'),
      projectId: z.string().optional().describe('Project ID'),
      environmentType: z.string().optional().describe('Target environment'),
      state: z.string().optional().describe('Deployment state (pending, success, failed)'),
      performedByName: z
        .string()
        .nullable()
        .optional()
        .describe('Name of the person who performed the deployment'),
      createdAt: z.string().optional().describe('Deployment creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.deployProject(ctx.input.projectId, ctx.input);
    const output = map.deployment(result);
    if (
      !output.projectId ||
      output.environmentType !== ctx.input.environmentType ||
      (!ctx.input.projectId.startsWith('f') &&
        output.projectId !== numericId(ctx.input.projectId, 'projectId'))
    )
      malformed();
    return {
      output: { ...output, projectId: output.projectId },
      message: `Deployment ${output.deploymentId}: ${output.state}. Use list_deployments with deploymentId to read exact status. Submission does not prove completion.`
    };
  });
