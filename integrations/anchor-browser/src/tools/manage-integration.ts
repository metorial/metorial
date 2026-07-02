import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIntegration = SlateTool.create(spec, {
  name: 'Manage Integrations',
  key: 'manage_integration',
  description: `List, create, or delete third-party integrations configured on your Anchor Browser account (e.g. 1Password service accounts).`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      integrationId: z.string().optional().describe('Integration ID (required for delete)'),
      name: z.string().optional().describe('Integration name (required for create)'),
      integrationType: z
        .string()
        .optional()
        .describe('Integration type, e.g. "1PASSWORD" (required for create)'),
      credentials: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Integration credentials (required for create)')
    })
  )
  .output(
    z.object({
      integration: z
        .object({
          integrationId: z.string(),
          name: z.string(),
          integrationType: z.string(),
          path: z.string().optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      integrations: z
        .array(
          z.object({
            integrationId: z.string(),
            name: z.string(),
            integrationType: z.string(),
            path: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listIntegrations();
      return {
        output: {
          integrations: (result.integrations ?? []).map(i => ({
            integrationId: i.id,
            name: i.name,
            integrationType: i.type,
            path: i.path,
            createdAt: i.createdAt
          }))
        },
        message: `Found **${(result.integrations ?? []).length}** integrations.`
      };
    }

    if (input.action === 'create') {
      if (!input.name || !input.integrationType || !input.credentials) {
        throw new Error('name, integrationType, and credentials are required for create.');
      }
      let result = await client.createIntegration({
        name: input.name,
        type: input.integrationType,
        credentials: input.credentials
      });
      let integration = result.integration;
      return {
        output: {
          integration: {
            integrationId: integration.id,
            name: integration.name,
            integrationType: integration.type,
            path: integration.path,
            createdAt: integration.createdAt
          }
        },
        message: `Integration **${integration.name}** created.`
      };
    }

    if (input.action === 'delete') {
      if (!input.integrationId) throw new Error('integrationId is required for delete.');
      await client.deleteIntegration(input.integrationId);
      return {
        output: { deleted: true },
        message: `Integration **${input.integrationId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
