import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let integrationSchema = z
  .object({
    integrationId: z.string().optional().describe('Integration identifier'),
    name: z.string().optional().describe('Integration name'),
    configType: z
      .string()
      .optional()
      .describe('Integration type (e.g., GITHUB_PULL_REQUEST, AWS_API_GATEWAY)'),
    enabled: z.boolean().optional().describe('Whether the integration is enabled')
  })
  .passthrough();

export let manageIntegrations = SlateTool.create(spec, {
  name: 'Manage Integrations',
  key: 'manage_integrations',
  description: `List, create, update, delete, or execute integrations on an API version in SwaggerHub. Integrations connect SwaggerHub to external tools like GitHub, GitLab, Bitbucket, AWS API Gateway, and more. Use the **action** field to specify the operation.`,
  instructions: [
    'To list integrations, set action to "list".',
    'To create, provide the full integration configuration object.',
    'To execute, provide the integrationId of an existing integration.'
  ]
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API'),
      version: z.string().describe('API version'),
      action: z
        .enum(['list', 'create', 'update', 'delete', 'execute'])
        .describe('Operation to perform'),
      integrationId: z
        .string()
        .optional()
        .describe('Integration ID (required for update, delete, execute)'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Integration configuration object (required for create/update)')
    })
  )
  .output(
    z.object({
      integrations: z
        .array(integrationSchema)
        .optional()
        .describe('List of integrations (for list action)'),
      integration: integrationSchema.optional().describe('Created or updated integration'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let { apiName, version, action, integrationId, configuration } = ctx.input;

    switch (action) {
      case 'list': {
        let result = await client.getApiIntegrations(owner, apiName, version);
        let integrations = Array.isArray(result) ? result : [];
        return {
          output: { integrations, success: true },
          message: `Found **${integrations.length}** integration(s) on **${owner}/${apiName}** v${version}.`
        };
      }
      case 'create': {
        if (!configuration)
          throw new Error('Configuration is required to create an integration.');
        let integration = await client.createApiIntegration(
          owner,
          apiName,
          version,
          configuration
        );
        return {
          output: { integration, success: true },
          message: `Created integration on **${owner}/${apiName}** v${version}.`
        };
      }
      case 'update': {
        if (!integrationId) throw new Error('integrationId is required for update.');
        if (!configuration) throw new Error('Configuration is required for update.');
        let integration = await client.updateApiIntegration(
          owner,
          apiName,
          version,
          integrationId,
          configuration
        );
        return {
          output: { integration, success: true },
          message: `Updated integration **${integrationId}** on **${owner}/${apiName}** v${version}.`
        };
      }
      case 'delete': {
        if (!integrationId) throw new Error('integrationId is required for delete.');
        await client.deleteApiIntegration(owner, apiName, version, integrationId);
        return {
          output: { success: true },
          message: `Deleted integration **${integrationId}** from **${owner}/${apiName}** v${version}.`
        };
      }
      case 'execute': {
        if (!integrationId) throw new Error('integrationId is required for execute.');
        await client.executeApiIntegration(owner, apiName, version, integrationId);
        return {
          output: { success: true },
          message: `Executed integration **${integrationId}** on **${owner}/${apiName}** v${version}.`
        };
      }
    }
  })
  .build();
