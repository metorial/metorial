import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `List, fork, promote, or delete sandbox environments. Environments allow safe schema migrations and testing before going live. Forking creates a full copy of an existing environment.`,
  instructions: [
    'Promoting a sandbox environment replaces the current primary environment.',
    'The primary environment cannot be deleted.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'fork', 'promote', 'delete'])
        .describe('Action to perform'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID (required for get, fork, promote, delete)'),
      newEnvironmentId: z
        .string()
        .optional()
        .describe('ID for the new forked environment (required for fork)')
    })
  )
  .output(
    z.object({
      environments: z
        .array(z.any())
        .optional()
        .describe('Array of environment objects (for list action)'),
      job: z
        .any()
        .optional()
        .describe(
          'Asynchronous job object, when the operation is queued. Use get_job_result with its id.'
        ),
      environment: z.any().optional().describe('Single environment object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action, environmentId, newEnvironmentId } = ctx.input;

    if (action === 'list') {
      let environments = await client.listEnvironments();
      return {
        output: { environments },
        message: `Found **${environments.length}** environments.`
      };
    }

    if (action === 'get') {
      if (!environmentId)
        throw createApiServiceError('environmentId is required for get action');
      let environment = await client.getEnvironment(environmentId);
      return {
        output: { environment, ...(environment?.type === 'job' ? { job: environment } : {}) },
        message: `Retrieved environment **${environmentId}**.`
      };
    }

    if (action === 'fork') {
      if (!environmentId)
        throw createApiServiceError('environmentId is required for fork action');
      if (!newEnvironmentId)
        throw createApiServiceError('newEnvironmentId is required for fork action');
      let environment = await client.forkEnvironment(environmentId, newEnvironmentId);
      return {
        output: { environment, ...(environment?.type === 'job' ? { job: environment } : {}) },
        message:
          environment?.type === 'job'
            ? `Queued operation as job **${environment.id}**. Use get_job_result to check completion.`
            : `Forked environment **${environmentId}** into **${newEnvironmentId}**.`
      };
    }

    if (action === 'promote') {
      if (!environmentId)
        throw createApiServiceError('environmentId is required for promote action');
      let environment = await client.promoteEnvironment(environmentId);
      return {
        output: { environment, ...(environment?.type === 'job' ? { job: environment } : {}) },
        message:
          environment?.type === 'job'
            ? `Queued operation as job **${environment.id}**. Use get_job_result to check completion.`
            : `Promoted environment **${environmentId}** to primary.`
      };
    }

    if (action === 'delete') {
      if (!environmentId)
        throw createApiServiceError('environmentId is required for delete action');
      let environment = await client.deleteEnvironment(environmentId);
      return {
        output: { environment, ...(environment?.type === 'job' ? { job: environment } : {}) },
        message:
          environment?.type === 'job'
            ? `Queued operation as job **${environment.id}**. Use get_job_result to check completion.`
            : `Deleted environment **${environmentId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
