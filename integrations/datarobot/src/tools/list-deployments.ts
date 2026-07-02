import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

let deploymentSchema = z.object({
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
  .output(
    z.object({
      deployments: z.array(deploymentSchema).describe('List of deployments'),
      totalCount: z.number().optional().describe('Total number of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let result = await client.listDeployments({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderBy: ctx.input.orderBy,
      status: ctx.input.status
    });

    let items = result.data || result;
    let deployments = (Array.isArray(items) ? items : []).map((d: any) => ({
      deploymentId: d.id || d.deploymentId,
      label: d.label,
      description: d.description,
      status: d.status,
      importance: d.importance,
      modelId: d.model?.id || d.modelId,
      modelPackageId: d.modelPackage?.id || d.modelPackageId,
      createdAt: d.createdAt,
      serviceHealth: d.serviceHealth?.status,
      modelHealth: d.modelHealth?.status,
      accuracyHealth: d.accuracyHealth?.status,
      predictionUsage: d.predictionUsage
    }));

    return {
      output: {
        deployments,
        totalCount: result.totalCount || result.count || deployments.length
      },
      message: `Found **${deployments.length}** deployment(s).`
    };
  })
  .build();
