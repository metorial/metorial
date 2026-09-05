import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createAmplitudeExperimentClient,
  experimentResultSchema
} from '../lib/experiment-client';
import { parseResponse } from '../lib/rest-validation';
import { spec } from '../spec';

const pagination = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum records for this page, up to 1000.'),
  cursor: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Numeric nextCursor returned by the previous list response.')
};

export const getExperimentsRestTool = SlateTool.create(spec, {
  key: 'get_experiments',
  name: 'Get Amplitude Experiments',
  description:
    'List experiments and their configuration, or retrieve one by ID. Requires an Experiment management API key on the API Key + Secret Key connection; OAuth and project keys alone do not authorize this endpoint. This returns experiment configuration, not statistical analysis or variant performance results.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      id: z
        .string()
        .min(1)
        .optional()
        .describe('Experiment ID from a previous list. Omit to list.'),
      key: z.string().optional().describe('List filter: exact experiment key.'),
      projectId: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe(
          'Optional list filter for a project ID returned by an experiment list or get_amplitude_context with OAuth.'
        ),
      includeArchived: z.boolean().optional(),
      deliveryMethod: z.enum(['feature', 'web']).optional(),
      ...pagination
    })
  )
  .output(experimentResultSchema)
  .handleInvocation(async ctx => {
    const { id, ...filters } = ctx.input;
    if (id && Object.values(filters).some(value => value !== undefined))
      throw createApiServiceError(
        'Experiment list filters and pagination cannot be combined with id.',
        { reason: 'amplitude_invalid_input' }
      );
    const client = createAmplitudeExperimentClient(ctx);
    const output = id ? await client.getExperiment(id) : await client.listExperiments(filters);
    return {
      output,
      message: id
        ? 'Retrieved Amplitude experiment configuration.'
        : 'Retrieved Amplitude experiments.'
    };
  })
  .build();

export const getDeploymentsRestTool = SlateTool.create(spec, {
  key: 'get_deployments',
  name: 'Get Amplitude Deployments',
  description:
    'List deployments shared by Amplitude flags and experiments. Requires an Experiment management API key on the API Key + Secret Key connection. Optional projectId filters only the fetched page locally; follow nextCursor even if no deployments match this page. Returns identifiers and deployment configuration.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      ...pagination,
      projectId: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe(
          'Optional project ID from a deployment or get_amplitude_context. Filters one upstream page locally and preserves its nextCursor.'
        )
    })
  )
  .output(experimentResultSchema)
  .handleInvocation(async ctx => {
    const { projectId, ...page } = ctx.input;
    const output = await createAmplitudeExperimentClient(ctx).listDeployments(page);
    if (projectId !== undefined) {
      const deployments = parseResponse(
        z.array(
          z
            .object({
              projectId: z.union([
                z.string().regex(/^\d+$/),
                z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
              ])
            })
            .passthrough()
        ),
        output.deployments,
        'deployment project filter'
      );
      output.deployments = deployments.filter(item => String(item.projectId) === projectId);
    }
    return { output, message: 'Retrieved Amplitude Experiment deployments.' };
  })
  .build();

export const amplitudeExperimentTools = [getExperimentsRestTool, getDeploymentsRestTool];
