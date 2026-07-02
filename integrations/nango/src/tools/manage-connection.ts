import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Create, retrieve, or delete a connection. A connection represents a per-user, per-integration authorization. Use **get** to retrieve full connection details including credentials (Nango auto-refreshes expired tokens). Use **create** to import existing credentials. Use **delete** to remove a connection.`,
  instructions: [
    'When getting a connection, the providerConfigKey is required to identify which integration the connection belongs to.',
    'Fetching a connection automatically checks and refreshes expired access tokens.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('Operation to perform'),
      connectionId: z.string().describe('The connection identifier'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      forceRefresh: z
        .boolean()
        .optional()
        .describe('Force token refresh regardless of expiry (for get action)'),
      includeRefreshToken: z
        .boolean()
        .optional()
        .describe('Include refresh token in response (for get action)'),
      credentials: z
        .record(z.string(), z.any())
        .optional()
        .describe('Auth credentials to import (for create action)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata (for create action)'),
      connectionConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('OAuth connection config (for create action)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags (for create action)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      connection: z
        .object({
          connectionId: z.string(),
          provider: z.string(),
          providerConfigKey: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          metadata: z.record(z.string(), z.any()).nullable(),
          credentials: z.record(z.string(), z.any())
        })
        .optional()
        .describe('Connection details (not returned for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, connectionId, providerConfigKey } = ctx.input;

    if (action === 'get') {
      let result = await client.getConnection(connectionId, {
        provider_config_key: providerConfigKey,
        force_refresh: ctx.input.forceRefresh,
        refresh_token: ctx.input.includeRefreshToken
      });
      return {
        output: {
          success: true,
          connection: {
            connectionId: result.connection_id,
            provider: result.provider,
            providerConfigKey: result.provider_config_key,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
            metadata: result.metadata,
            credentials: result.credentials
          }
        },
        message: `Retrieved connection **${connectionId}** for integration **${providerConfigKey}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.credentials) {
        throw new Error('Credentials are required when creating a connection');
      }
      let result = await client.createConnection({
        provider_config_key: providerConfigKey,
        connection_id: connectionId,
        credentials: ctx.input.credentials,
        metadata: ctx.input.metadata,
        connection_config: ctx.input.connectionConfig,
        tags: ctx.input.tags
      });
      return {
        output: {
          success: true,
          connection: {
            connectionId: result.connection_id,
            provider: result.provider,
            providerConfigKey: result.provider_config_key,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
            metadata: result.metadata,
            credentials: result.credentials
          }
        },
        message: `Created connection **${connectionId}** for integration **${providerConfigKey}**.`
      };
    }

    // delete
    await client.deleteConnection(connectionId, providerConfigKey);
    return {
      output: { success: true },
      message: `Deleted connection **${connectionId}** from integration **${providerConfigKey}**.`
    };
  })
  .build();
