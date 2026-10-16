import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let deploymentSchema = z.object({
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
  modelPackageId: z.string().optional().describe('Currently deployed model package ID'),
  createdAt: z.string().optional().describe('Deployment creation timestamp'),
  serviceHealth: z.string().optional().nullable().describe('Service health status'),
  modelHealth: z.string().optional().nullable().describe('Model health status'),
  accuracyHealth: z.string().optional().nullable().describe('Accuracy health status'),
  predictionUsage: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Prediction usage statistics')
});

let outputSchema = z.object({
  deployments: z.array(deploymentSchema).describe('List of deployments'),
  totalCount: z.number().optional().describe('Total number of deployments')
});

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List all model deployments with their health status, importance, and prediction usage. Useful for monitoring deployed models across the organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of deployments to return'),
      orderBy: z.string().optional().describe('Sort field'),
      status: z.string().optional().describe('Filter by deployment status')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let result = await client.listDeployments({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderBy: ctx.input.orderBy,
      status: ctx.input.status
    });

    let items = responseItems(result, 'deployments');
    let deployments = items.map((d: any) => ({
      raw: d,
      deploymentId: d.id ?? d.deploymentId,
      label: d.label,
      description: d.description === null ? undefined : d.description,
      status: d.status,
      importance: d.importance,
      modelId: d.model?.id ?? d.modelId,
      modelPackageId: d.modelPackage?.id ?? d.modelPackageId,
      createdAt: d.createdAt,
      serviceHealth: d.serviceHealth === null ? null : d.serviceHealth?.status,
      modelHealth: d.modelHealth === null ? null : d.modelHealth?.status,
      accuracyHealth: d.accuracyHealth === null ? null : d.accuracyHealth?.status,
      predictionUsage: d.predictionUsage
    }));

    return {
      output: parseOutput(outputSchema, {
        deployments,
        totalCount: result.totalCount
      }),
      message: `Found **${deployments.length}** deployment(s).`
    };
  })
  .build();
