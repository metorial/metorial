import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let manageDeployment = SlateTool.create(spec, {
  name: 'Update, Replace Model, or Delete Deployment',
  key: 'manage_deployment',
  description: `Manage an existing deployment. Update its label/description/importance, replace the champion model, or delete the deployment entirely.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment'),
      action: z.enum(['update', 'replace_model', 'delete']).describe('Action to perform'),
      label: z.string().optional().describe('New label (for update)'),
      description: z.string().optional().describe('New description (for update)'),
      importance: z
        .enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])
        .optional()
        .describe('New importance (for update)'),
      modelId: z.string().optional().describe('New model ID (for replace_model)'),
      modelPackageId: z
        .string()
        .optional()
        .describe('New model package ID (for replace_model)'),
      replacementReason: z
        .string()
        .optional()
        .describe('Reason for model replacement (for replace_model)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      deploymentId: z.string().describe('ID of the affected deployment'),
      label: z.string().optional().describe('Updated deployment label')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    if (ctx.input.action === 'delete') {
      await client.deleteDeployment(ctx.input.deploymentId);
      return {
        output: {
          success: true,
          deploymentId: ctx.input.deploymentId
        },
        message: `Deployment **${ctx.input.deploymentId}** has been deleted.`
      };
    }

    if (ctx.input.action === 'replace_model') {
      await client.replaceDeploymentModel(ctx.input.deploymentId, {
        modelId: ctx.input.modelId,
        modelPackageId: ctx.input.modelPackageId,
        reason: ctx.input.replacementReason || 'Model replacement'
      });
      return {
        output: {
          success: true,
          deploymentId: ctx.input.deploymentId
        },
        message: `Champion model on deployment **${ctx.input.deploymentId}** has been replaced.`
      };
    }

    // update
    let updated = await client.updateDeployment(ctx.input.deploymentId, {
      label: ctx.input.label,
      description: ctx.input.description,
      importance: ctx.input.importance
    });

    return {
      output: {
        success: true,
        deploymentId: ctx.input.deploymentId,
        label: updated.label || ctx.input.label
      },
      message: `Deployment **${ctx.input.deploymentId}** updated.`
    };
  })
  .build();
