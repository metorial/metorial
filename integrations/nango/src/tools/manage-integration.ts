import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let manageIntegration = SlateTool.create(spec, {
  name: 'Manage Integration',
  key: 'manage_integration',
  description: `Create, update, retrieve, or delete an integration in Nango. An integration ties a provider (e.g., Slack, GitHub) to auth credentials (client ID/secret for OAuth). Use **create** to set up a new integration, **update** to modify its display name or credentials, **get** to retrieve details, or **delete** to remove it.`,
  instructions: [
    'For creating, both uniqueKey and provider are required.',
    'For updating, only provide fields you wish to change.',
    'When including credentials for OAuth, provide clientId and clientSecret inside the credentials object.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Operation to perform'),
      uniqueKey: z.string().describe('The integration identifier (unique_key)'),
      provider: z.string().optional().describe('Provider name (required for create)'),
      displayName: z.string().optional().describe('Human-readable integration name'),
      credentials: z
        .record(z.string(), z.any())
        .optional()
        .describe('Auth credentials (e.g., client_id, client_secret for OAuth)'),
      include: z
        .array(z.string())
        .optional()
        .describe('Optional data to include when getting (e.g., ["webhook", "credentials"])')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      integration: z
        .object({
          uniqueKey: z.string(),
          displayName: z.string(),
          provider: z.string(),
          logo: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
        .optional()
        .describe('Integration details (not returned for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, uniqueKey, provider, displayName, credentials, include } = ctx.input;

    if (action === 'create') {
      if (!provider) {
        throw new Error('Provider is required when creating an integration');
      }
      let result = await client.createIntegration({
        unique_key: uniqueKey,
        provider,
        display_name: displayName,
        credentials
      });
      let i = result.data;
      return {
        output: {
          success: true,
          integration: {
            uniqueKey: i.unique_key,
            displayName: i.display_name,
            provider: i.provider,
            logo: i.logo,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          }
        },
        message: `Created integration **${uniqueKey}** for provider **${provider}**.`
      };
    }

    if (action === 'update') {
      let result = await client.updateIntegration(uniqueKey, {
        display_name: displayName,
        credentials
      });
      let i = result.data;
      return {
        output: {
          success: true,
          integration: {
            uniqueKey: i.unique_key,
            displayName: i.display_name,
            provider: i.provider,
            logo: i.logo,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          }
        },
        message: `Updated integration **${uniqueKey}**.`
      };
    }

    if (action === 'get') {
      let result = await client.getIntegration(uniqueKey, include);
      let i = result.data;
      return {
        output: {
          success: true,
          integration: {
            uniqueKey: i.unique_key,
            displayName: i.display_name,
            provider: i.provider,
            logo: i.logo,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          }
        },
        message: `Retrieved integration **${uniqueKey}**.`
      };
    }

    // delete
    await client.deleteIntegration(uniqueKey);
    return {
      output: { success: true },
      message: `Deleted integration **${uniqueKey}**.`
    };
  })
  .build();
