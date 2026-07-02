import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let getDeployment = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Retrieve detailed information about a specific model deployment including its health status, model information, capabilities, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to retrieve')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Unique deployment identifier'),
      label: z.string().optional().describe('Deployment label/name'),
      description: z.string().optional().describe('Deployment description'),
      status: z.string().optional().describe('Current deployment status'),
      importance: z.string().optional().describe('Deployment importance level'),
      modelId: z.string().optional().describe('Currently deployed model ID'),
      modelPackageId: z.string().optional().describe('Model package ID'),
      createdAt: z.string().optional().describe('Deployment creation timestamp'),
      serviceHealth: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Service health details'),
      modelHealth: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Model health details'),
      accuracyHealth: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Accuracy health details'),
      defaultPredictionServerId: z
        .string()
        .optional()
        .describe('Default prediction server ID'),
      predictionEnvironmentId: z.string().optional().describe('Prediction environment ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let d = await client.getDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: d.id || d.deploymentId,
        label: d.label,
        description: d.description,
        status: d.status,
        importance: d.importance,
        modelId: d.model?.id || d.modelId,
        modelPackageId: d.modelPackage?.id || d.modelPackageId,
        createdAt: d.createdAt,
        serviceHealth: d.serviceHealth,
        modelHealth: d.modelHealth,
        accuracyHealth: d.accuracyHealth,
        defaultPredictionServerId: d.defaultPredictionServer?.id,
        predictionEnvironmentId: d.predictionEnvironment?.id
      },
      message: `Deployment **${d.label}** — Status: ${d.status || 'unknown'}, Service Health: ${d.serviceHealth?.status || 'N/A'}.`
    };
  })
  .build();
