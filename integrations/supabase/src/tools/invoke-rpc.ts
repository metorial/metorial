import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let invokeRpc = SlateTool.create(spec, {
  name: 'Invoke Database Function',
  key: 'invoke_rpc',
  description: `Call a PostgreSQL function (RPC) through the Supabase REST API. This allows you to execute custom database functions with typed arguments and receive results.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      functionName: z.string().describe('Name of the PostgreSQL function to invoke'),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments to pass to the function'),
      schema: z
        .string()
        .optional()
        .describe('Database schema containing the function (defaults to public)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result returned by the function')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let apiKey = serviceKey?.api_key;

    if (!apiKey) {
      throw createApiServiceError('Could not retrieve service_role API key for the project');
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let result = await projectClient.rpc(ctx.input.functionName, ctx.input.args ?? {}, {
      schema: ctx.input.schema
    });

    return {
      output: { result },
      message: `Invoked function **${ctx.input.functionName}** on project **${projectRef}**.`
    };
  })
  .build();
