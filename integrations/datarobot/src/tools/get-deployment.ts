import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
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
  defaultPredictionServerId: z.string().optional().describe('Default prediction server ID'),
  predictionEnvironmentId: z.string().optional().describe('Prediction environment ID')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let d = await client.getDeployment(ctx.input.deploymentId);

    return {
      output: parseOutput(outputSchema, {
        raw: d,
        deploymentId: d.id ?? d.deploymentId,
        label: d.label,
        description: d.description === null ? undefined : d.description,
        status: d.status,
        importance: d.importance,
        modelId: d.model?.id ?? d.modelId,
        modelPackageId: d.modelPackage?.id ?? d.modelPackageId,
        createdAt: d.createdAt,
        serviceHealth: d.serviceHealth,
        modelHealth: d.modelHealth,
        accuracyHealth: d.accuracyHealth,
        defaultPredictionServerId:
          d.defaultPredictionServer?.id === null ? undefined : d.defaultPredictionServer?.id,
        predictionEnvironmentId:
          d.predictionEnvironment?.id === null ? undefined : d.predictionEnvironment?.id
      }),
      message: `Deployment **${d.label}** — Status: ${d.status || 'unknown'}, Service Health: ${d.serviceHealth?.status || 'N/A'}.`
    };
  })
  .build();
