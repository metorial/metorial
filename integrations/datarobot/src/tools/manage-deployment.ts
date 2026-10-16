import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  deploymentId: z.string().describe('ID of the affected deployment'),
  label: z.string().optional().describe('Updated deployment label')
});

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
        .describe(
          'Replacement reason: ACCURACY, DATA_DRIFT, ERRORS, SCHEDULED_REFRESH, SCORING_SPEED, DEPRECATION, or OTHER (default)'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    if (ctx.input.action === 'delete') {
      await client.deleteDeployment(ctx.input.deploymentId);
      return {
        output: parseOutput(outputSchema, {
          success: true,
          deploymentId: ctx.input.deploymentId
        }),
        message: `Deployment **${ctx.input.deploymentId}** has been deleted.`
      };
    }

    if (ctx.input.action === 'replace_model') {
      if (Boolean(ctx.input.modelId) === Boolean(ctx.input.modelPackageId)) {
        throw createApiServiceError(
          'Provide exactly one of modelId or modelPackageId to replace the model.'
        );
      }
      await client.replaceDeploymentModel(ctx.input.deploymentId, {
        modelId: ctx.input.modelId,
        modelPackageId: ctx.input.modelPackageId,
        reason: ctx.input.replacementReason ?? 'OTHER'
      });
      return {
        output: parseOutput(outputSchema, {
          success: true,
          deploymentId: ctx.input.deploymentId
        }),
        message: `Champion model on deployment **${ctx.input.deploymentId}** has been replaced.`
      };
    }

    if (
      [ctx.input.label, ctx.input.description, ctx.input.importance].every(
        value => value === undefined
      )
    ) {
      throw createApiServiceError(
        'Provide label, description, or importance to update the deployment.'
      );
    }
    let updated = await client.updateDeployment(ctx.input.deploymentId, {
      label: ctx.input.label,
      description: ctx.input.description,
      importance: ctx.input.importance
    });

    return {
      output: parseOutput(outputSchema, {
        success: true,
        deploymentId: ctx.input.deploymentId,
        label: updated.label
      }),
      message: `Deployment **${ctx.input.deploymentId}** updated.`
    };
  })
  .build();
