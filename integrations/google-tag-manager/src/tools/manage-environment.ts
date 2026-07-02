import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let environmentOutputSchema = z.object({
  environmentId: z.string().optional().describe('Environment ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  name: z.string().optional().describe('Environment name'),
  type: z.string().optional().describe('Environment type (e.g., "live", "latest", "user")'),
  description: z.string().optional().describe('Environment description'),
  enableDebug: z.boolean().optional().describe('Whether debug mode is enabled'),
  url: z.string().optional().describe('Preview URL'),
  authorizationCode: z.string().optional().describe('Authorization code for preview'),
  containerVersionId: z
    .string()
    .optional()
    .describe('Container version ID linked to this environment'),
  fingerprint: z.string().optional().describe('Environment fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI')
});

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, list, get, update, delete, or reauthorize GTM environments. Environments allow previewing and testing container configurations before publishing to production.`,
  instructions: [
    'Use "create" to set up a new preview/staging environment.',
    'Use "reauthorize" to generate a fresh authorization code for a preview URL.',
    'Each environment can be linked to a specific container version for testing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageEnvironment)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete', 'reauthorize'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID (required for get, update, delete, reauthorize)'),
      name: z.string().optional().describe('Environment name (required for create)'),
      description: z.string().optional().describe('Environment description'),
      enableDebug: z.boolean().optional().describe('Whether to enable debug mode'),
      url: z.string().optional().describe('Preview URL for the environment')
    })
  )
  .output(
    z.object({
      environment: environmentOutputSchema
        .optional()
        .describe('Environment details (for single operations)'),
      environments: z
        .array(environmentOutputSchema)
        .optional()
        .describe('List of environments (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, environmentId } = ctx.input;

    if (action === 'list') {
      let response = await client.listEnvironments(accountId, containerId);
      let environments = response.environment || [];
      return {
        output: { environments } as any,
        message: `Found **${environments.length}** environment(s) for container \`${containerId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating an environment');

      let environment = await client.createEnvironment(accountId, containerId, {
        name: ctx.input.name,
        description: ctx.input.description,
        enableDebug: ctx.input.enableDebug,
        url: ctx.input.url
      });

      return {
        output: { environment } as any,
        message: `Created environment **"${environment.name}"** (ID: \`${environment.environmentId}\`)`
      };
    }

    if (!environmentId)
      throw new Error(
        'environmentId is required for get, update, delete, and reauthorize actions'
      );

    if (action === 'get') {
      let environment = await client.getEnvironment(accountId, containerId, environmentId);
      return {
        output: { environment } as any,
        message: `Retrieved environment **"${environment.name}"** (type: \`${environment.type}\`)`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.enableDebug !== undefined) updateData.enableDebug = ctx.input.enableDebug;
      if (ctx.input.url !== undefined) updateData.url = ctx.input.url;

      let environment = await client.updateEnvironment(
        accountId,
        containerId,
        environmentId,
        updateData
      );
      return {
        output: { environment } as any,
        message: `Updated environment **"${environment.name}"**`
      };
    }

    if (action === 'delete') {
      await client.deleteEnvironment(accountId, containerId, environmentId);
      return {
        output: { environment: { environmentId, accountId, containerId } } as any,
        message: `Deleted environment \`${environmentId}\``
      };
    }

    // reauthorize
    let environment = await client.reauthorizeEnvironment(
      accountId,
      containerId,
      environmentId
    );
    return {
      output: { environment } as any,
      message: `Reauthorized environment **"${environment.name}"** — new authorization code generated`
    };
  })
  .build();
