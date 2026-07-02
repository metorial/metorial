import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { anthropicServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageApiKeys = SlateTool.create(spec, {
  name: 'Manage API Keys',
  key: 'manage_api_keys',
  description: `List, retrieve, and update organization API keys via the Admin API. View active, inactive, or archived keys filtered by workspace. Update keys to activate, deactivate, or rename them.
Requires an Admin API key (sk-ant-admin...).`,
  constraints: [
    'Requires an Admin API key (sk-ant-admin...).',
    'Cannot create or delete API keys via this endpoint—only list and update.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update']).describe('Operation to perform'),
      apiKeyId: z.string().optional().describe('API key ID (required for "get" and "update")'),
      status: z
        .enum(['active', 'inactive', 'archived'])
        .optional()
        .describe('Filter keys by status (for "list")'),
      workspaceId: z.string().optional().describe('Filter keys by workspace ID (for "list")'),
      name: z.string().optional().describe('New name for the API key (for "update")'),
      keyStatus: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('New status for the API key (for "update")'),
      limit: z.number().optional().describe('Max results for "list"'),
      afterId: z.string().optional().describe('Pagination cursor for "list"')
    })
  )
  .output(
    z.object({
      apiKeys: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of API keys'),
      apiKey: z.record(z.string(), z.unknown()).optional().describe('Updated API key details'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listApiKeys({
          limit: ctx.input.limit,
          afterId: ctx.input.afterId,
          status: ctx.input.status,
          workspaceId: ctx.input.workspaceId
        });
        return {
          output: { apiKeys: result.apiKeys, hasMore: result.hasMore },
          message: `Found **${result.apiKeys.length}** API key(s).${result.hasMore ? ' More available with pagination.' : ''}`
        };
      }
      case 'get': {
        if (!ctx.input.apiKeyId) {
          throw anthropicServiceError('apiKeyId is required for "get"');
        }
        let apiKey = await client.getApiKey(ctx.input.apiKeyId);
        return {
          output: { apiKey },
          message: `Retrieved API key **${ctx.input.apiKeyId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.apiKeyId) {
          throw anthropicServiceError('apiKeyId is required for "update"');
        }
        let params: Record<string, unknown> = {};
        if (ctx.input.name !== undefined) params.name = ctx.input.name;
        if (ctx.input.keyStatus !== undefined) params.status = ctx.input.keyStatus;

        let apiKey = await client.updateApiKey(ctx.input.apiKeyId, params);
        return {
          output: { apiKey },
          message: `Updated API key **${ctx.input.apiKeyId}**.`
        };
      }
    }
  })
  .build();
