import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let createDeployment = SlateTool.create(spec, {
  name: 'Create Deployment',
  key: 'create_deployment',
  description: `Deploy a trained model to production. Supports deploying from a learning model (by modelId) or from a registered model package (by modelPackageId). The deployment will be accessible for real-time or batch predictions.`,
  instructions: [
    'Provide either a modelId (from a project leaderboard) or a modelPackageId (from the Model Registry) to deploy.',
    'A defaultPredictionServerId or predictionEnvironmentId may be required depending on your DataRobot configuration.'
  ]
})
  .input(
    z.object({
      label: z.string().describe('Name/label for the deployment'),
      description: z.string().optional().describe('Description of the deployment'),
      modelId: z
        .string()
        .optional()
        .describe('ID of a trained model from a project leaderboard'),
      modelPackageId: z.string().optional().describe('ID of a registered model package'),
      defaultPredictionServerId: z.string().optional().describe('Prediction server to use'),
      predictionEnvironmentId: z.string().optional().describe('Prediction environment to use'),
      importance: z
        .enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])
        .optional()
        .describe('Deployment importance level')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('ID of the created deployment'),
      label: z.string().optional().describe('Deployment label'),
      status: z.string().optional().describe('Deployment status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let deployment: any;

    if (ctx.input.modelPackageId) {
      deployment = await client.createDeploymentFromModelPackage({
        modelPackageId: ctx.input.modelPackageId,
        label: ctx.input.label,
        description: ctx.input.description,
        defaultPredictionServerId: ctx.input.defaultPredictionServerId,
        predictionEnvironmentId: ctx.input.predictionEnvironmentId,
        importance: ctx.input.importance
      });
    } else if (ctx.input.modelId) {
      deployment = await client.createDeploymentFromLearningModel({
        modelId: ctx.input.modelId,
        label: ctx.input.label,
        description: ctx.input.description,
        defaultPredictionServerId: ctx.input.defaultPredictionServerId,
        importance: ctx.input.importance
      });
    } else {
      throw new Error('Either modelId or modelPackageId must be provided');
    }

    return {
      output: {
        deploymentId: deployment.id || deployment.deploymentId,
        label: deployment.label,
        status: deployment.status
      },
      message: `Deployment **${ctx.input.label}** created successfully. ID: **${deployment.id || deployment.deploymentId}**.`
    };
  })
  .build();
